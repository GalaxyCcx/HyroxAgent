# 前端组件指南

## 1. 组件架构

### 1.1 文件结构

```
frontend/src/
├── components/
│   └── ReportChart.tsx      # ECharts 图表组件
├── screens/
│   └── LiveTab.tsx          # 报告主视图
├── services/
│   └── api.ts               # API 客户端
└── types.ts                 # 类型定义
```

### 1.2 组件关系

```
LiveTab.tsx
    │
    ├── 报告创建表单
    ├── 进度指示器 (SSE 订阅)
    │
    └── 报告内容渲染
        ├── 引言部分
        ├── 章节列表
        │   └── ReportChart.tsx (图表)
        └── 结论部分
```

## 2. ReportChart 组件

### 2.1 组件定义

```typescript
// frontend/src/components/ReportChart.tsx

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'radar' | 'pie';
  title: string;
  option: echarts.EChartsOption;
}

interface ReportChartProps {
  config: ChartConfig;
  height?: number;
}

export const ReportChart: React.FC<ReportChartProps> = ({ 
  config, 
  height = 300 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current, 'dark');
    
    // 应用主题配置
    const themedOption = applyTheme(config.option, config.type);
    chartInstance.current.setOption(themedOption);

    // 响应式
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [config]);

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: `${height}px`,
        backgroundColor: 'rgba(13, 17, 23, 0.95)',
        borderRadius: '8px',
        padding: '16px'
      }} 
    />
  );
};
```

### 2.2 主题配置

```typescript
// 深色科技风主题
const THEME_COLORS = {
  primary: '#00d4ff',
  secondary: '#ff6b6b',
  accent: '#00ff88',
  warning: '#ffaa00',
  text: '#e0e0e0',
  textSecondary: '#888888',
  background: 'rgba(13, 17, 23, 0.95)',
  grid: 'rgba(255, 255, 255, 0.1)'
};

const CHART_PALETTE = [
  '#00d4ff',  // 青蓝
  '#ff6b6b',  // 珊瑚红
  '#00ff88',  // 荧光绿
  '#ffaa00',  // 橙黄
  '#a855f7',  // 紫色
  '#f472b6',  // 粉色
];

function applyTheme(option: echarts.EChartsOption, type: string): echarts.EChartsOption {
  const baseConfig = {
    backgroundColor: 'transparent',
    textStyle: {
      color: THEME_COLORS.text
    },
    title: {
      textStyle: {
        color: THEME_COLORS.text,
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: THEME_COLORS.primary,
      textStyle: { color: THEME_COLORS.text }
    },
    legend: {
      textStyle: { color: THEME_COLORS.textSecondary }
    }
  };

  // 按图表类型应用特定配置
  switch (type) {
    case 'bar':
    case 'line':
      return {
        ...baseConfig,
        ...option,
        xAxis: {
          ...option.xAxis,
          axisLine: { lineStyle: { color: THEME_COLORS.grid } },
          axisLabel: { color: THEME_COLORS.textSecondary }
        },
        yAxis: {
          ...option.yAxis,
          axisLine: { lineStyle: { color: THEME_COLORS.grid } },
          axisLabel: { color: THEME_COLORS.textSecondary },
          splitLine: { lineStyle: { color: THEME_COLORS.grid } }
        }
      };
    
    case 'radar':
      return {
        ...baseConfig,
        ...option,
        radar: {
          ...option.radar,
          axisLine: { lineStyle: { color: THEME_COLORS.grid } },
          splitLine: { lineStyle: { color: THEME_COLORS.grid } },
          axisName: { color: THEME_COLORS.textSecondary }
        }
      };
    
    case 'pie':
      return {
        ...baseConfig,
        ...option
      };
    
    default:
      return { ...baseConfig, ...option };
  }
}
```

### 2.3 图表标记解析

```typescript
// 从 Markdown 内容中解析图表标记
export function parseChartMarkers(
  content: string, 
  charts: ChartConfig[]
): { text: string; charts: Map<string, ChartConfig> } {
  const chartMap = new Map<string, ChartConfig>();
  
  // 建立图表 ID 映射
  charts.forEach(chart => {
    chartMap.set(chart.id, chart);
  });

  // 替换 [CHART:chart_id] 标记为占位符
  const processedContent = content.replace(
    /\[CHART:([a-zA-Z0-9-]+)\]/g,
    (match, chartId) => {
      if (chartMap.has(chartId)) {
        return `{{CHART_PLACEHOLDER_${chartId}}}`;
      }
      return match;
    }
  );

  return { text: processedContent, charts: chartMap };
}

// 渲染带图表的内容
export function renderContentWithCharts(
  content: string,
  charts: Map<string, ChartConfig>
): React.ReactNode[] {
  const parts = content.split(/(\{\{CHART_PLACEHOLDER_[a-zA-Z0-9-]+\}\})/);
  
  return parts.map((part, index) => {
    const match = part.match(/\{\{CHART_PLACEHOLDER_([a-zA-Z0-9-]+)\}\}/);
    if (match && charts.has(match[1])) {
      return <ReportChart key={index} config={charts.get(match[1])!} />;
    }
    return <ReactMarkdown key={index}>{part}</ReactMarkdown>;
  });
}
```

