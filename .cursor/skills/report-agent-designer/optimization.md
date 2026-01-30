# 优化策略指南

## 1. 性能优化

### 1.1 生成时间优化

**当前瓶颈分析：**
| 阶段 | 耗时占比 | 瓶颈原因 |
|------|---------|---------|
| 章节生成 | 60% | LLM 多轮对话 |
| 图表生成 | 20% | 额外 LLM 调用 |
| 数据查询 | 10% | 数据库查询 |
| 摘要生成 | 10% | LLM 调用 |

**优化方案 1：章节并行生成**

```python
# 当前：串行生成
for section_def in SECTION_DEFINITIONS:
    section = await self._generate_section(section_def)
    sections.append(section)

# 优化后：并行生成（注意：无依赖章节可并行）
async def generate_sections_parallel(self, section_defs: list):
    # 分组：独立章节可并行
    parallel_groups = [
        ["overview"],           # 第一组
        ["running", "stations"], # 第二组（可并行）
        ["pacing"],             # 第三组
        ["recommendations"]     # 第四组（依赖前面所有）
    ]
    
    all_sections = []
    for group in parallel_groups:
        defs = [d for d in section_defs if d["id"] in group]
        tasks = [self._generate_section(d) for d in defs]
        results = await asyncio.gather(*tasks)
        all_sections.extend(results)
    
    return all_sections
```

**优化方案 2：预计算数据**

```python
# 在生成开始时预加载所有可能需要的数据
async def preload_data(self, context: dict):
    """预加载常用数据"""
    tasks = [
        self.data_executor.execute("GetAthleteResult", context),
        self.data_executor.execute("GetDivisionStats", context),
        self.data_executor.execute("GetSegmentComparison", context),
        self.data_executor.execute("GetPacingAnalysis", context),
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return {
        "athlete_result": results[0] if not isinstance(results[0], Exception) else None,
        "division_stats": results[1] if not isinstance(results[1], Exception) else None,
        "segment_comparison": results[2] if not isinstance(results[2], Exception) else None,
        "pacing_analysis": results[3] if not isinstance(results[3], Exception) else None,
    }
```

**优化方案 3：流式生成**

```python
# 不等待全部完成，边生成边推送
async def generate_streaming(self, report_id: str):
    async for section in self._generate_sections_stream():
        # 立即推送已完成的章节
        yield {
            "event": "section_complete",
            "data": {"section": section}
        }
        
        # 更新数据库
        await self._save_section(report_id, section)
```

### 1.2 内存优化

**问题：** 大报告的 sections 和 charts JSON 可能很大

**解决方案：**
```python
# 分段存储
class ProReportSection(Base):
    """章节独立存储"""
    __tablename__ = "pro_report_sections"
    
    id = Column(Integer, primary_key=True)
    report_id = Column(String(36), ForeignKey("pro_reports.report_id"))
    section_id = Column(String(50))
    title = Column(String(200))
    content = Column(Text)
    charts = Column(Text)  # 该章节的图表
    order = Column(Integer)

# 按需加载
async def get_report_detail(report_id: str, include_sections: bool = True):
    report = await db.get(ProReport, report_id)
    if include_sections:
        sections = await db.query(ProReportSection).filter_by(report_id=report_id).all()
        report.sections = sections
    return report
```

### 1.3 数据库优化

**索引优化：**
```sql
-- 常用查询的复合索引
CREATE INDEX idx_results_lookup ON results(season, location, athlete_name);
CREATE INDEX idx_results_division ON results(season, location, division, total_seconds);
CREATE INDEX idx_reports_user ON pro_reports(user_id, created_at DESC);
```

**查询优化：**
```python
# 避免 N+1 查询
# Bad
for result in results:
    division_stats = await get_division_stats(result.division)

# Good
division_stats = await get_all_division_stats(season, location)
stats_map = {s.division: s for s in division_stats}
for result in results:
    stats = stats_map.get(result.division)
```

## 2. 质量优化

### 2.1 提高图表生成率

**问题：** LLM 不一定每次输出 chart_requirements（约 60-70% 覆盖率）

**方案 1：强化提示词**
```python
SYSTEM_PROMPT = """
...
# 图表要求（重要！）
每个章节必须评估是否需要图表可视化。

判断标准：
✅ 必须生成图表：
- 有 3 个以上数值对比 → bar/line
- 有多维度能力评估 → radar
- 有占比/分布数据 → pie
- 有时间序列趋势 → line

❌ 不需要图表：
- 纯文字描述性内容
- 数据点少于 3 个
- 数据不适合可视化

如果满足图表生成条件但未输出 chart_requirements，将被视为不完整的分析。
"""
```

