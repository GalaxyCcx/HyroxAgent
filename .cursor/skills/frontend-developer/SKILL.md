---
name: frontend-developer
description: HyroxAgent 项目前端开发专用 Agent。帮助开发 React 页面、组件、API 对接、样式实现。当用户需要开发前端功能、修改 UI、添加新页面、对接后端 API 或修复前端问题时使用。
---

# HyroxAgent 前端开发 Agent

专门为 HyroxAgent 项目的 React 前端提供开发支持。

## 快速开始

执行前端开发任务时，按以下流程：

```
任务进度:
- [ ] 1. 理解需求 - 明确功能需求和 UI 设计
- [ ] 2. 定义类型 - 在 types.ts 中添加 TypeScript 类型
- [ ] 3. 实现 API - 在 api.ts 中添加 API 调用方法
- [ ] 4. 开发组件/页面 - 实现 React 组件
- [ ] 5. 样式调整 - 使用 Tailwind CSS 调整样式
- [ ] 6. 测试验证 - 启动 dev server 验证功能
```

## 技术栈

| 技术 | 版本 | 用途 |
|-----|-----|-----|
| React | 19.x | UI 框架 |
| TypeScript | 5.8.x | 类型系统 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | - | 样式（内联） |
| ECharts | 6.x | 图表渲染 |
| React Markdown | 10.x | Markdown 渲染 |

## 目录结构

```
frontend/src/
├── App.tsx              # 主应用 - Tab 导航
├── index.tsx            # 入口文件
├── types.ts             # 全局类型定义
├── screens/             # 页面组件
│   ├── LiveTab.tsx      # 首页 - 搜索/排行榜
│   ├── PlanTab.tsx      # 比赛 - 备赛计划
│   ├── DataTab.tsx      # 我的 - 个人数据
│   └── AgentTab.tsx     # Agent 测试
├── components/          # 通用组件
│   ├── AthleteSearchView.tsx
│   └── ReportChart.tsx
├── services/
│   └── api.ts           # API 客户端
└── hooks/
    └── useAthleteSearch.ts
```

## 设计规范

### 颜色主题（Tailwind）

```
主色调:
- primary: #42ff9e (荧光绿)
- primary-dark: #2dd87a
- background-dark: #101013
- surface-dark: #1E2024

文字:
- text-white/80, text-white/60, text-white/40, text-white/30
```

### 常用 UI 模式

```tsx
// 卡片容器
<div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4">

// 主按钮
<button className="bg-primary text-black font-bold px-6 py-3 rounded-xl">

// 次要按钮
<button className="border border-white/10 text-white px-4 py-2 rounded-lg">

// 加载动画
<div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin">

// 图标使用 Material Symbols
<span className="material-symbols-outlined text-primary">search</span>
```

## API 对接模式

### 1. 定义类型 (types.ts)

```typescript
// 响应数据类型
export interface YourDataItem {
  id: string;
  name: string;
  value: number;
}

export interface YourData {
  items: YourDataItem[];
  total: number;
}
```

### 2. 添加 API 方法 (api.ts)

```typescript
export const yourApi = {
  getData: async (params: { id: string }): Promise<ApiResponse<YourData>> => {
    const url = `${API_BASE_URL}/your-endpoint?id=${params.id}`;
    return request<YourData>(url);
  },
};
```

### 3. 在组件中使用

```typescript
const [data, setData] = useState<YourData | null>(null);
const [loading, setLoading] = useState(false);

const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const response = await yourApi.getData({ id: 'xxx' });
    if (response.code === 0) {
      setData(response.data);
    }
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    setLoading(false);
  }
}, []);
```

## 页面开发模式

### 视图状态管理

LiveTab 使用视图状态模式管理多个子页面：

```typescript
type ViewState = 'HOME' | 'SEARCH' | 'RESULTS' | 'DETAIL';

const [currentView, setCurrentView] = useState<ViewState>('HOME');

const renderCurrentView = () => {
  switch (currentView) {
    case 'HOME': return renderHome();
    case 'SEARCH': return renderSearch();
    // ...
  }
};
```

