# 报告生成系统架构设计

## 1. 整体架构

### 1.1 系统分层

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│                   (report.py - FastAPI)                          │
├─────────────────────────────────────────────────────────────────┤
│                     Service Layer                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  ReportGenerator                          │   │
│  │              (流程编排 + 状态管理)                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ResearcherAgent │ ChartAgent │ SummaryAgent              │   │
│  │     (研究)        │   (图表)    │   (摘要)                  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  SectionProcessor │ DataExecutor │ ContextBuilder         │   │
│  │     (章节处理)     │  (数据执行)   │  (上下文构建)           │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     LLM Layer                                    │
│              (client.py - DashScope API)                         │
├─────────────────────────────────────────────────────────────────┤
│                     Data Layer                                   │
│              (SQLAlchemy + PostgreSQL)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
用户请求
    │
    ▼
┌───────────────────┐
│   创建报告任务     │  POST /api/v1/reports/create
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  保存 pending 状态  │  ProReport 表
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   启动生成任务     │  asyncio.create_task
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────────────────────────────┐
│              ReportGenerator.generate()            │
│  ┌─────────────────────────────────────────────┐  │
│  │  1. 加载运动员数据                            │  │
│  │  2. 构建上下文 (ContextBuilder)              │  │
│  │  3. 遍历章节定义                             │  │
│  │     ├─ ResearcherAgent 分析                  │  │
│  │     └─ SectionProcessor 处理                 │  │
│  │        └─ ChartAgent 生成图表                │  │
│  │  4. SummaryAgent 生成摘要                    │  │
│  │  5. 保存报告到数据库                         │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
          │
          ▼
    SSE 推送进度
    (EventSourceResponse)
```

## 2. 核心组件详解

### 2.1 ReportGenerator（流程编排器）

**职责：**
- 协调各 Agent 执行
- 管理生成进度（0-100%）
- 处理错误和降级
- 更新数据库状态

**关键方法：**
```python
class ReportGenerator:
    async def generate(self, report_id: str) -> AsyncGenerator:
        """主生成流程"""
        # 1. 初始化
        yield {"event": "progress", "data": {"progress": 5}}
        
        # 2. 加载数据
        athlete_data = await self._load_athlete_data()
        yield {"event": "progress", "data": {"progress": 10}}
        
        # 3. 生成章节
        for i, section_def in enumerate(SECTION_DEFINITIONS):
            section = await self._generate_section(section_def)
            progress = 15 + (i * 12)  # 15%, 27%, 39%, 51%, 63%
            yield {"event": "progress", "data": {"progress": progress}}
        
        # 4. 生成摘要
        summary = await self._generate_summary()
        yield {"event": "progress", "data": {"progress": 85}}
        
        # 5. 保存报告
        await self._save_report()
        yield {"event": "complete", "data": {"report_id": report_id}}
```

**状态机：**
```
pending ──▶ generating ──▶ completed
    │           │
    │           ▼
    └────────▶ error
```

### 2.2 ResearcherAgent（研究 Agent）

**职责：**
- 使用 LLM + Function Calling 分析数据
- 生成章节内容（discoveries + conclusion）
- 决定是否需要图表

**Function Calling 工具：**
```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "Search",
            "description": "查询数据，支持多种数据函数",
            "parameters": {
                "type": "object",
                "properties": {
                    "function": {"type": "string", "enum": [...]},
                    "params": {"type": "object"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "Section",
            "description": "输出章节分析结果",
            "parameters": {
                "type": "object",
                "properties": {
                    "discoveries": {"type": "array"},
                    "conclusion": {"type": "string"},
                    "chart_requirements": {"type": "object"}  # 可选
                }
            }
        }
    }
]
```

**执行循环：**
```python
async def analyze(self, section_def: dict, context: dict):
    max_iterations = 10
    for i in range(max_iterations):
        response = await self.llm.chat(messages, tools=TOOLS)
        
        if response.tool_calls:
            for tool_call in response.tool_calls:
                if tool_call.name == "Search":
                    result = await data_executor.execute(tool_call.args)
                    messages.append({"role": "tool", "content": result})
                elif tool_call.name == "Section":
                    return tool_call.args  # 完成分析
        else:
            # 无工具调用，可能已完成或需要提示
            break
    
    return self._fallback_section()  # 降级处理
