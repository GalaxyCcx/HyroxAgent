# 第2章「ZONEØ 引擎深度复盘」PRD 与修改计划

## 一、PRD（产品需求说明）

### 1.1 章节定位

- **章节标签**：第2章  
- **标题**：ZONEØ 引擎深度复盘  
- **副标题**：Deep Dive  
- **目标**：基于心率与配速的解耦分析，解释「体能何时、为何崩盘」；并单独拆解「转换区」行为，给出可执行建议。  
- **数据依赖**：心率数据可选；无心率时走降级模式（仅配速分析 + 转换区显微镜仍可展示）。

### 1.2 用户价值

- 理解「心率和配速什么时候分手」——用双轴图 + 阶段卡片说清稳态期 → 脱钩期 → 崩盘区。  
- 获得一句清晰的 **ZONEØ 结论**（红色警告框），解释崩盘原因（如乳酸堆积、有氧底座不足）。  
- 把「转换区」当成第九个功能站：看到自己 vs Top10% vs 平均的对比、行为分析（进站减速/出站启动）、以及一句可执行的 **建议**（绿色引用框）。

### 1.3 章节结构与 Demo 对照

**说明**：**阶段分析**（每阶段的标题、数据行、结论）、**ZONEØ 结论**（红色警告框的 title + content）、**行为分析**（转换区显微镜内的多条「标题 + 正文」）均为 **LLM 输出**，由模型根据数据生成自然语言与结论，前端仅负责按结构渲染。

| 区块 | Demo 表现（report-demo.html 约 675–762 行） | 数据/交互 |
|------|---------------------------------------------|-----------|
| 章节头 | section-tag「第2章」+ title「ZONEØ 引擎深度复盘」+ subtitle「Deep Dive」 | 来自 sections.json，已配置 |
| **2.1 心率与配速解耦分析** | | |
| 引言引用 | 绿色左边框 `.quote-box`：「我们要看的不是心率多高，而是心率和配速什么时候「分手」。」 | **LLM 输出** `intro_quote` |
| 解耦图 | 双 Y 轴：左轴配速 (s/km) 绿色，右轴心率 (bpm) 红色；Run6–Run8 可标脱钩区域背景 | `decoupling_chart`（或沿用 `hr_pace_chart` 结构 + 图表数据） |
| 图例 | 图下方：红色线「心率 (bpm)」、绿色线「配速 (s/km)」 | 与解耦图同源 |
| 阶段卡片 | 多个 `.stage-box`：标题（📍 阶段一/二）、数据行、**结论行**（✅/⚠️） | **LLM 输出** `phase_analysis[]`（每项含 title、metrics、conclusion 等） |
| ZONEØ 结论 | 红色左边框 `.warning-box`：标题「ZONEØ 结论」+ 正文 | **LLM 输出** `zonex_conclusion`（title + content） |
| **2.2 转换区显微镜** | | |
| 引言引用 | 绿色 `.quote-box`：「这是一个被严重忽视的第九个功能站」 | **LLM 输出** `roxzone_microscope.intro_quote` |
| 对比图 | 横向条形图：你 / Top10% / 平均（Roxzone 总耗时） | `roxzone_microscope.comparison_chart` |
| 对比数据行 | 你的 Roxzone 总耗时、Top10% 平均、全场平均、vs Top10% 差距 | 同上或单独字段 |
| 行为分析 | 卡片「📋 行为分析」内多条：**标题 + 正文**（如进站减速、出站启动） | **LLM 输出** `roxzone_microscope.behavior_analysis[]`（每项 title、content） |
| 建议框 | 绿色 `.quote-box` + 💡：「将 Roxzone 视为比赛的一部分。出站后立即慢跑 (Jog)，禁止步行。」 | **LLM 输出** `roxzone_microscope.suggestion` |

### 1.4 验收标准（高亮）

