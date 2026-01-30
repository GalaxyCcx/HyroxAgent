# 前端开发示例

## 示例 1: 添加新的数据卡片组件

### 需求
创建一个显示运动员统计数据的卡片组件。

### 实现

**1. 定义类型 (types.ts)**

```typescript
export interface AthleteStatsCard {
  athleteName: string;
  totalRaces: number;
  bestTime: string;
  avgTime: string;
  recentRank: number;
}
```

**2. 创建组件 (components/AthleteStatsCard.tsx)**

```typescript
/**
 * AthleteStatsCard - 运动员统计卡片
 * 版本: v1.0
 */

import React from 'react';
import type { AthleteStatsCard as AthleteStatsCardType } from '../types';

interface Props {
  data: AthleteStatsCardType;
  onClick?: () => void;
}

const AthleteStatsCard: React.FC<Props> = ({ data, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-[#1E2024] border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{data.athleteName}</h3>
        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded">
          #{data.recentRank}
        </span>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-white font-display">{data.totalRaces}</div>
          <div className="text-[10px] text-white/40">参赛场次</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary font-display">{data.bestTime}</div>
          <div className="text-[10px] text-white/40">最佳成绩</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white/60 font-display">{data.avgTime}</div>
          <div className="text-[10px] text-white/40">平均成绩</div>
        </div>
      </div>
    </div>
  );
};

export default AthleteStatsCard;
```

---

## 示例 2: 添加新的 API 端点对接

### 需求
对接后端的运动员历史记录 API。

### 实现

**1. 定义响应类型 (types.ts)**

```typescript
export interface HistoryRecord {
  raceId: string;
  eventName: string;
  date: string;
  totalTime: string;
  rank: number;
  totalParticipants: number;
}

export interface AthleteHistoryData {
  athleteName: string;
  records: HistoryRecord[];
  total: number;
}
```

**2. 添加 API 方法 (api.ts)**

```typescript
export const historyApi = {
  /**
   * 获取运动员历史记录
   * 
   * @param athleteName - 运动员姓名
   * @param limit - 返回数量，默认10
   */
  getHistory: async (
    athleteName: string, 
    limit = 10
  ): Promise<ApiResponse<AthleteHistoryData>> => {
    const url = `${API_BASE_URL}/athletes/${encodeURIComponent(athleteName)}/history?limit=${limit}`;
    return request<AthleteHistoryData>(url);
  },
};
```

**3. 在组件中使用**

```typescript
const [history, setHistory] = useState<AthleteHistoryData | null>(null);
const [loading, setLoading] = useState(false);

const loadHistory = useCallback(async (name: string) => {
  setLoading(true);
  try {
    const response = await historyApi.getHistory(name, 20);
    if (response.code === 0 && response.data) {
      setHistory(response.data);
    }
  } catch (err) {
    console.error('Failed to load history:', err);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  if (athleteName) {
    loadHistory(athleteName);
  }
}, [athleteName, loadHistory]);
```

---

## 示例 3: 添加模态框/弹窗

### 需求
创建一个确认删除的模态框。

### 实现

```typescript
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [itemToDelete, setItemToDelete] = useState<string | null>(null);

const handleDeleteClick = (itemId: string) => {
  setItemToDelete(itemId);
  setShowDeleteModal(true);
};

const handleDeleteConfirm = async () => {
  if (!itemToDelete) return;
  
  try {
    await deleteApi.deleteItem(itemToDelete);
    // 刷新列表
    loadData();
    setShowDeleteModal(false);
  } catch (err) {
    console.error('Delete failed:', err);
  }
};

// 渲染模态框
{showDeleteModal && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
    <div className="bg-[#101013] border border-white/10 rounded-3xl p-6 w-full max-w-xs animate-in zoom-in-95">
      {/* Icon */}
      <div className="size-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 mx-auto">
        <span className="material-symbols-outlined text-red-500 text-3xl">delete</span>
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-bold text-white text-center mb-3">确认删除？</h3>
      
      {/* Description */}
      <p className="text-xs text-white/60 text-center mb-8">
        删除后数据将无法恢复，请谨慎操作。
      </p>
      
      {/* Actions */}
      <div className="flex gap-3">
        <button 
          onClick={() => setShowDeleteModal(false)}
          className="flex-1 py-3.5 rounded-xl bg-transparent border border-white/10 text-white font-bold text-sm"
        >
          取消
        </button>
        <button 
          onClick={handleDeleteConfirm}
          className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-bold text-sm"
        >
          确认删除
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 示例 4: 添加下拉筛选器

### 需求
创建一个带下拉菜单的筛选器组件。

### 实现

```typescript
const [showDropdown, setShowDropdown] = useState(false);
const [selectedFilter, setSelectedFilter] = useState('all');
const dropdownRef = useRef<HTMLDivElement>(null);

const filterOptions = [
  { id: 'all', label: '全部' },
  { id: 'completed', label: '已完成' },
  { id: 'pending', label: '进行中' },
];

// 点击外部关闭下拉
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowDropdown(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// 渲染
<div className="relative" ref={dropdownRef}>
  <button 
    onClick={() => setShowDropdown(!showDropdown)}
    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold ${
      selectedFilter !== 'all' 
        ? 'bg-primary/10 border-primary text-primary' 
        : 'bg-[#1E2024] border-white/10 text-white/60'
    }`}
  >
    {filterOptions.find(f => f.id === selectedFilter)?.label}
    <span className="material-symbols-outlined text-xs">
      {showDropdown ? 'expand_less' : 'expand_more'}
    </span>
  </button>

  {showDropdown && (
    <div className="absolute top-full left-0 mt-2 w-32 bg-[#1E2024] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95">
      {filterOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => {
            setSelectedFilter(option.id);
            setShowDropdown(false);
          }}
          className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/5 ${
            selectedFilter === option.id ? 'text-primary' : 'text-white/60'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )}
</div>
```

---

## 示例 5: 添加无限滚动列表

### 需求
实现触底加载更多的列表。

### 实现

```typescript
const [items, setItems] = useState<Item[]>([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const listRef = useRef<HTMLDivElement>(null);

const loadMore = useCallback(async () => {
  if (loadingMore || !hasMore) return;
  
  setLoadingMore(true);
  try {
    const response = await api.getItems({ page: page + 1, limit: 20 });
    if (response.code === 0 && response.data) {
      setItems(prev => [...prev, ...response.data.items]);
      setPage(p => p + 1);
      setHasMore(response.data.has_more);
    }
  } finally {
    setLoadingMore(false);
  }
}, [page, hasMore, loadingMore]);

// 滚动监听
useEffect(() => {
  const handleScroll = () => {
    if (!listRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMore();
    }
  };
  
  const el = listRef.current;
  el?.addEventListener('scroll', handleScroll);
  return () => el?.removeEventListener('scroll', handleScroll);
}, [loadMore]);

// 渲染
<div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-32">
  {items.map(item => (
    <ItemCard key={item.id} data={item} />
  ))}
  
  {loadingMore && (
    <div className="flex justify-center py-4">
      <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )}
  
  {!hasMore && items.length > 0 && (
    <div className="text-center py-4 text-xs text-white/30">
      已加载全部
    </div>
  )}
</div>
```
