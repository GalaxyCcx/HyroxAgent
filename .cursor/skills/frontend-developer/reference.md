# 前端开发参考文档

## Tailwind CSS 自定义类

项目使用自定义 Tailwind 配置，以下是常用的自定义类：

### 颜色

```css
/* 主色 */
primary: #42ff9e
primary-dark: #2dd87a

/* 背景 */
background-dark: #101013
surface-dark: #1E2024

/* 透明度变体 */
text-white/80, text-white/60, text-white/40, text-white/30, text-white/20, text-white/10, text-white/5
border-white/10, border-white/5
bg-white/5, bg-white/10
```

### 字体

```css
font-display: 用于数字、标题（等宽/装饰）
font-body: 正文字体
font-bold: 加粗
```

### 动画

```css
animate-in: 进入动画
fade-in: 淡入
slide-in-from-right-8: 从右滑入
zoom-in-95: 缩放进入
duration-200, duration-300: 动画时长
```

---

## Material Symbols 图标

项目使用 Google Material Symbols Outlined，常用图标：

### 导航

```
arrow_back - 返回
chevron_right - 右箭头
chevron_left - 左箭头
expand_more - 展开
expand_less - 收起
menu - 菜单
close - 关闭
```

### 操作

```
search - 搜索
add - 添加
edit - 编辑
delete - 删除
share - 分享
download - 下载
upload - 上传
refresh - 刷新
settings - 设置
```

### 状态

```
check_circle - 成功/完成
error - 错误
warning - 警告
info - 信息
lock - 锁定
lock_open - 解锁
visibility - 可见
visibility_off - 隐藏
```

### 运动相关

```
directions_run - 跑步
fitness_center - 健身
sports - 运动
emoji_events - 奖杯
leaderboard - 排行榜
timer - 计时
speed - 速度
trending_up - 上升趋势
trending_down - 下降趋势
```

### 用户

```
person - 用户
person_check - 已认证
group - 群组
account_circle - 头像
```

### 其他

```
home - 首页
analytics - 分析
description - 文档
picture_as_pdf - PDF
auto_awesome - AI/智能
psychology - 心理/AI分析
tips_and_updates - 建议
location_on - 位置
calendar_today - 日历
```

---

## API 响应格式

所有后端 API 遵循统一响应格式：

### 成功响应

```typescript
interface ApiResponse<T> {
  code: 0;
  message: 'success';
  data: T;
}
```

### 错误响应

```typescript
interface ApiResponse<T> {
  code: number;  // 非0错误码
  message: string;  // 错误信息
  data: null;
}
```

### 常见错误码

| Code | 含义 |
|------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 后端 API 端点

### 运动员 API (`/api/v1/athletes`)

```
GET /athletes/suggest?keyword=xxx&limit=5
- 名称建议

GET /athletes/search?name=xxx&season=8&limit=20
- 搜索运动员
```

### 成绩 API (`/api/v1/results`)

```
GET /results/{season}/{location}/{name}
- 获取成绩详情

GET /results/{season}/{location}/{name}/analytics
- 获取分段统计

GET /results/{season}/{location}/{name}/analysis
- 获取 LLM 快速分析
```

### 赛事 API (`/api/v1/races`)

```
GET /races/recent?limit=5
- 近期赛事列表

GET /races/{season}/{location}/leaderboard
- 赛事排行榜
```

### 报告 API (`/api/v1/reports`)

```
POST /reports/create
- 创建报告

GET /reports/generate/{report_id}
- SSE: 订阅报告生成进度

GET /reports/status/{report_id}
- 获取报告状态

GET /reports/detail/{report_id}
- 获取报告详情

GET /reports/list
- 列出报告
```

---

## 类型定义速查

### 核心类型

```typescript
// Tab 枚举
enum AppTab {
  HOME = 'home',
  RACE = 'race',
  ME = 'me'
}

// 搜索建议
interface SuggestionItem {
  name: string;
  match_count: number;
}

// 搜索结果
interface AthleteSearchItem {
  id: string;
  name: string;
  nationality?: string;
  event_id: string;
  event_name: string;
  location: string;
  season: number;
  total_time: string;
  total_time_minutes: number;
  gender: string;
  division: string;
  age_group?: string;
}

// 成绩详情
interface AthleteResultData {
  athlete: AthleteInfo;
  race: RaceInfo;
  results: ResultsInfo;
  rankings: RankingsInfo;
  splits: SplitsInfo;
}

// 排行榜条目
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

// LLM 分析
interface AnalysisLiteData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  cached: boolean;
}

// 专业报告
interface ProReportDetail {
  report_id: string;
  athlete_name: string;
  season: number;
  location: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  introduction: string | null;
  sections: ReportSection[];
  charts: Record<string, ChartConfig>;
  conclusion: string | null;
}
```

---

## 组件生命周期模式

### 初始化加载

```typescript
useEffect(() => {
  loadInitialData();
}, []); // 仅首次加载
```

### 依赖变化重新加载

```typescript
useEffect(() => {
  if (selectedId) {
    loadData(selectedId);
  }
}, [selectedId, loadData]);
```

### 清理副作用

```typescript
useEffect(() => {
  const eventSource = new EventSource(url);
  
  // ... 设置监听
  
  return () => {
    eventSource.close(); // 清理
  };
}, [url]);
```

---

## 错误处理最佳实践

### API 调用

```typescript
try {
  const response = await api.getData();
  if (response.code === 0 && response.data) {
    setData(response.data);
  } else {
    setError(response.message || '请求失败');
  }
} catch (err) {
  console.error('API Error:', err);
  setError('网络错误，请检查连接');
}
```

### 边界情况处理

```typescript
// 空数据
{items.length === 0 && !loading && (
  <EmptyState message="暂无数据" />
)}

// 可选链
const userName = data?.user?.name ?? '未知';

// 空值合并
const limit = options.limit ?? 20;
```

---

## 性能优化建议

### 使用 useCallback

```typescript
// ✅ 缓存回调函数
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ❌ 每次渲染创建新函数
const handleClick = () => {
  doSomething(id);
};
```

### 使用 useMemo

```typescript
// 计算密集型操作
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.time - b.time);
}, [items]);
```

### 避免不必要的重渲染

```typescript
// 使用 React.memo 包装纯组件
const ItemCard = React.memo(({ item, onClick }) => {
  return <div onClick={onClick}>{item.name}</div>;
});
```

---

## 文件命名约定

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 组件文件 | PascalCase | `AthleteCard.tsx` |
| Hook 文件 | camelCase, use 前缀 | `useAthleteSearch.ts` |
| 工具文件 | camelCase | `formatTime.ts` |
| 类型文件 | camelCase | `types.ts` |
| 服务文件 | camelCase | `api.ts` |

---

## Git 提交规范

```
feat(frontend): 添加运动员搜索功能
fix(frontend): 修复排行榜加载问题
style(frontend): 调整卡片间距
refactor(frontend): 重构 API 调用逻辑
docs(frontend): 更新组件注释
```