**方案 2：后置图表生成**
```python
async def ensure_chart(self, section: dict) -> dict:
    """确保章节有图表"""
    if section.get("chart_requirements"):
        return section
    
    # 分析内容是否适合生成图表
    chart_prompt = f"""
    分析以下内容，判断是否需要图表可视化：
    {section["content"]}
    
    如果需要，输出 chart_requirements，否则输出 null。
    """
    
    response = await self.llm.chat([
        {"role": "system", "content": "你是图表需求分析专家"},
        {"role": "user", "content": chart_prompt}
    ])
    
    if chart_req := self._parse_chart_requirements(response):
        section["chart_requirements"] = chart_req
    
    return section
```

**方案 3：规则引擎补充**
```python
def generate_fallback_chart(self, section_id: str, data: dict) -> ChartConfig | None:
    """根据章节类型生成默认图表"""
    FALLBACK_CHARTS = {
        "overview": {
            "type": "radar",
            "title": "综合能力雷达图",
            "dimensions": ["跑步", "力量", "耐力", "技巧", "配速"]
        },
        "running": {
            "type": "line",
            "title": "跑步段配速趋势",
            "x_axis": ["Run1", "Run2", "Run3", "Run4", "Run5", "Run6", "Run7", "Run8"]
        },
        "stations": {
            "type": "bar",
            "title": "功能站表现对比",
            "x_axis": ["SkiErg", "Sled Push", "Sled Pull", "Burpee", 
                      "Rowing", "Carry", "Lunges", "Wall Balls"]
        },
        "pacing": {
            "type": "line",
            "title": "体能分配曲线"
        }
    }
    
    if template := FALLBACK_CHARTS.get(section_id):
        return self._build_chart_from_template(template, data)
    return None
```

### 2.2 提高内容质量

**方案 1：输出验证**
```python
def validate_section(self, section: dict) -> list[str]:
    """验证章节内容质量"""
    issues = []
    
    # 检查发现数量
    discoveries = section.get("discoveries", [])
    if len(discoveries) < 3:
        issues.append("发现数量不足（至少需要 3 个）")
    
    # 检查结论长度
    conclusion = section.get("conclusion", "")
    if len(conclusion) < 100:
        issues.append("结论过短（至少需要 100 字）")
    
    # 检查数据引用
    for discovery in discoveries:
        if not re.search(r'\d+', discovery.get("evidence", "")):
            issues.append(f"发现缺少数据支撑: {discovery['finding'][:20]}...")
    
    return issues

async def generate_with_validation(self, section_def: dict) -> dict:
    max_attempts = 3
    for attempt in range(max_attempts):
        section = await self.researcher.analyze(section_def)
        issues = self.validate_section(section)
        
        if not issues:
            return section
        
        # 添加反馈重试
        feedback = f"上次输出存在问题：{'; '.join(issues)}。请改进。"
        section = await self.researcher.analyze(section_def, feedback=feedback)
    
    return section  # 返回最后一次结果
```

**方案 2：Few-shot 示例库**
```python
SECTION_EXAMPLES = {
    "overview": {
        "input": "运动员张三，总成绩 01:15:30，组别排名 15/156",
        "output": {
            "discoveries": [
                {
                    "finding": "整体表现位列组别前 10%",
                    "evidence": "排名 15/156，超越 90.4% 的参赛者",
                    "insight": "属于高水平业余选手"
                },
                # ... 更多示例
            ],
            "conclusion": "张三在本次比赛中展现了扎实的综合实力..."
        }
    }
}

def build_prompt_with_examples(self, section_def: dict) -> str:
    example = SECTION_EXAMPLES.get(section_def["id"])
    if example:
        return f"""
        参考示例：
        输入：{example["input"]}
        输出：{json.dumps(example["output"], ensure_ascii=False, indent=2)}
        
        现在请分析：
        {section_def["objective"]}
        """
    return section_def["objective"]
```

### 2.3 降低幻觉

