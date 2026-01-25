# PRD: 赛事成绩排行榜功能

**文档版本**: v1.1  
**系统版本**: v5.1  
**日期**: 2026-01-22  
**作者**: HyroxAgent Team  
**状态**: ✅ 已完成

---

## 版本变更记录

| 文档版本 | 系统版本 | 日期 | 变更内容 |
|---------|---------|------|---------|
| v1.0 | v5.0 | 2026-01-22 | 初始设计 |
| v1.1 | v5.1 | 2026-01-22 | **修复筛选逻辑**: 分离一级标签（单人赛/双人赛）和二级标签（组别筛选），解决单人赛下显示双人赛数据的问题 |

---

## 1. 功能概述

### 1.1 背景
当前首页"近期赛事"卡片无法点击。需要实现点击后跳转到该场比赛的成绩排行榜页面，展示所有参赛选手的成绩排名。

### 1.2 目标
- 实现近期赛事卡片的点击交互
- 新增赛事排行榜页面，展示该场比赛的所有选手成绩
- 支持按赛事类型（单人/双人）和组别（Open/Pro）筛选

## 2. 功能需求

### 2.1 用户流程

```
首页 (近期赛事卡片)
    ↓ 点击卡片
赛事排行榜页面
    ↓ 点击某位选手
比赛总结页面 (已有)
    ↓ 
快速分析页面 (已有)
```

### 2.2 赛事排行榜页面

#### 页面头部
- 返回按钮
- 赛事名称 (如 "HYROX Hong Kong 2025 - 成绩列表")
- 搜索图标

#### 筛选栏 (v1.1 重构)

采用**两级筛选架构**，解决单人/双人赛数据混淆问题：

**一级标签 - 赛事类型** (`raceTypeFilter: 'single' | 'doubles'`)
| 标签 | 说明 | 对应 division |
|------|------|--------------|
| 单人赛 | 个人参赛 | `open`, `pro` |
| 双人赛 | 双人组队 | `doubles`, `pro_doubles` |

**二级标签 - 组别筛选** (`divisionFilter: 'all' | 'open' | 'pro'`)
| 一级标签 | 二级标签显示 | API division 参数 |
|---------|-------------|------------------|
| 单人赛 + 全部 | 全部 | 不传（前端过滤掉 doubles） |
| 单人赛 + Open | Open | `open` |
| 单人赛 + Pro | Pro | `pro` |
| 双人赛 + 全部 | 全部 | 不传（前端只保留 doubles） |
| 双人赛 + Doubles | Doubles | `doubles` |
| 双人赛 + Pro Doubles | Pro Doubles | `pro_doubles` |

**性别筛选** (`genderFilter: 'all' | 'male' | 'female'`)
- 男子 / 女子 / 全部

**筛选逻辑说明**：
1. 切换一级标签时，自动重置二级标签为"全部"
2. 当二级标签为"全部"时，API 不传 division 参数，由前端根据一级标签过滤数据
3. 前端过滤规则：
   - 单人赛：排除 `division.includes('doubles')` 的数据
   - 双人赛：只保留 `division.includes('doubles')` 的数据

#### 排行榜列表
每个条目展示：
- **排名**：#1, #2, #3... (前3名用金色，其余灰色)
- **姓名**：选手姓名
- **年龄组**：如 "25-29"
- **完赛时间**：格式 HH:MM:SS (如 01:04:12)
- **查看按钮**：点击进入比赛总结页面

#### 特殊样式
- 第1名：左侧绿色边框 + 渐变背景
- 其他名次：普通卡片样式

### 2.3 数据字段映射

| 前端字段 | 后端字段 | 说明 |
|----------|----------|------|
| rank | 计算字段 | 按 total_time 升序排列的序号 |
| name | name | 选手姓名 |
| ageGroup | age_group | 年龄组 |
| time | total_time | 格式化为 HH:MM:SS |
| event_name | event_name | 比赛名称 |
| division | division | 组别筛选 |
| gender | gender | 性别筛选 |

### 2.4 暂不实现的功能
- **当前用户高亮 (isMe)**：需要用户登录系统，后续版本实现
- **参赛号显示**：数据源无此字段

## 3. API 设计

### 3.1 获取赛事排行榜

```
GET /api/v1/races/{season}/{location}/leaderboard
```

**路径参数：**
- `season`: 赛季 (如 8)
- `location`: 比赛地点 (如 hong-kong)

