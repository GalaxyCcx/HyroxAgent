# HYROX 数据字段说明

## 概述

本文档详细说明 HYROX 比赛结果数据中各字段的含义、数据类型及示例值。

---

## 数据表结构

### 1. 比赛列表表 (Race List)

**获取方式:** `client.list_races()`

| 字段名 | 数据类型 | 说明 | 示例值 |
|--------|----------|------|--------|
| season | int64 | 赛季编号 | 7 |
| location | string | 比赛地点 (小写英文) | "amsterdam" |
| file_last_modified | string | 数据最后更新时间 (ISO 8601) | "2026-01-03T17:18:05+00:00" |

---

### 2. 比赛成绩表 (Race Results)

**获取方式:** `client.get_race()` 或 `client.get_season()`

#### 2.1 选手基本信息

| 字段名 | 数据类型 | 说明 | 示例值 | 可能的值 |
|--------|----------|------|--------|----------|
| name | string | 选手姓名 | "Magill, Connor" | 见下方格式说明 |
| nationality | string | 国籍代码 | "IRL" | 见下方枚举表 |
| gender | string | 性别 | "male" | male, female, mixed |
| age_group | string | 年龄组别 | "40-44" | 见下方枚举表 |
| division | string | 比赛组别 | "open" | open, pro, doubles, pro_doubles |

**name 字段格式说明:**

| 组别 | 格式 | 示例 |
|------|------|------|
| 个人组 (open/pro) | `"姓, 名"` | `"Chen, Yuanmin"` |
| 双人组 (doubles) | `"姓名1, 姓名2"` | `"Jack Chen, Rich Lee"` |
| 双人组 (doubles) | `"姓名1 / 姓名2"` | `"Simon Chen / Calvin Chan"` |

#### 2.2 比赛信息

| 字段名 | 数据类型 | 说明 | 示例值 |
|--------|----------|------|--------|
| event_id | string | 比赛唯一标识符 | "JGDMS4JI8B2" |
| event_name | string | 比赛名称 | "2024 Amsterdam" |

#### 2.3 成绩数据 (单位: 分钟)

##### 总成绩

| 字段名 | 数据类型 | 说明 | 示例值 | 备注 |
|--------|----------|------|--------|------|
| total_time | float64 | **总成绩** | 57.233333 | 约 57 分 14 秒 |
| run_time | float64 | 跑步总时间 | 29.983333 | 8 段跑步时间之和 |
| work_time | float64 | 功能站总时间 | 23.95 | 8 个功能站时间之和 |
| roxzone_time | float64 | Roxzone 区域时间 | 3.4 | 功能站之间的过渡时间 |

##### 跑步分段成绩

| 字段名 | 数据类型 | 说明 | 示例值 | 对应区间 |
|--------|----------|------|--------|----------|
| run1_time | float64 | 第 1 段跑步 | 2.816667 | 起点 → SkiErg |
| run2_time | float64 | 第 2 段跑步 | 3.733333 | SkiErg → Sled Push |
| run3_time | float64 | 第 3 段跑步 | 3.8 | Sled Push → Sled Pull |
| run4_time | float64 | 第 4 段跑步 | 3.833333 | Sled Pull → Burpee Broad Jump |
| run5_time | float64 | 第 5 段跑步 | 3.9 | Burpee Broad Jump → Row |
| run6_time | float64 | 第 6 段跑步 | 3.85 | Row → Farmers Carry |
| run7_time | float64 | 第 7 段跑步 | 3.883333 | Farmers Carry → Sandbag Lunges |
| run8_time | float64 | 第 8 段跑步 | 4.233333 | Sandbag Lunges → 终点 |

##### 功能站成绩

| 字段名 | 数据类型 | 说明 | 示例值 | 动作要求 |
|--------|----------|------|--------|----------|
| skiErg_time | float64 | SkiErg 滑雪机 | 3.933333 | 1000m |
| sledPush_time | float64 | Sled Push 推雪橇 | 1.716667 | 50m |
| sledPull_time | float64 | Sled Pull 拉雪橇 | 2.766667 | 50m |
| burpeeBroadJump_time | float64 | Burpee Broad Jump 波比跳远 | 3.05 | 80m |
| rowErg_time | float64 | Row Erg 划船机 | 4.016667 | 1000m |
| farmersCarry_time | float64 | Farmers Carry 农夫行走 | 1.416667 | 200m |
| sandbagLunges_time | float64 | Sandbag Lunges 沙袋弓步 | 3.283333 | 100m |
| wallBalls_time | float64 | Wall Balls 药球上抛 | 3.766667 | 100次 |

---

## 枚举值详解

### gender (性别)

| 值 | 中文 | 说明 |
|------|------|------|
| male | 男子 | 男子个人组 |
| female | 女子 | 女子个人组 |
| mixed | 混合 | 双人混合组 |

### division (比赛组别)

| 值 | 中文 | 说明 |
|------|------|------|
| open | 公开组 | 普通参赛者 |
| pro | 精英组 | 职业/精英选手 |
| doubles | 双人组 | 两人配合完成 |
| pro_doubles | 精英双人组 | 职业双人组 |

### age_group (年龄组别)

| 值 | 年龄范围 | 说明 |
|------|----------|------|
| 16-24 | 16-24岁 | 青年组 |
| 25-29 | 25-29岁 | |
| 30-34 | 30-34岁 | |
| 35-39 | 35-39岁 | |
| 40-44 | 40-44岁 | |
| 45-49 | 45-49岁 | |
| 50-54 | 50-54岁 | |
| 55-59 | 55-59岁 | |
| 60-64 | 60-64岁 | |
| 65-69 | 65-69岁 | |
| 70-74 | 70-74岁 | |
| MU29 | 男子29岁以下 | Men Under 29 |
| WU29 | 女子29岁以下 | Women Under 29 |
| XU29 | 混合29岁以下 | Mixed Under 29 |

