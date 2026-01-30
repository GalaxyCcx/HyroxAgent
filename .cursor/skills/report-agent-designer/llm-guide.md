# LLM 集成指南

## 1. LLM 客户端架构

### 1.1 配置管理

**配置文件位置：** `backend/data/llm_config.json`

```json
{
  "default_provider": "dashscope",
  "providers": {
    "dashscope": {
      "api_key": "sk-xxx",
      "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "default_model": "qwen-max-latest"
    }
  },
  "agents": {
    "center": {
      "model": "qwen-max-latest",
      "temperature": 0.7,
      "max_tokens": 8192,
      "timeout": 120
    },
    "research": {
      "model": "qwen-max-latest",
      "temperature": 0.5,
      "max_tokens": 8192,
      "timeout": 180
    },
    "summary": {
      "model": "qwen-max-latest",
      "temperature": 0.7,
      "max_tokens": 8192,
      "timeout": 120
    },
    "chart": {
      "model": "qwen-max-latest",
      "temperature": 0.3,
      "max_tokens": 2048,
      "timeout": 60
    }
  }
}
```

### 1.2 客户端封装

**文件：** `backend/app/llm/client.py`

```python
class LLMClient:
    def __init__(self, agent_type: str = "research"):
        self.config = LLMConfigManager().get_agent_config(agent_type)
        self.client = OpenAI(
            api_key=self.config["api_key"],
            base_url=self.config["base_url"]
        )
    
    async def chat(
        self,
        messages: list,
        tools: list = None,
        stream: bool = False
    ) -> ChatResponse:
        """发送聊天请求"""
        response = await self.client.chat.completions.create(
            model=self.config["model"],
            messages=messages,
            tools=tools,
            temperature=self.config["temperature"],
            max_tokens=self.config["max_tokens"],
            stream=stream
        )
        return response
```

## 2. 提示词设计原则

### 2.1 系统提示词结构

```markdown
# 角色定义
你是 [Agent 角色]，专门负责 [职责描述]。

# 能力边界
你可以：
- 能力 1
- 能力 2

你不能：
- 限制 1
- 限制 2

# 输出格式
你必须按以下格式输出：
[格式说明]

# 约束条件
- 约束 1
- 约束 2
```

### 2.2 ResearcherAgent 提示词

```python
SYSTEM_PROMPT = """
# 角色
你是 HYROX 赛事数据分析专家，负责分析运动员比赛表现并生成专业分析报告。

# 工具说明
你有两个工具可用：

1. Search - 查询数据
   - 调用格式：Search(function="函数名", params={参数})
   - 可用函数：GetAthleteResult, GetDivisionStats, GetDivisionRanking, 
              GetSegmentComparison, GetAthleteHistory, GetPacingAnalysis,
              GetStationDeepAnalysis

2. Section - 输出分析结果
   - 当你完成分析后，必须调用此工具输出结果
   - 格式：Section(discoveries=[...], conclusion="...", chart_requirements={...})

# 分析流程
1. 根据章节目标，使用 Search 工具获取相关数据
2. 分析数据，提取关键发现
3. 调用 Section 工具输出结果

# 输出要求
- discoveries: 3-5 个关键发现，每个发现包含数据支撑
- conclusion: 1-2 段总结性结论
- chart_requirements: 如果数据适合可视化，提供图表需求（可选）

# 语言
使用中文输出，专业且易懂。
"""
```

### 2.3 ChartAgent 提示词

```python
SYSTEM_PROMPT = """
# 角色
你是数据可视化专家，负责生成 ECharts 图表配置。

# 支持的图表类型
- bar: 柱状图，适合比较不同类别的数值
- line: 折线图，适合展示趋势变化
- radar: 雷达图，适合多维度能力对比
- pie: 饼图，适合展示占比分布

# 输出格式
必须输出有效的 JSON，包含：
{
  "type": "图表类型",
  "title": "图表标题",
  "option": {
    // ECharts option 配置
  }
}

# 样式要求
- 使用深色主题配色
- 主色调：#00d4ff
- 次要色：#ff6b6b
- 强调色：#00ff88
- 背景透明

# 约束
- 不要添加 ECharts 不支持的属性
- 数据量大时考虑省略部分数据
- 标题简洁明了
"""
```

### 2.4 SummaryAgent 提示词

```python
INTRO_PROMPT = """
# 角色
你是报告编辑，负责撰写分析报告的引言部分。

# 输入
你将收到运动员信息和各章节的分析内容。

# 输出要求
- 2-3 段引言
- 简要介绍运动员基本信息
- 概述本次比赛的整体表现
- 预告报告将分析的内容

# 语言风格
- 专业但不生硬
- 客观陈述，不过度夸张
- 中文输出
"""

CONCLUSION_PROMPT = """
# 角色
你是报告编辑，负责撰写分析报告的总结部分。

# 输入
你将收到各章节的分析内容。

# 输出要求
- 2-3 段总结
- 综合各章节的关键发现
- 给出整体评价
- 提供未来提升建议

# 语言风格
- 专业但不生硬
- 客观陈述，不过度夸张
- 中文输出
"""
```

## 3. Function Calling 设计

### 3.1 工具定义最佳实践

```python
# 好的工具定义
{
    "type": "function",
    "function": {
        "name": "Search",
        "description": "查询运动员比赛数据。支持多种查询类型。",
        "parameters": {
            "type": "object",
            "properties": {
                "function": {
                    "type": "string",
                    "description": "查询函数名",
                    "enum": [
                        "GetAthleteResult",
                        "GetDivisionStats",
                        "GetDivisionRanking"
                    ]
                },
                "params": {
                    "type": "object",
                    "description": "查询参数，根据函数不同而不同"
                }
            },
            "required": ["function", "params"]
        }
    }
}
```