**查询参数：**
- `division`: 组别筛选 (open/pro/doubles/pro_doubles)，可选
- `gender`: 性别筛选 (male/female/mixed)，可选
- `limit`: 返回数量，默认 50
- `offset`: 偏移量，默认 0

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "race": {
      "season": 8,
      "location": "hong-kong",
      "event_name": "2025 Hong Kong",
      "total_participants": 3500
    },
    "leaderboard": [
      {
        "rank": 1,
        "name": "张三",
        "age_group": "25-29",
        "total_time": "01:04:12",
        "total_time_minutes": 64.2,
        "gender": "male",
        "division": "open",
        "nationality": "CHN"
      }
    ],
    "total": 3500,
    "has_more": true
  }
}
```

## 4. 前端改动

### 4.1 首页近期赛事卡片
- 添加点击事件
- 点击后携带 `season` 和 `location` 参数跳转到排行榜页面
- 默认显示单人赛数据

### 4.2 排行榜页面状态管理 (v1.1 更新)

```typescript
// 赛事选择
const [selectedRace, setSelectedRace] = useState<{ season: number; location: string } | null>(null);

// 筛选状态 - 分离一级和二级标签
type RaceTypeFilter = 'single' | 'doubles';  // 一级标签
type DivisionFilter = 'all' | 'open' | 'pro';  // 二级标签
type GenderFilter = 'all' | 'male' | 'female';

const [raceTypeFilter, setRaceTypeFilter] = useState<RaceTypeFilter>('single');
const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>('all');
const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
```

### 4.3 数据加载与过滤逻辑

```typescript
const loadLeaderboard = async (season, location, division, gender, raceType) => {
  // 1. 构建 API 筛选参数
  const filters = { limit: 100 };
  if (raceType === 'doubles' && division !== 'all') {
    filters.division = division === 'pro' ? 'pro_doubles' : 'doubles';
  } else if (division !== 'all') {
    filters.division = division;
  }
  
  // 2. 调用 API
  const response = await racesApi.getLeaderboard(season, location, filters);
  
  // 3. 前端过滤（当二级标签为"全部"时）
  let filteredData = response.data.leaderboard;
  if (raceType === 'single') {
    filteredData = filteredData.filter(e => !e.division.includes('doubles'));
  } else if (raceType === 'doubles') {
    filteredData = filteredData.filter(e => e.division.includes('doubles'));
  }
  
  // 4. 重新计算排名
  filteredData = filteredData.map((entry, index) => ({ ...entry, rank: index + 1 }));
};
```

### 4.4 类型定义
```typescript
interface LeaderboardEntry {
  rank: number;
  name: string;
  age_group: string;
  total_time: string;
  total_time_minutes: number;
  gender: string;
  division: string;
  nationality?: string;
}

interface RaceLeaderboardData {
  race: {
    season: number;
    location: string;
    event_name: string;
    total_participants: number;
  };
  leaderboard: LeaderboardEntry[];
  total: number;
  has_more: boolean;
}
```

## 5. 验收标准

### 5.1 基础功能
1. ✅ 点击首页近期赛事卡片，能正确跳转到对应赛事的排行榜页面
2. ✅ 排行榜页面正确显示赛事名称
3. ✅ 排行榜列表按完赛时间升序排列，显示正确的排名
4. ✅ 第1名有特殊的视觉样式（左侧绿色边框）
5. ✅ 点击列表中的"查看"按钮，能跳转到比赛总结页面
6. ✅ 加载状态和错误状态正确显示

### 5.2 筛选功能 (v1.1 验收)
7. ✅ 默认进入排行榜时，显示"单人赛"数据，不包含 doubles/pro_doubles
8. ✅ 点击"双人赛"一级标签，只显示 doubles 相关数据
9. ✅ 切换一级标签时，二级标签自动重置为"全部"
10. ✅ 单人赛模式下，二级标签显示：全部 / Open / Pro
11. ✅ 双人赛模式下，二级标签显示：全部 / Doubles / Pro Doubles
12. ✅ 性别筛选（男子/女子）在所有模式下正常工作
13. ✅ 当某赛事没有特定组别数据时（如无 pro_doubles），显示空列表而非错误

## 6. 后续迭代

### 已完成
- ✅ v1.1: 修复筛选逻辑，分离一级/二级标签

### 待开发
- v2: 添加用户登录系统后，实现 `isMe` 当前用户高亮功能
- v2: 添加分页加载（下拉加载更多）
- v2: 当特定组别无数据时，显示友好提示（如"该赛事暂无 Pro Doubles 数据"）
- v3: 添加排行榜搜索功能
- v3: 后端支持多 division OR 查询，减少前端过滤开销

