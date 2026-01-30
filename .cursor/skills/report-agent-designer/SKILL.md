---
name: report-agent-designer
description: 设计、开发和优化 HYROX 报告生成 Multi-Agent 系统。用于报告 Agent 架构设计、LLM 提示词优化、数据函数开发、章节定义、图表生成、前端渲染等任务。当用户提到报告生成、Report Agent、分析报告、LLM Agent 或相关功能时使用。
---

# HYROX 报告生成 Agent 设计器

## 快速概览

本系统采用 **Multi-Agent 架构**，通过 LLM Function Calling 实现数据驱动的报告生成。

```
┌─────────────────────────────────────────────────────────┐
│                    ReportGenerator                       │
│                    (流程编排中心)                         │
├─────────────────────────────────────────────────────────┤
│   ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│   │ Researcher  │    │   Chart     │    │  Summary   │  │
│   │   Agent     │───▶│   Agent     │    │   Agent    │  │
│   │ (章节分析)   │    │ (图表生成)   │    │ (摘要生成) │  │
│   └──────┬──────┘    └─────────────┘    └────────────┘  │
│          ▼                                               │
│   ┌─────────────┐    ┌─────────────┐                    │
│   │    Data     │    │  Section    │                    │
│   │  Executor   │◀───│  Processor  │                    │
│   │ (数据查询)   │    │ (章节处理)   │                    │
│   └─────────────┘    └─────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 核心文件位置

| 组件 | 路径 | 职责 |
|------|------|------|
| ReportGenerator | `backend/app/services/report/report_generator.py` | 流程编排 |
| ResearcherAgent | `backend/app/services/report/researcher_agent.py` | 章节分析 |
| ChartAgent | `backend/app/services/report/chart_agent.py` | 图表生成 |
| SummaryAgent | `backend/app/services/report/summary_agent.py` | 摘要生成 |
| SectionProcessor | `backend/app/services/report/section_processor.py` | 章节处理 |
| DataExecutor | `backend/app/services/report/data_executor.py` | 数据执行 |
| API 路由 | `backend/app/api/v1/report.py` | HTTP 接口 |
| 前端渲染 | `frontend/src/screens/LiveTab.tsx` | 报告展示 |
| 图表组件 | `frontend/src/components/ReportChart.tsx` | ECharts |

## 开发工作流

### 任务 1：修改/添加章节定义

```bash
# 1. 编辑章节定义
编辑: backend/app/services/report/section_definitions.py

# 2. 更新 ResearcherAgent 提示词（如需要）
编辑: backend/app/services/report/researcher_agent.py

# 3. 测试章节生成
python scripts/test_section.py --section <section_id>
```

**章节定义模板：**
```python
{
    "id": "section_id",
    "title": "章节标题",
    "objective": "分析目标描述",
    "data_hints": ["hint1", "hint2"],  # 数据获取提示
    "output_guidelines": "输出格式指南"
}
```

### 任务 2：添加新数据函数

```bash
# 1. 定义函数 schema
编辑: backend/app/services/report/data_functions.py

# 2. 实现执行逻辑
编辑: backend/app/services/report/data_executor.py

# 3. 测试数据函数
python scripts/test_data_function.py --function <function_name>
```

**数据函数模板：**
```python
# data_functions.py 添加
{
    "type": "function",
    "function": {
        "name": "GetNewData",
        "description": "获取某类数据的描述",
        "parameters": {
            "type": "object",
            "properties": {
                "param1": {"type": "string", "description": "参数描述"}
            },
            "required": ["param1"]
        }
    }
}

# data_executor.py 添加执行逻辑
async def _execute_get_new_data(self, params: dict) -> dict:
    # 实现数据查询逻辑
    pass
```

### 任务 3：优化 LLM 提示词

**关键原则：**
1. **明确角色定位**：开头定义 Agent 身份
2. **结构化输出**：指定 JSON/Markdown 格式
3. **Few-shot 示例**：提供输入输出示例
4. **约束边界**：明确禁止和限制

**提示词调试流程：**
```bash
# 1. 查看当前提示词
python scripts/debug_prompt.py --agent <agent_name>

# 2. 测试提示词效果
python scripts/test_prompt.py --agent <agent_name> --input "测试输入"

# 3. 分析 token 使用
python scripts/analyze_tokens.py --agent <agent_name>
```

### 任务 4：图表优化

**支持的图表类型：**
- `bar`: 柱状图
- `line`: 折线图
- `radar`: 雷达图
- `pie`: 饼图

**图表生成流程：**
1. ResearcherAgent 输出 `chart_requirements`
2. SectionProcessor 调用 ChartAgent
3. ChartAgent 返回 ECharts 配置
4. 前端 ReportChart 渲染

**图表调试：**
```bash
python scripts/test_chart.py --type radar --data '{"dimensions":["速度","耐力","力量"]}'
```

### 任务 5：前端渲染优化

**关键组件：**
- `LiveTab.tsx`: 报告主视图、SSE 进度订阅
- `ReportChart.tsx`: ECharts 渲染、主题配置

**样式配置（深色科技风）：**
```typescript
// ReportChart.tsx 主题色
const COLORS = {
  primary: '#00d4ff',    // 主色调
  secondary: '#ff6b6b',  // 次要色
  accent: '#00ff88',     // 强调色
  background: 'rgba(13, 17, 23, 0.95)'
}
```

## 常见问题解决

### 问题：图表生成率低
**原因**：LLM 不一定每次输出 chart_requirements
**解决**：
1. 在 ResearcherAgent 提示词中强调图表需求
2. 添加 fallback 图表逻辑
3. 参考 [optimization.md](optimization.md) 中的提示词技巧

### 问题：报告生成超时
**原因**：LLM 响应慢或数据查询慢
**解决**：
1. 优化数据查询（添加索引、缓存）
2. 调整 LLM 超时配置
3. 考虑并行生成章节

### 问题：内容质量不稳定
**原因**：温度参数过高或提示词不够明确
**解决**：
1. 降低 temperature（推荐 0.3-0.5）
2. 增加 few-shot 示例
3. 添加输出格式验证

## 详细参考文档

- **架构设计**：[architecture.md](architecture.md)
- **LLM 集成**：[llm-guide.md](llm-guide.md)
- **数据层设计**：[data-functions.md](data-functions.md)
- **前端组件**：[frontend-guide.md](frontend-guide.md)
- **优化策略**：[optimization.md](optimization.md)
- **PRD 文档**：`docs/prd/v8.0-pro-analysis-report.md`
- **API 文档**：`docs/api/v8.0-report-api.md`

## 质量检查清单

开发完成后，确认以下项目：

- [ ] 章节定义完整（id, title, objective, data_hints）
- [ ] 数据函数有错误处理
- [ ] 提示词包含角色定义和输出格式
- [ ] 图表配置符合 ECharts 规范
- [ ] SSE 进度节点更新正确
- [ ] 前端正确处理 loading/error 状态
- [ ] 单元测试覆盖新功能