- 章节标签「第2章」、标题「ZONEØ 引擎深度复盘」、副标题「Deep Dive」正确显示。  
- 2.1：引言引用框、心率-配速解耦图双 Y 轴正确、脱钩区域（Run6–Run8）可高亮、阶段卡片样式与 Demo 一致（📍 标题 + 数据 + ✅/⚠️ 结论）、ZONEØ 结论为红色警告框。  
- 2.2：转换区引言、横向条形图（你/Top10%/平均）、对比数据行、行为分析卡片、建议框（绿色 + 💡）正确展示。  
- 无心率数据时：不展示解耦图与阶段中的心率指标，仅展示配速分析 + 转换区显微镜；或展示降级说明卡片。

---

## 二、修改计划

### 2.1 章节与 Demo 区块对应表

| 区块 | Demo 表现 | 数据/LLM 输出 |
|------|-----------|----------------|
| 章节头 | 第2章 / ZONEØ 引擎深度复盘 / Deep Dive | sections.json |
| 2.1 引言 | 绿色 quote-box 一句 | `intro_quote` |
| 2.1 解耦图 | 双 Y 轴图 + 图例 | `decoupling_chart` 或 `hr_pace_chart` + 序列数据 |
| 2.1 阶段分析 | stage-box × N（标题、数据、**结论**） | **LLM 输出** `phase_analysis[]` |
| 2.1 ZONEØ 结论 | warning-box（标题 + 正文） | **LLM 输出** `zonex_conclusion` |
| 2.2 转换区引言 | quote-box | **LLM 输出** `roxzone_microscope.intro_quote` |
| 2.2 Roxzone 对比图 | 横向条形图 + 对比行 | `roxzone_microscope.comparison_chart` |
| 2.2 行为分析 | 卡片内多条**标题+正文** | **LLM 输出** `roxzone_microscope.behavior_analysis[]` |
| 2.2 建议 | 绿色 quote-box + 💡 | `roxzone_microscope.suggestion` |

### 2.2 数据接口（与后端对齐）

| 数据类型 | 当前状态 | 修改需求 |
|----------|----------|----------|
| `heart_rate_data` | 可选（VL 提取） | 保持；无则降级 |
| `pacing_analysis` / run_splits | 已有 | 解耦图配速轴、阶段配速 |
| `roxzone_comparison` 或 segment 汇总 | 需确认 | 需支持「你 / Top10% / 平均」Roxzone 总耗时；若无则 LLM 从现有分段推算或占位 |

结论：先确认现有 deep_dive `inputs.json` 及数据函数是否已提供 Roxzone 三方对比；若无则 tools 中预留 `roxzone_microscope.comparison_chart` 结构，由 LLM 填占位或从已有分段推导。

### 2.3 后端修改（确认后执行）

| 文件 | 修改要点 |
|------|----------|
| `sections/deep_dive/prompt.md` | 1）要求输出 `intro_quote`（2.1 引言一句）。2）解耦图：明确双轴为配速(s/km)+心率(bpm)，脱钩区域 Run6–Run8。3）**阶段分析**（LLM 输出）：每阶段由 LLM 生成「标题、数据行、结论」且结论带状态（success/warning），禁止仅罗列数据。4）**ZONEØ 结论**（LLM 输出）：要求输出 `zonex_conclusion`（title + content），由 LLM 根据分析归纳。5）要求输出 `roxzone_microscope`：intro_quote、comparison_chart、**行为分析**（LLM 输出 behavior_analysis[]，每项 title + content）、suggestion。6）降级模式：无心率时仅输出配速相关 + 转换区显微镜，并说明数据限制。 |
| `sections/deep_dive/tools.json` | 1）在 function 的 parameters 中增加：`intro_quote`（string）、`decoupling_chart`（含图表序列数据 + decoupling_zone）、`phase_analysis`（数组，**LLM 输出**，每项含 title、icon、metrics、detail、status、conclusion）。2）增加 `zonex_conclusion`（**LLM 输出** title, content）。3）增加 `roxzone_microscope`（intro_quote, comparison_chart, **behavior_analysis[] 为 LLM 输出**，每项 title、content，以及 suggestion）。4）降级时 `decoupling_chart`/心率相关字段可选；保留 `pace_trend_chart` 与 `degraded_analysis`。5）`blocks_mapping` 与前端组件名对齐（见下）。 |
| `sections.json` | 将第2章 `deep_dive` 的 `enabled` 设为 `true`，开启第二章展示。 |