### 页面模板

```tsx
const renderYourView = () => (
  <div className="flex flex-col min-h-screen bg-background-dark animate-in fade-in duration-300">
    {/* Header */}
    <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-background-dark/95 backdrop-blur-md z-30 border-b border-white/5">
      <button onClick={goBack} className="text-white">
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <span className="text-white font-bold">页面标题</span>
      <div className="w-8"></div>
    </header>

    {/* Content */}
    <main className="flex-1 p-4 pb-32 overflow-y-auto">
      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        // 内容
      )}
    </main>
  </div>
);
```

## 组件开发规范

### 文件头部注释

```typescript
/**
 * 组件名称 - 功能描述
 * 版本: vX.X
 * 
 * 功能：
 * - 功能点1
 * - 功能点2
 */
```

### Props 定义

```typescript
interface ComponentProps {
  data: DataType;
  onSelect?: (item: ItemType) => void;
  className?: string;
}

const MyComponent: React.FC<ComponentProps> = ({ data, onSelect, className }) => {
  // ...
};
```

## 常用代码片段

### Loading 状态

```tsx
{isLoading && (
  <div className="flex flex-col items-center justify-center pt-20">
    <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-sm text-white/60">加载中...</p>
  </div>
)}
```

### 错误状态

```tsx
{error && (
  <div className="text-center pt-10 text-white/40">
    <span className="material-symbols-outlined text-4xl mb-2">error</span>
    <p className="text-sm">{error}</p>
  </div>
)}
```

### Toast 通知

```tsx
const [toastMsg, setToastMsg] = useState<string | null>(null);

// 显示
setToastMsg('操作成功');
setTimeout(() => setToastMsg(null), 2000);

// 渲染
{toastMsg && (
  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
    <div className="bg-[#1E2024]/90 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-xl">
      {toastMsg}
    </div>
  </div>
)}
```

### 列表渲染

```tsx
{items.map((item) => (
  <div 
    key={item.id}
    onClick={() => handleSelect(item)}
    className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 hover:border-primary/30 cursor-pointer transition-all"
  >
    <h3 className="text-white font-bold">{item.name}</h3>
    <p className="text-xs text-white/40">{item.description}</p>
  </div>
))}
```

## 开发命令

```bash
# 启动开发服务器
cd frontend && npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 验证清单

完成开发后验证：

- [ ] TypeScript 类型定义完整，无 any
- [ ] API 调用有错误处理
- [ ] Loading 和 Error 状态有处理
- [ ] 样式符合设计规范（暗色主题、圆角、间距）
- [ ] 响应式适配（max-w-md 移动端优先）
- [ ] 文件有版本注释
- [ ] 组件有 displayName（如需要）

## 常见问题

### Q: 如何添加新 Tab 页面？

1. 在 `types.ts` 中添加 AppTab 枚举值
2. 在 `screens/` 创建新的 Tab 组件
3. 在 `App.tsx` 中导入并添加到 switch 语句
4. 在底部导航添加对应按钮

### Q: 如何处理 SSE（Server-Sent Events）？

```typescript
const eventSource = new EventSource(url);

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  setProgress(data.progress);
});

eventSource.addEventListener('complete', () => {
  eventSource.close();
});

eventSource.onerror = () => {
  eventSource.close();
};
```

### Q: 图表如何渲染？

使用 `ReportChart` 组件，传入 ECharts 配置：

```tsx
import ReportChart from '../components/ReportChart';

<ReportChart
  chartId="my-chart"
  config={{ /* ECharts option */ }}
  purpose="图表用途说明"
/>
```

## 参考资源

- 类型定义: `frontend/src/types.ts`
- API 客户端: `frontend/src/services/api.ts`
- 主页面示例: `frontend/src/screens/LiveTab.tsx`
- 图表组件: `frontend/src/components/ReportChart.tsx`