## 3. LiveTab 报告视图

### 3.1 状态管理

```typescript
interface ReportState {
  status: 'idle' | 'creating' | 'generating' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  report: ProReportDetail | null;
  error: string | null;
}

const initialState: ReportState = {
  status: 'idle',
  progress: 0,
  currentStep: '',
  report: null,
  error: null
};

function reportReducer(state: ReportState, action: ReportAction): ReportState {
  switch (action.type) {
    case 'CREATE_START':
      return { ...state, status: 'creating', error: null };
    case 'GENERATE_START':
      return { ...state, status: 'generating', progress: 0 };
    case 'PROGRESS_UPDATE':
      return { 
        ...state, 
        progress: action.progress, 
        currentStep: action.step 
      };
    case 'COMPLETE':
      return { 
        ...state, 
        status: 'completed', 
        progress: 100, 
        report: action.report 
      };
    case 'ERROR':
      return { 
        ...state, 
        status: 'error', 
        error: action.error 
      };
    default:
      return state;
  }
}
```

### 3.2 SSE 进度订阅

```typescript
async function subscribeToGeneration(
  reportId: string,
  dispatch: React.Dispatch<ReportAction>
) {
  const eventSource = new EventSource(
    `${API_BASE_URL}/api/v1/reports/generate/${reportId}`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.event) {
      case 'progress':
        dispatch({
          type: 'PROGRESS_UPDATE',
          progress: data.data.progress,
          step: data.data.current_step || ''
        });
        break;
      
      case 'complete':
        dispatch({ type: 'COMPLETE', report: data.data });
        eventSource.close();
        break;
      
      case 'error':
        dispatch({ type: 'ERROR', error: data.data.message });
        eventSource.close();
        break;
    }
  };

  eventSource.onerror = () => {
    dispatch({ type: 'ERROR', error: '连接中断，请刷新重试' });
    eventSource.close();
  };

  return eventSource;
}
```

### 3.3 进度指示器

```typescript
const ProgressIndicator: React.FC<{ progress: number; step: string }> = ({
  progress,
  step
}) => {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-text">
        <span>{progress}%</span>
        <span className="step-text">{step}</span>
      </div>
    </div>
  );
};

// CSS
const progressStyles = `
.progress-container {
  margin: 24px 0;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  transition: width 0.3s ease;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 14px;
  color: #888;
}

.step-text {
  color: #00d4ff;
}
`;
```

### 3.4 报告内容渲染

```typescript
const ReportContent: React.FC<{ report: ProReportDetail }> = ({ report }) => {
  const sections = JSON.parse(report.sections || '[]');
  const charts = JSON.parse(report.charts || '[]');

  return (
    <div className="report-content">
      {/* 标题 */}
      <h1 className="report-title">{report.title}</h1>
      
      {/* 引言 */}
      <section className="report-section">
        <ReactMarkdown>{report.introduction}</ReactMarkdown>
      </section>

      {/* 章节 */}
      {sections.map((section: ReportSection, index: number) => (
        <section key={section.id} className="report-section">
          <h2>{section.title}</h2>
          {renderContentWithCharts(section.content, new Map(
            charts.filter((c: ChartConfig) => 
              section.content.includes(`[CHART:${c.id}]`)
            ).map((c: ChartConfig) => [c.id, c])
          ))}
        </section>
      ))}

      {/* 结论 */}
      <section className="report-section">
        <h2>总结</h2>
        <ReactMarkdown>{report.conclusion}</ReactMarkdown>
      </section>
    </div>
  );
};
```

## 4. PDF 导出

### 4.1 使用 html2pdf.js