### 2.4 前端组件与渲染

| 组件 | 操作 | 说明 |
|------|------|------|
| QuoteBox | 复用 | 2.1 引言、2.2 转换区引言、2.2 建议（建议框可用同一组件，建议内容前加 💡） |
| DecouplingChart | 新建 | 双 Y 轴：配速 (s/km) 绿、心率 (bpm) 红；支持 decoupling_zone 背景高亮；图例与 Demo 一致 |
| PhaseAnalysisCard | 新建 | 对应 Demo `.stage-box`：标题（可含 icon）、数据行、结论（根据 status 显示 ✅/⚠️） |
| WarningBox | 复用 | ZONEØ 结论（title + content） |
| RoxzoneCompareChart | 新建 | 横向条形图：你 / Top10% / 平均；支持 label + value/seconds |
| ComparisonRow | 可选 | 对比数据行（你的、Top10%、平均、差距）；若数据来自 comparison_chart 可直接用 props 渲染 |
| BehaviorAnalysisCard | 新建 | 卡片标题「📋 行为分析」+ 多条「标题 + 正文」（对应 `.analysis-point` 简化版） |
| SuggestionBox | 新建或复用 | 绿色左边框 + 💡 + 文案；可复用 QuoteBox 并传 `suggestion` 文案与 icon |
| BlockRenderer | 修改 | 注册 DecouplingChart、PhaseAnalysisCard、RoxzoneCompareChart、BehaviorAnalysisCard、SuggestionBox；与 tools 中 blocks_mapping 一致 |
| ReportView | 修改 | 对 `section_id === 'deep_dive'` 的 blocks 增加 subSectionTitles 映射（如 2.1 解耦分析、2.2 转换区显微镜），与 block 顺序或 component 对应 |

### 2.5 Block 顺序与 subSectionTitles 建议

第2章建议 block 顺序（与 LLM 输出一致即可）：

1. QuoteBox（intro_quote）  
2. DecouplingChart  
3. PhaseAnalysisCard 或 PhaseAnalysisList（phase_analysis / phases）  
4. WarningBox（zonex_conclusion）  
5. 2.2 小标题（转换区显微镜）  
6. QuoteBox（roxzone_microscope.intro_quote）  
7. RoxzoneCompareChart + 对比数据  
8. BehaviorAnalysisCard  
9. SuggestionBox 或 QuoteBox（suggestion）

ReportView 中可为 `deep_dive` 配置 subSectionTitles，例如：

- DecouplingChart 或第一张图块前：「💓 2.1 心率与配速解耦分析」
- RoxzoneCompareChart 或行为分析前：「⚡ 2.2 转换区显微镜」

（具体以 block.component 或 block 顺序为准，与后端产出 blocks 顺序一致。）

### 2.6 sections.json

- **修改** `backend/app/services/report/configs/sections.json`：将第2章 `deep_dive` 的 `enabled` 设为 `true`，开启第二章展示。

---

## 三、执行顺序（与计划一致）

1. **列出修改内容**：本文档即为第2章修改内容（数据/LLM/前端）清单。  
2. **等你确认**：你确认 PRD 与修改计划无异议后，再进入开发。  
3. **开发实现**：按确认方案改后端（prompt.md + tools.json）与前端（新组件 + BlockRenderer + ReportView），并修改 sections.json 开启第2章（`deep_dive.enabled: true`）。  
4. **重启与验收**：重启前后端，按本文验收标准验收；通过后进入第3章。

---

## 四、参考

- Demo 结构：`frontend/font/report-demo.html` 第2章约 675–762 行。  
- 原计划 Phase 3：`报告模块重构计划_bbedfdd9.plan.md` 第六节「Phase 3：第2章 - ZONEØ 引擎深度复盘」。  
- 当前章节配置：`backend/app/services/report/configs/sections.json`。  
- 当前 deep_dive 配置：`backend/app/services/report/configs/sections/deep_dive/`（prompt.md、tools.json、inputs.json）。
