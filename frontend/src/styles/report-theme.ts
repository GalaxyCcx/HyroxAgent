/**
 * 报告模块主题配置
 * 用于 V4 重构版的深色科技风格
 */

export const REPORT_THEME = {
  // 背景色
  bg: {
    primary: '#0D0D0D',
    card: '#1A1A1A',
    cardHover: '#242424',
    cardAlt: '#151515',
  },
  
  // 主色调
  accent: '#00FF88',
  accentDim: 'rgba(0, 255, 136, 0.2)',
  accentBorder: 'rgba(0, 255, 136, 0.3)',
  
  // 状态色
  warning: '#FF6B6B',
  warningDim: 'rgba(255, 107, 107, 0.2)',
  success: '#00FF88',
  gold: '#FFD700',
  
  // 文字色
  text: {
    primary: '#FFFFFF',
    secondary: '#888888',
    muted: '#555555',
    accent: '#00FF88',
  },
  
  // 边框色
  border: '#333333',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  
  // 等级徽章颜色
  grades: {
    S: { bg: 'rgba(255, 107, 107, 0.2)', text: '#FF6B6B', border: 'rgba(255, 107, 107, 0.3)' },
    A: { bg: 'rgba(168, 85, 247, 0.2)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' },
    B: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
    C: { bg: 'rgba(255, 215, 0, 0.2)', text: '#FFD700', border: 'rgba(255, 215, 0, 0.3)' },
    D: { bg: 'rgba(156, 163, 175, 0.2)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' },
  },
  
  // 章节颜色主题
  sections: [
    { accent: '#00FF88', border: 'rgba(0, 255, 136, 0.2)' },
    { accent: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
    { accent: '#A855F7', border: 'rgba(168, 85, 247, 0.2)' },
    { accent: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' },
    { accent: '#EC4899', border: 'rgba(236, 72, 153, 0.2)' },
  ],
  
  // 预测档位渐变色 (深橙 -> 浅橙)
  predictionTiers: {
    excellent: '#FF6600',
    great: '#FF8C00',
    expected: '#FFA500',
    subpar: '#FFBB55',
    poor: '#FFCC80',
  },
  
  // ECharts 深色主题配置
  echarts: {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#888888',
    },
    axisLine: {
      lineStyle: {
        color: '#333333',
      },
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
    },
    radar: {
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(0, 255, 136, 0.02)', 'rgba(0, 255, 136, 0.04)'],
        },
      },
    },
  },
} as const;

// 章节 tag 样式
export const getSectionTagStyle = () => ({
  className: 'text-xs font-bold uppercase tracking-wider text-[#00FF88]',
});

// 章节标题样式
export const getSectionTitleStyle = () => ({
  className: 'text-xl font-bold text-white mt-1',
});

// 章节副标题样式
export const getSectionSubtitleStyle = () => ({
  className: 'text-sm text-gray-500 mt-1',
});

// 卡片样式
export const getCardStyle = (accent?: string) => ({
  className: `bg-[${REPORT_THEME.bg.card}] rounded-xl border border-[${accent || REPORT_THEME.border}]`,
});

// 引用框样式 (绿色左边框)
export const getQuoteBoxStyle = () => ({
  className: 'bg-[#1A1A1A] rounded-r-xl p-4 border-l-4 border-l-[#00FF88] text-white/80',
});

// 警告框样式 (红色左边框)
export const getWarningBoxStyle = () => ({
  className: 'bg-[#1A1A1A] rounded-r-xl p-4 border-l-4 border-l-[#FF6B6B] text-white/80',
});

export default REPORT_THEME;
