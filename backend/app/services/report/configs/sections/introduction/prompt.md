# Introduction 章节

这是一个静态章节，不需要 LLM 生成内容。

## 数据来源

introduction 章节的内容由 summary 章节的输出填充，主要展示：

1. **ROXSCAN 评分卡片**：综合评分、等级、等级名称
2. **三维能力雷达图**：力量、有氧基础、转换效率

## 前端渲染

前端直接使用 summary 章节的 `roxscan_card` 和 `radar_chart` blocks 进行渲染。