```

### 2.3 ChartAgent（图表 Agent）

**职责：**
- 根据数据和需求生成 ECharts 配置
- 支持 bar、line、radar、pie 四种类型

**输入：**
```python
{
    "chart_type": "radar",
    "title": "能力雷达图",
    "dimensions": ["速度", "耐力", "力量", "技巧"],
    "data": [
        {"name": "运动员A", "values": [85, 90, 78, 82]},
        {"name": "组别平均", "values": [75, 80, 75, 80]}
    ]
}
```

**输出：**
```python
{
    "id": "chart_uuid",
    "type": "radar",
    "title": "能力雷达图",
    "option": {
        "radar": {"indicator": [...]},
        "series": [{...}]
    }
}
```

### 2.4 SectionProcessor（章节处理器）

**职责：**
- 处理 ResearcherAgent 的输出
- 调用 ChartAgent 生成图表
- 组装最终章节内容
- 图表去重（基于数据指纹）

**处理流程：**
```python
async def process(self, raw_section: dict) -> dict:
    # 1. 提取发现和结论
    discoveries = raw_section.get("discoveries", [])
    conclusion = raw_section.get("conclusion", "")
    
    # 2. 生成图表（如果有需求）
    charts = []
    if chart_requirements := raw_section.get("chart_requirements"):
        chart = await self.chart_agent.generate(chart_requirements)
        if chart:
            charts.append(chart)
    
    # 3. 组装 Markdown 内容
    content = self._build_markdown(discoveries, conclusion, charts)
    
    return {
        "id": section_def["id"],
        "title": section_def["title"],
        "content": content,
        "charts": charts
    }
```

### 2.5 SummaryAgent（摘要 Agent）

**职责：**
- 生成报告引言（Introduction）
- 生成报告总结（Conclusion）

**并行生成：**
```python
async def generate_summary(self, sections: list) -> tuple:
    # 并行生成引言和结论
    intro_task = asyncio.create_task(self._generate_intro(sections))
    conclusion_task = asyncio.create_task(self._generate_conclusion(sections))
    
    introduction, conclusion = await asyncio.gather(intro_task, conclusion_task)
    return introduction, conclusion
```

### 2.6 DataExecutor（数据执行器）

**职责：**
- 执行数据查询函数
- 参数验证和错误处理
- 结果格式化

**支持的函数：**
| 函数名 | 描述 | 参数 |
|--------|------|------|
| GetAthleteResult | 获取单场成绩 | season, location, athlete_name |
| GetDivisionStats | 获取组别统计 | season, location, division |
| GetDivisionRanking | 获取排行榜 | season, location, division, limit |
| GetSegmentComparison | 分段对比 | season, location, athlete_name |
| GetAthleteHistory | 历史记录 | athlete_name, limit |
| GetPacingAnalysis | 配速分析 | season, location, athlete_name |
| GetStationDeepAnalysis | 功能站分析 | season, location, athlete_name |

## 3. 扩展指南

### 3.1 添加新 Agent

1. 创建 Agent 类：
```python
# backend/app/services/report/new_agent.py
class NewAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
    
    async def process(self, input_data: dict) -> dict:
        # 实现 Agent 逻辑
        pass
```

2. 在 ReportGenerator 中集成：
```python
# report_generator.py
self.new_agent = NewAgent(self.llm_client)

# 在 generate() 中调用
result = await self.new_agent.process(data)
```

### 3.2 添加新章节

1. 在 `section_definitions.py` 添加定义
2. 更新进度节点（如果需要）
3. 测试章节生成

### 3.3 添加新数据函数

1. 在 `data_functions.py` 添加 schema
2. 在 `data_executor.py` 实现执行逻辑
3. 更新 ResearcherAgent 的工具描述

## 4. 性能考量

### 4.1 并行化机会

- 章节生成：目前串行，可改为并行（注意依赖关系）
- 引言/结论：已并行化
- 图表生成：在章节处理内串行

### 4.2 缓存策略

- 数据查询结果：可添加 Redis 缓存
- LLM 响应：相同输入可缓存（注意 temperature）
- 图表配置：相同数据可复用

### 4.3 资源限制

- LLM 并发：注意 API 限流
- 数据库连接：使用连接池
- 内存：大报告注意流式处理