```typescript
import html2pdf from 'html2pdf.js';

async function exportToPDF(reportElement: HTMLElement, title: string) {
  const options = {
    margin: [10, 10, 10, 10],
    filename: `${title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#0d1117'
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    }
  };

  // 克隆元素以避免影响原始渲染
  const clonedElement = reportElement.cloneNode(true) as HTMLElement;
  
  // 等待图表渲染完成
  await new Promise(resolve => setTimeout(resolve, 500));

  await html2pdf().set(options).from(clonedElement).save();
}
```

### 4.2 PDF 样式优化

```typescript
// 导出前应用打印样式
function applyPrintStyles(element: HTMLElement) {
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#000000';
  
  // 图表适配
  const charts = element.querySelectorAll('.chart-container');
  charts.forEach(chart => {
    (chart as HTMLElement).style.backgroundColor = '#f5f5f5';
  });
  
  // 隐藏不需要的元素
  const hideElements = element.querySelectorAll('.no-print');
  hideElements.forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
}
```

## 5. API 客户端

### 5.1 报告 API

```typescript
// frontend/src/services/api.ts

export const reportApi = {
  // 创建报告
  async create(params: CreateReportParams): Promise<CreateReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/reports/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  },

  // 订阅生成进度 (SSE)
  subscribeGenerate(reportId: string): EventSource {
    return new EventSource(
      `${API_BASE_URL}/api/v1/reports/generate/${reportId}`
    );
  },

  // 获取报告状态
  async getStatus(reportId: string): Promise<ReportStatus> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reports/status/${reportId}`
    );
    return response.json();
  },

  // 获取报告详情
  async getDetail(reportId: string): Promise<ProReportDetail> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reports/detail/${reportId}`
    );
    return response.json();
  },

  // 获取用户报告列表
  async list(params: ListReportParams): Promise<ListReportResponse> {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reports/list?${query}`
    );
    return response.json();
  }
};
```

### 5.2 类型定义

```typescript
// frontend/src/types.ts

export interface CreateReportParams {
  season: number;
  location: string;
  athlete_name: string;
  user_id?: number;
}

export interface CreateReportResponse {
  report_id: string;
  status: string;
  message: string;
}

export interface ProReportDetail {
  report_id: string;
  title: string;
  athlete_name: string;
  season: number;
  location: string;
  division: string;
  gender: string;
  introduction: string;
  sections: string;  // JSON string
  charts: string;    // JSON string
  conclusion: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at: string | null;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  charts: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'radar' | 'pie';
  title: string;
  option: Record<string, any>;
}

export interface ReportStatus {
  report_id: string;
  status: string;
  progress: number;
  current_step: string;
  title: string;
}
```

## 6. 样式指南

### 6.1 颜色系统

```css
:root {
  /* 主题色 */
  --color-primary: #00d4ff;
  --color-secondary: #ff6b6b;
  --color-accent: #00ff88;
  --color-warning: #ffaa00;
  
  /* 文字色 */
  --color-text: #e0e0e0;
  --color-text-secondary: #888888;
  --color-text-muted: #555555;
  
  /* 背景色 */
  --color-bg: #0d1117;
  --color-bg-elevated: #161b22;
  --color-bg-card: #21262d;
  
  /* 边框 */
  --color-border: rgba(255, 255, 255, 0.1);
  
  /* 渐变 */
  --gradient-primary: linear-gradient(90deg, #00d4ff, #00ff88);
}
```

### 6.2 组件样式

```css
/* 报告容器 */
.report-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: var(--color-bg-elevated);
  border-radius: 12px;
}

/* 标题 */
.report-title {
  font-size: 28px;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 24px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 章节 */
.report-section {
  margin-bottom: 32px;
  padding: 20px;
  background: var(--color-bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.report-section h2 {
  font-size: 20px;
  color: var(--color-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

/* 图表容器 */
.chart-container {
  margin: 16px 0;
  padding: 16px;
  background: var(--color-bg);
  border-radius: 8px;
}
```

## 7. 性能优化

### 7.1 图表懒加载

```typescript
import { useInView } from 'react-intersection-observer';

const LazyChart: React.FC<{ config: ChartConfig }> = ({ config }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <div ref={ref} className="chart-container">
      {inView ? (
        <ReportChart config={config} />
      ) : (
        <div className="chart-placeholder">加载中...</div>
      )}
    </div>
  );
};
```

### 7.2 内容虚拟化

```typescript
import { Virtuoso } from 'react-virtuoso';

const VirtualizedSections: React.FC<{ sections: ReportSection[] }> = ({
  sections
}) => {
  return (
    <Virtuoso
      data={sections}
      itemContent={(index, section) => (
        <SectionContent key={section.id} section={section} />
      )}
    />
  );
};
```

### 7.3 Memo 优化

```typescript
const ReportSection = React.memo<{ section: ReportSection }>(
  ({ section }) => {
    // 渲染逻辑
  },
  (prevProps, nextProps) => {
    return prevProps.section.id === nextProps.section.id &&
           prevProps.section.content === nextProps.section.content;
  }
);
```
