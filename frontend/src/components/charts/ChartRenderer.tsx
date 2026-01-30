/**
 * ChartRenderer - 通用 ECharts 渲染器
 * 版本: v1.0
 * 
 * 功能：
 * - 暗色主题适配
 * - 响应式尺寸
 * - 自动销毁和内存管理
 * - 统一的样式处理
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// 深色主题配色
export const CHART_COLORS = {
  // 主色调
  primary: '#3b82f6',      // 蓝色
  success: '#22c55e',      // 绿色
  danger: '#ef4444',       // 红色
  warning: '#f59e0b',      // 橙色
  purple: '#a855f7',       // 紫色
  cyan: '#00d4ff',         // 青色
  pink: '#ec4899',         // 粉色
  
  // 文字颜色
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: 'rgba(255,255,255,0.4)',
  
  // 背景和边框
  background: 'transparent',
  cardBg: '#1a1a1a',
  border: 'rgba(255,255,255,0.1)',
  gridLine: 'rgba(255,255,255,0.08)',
  
  // 百分位颜色映射
  percentile: {
    top25: '#22c55e',      // 绿色 - Top 25%
    mid25_50: '#86efac',   // 浅绿 - 25-50%
    mid50_75: '#f59e0b',   // 橙色 - 50-75%
    bottom25: '#ef4444',   // 红色 - Bottom 25%
  },
  
  // 难度着色
  difficulty: {
    easy: '#22c55e',
    medium: '#f59e0b',
    hard: '#ef4444',
  },
};

// 默认配色序列
export const DEFAULT_COLOR_PALETTE = [
  CHART_COLORS.cyan,
  CHART_COLORS.purple,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.primary,
  CHART_COLORS.pink,
];

interface ChartRendererProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onChartReady?: (instance: any) => void;
  onEvents?: Record<string, (params: any) => void>;
  notMerge?: boolean;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  option,
  style,
  className,
  title,
  subtitle,
  loading = false,
  onChartReady,
  onEvents,
  notMerge = true,
}) => {
  const chartRef = useRef<ReactECharts>(null);

  // 合并默认样式
  const chartStyle = useMemo(() => ({
    height: '280px',
    width: '100%',
    ...style,
  }), [style]);

  // 处理配置，应用深色主题
  const processedOption = useMemo(() => {
    const newOption = JSON.parse(JSON.stringify(option)) as EChartsOption;

    // 基础设置
    newOption.backgroundColor = CHART_COLORS.background;
    if (!newOption.color) {
      newOption.color = DEFAULT_COLOR_PALETTE;
    }

    // 工具提示样式
    if (!newOption.tooltip) {
      newOption.tooltip = {};
    }
    newOption.tooltip = {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12,
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(0, 212, 255, 0.1)',
        },
      },
      ...newOption.tooltip,
    };

    // 图例样式
    if (newOption.legend) {
      newOption.legend = {
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 11,
        },
        pageTextStyle: { color: CHART_COLORS.textMuted },
        pageIconColor: CHART_COLORS.cyan,
        pageIconInactiveColor: CHART_COLORS.textMuted,
        ...newOption.legend,
      };
    }

    // X轴样式
    if (newOption.xAxis) {
      const xAxis = Array.isArray(newOption.xAxis) ? newOption.xAxis : [newOption.xAxis];
      newOption.xAxis = xAxis.map((axis: any) => ({
        ...axis,
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
          ...(axis.axisLine || {}),
        },
        axisTick: {
          lineStyle: { color: CHART_COLORS.border },
          ...(axis.axisTick || {}),
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
          ...(axis.axisLabel || {}),
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine },
          ...(axis.splitLine || {}),
        },
      }));
      if (!Array.isArray(option.xAxis)) {
        newOption.xAxis = newOption.xAxis[0];
      }
    }

    // Y轴样式
    if (newOption.yAxis) {
      const yAxis = Array.isArray(newOption.yAxis) ? newOption.yAxis : [newOption.yAxis];
      newOption.yAxis = yAxis.map((axis: any) => ({
        ...axis,
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
          ...(axis.axisLine || {}),
        },
        axisTick: {
          lineStyle: { color: CHART_COLORS.border },
          ...(axis.axisTick || {}),
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
          ...(axis.axisLabel || {}),
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
          ...(axis.splitLine || {}),
        },
        nameTextStyle: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
          ...(axis.nameTextStyle || {}),
        },
      }));
      if (!Array.isArray(option.yAxis)) {
        newOption.yAxis = newOption.yAxis[0];
      }
    }

    // 雷达图样式
    if (newOption.radar) {
      newOption.radar = {
        axisName: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine },
        },
        splitArea: {
          areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.05)'] },
        },
        ...newOption.radar,
      };
    }

    // 网格设置
    if (!newOption.grid && (newOption.xAxis || newOption.yAxis)) {
      newOption.grid = {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '12%',
        containLabel: true,
      };
    }

    // 动画设置
    if (newOption.animation === undefined) {
      newOption.animation = true;
      newOption.animationDuration = 800;
      newOption.animationEasing = 'cubicOut';
    }

    return newOption;
  }, [option]);

  // 图表就绪回调
  const handleChartReady = useCallback((instance: any) => {
    if (onChartReady) {
      onChartReady(instance);
    }
  }, [onChartReady]);

  // 窗口大小变化时自动 resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const instance = chartRef.current.getEchartsInstance();
        instance?.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`chart-renderer-container ${className || ''}`}>
      {/* 标题区域 */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="size-1.5 bg-cyan-400 rounded-full"></span>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      
      {/* 图表 */}
      <ReactECharts
        ref={chartRef}
        option={processedOption}
        style={chartStyle}
        opts={{ renderer: 'svg' }}
        notMerge={notMerge}
        lazyUpdate={true}
        showLoading={loading}
        loadingOption={{
          text: '加载中...',
          color: CHART_COLORS.cyan,
          textColor: CHART_COLORS.textSecondary,
          maskColor: 'rgba(0, 0, 0, 0.8)',
        }}
        onChartReady={handleChartReady}
        onEvents={onEvents}
      />
    </div>
  );
};

export default ChartRenderer;

/**
 * 辅助函数：根据百分位返回颜色
 */
export function getPercentileColor(percentile: number): string {
  if (percentile <= 25) return CHART_COLORS.percentile.top25;
  if (percentile <= 50) return CHART_COLORS.percentile.mid25_50;
  if (percentile <= 75) return CHART_COLORS.percentile.mid50_75;
  return CHART_COLORS.percentile.bottom25;
}

/**
 * 辅助函数：根据难度返回颜色
 */
export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  return CHART_COLORS.difficulty[difficulty];
}

/**
 * 辅助函数：格式化时间（秒 -> mm:ss）
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 辅助函数：格式化配速（min/km）
 */
export function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
}