**方案 1：数据锚定**
```python
SYSTEM_PROMPT = """
# 重要约束
1. 所有分析必须基于查询到的数据
2. 不要编造未查询的数据
3. 如果数据不足，明确说明而不是推测
4. 引用数据时使用精确数值

# 正确示例
"运动员在 Run1 段用时 4:30，比组别平均快 15 秒（-5.3%）"

# 错误示例
"运动员跑步能力出色，大约比平均水平快 10-20%"  # 不精确
"根据经验，该成绩属于优秀水平"  # 无数据支撑
"""
```

**方案 2：源数据追踪**
```python
async def analyze_with_sources(self, section_def: dict) -> dict:
    """带数据源追踪的分析"""
    sources = {}
    
    async def tracked_search(function: str, params: dict):
        result = await self.data_executor.execute(function, params)
        source_id = f"{function}_{hash(str(params))}"
        sources[source_id] = {
            "function": function,
            "params": params,
            "result": result
        }
        return result, source_id
    
    # 在 LLM 调用中使用
    section = await self._generate_with_tracked_search(section_def, tracked_search)
    section["sources"] = sources
    
    return section
```

## 3. 可靠性优化

### 3.1 错误处理增强

```python
class ReportGeneratorError(Exception):
    """报告生成错误基类"""
    def __init__(self, message: str, recoverable: bool = True):
        self.message = message
        self.recoverable = recoverable

class LLMTimeoutError(ReportGeneratorError):
    """LLM 超时"""
    pass

class DataNotFoundError(ReportGeneratorError):
    """数据未找到"""
    pass

class ChartGenerationError(ReportGeneratorError):
    """图表生成失败"""
    def __init__(self, message: str):
        super().__init__(message, recoverable=True)

async def generate_with_recovery(self, report_id: str):
    """带恢复机制的生成"""
    try:
        async for event in self._generate(report_id):
            yield event
    except LLMTimeoutError as e:
        if e.recoverable:
            logger.warning(f"LLM timeout, retrying: {e.message}")
            # 从上次进度恢复
            async for event in self._resume_generation(report_id):
                yield event
        else:
            yield {"event": "error", "data": {"message": e.message}}
    except DataNotFoundError as e:
        # 数据缺失不中断，使用降级内容
        logger.warning(f"Data not found: {e.message}")
        yield {"event": "warning", "data": {"message": f"部分数据不可用: {e.message}"}}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        yield {"event": "error", "data": {"message": "生成过程中发生错误"}}
```

### 3.2 重试策略

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class LLMClient:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((RateLimitError, TimeoutError))
    )
    async def chat(self, messages: list, tools: list = None):
        """带重试的 LLM 调用"""
        try:
            return await self._do_chat(messages, tools)
        except RateLimitError:
            logger.warning("Rate limited, will retry")
            raise
        except TimeoutError:
            logger.warning("Timeout, will retry")
            raise
```

### 3.3 状态恢复

```python
class ReportCheckpoint:
    """报告生成检查点"""
    
    async def save(self, report_id: str, state: dict):
        """保存检查点"""
        checkpoint = {
            "report_id": report_id,
            "timestamp": datetime.utcnow().isoformat(),
            "completed_sections": state.get("completed_sections", []),
            "current_section": state.get("current_section"),
            "context": state.get("context"),
        }
        await self.redis.set(f"checkpoint:{report_id}", json.dumps(checkpoint))
    
    async def load(self, report_id: str) -> dict | None:
        """加载检查点"""
        data = await self.redis.get(f"checkpoint:{report_id}")
        return json.loads(data) if data else None
    
    async def clear(self, report_id: str):
        """清除检查点"""
        await self.redis.delete(f"checkpoint:{report_id}")

async def resume_from_checkpoint(self, report_id: str):
    """从检查点恢复生成"""
    checkpoint = await self.checkpoint.load(report_id)
    if not checkpoint:
        raise ValueError("No checkpoint found")
    
    # 跳过已完成的章节
    completed = set(checkpoint["completed_sections"])
    remaining = [s for s in SECTION_DEFINITIONS if s["id"] not in completed]
    
    # 继续生成
    for section_def in remaining:
        section = await self._generate_section(section_def, checkpoint["context"])
        yield {"event": "section_complete", "data": {"section": section}}
        
        # 更新检查点
        checkpoint["completed_sections"].append(section_def["id"])
        await self.checkpoint.save(report_id, checkpoint)