### nationality (国籍代码)

使用 ISO 3166-1 Alpha-3 三字母国家代码，常见值:

| 代码 | 国家/地区 |
|------|----------|
| CHN | 中国大陆 |
| HKG | 中国香港 |
| TPE | 中国台湾 |
| MAC | 中国澳门 |
| USA | 美国 |
| GBR | 英国 |
| GER | 德国 |
| FRA | 法国 |
| IRL | 爱尔兰 |
| NED | 荷兰 |
| AUS | 澳大利亚 |
| JPN | 日本 |
| KOR | 韩国 |
| SIN | 新加坡 |
| MAS | 马来西亚 |
| THA | 泰国 |
| POR | 葡萄牙 |
| BEL | 比利时 |
| CAN | 加拿大 |
| NZL | 新西兰 |
| RUS | 俄罗斯 |

**特殊值:**

| 代码 | 说明 |
|------|------|
| HYROX | 未提供国籍信息 |
| "CHN, CHN" | 双人组两人国籍（逗号分隔） |
| "HKG, CHN" | 双人组混合国籍 |

---

## HYROX 比赛流程说明

HYROX 是一项标准化的室内健身竞赛，每场比赛流程相同:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HYROX 比赛流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  起点 ──► Run 1 (1km) ──► SkiErg (1000m)                               │
│                                    │                                    │
│                                    ▼                                    │
│           Run 2 (1km) ──► Sled Push (50m)                              │
│                                    │                                    │
│                                    ▼                                    │
│           Run 3 (1km) ──► Sled Pull (50m)                              │
│                                    │                                    │
│                                    ▼                                    │
│           Run 4 (1km) ──► Burpee Broad Jump (80m)                      │
│                                    │                                    │
│                                    ▼                                    │
│           Run 5 (1km) ──► Row Erg (1000m)                              │
│                                    │                                    │
│                                    ▼                                    │
│           Run 6 (1km) ──► Farmers Carry (200m)                         │
│                                    │                                    │
│                                    ▼                                    │
│           Run 7 (1km) ──► Sandbag Lunges (100m)                        │
│                                    │                                    │
│                                    ▼                                    │
│           Run 8 (1km) ──► Wall Balls (100次) ──► 终点                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

总距离: 8km 跑步 + 8个功能站
```

---

## 数据计算关系

```
total_time ≈ run_time + work_time + roxzone_time

run_time = run1_time + run2_time + ... + run8_time

work_time = skiErg_time + sledPush_time + sledPull_time + 
            burpeeBroadJump_time + rowErg_time + farmersCarry_time + 
            sandbagLunges_time + wallBalls_time
```

---

## 时间格式转换

数据中的时间以**分钟**为单位 (float)，转换示例:

```python
import pandas as pd

def minutes_to_time_str(minutes):
    """将分钟数转换为 MM:SS 格式"""
    if pd.isna(minutes):
        return None
    total_seconds = int(minutes * 60)
    mins = total_seconds // 60
    secs = total_seconds % 60
    return f"{mins:02d}:{secs:02d}"

# 示例
total_time = 57.233333  # 分钟
print(minutes_to_time_str(total_time))  # 输出: "57:14"
```

---

## 数据质量说明

| 情况 | 表现 | 说明 |
|------|------|------|
| 正常完赛 | 所有字段有值 | 选手正常完成比赛 |
| 未完赛/DNF | 部分字段为 NaN | 选手中途退出 |
| 年龄组缺失 | age_group 为 NaN | 未提供年龄信息 |
| 国籍缺失 | nationality 为 "HYROX" | 未提供国籍信息 |
| 双人组姓名 | name 包含两人姓名 | 格式: "Name1, Name2" 或 "Name1 / Name2" |
| 双人组国籍 | nationality 包含两个代码 | 格式: "CHN, CHN" 或 "HKG, CHN" |
| 中文名乱码 | name 包含乱码字符 | 部分中文名显示异常，如 "陈明远" 显示为乱码 |

---

## 示例数据

```json
{
  "name": "Magill, Connor",
  "nationality": "IRL",
  "gender": "male",
  "age_group": "40-44",
  "division": "open",
  "event_id": "JGDMS4JI8B2",
  "event_name": "2024 Amsterdam",
  "total_time": 57.233333,
  "run_time": 29.983333,
  "work_time": 23.95,
  "roxzone_time": 3.4,
  "run1_time": 2.816667,
  "run2_time": 3.733333,
  "run3_time": 3.8,
  "run4_time": 3.833333,
  "run5_time": 3.9,
  "run6_time": 3.85,
  "run7_time": 3.883333,
  "run8_time": 4.233333,
  "skiErg_time": 3.933333,
  "sledPush_time": 1.716667,
  "sledPull_time": 2.766667,
  "burpeeBroadJump_time": 3.05,
  "rowErg_time": 4.016667,
  "farmersCarry_time": 1.416667,
  "sandbagLunges_time": 3.283333,
  "wallBalls_time": 3.766667
}
```

---

## 数据使用建议

1. **性能分析**: 对比 run_time 和 work_time 占比，分析选手强项
2. **分段分析**: 找出最慢的功能站进行针对性训练
3. **趋势分析**: 跨赛季对比同一选手的成绩变化
4. **群体分析**: 按 age_group、gender、nationality 进行统计分析