**注意事项：**
- description 要清晰说明工具用途
- enum 限制可选值，减少错误
- required 明确必填参数
- 参数命名一致，避免歧义

### 3.2 工具调用处理

```python
async def handle_tool_calls(self, response):
    """处理工具调用"""
    results = []
    for tool_call in response.tool_calls:
        try:
            # 解析参数
            args = json.loads(tool_call.function.arguments)
            
            # 执行工具
            if tool_call.function.name == "Search":
                result = await self.data_executor.execute(
                    args["function"],
                    args["params"]
                )
            elif tool_call.function.name == "Section":
                return {"type": "section", "data": args}
            
            results.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "content": json.dumps(result, ensure_ascii=False)
            })
        except Exception as e:
            results.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "content": json.dumps({"error": str(e)})
            })
    
    return {"type": "tool_results", "data": results}
```

## 4. 提示词优化技巧

### 4.1 提高输出质量

**技巧 1：Few-shot 示例**
```python
PROMPT = """
# 示例

输入数据：
{运动员A 跑步段1: 4:30, 段2: 4:45, 段3: 5:10}

分析输出：
{
  "discoveries": [
    {
      "finding": "配速呈递减趋势",
      "evidence": "从4:30递减到5:10，降幅13%",
      "insight": "后半程体能下降明显"
    }
  ],
  "conclusion": "运动员A在跑步段表现出明显的体能递减特征..."
}

现在分析以下数据：
{实际数据}
"""
```

**技巧 2：结构化思考**
```python
PROMPT = """
请按以下步骤分析：

Step 1: 数据概览
- 列出关键指标
- 标记异常值

Step 2: 对比分析
- 与组别平均对比
- 与历史成绩对比

Step 3: 洞察提取
- 优势项目
- 待提升项目

Step 4: 输出结论
"""
```

**技巧 3：约束输出长度**
```python
PROMPT = """
# 输出约束
- discoveries: 恰好 3-5 个，每个不超过 100 字
- conclusion: 不超过 200 字
- 总输出不超过 1000 字
"""
```

### 4.2 提高可靠性

**技巧 1：参数校验提示**
```python
PROMPT = """
# 重要约束
在调用 Search 工具前，确认：
1. function 是支持的函数之一
2. params 包含所有必需参数
3. 参数值格式正确（如 season 是数字）

错误的调用会导致分析失败。
"""
```

**技巧 2：降级处理提示**
```python
PROMPT = """
# 数据缺失处理
如果查询返回空数据或错误：
1. 尝试其他相关查询
2. 如果仍无数据，在分析中说明
3. 不要编造数据
"""
```

### 4.3 提高图表生成率

**问题：** LLM 不一定每次输出 chart_requirements

**解决方案：**
```python
PROMPT = """
# 图表需求（重要）
每个章节应尽可能包含图表可视化。评估标准：

必须生成图表的情况：
- 有多维度对比数据 → radar
- 有时间序列数据 → line
- 有类别比较数据 → bar
- 有占比分布数据 → pie

chart_requirements 格式：
{
  "chart_type": "radar|line|bar|pie",
  "title": "图表标题",
  "dimensions": ["维度1", "维度2"],
  "data": [
    {"name": "系列1", "values": [数值...]}
  ]
}

除非数据确实不适合可视化，否则必须提供 chart_requirements。
"""
```

## 5. 调试和监控

### 5.1 日志记录

```python
import logging

logger = logging.getLogger("llm")

class LLMClient:
    async def chat(self, messages, tools=None):
        # 记录请求
        logger.info(f"LLM Request: {len(messages)} messages")
        logger.debug(f"Messages: {json.dumps(messages, ensure_ascii=False)}")
        
        start_time = time.time()
        response = await self.client.chat.completions.create(...)
        elapsed = time.time() - start_time
        
        # 记录响应
        logger.info(f"LLM Response: {elapsed:.2f}s, {response.usage.total_tokens} tokens")
        
        return response
```

### 5.2 Token 使用监控

```python
class TokenTracker:
    def __init__(self):
        self.total_input = 0
        self.total_output = 0
    
    def track(self, usage):
        self.total_input += usage.prompt_tokens
        self.total_output += usage.completion_tokens
    
    def report(self):
        return {
            "input_tokens": self.total_input,
            "output_tokens": self.total_output,
            "total_tokens": self.total_input + self.total_output,
            "estimated_cost": self._calculate_cost()
        }
```

### 5.3 错误处理

```python
class LLMClient:
    async def chat_with_retry(self, messages, tools=None, max_retries=3):
        for attempt in range(max_retries):
            try:
                return await self.chat(messages, tools)
            except RateLimitError:
                wait_time = 2 ** attempt
                logger.warning(f"Rate limited, waiting {wait_time}s")
                await asyncio.sleep(wait_time)
            except APIError as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"API error: {e}, retrying...")
        
        raise MaxRetriesExceeded()
```

## 6. 模型选择建议

### 6.1 按任务选择

| 任务 | 推荐模型 | 原因 |
|------|---------|------|
| 章节分析 | qwen-max | 需要复杂推理 |
| 图表生成 | qwen-plus | 结构化输出，较低成本 |
| 摘要生成 | qwen-max | 需要综合理解 |
| 简单提取 | qwen-turbo | 快速响应 |

### 6.2 Temperature 调优

| 任务类型 | 建议 Temperature |
|----------|------------------|
| 数据分析 | 0.3-0.5 |
| 文本生成 | 0.6-0.8 |
| 结构化输出 | 0.2-0.4 |
| 创意内容 | 0.8-1.0 |