```

## 4. 成本优化

### 4.1 Token 使用优化

**方案 1：上下文压缩**
```python
def compress_context(self, context: dict, max_tokens: int = 2000) -> dict:
    """压缩上下文以减少 token 使用"""
    compressed = {}
    
    # 只保留关键字段
    essential_fields = ["athlete_name", "total_time", "division", "division_rank"]
    compressed["athlete"] = {k: context["athlete"].get(k) for k in essential_fields}
    
    # 分段数据只保留异常值
    segments = context.get("segments", {})
    compressed["segments"] = {
        k: v for k, v in segments.items()
        if abs(v.get("vs_avg_pct", 0)) > 10  # 只保留偏离超过 10% 的
    }
    
    return compressed
```

**方案 2：模型分级**
```python
# 按任务复杂度选择模型
MODEL_TIERS = {
    "simple": "qwen-turbo",      # 简单提取、格式化
    "medium": "qwen-plus",       # 图表生成、简单分析
    "complex": "qwen-max"        # 深度分析、摘要生成
}

def select_model(self, task_type: str) -> str:
    complexity = self._assess_complexity(task_type)
    return MODEL_TIERS.get(complexity, "qwen-plus")
```

**方案 3：缓存相似请求**
```python
import hashlib

class ResponseCache:
    def __init__(self):
        self.cache = {}
    
    def get_key(self, messages: list, tools: list) -> str:
        content = json.dumps({"messages": messages, "tools": tools}, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()
    
    async def get_or_create(self, messages: list, tools: list, create_fn) -> dict:
        key = self.get_key(messages, tools)
        
        if key in self.cache:
            logger.info("Cache hit")
            return self.cache[key]
        
        result = await create_fn()
        self.cache[key] = result
        return result
```

### 4.2 API 调用优化

**批量处理：**
```python
# 避免频繁小请求
async def batch_generate_charts(self, requirements: list[dict]) -> list[ChartConfig]:
    """批量生成图表"""
    prompt = f"""
    请为以下 {len(requirements)} 个图表需求生成 ECharts 配置：
    
    {json.dumps(requirements, ensure_ascii=False)}
    
    返回格式：[{{"id": "...", "option": {{...}}}}, ...]
    """
    
    response = await self.llm.chat([
        {"role": "system", "content": CHART_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ])
    
    return self._parse_charts(response)
```

## 5. 监控和调试

### 5.1 指标收集

```python
from prometheus_client import Counter, Histogram

# 定义指标
report_generation_duration = Histogram(
    'report_generation_duration_seconds',
    'Report generation duration',
    ['status']
)

llm_calls_total = Counter(
    'llm_calls_total',
    'Total LLM API calls',
    ['agent', 'model', 'status']
)

tokens_used_total = Counter(
    'tokens_used_total',
    'Total tokens used',
    ['agent', 'type']  # type: input/output
)

# 使用
async def generate(self, report_id: str):
    start_time = time.time()
    try:
        result = await self._generate(report_id)
        report_generation_duration.labels(status='success').observe(
            time.time() - start_time
        )
        return result
    except Exception as e:
        report_generation_duration.labels(status='error').observe(
            time.time() - start_time
        )
        raise
```

### 5.2 日志结构化

```python
import structlog

logger = structlog.get_logger()

async def generate_section(self, section_def: dict):
    log = logger.bind(
        section_id=section_def["id"],
        report_id=self.report_id
    )
    
    log.info("section_generation_started")
    
    try:
        result = await self._do_generate(section_def)
        log.info(
            "section_generation_completed",
            duration_ms=result["duration_ms"],
            tokens_used=result["tokens_used"]
        )
        return result
    except Exception as e:
        log.error(
            "section_generation_failed",
            error=str(e),
            error_type=type(e).__name__
        )
        raise
```

### 5.3 调试工具

```python
# 保存中间状态用于调试
class DebugStore:
    def __init__(self, enabled: bool = False):
        self.enabled = enabled
        self.data = {}
    
    def save(self, key: str, value: any):
        if self.enabled:
            self.data[key] = {
                "timestamp": datetime.utcnow().isoformat(),
                "value": value
            }
    
    def dump(self, filepath: str):
        if self.enabled:
            with open(filepath, "w") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)

# 使用
debug = DebugStore(enabled=os.getenv("DEBUG_MODE") == "true")

async def generate(self):
    debug.save("context", self.context)
    
    for section in sections:
        debug.save(f"section_{section['id']}_input", section)
        result = await self._generate_section(section)
        debug.save(f"section_{section['id']}_output", result)
    
    debug.dump(f"debug_{self.report_id}.json")
```
