/**
 * ReportChart - 图表渲染组件（V2.0）
 * 支持通用 ECharts 图表和专用图表组件
 * 
 * 专用图表类型:
 * - radar: 雷达图
 * - time_loss_waterfall: 时间损耗瀑布图
 * - hr_pace_dual: 心率配速双轴图
 * - prediction_tiers: 五档预测卡片
 * - prediction_density: 概率密度曲线
 * - pacing_consistency: 配速一致性卡片
 * - cohort_comparison: 同水平对比卡片
 * - training_week_view: 周训练日历
 * - priority_matrix: 训练优先级矩阵
 * - horizontal_bar: 横向柱状图
 */
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

// 导入专用图表组件
import {
  RadarChart,
  TimeLossWaterfall,
  HRPaceDualAxis,
  PredictionTiers,
  PredictionDensity,
  PacingConsistencyCard,
  CohortComparison,
  CohortDistribution,
  TrainingWeekView,
  PriorityMatrix,
  HorizontalBar,
  SplitsBreakdown,
  PaceTrendChart,
  DistributionHistogram,
  DEFAULT_ZONEX_DIMENSIONS,
} from './charts';

// 深色科技风配色方案
const DARK_THEME_COLORS = [
  '#00d4ff', // 青色
  '#7c3aed', // 紫色
  '#10b981', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#3b82f6', // 蓝色
  '#ec4899', // 粉色
  '#14b8a6', // 青绿
];

interface ReportChartProps {
  chartId: string;
  config: Record<string, unknown>;
  purpose?: string;
  chartType?: string;
  style?: React.CSSProperties;
}

// 专用图表类型列表
const SPECIALIZED_CHART_TYPES = [
  'radar',
  'time_loss_waterfall',
  'hr_pace_dual',
  'prediction_tiers',
  'prediction_density',
  'pacing_consistency',
  'cohort_comparison',
  'cohort_distribution',
  'training_week_view',
  'priority_matrix',
  'horizontal_bar',
  'splits_breakdown',
  'pace_trend',
  'distribution_histogram',
];

const ReportChart: React.FC<ReportChartProps> = ({
  config,
  purpose,
  chartType,
  style,
}) => {
  // 判断是否使用专用图表组件
  const isSpecializedChart = chartType && SPECIALIZED_CHART_TYPES.includes(chartType);

  // 渲染专用图表组件
  if (isSpecializedChart) {
    return (
      <div className="report-chart-container">
        {purpose && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <span className="text-xs text-cyan-400/80 font-medium">{purpose}</span>
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
          </div>
        )}
        <SpecializedChartRenderer chartType={chartType} config={config} />
      </div>
    );
  }

  // 合并默认样式
  const chartStyle = useMemo(() => ({
    height: '280px',
    width: '100%',
    ...style,
  }), [style]);

  // 处理配置，应用深色主题
  const processedConfig = useMemo(() => {
    if (!config || typeof config !== 'object') {
      return createFallbackConfig();
    }

    // 深拷贝配置
    const newConfig = JSON.parse(JSON.stringify(config));

    // 应用深色主题基础设置
    newConfig.backgroundColor = 'transparent';
    newConfig.color = DARK_THEME_COLORS;

    // 标题样式
    if (newConfig.title) {
      newConfig.title = {
        ...newConfig.title,
        textStyle: {
          color: '#fff',
          fontSize: 14,
          fontWeight: 'bold',
          ...(newConfig.title.textStyle || {}),
        },
        subtextStyle: {
          color: 'rgba(255,255,255,0.5)',
          ...(newConfig.title.subtextStyle || {}),
        },
      };
    }

    // 图例样式
    if (newConfig.legend) {
      newConfig.legend = {
        ...newConfig.legend,
        textStyle: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
          ...(newConfig.legend.textStyle || {}),
        },
        pageTextStyle: { color: 'rgba(255,255,255,0.5)' },
        pageIconColor: '#00d4ff',
        pageIconInactiveColor: 'rgba(255,255,255,0.2)',
      };
    }

    // 工具提示样式
    newConfig.tooltip = {
      trigger: newConfig.tooltip?.trigger || 'axis',
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
      ...(newConfig.tooltip || {}),
    };

    // X轴样式
    if (newConfig.xAxis) {
      const xAxis = Array.isArray(newConfig.xAxis) ? newConfig.xAxis : [newConfig.xAxis];
      newConfig.xAxis = xAxis.map((axis: Record<string, unknown>) => ({
        ...axis,
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
          ...(axis.axisLine as object || {}),
        },
        axisTick: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
          ...(axis.axisTick as object || {}),
        },
        axisLabel: {
          color: 'rgba(255,255,255,0.6)',
          fontSize: 10,
          ...(axis.axisLabel as object || {}),
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.05)' },
          ...(axis.splitLine as object || {}),
        },
      }));
      if (!Array.isArray(config.xAxis)) {
        newConfig.xAxis = newConfig.xAxis[0];
      }
    }

    // Y轴样式
    if (newConfig.yAxis) {
      const yAxis = Array.isArray(newConfig.yAxis) ? newConfig.yAxis : [newConfig.yAxis];
      newConfig.yAxis = yAxis.map((axis: Record<string, unknown>) => ({
        ...axis,
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
          ...(axis.axisLine as object || {}),
        },
        axisTick: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
          ...(axis.axisTick as object || {}),
        },
        axisLabel: {
          color: 'rgba(255,255,255,0.6)',
          fontSize: 10,
          ...(axis.axisLabel as object || {}),
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' },
          ...(axis.splitLine as object || {}),
        },
        nameTextStyle: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10,
          ...(axis.nameTextStyle as object || {}),
        },
      }));
      if (!Array.isArray(config.yAxis)) {
        newConfig.yAxis = newConfig.yAxis[0];
      }
    }

    // 雷达图样式
    if (newConfig.radar) {
      newConfig.radar = {
        ...newConfig.radar,
        axisName: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 10,
          ...(newConfig.radar.axisName || {}),
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.15)' },
          ...(newConfig.radar.axisLine || {}),
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
          ...(newConfig.radar.splitLine || {}),
        },
        splitArea: {
          areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.05)'] },
          ...(newConfig.radar.splitArea || {}),
        },
      };
    }

    // 系列样式增强
    if (newConfig.series) {
      newConfig.series = (newConfig.series as Array<Record<string, unknown>>).map((series, idx) => {
        const enhancedSeries = { ...series };

        // 柱状图渐变
        if (series.type === 'bar') {
          enhancedSeries.itemStyle = {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: DARK_THEME_COLORS[idx % DARK_THEME_COLORS.length] },
                { offset: 1, color: `${DARK_THEME_COLORS[idx % DARK_THEME_COLORS.length]}80` },
              ],
            },
            ...(series.itemStyle as object || {}),
          };
          enhancedSeries.emphasis = {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: `${DARK_THEME_COLORS[idx % DARK_THEME_COLORS.length]}60`,
            },
            ...(series.emphasis as object || {}),
          };
        }

        // 折线图样式
        if (series.type === 'line') {
          enhancedSeries.lineStyle = {
            width: 2,
            shadowColor: `${DARK_THEME_COLORS[idx % DARK_THEME_COLORS.length]}40`,
            shadowBlur: 8,
            ...(series.lineStyle as object || {}),
          };
          enhancedSeries.areaStyle = {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${DARK_THEME_COLORS[idx % DARK_THEME_COLORS.length]}30` },
                { offset: 1, color: `${DARK_THEME_COLORS[idx % DARK_THEME_COLORS.length]}05` },
              ],
            },
            ...(series.areaStyle as object || {}),
          };
        }

        // 饼图样式
        if (series.type === 'pie') {
          enhancedSeries.itemStyle = {
            borderColor: '#0a0d12',
            borderWidth: 2,
            ...(series.itemStyle as object || {}),
          };
          enhancedSeries.label = {
            color: 'rgba(255,255,255,0.8)',
            fontSize: 11,
            ...(series.label as object || {}),
          };
        }

        // 雷达图样式
        if (series.type === 'radar') {
          enhancedSeries.areaStyle = {
            opacity: 0.2,
            ...(series.areaStyle as object || {}),
          };
          enhancedSeries.lineStyle = {
            width: 2,
            ...(series.lineStyle as object || {}),
          };
        }

        return enhancedSeries;
      });
    }

    // 网格设置
    if (!newConfig.grid && (newConfig.xAxis || newConfig.yAxis)) {
      newConfig.grid = {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: newConfig.title ? '15%' : '8%',
        containLabel: true,
      };
    }

    // 动画设置
    if (newConfig.animation === undefined) {
      newConfig.animation = true;
      newConfig.animationDuration = 1000;
      newConfig.animationEasing = 'cubicOut';
    }

    return newConfig;
  }, [config]);

  return (
    <div className="report-chart-container">
      {purpose && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="size-1.5 bg-cyan-400 rounded-full"></span>
          <span className="text-xs text-cyan-400/80 font-medium">{purpose}</span>
          <span className="size-1.5 bg-cyan-400 rounded-full"></span>
        </div>
      )}
      <ReactECharts
        option={processedConfig}
        style={chartStyle}
        opts={{ renderer: 'svg' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

/**
 * 专用图表组件渲染器
 */
const SpecializedChartRenderer: React.FC<{
  chartType: string;
  config: Record<string, unknown>;
}> = ({ chartType, config }) => {
  switch (chartType) {
    case 'radar':
      // 雷达图
      return (
        <RadarChart
          dimensions={config.dimensions as any[] || DEFAULT_ZONEX_DIMENSIONS}
          dataSets={config.dataSets as any[] || [{ name: '运动员', values: [50, 50, 50] }]}
          title={config.title as string}
          subtitle={config.subtitle as string}
          showLegend={config.showLegend !== false}
        />
      );

    case 'time_loss_waterfall':
      // 时间损耗瀑布图
      return (
        <TimeLossWaterfall
          data={config.data as any[] || []}
          title={config.title as string || '时间损耗分析'}
          targetSaveSeconds={config.targetSaveSeconds as number}
        />
      );

    case 'hr_pace_dual':
      // 心率配速双轴图
      return (
        <HRPaceDualAxis
          data={config.data as any[] || []}
          title={config.title as string || '心率配速走势'}
          showDecouplingMarkers={config.showDecouplingMarkers !== false}
        />
      );

    case 'prediction_tiers':
      // 五档预测卡片
      return (
        <PredictionTiers
          tiers={config.tiers as any}
          currentTime={config.currentTime as string || '--:--'}
          currentTimeSeconds={config.currentTimeSeconds as number || 0}
          statistics={config.statistics as any}
        />
      );

    case 'prediction_density':
      // 概率密度曲线
      return (
        <PredictionDensity
          curveData={config.curveData as Array<[number, number]> || config.distributionCurve as Array<[number, number]> || []}
          expected={config.expected as number || config.predictedMean as number || 80}
          variance={config.variance as number || 600}
          range={config.range as { low: number; high: number } || { low: 75, high: 90 }}
          sampleSize={config.sampleSize as number || 1000}
          improvementRate={config.improvementRate as number}
          title={config.title as string}
        />
      );

    case 'pacing_consistency':
      // 配速一致性卡片
      return (
        <PacingConsistencyCard
          data={config.data as any}
          title={config.title as string || '配速一致性'}
        />
      );

    case 'cohort_comparison':
      // 同水平对比卡片
      return (
        <CohortComparison
          athleteName={config.athleteName as string || '运动员'}
          athleteRank={config.athleteRank as number || 0}
          athleteTime={config.athleteTime as number || 0}
          peerRange={config.peerRange as string || ''}
          peersAhead={config.peersAhead as any[] || []}
          peersBehind={config.peersBehind as any[] || []}
          timeToNextLevel={config.timeToNextLevel as number | null}
          title={config.title as string}
        />
      );

    case 'cohort_distribution':
      // 同水平选手群体分布（四组分布卡片）
      return (
        <CohortDistribution
          cohortSize={config.cohortSize as number || config.cohort_size as number || 1000}
          timeRange={config.timeRange as string || config.time_range as string || ''}
          groups={config.groups as any || {
            regress: { percentage: 15, avg_time: 90, characteristics: '缺乏系统训练' },
            maintain: { percentage: 35, avg_time: 86, characteristics: '维持原有训练' },
            improve: { percentage: 40, avg_time: 82, characteristics: '针对短板修正' },
            elite: { percentage: 10, avg_time: 78, characteristics: '严格周期化训练' },
          }}
          title={config.title as string}
        />
      );

    case 'training_week_view':
      // 周训练日历
      return (
        <TrainingWeekView
          weeklyPlan={config.weeklyPlan as any[] || config.days as any[] || []}
          weekNumber={config.weekNumber as number || 1}
          phase={config.phase as string}
          focusAreas={config.focusAreas as string[]}
        />
      );

    case 'priority_matrix':
      // 训练优先级矩阵
      return (
        <PriorityMatrix
          items={config.items as any[] || []}
          title={config.title as string || '训练优先级'}
        />
      );

    case 'horizontal_bar':
      // 横向柱状图
      return (
        <HorizontalBar
          items={config.items as any[] || config.data as any[] || []}
          totalLoss={config.totalLoss as number || 0}
          title={config.title as string || '损耗排行'}
        />
      );

    case 'splits_breakdown':
      // 分段时间对比
      return (
        <SplitsBreakdown
          data={config.data as any[] || []}
          title={config.title as string || '分段时间对比'}
        />
      );

    case 'pace_trend':
      // 配速走势图
      return (
        <PaceTrendChart
          data={config.data as any[] || []}
          title={config.title as string || '配速走势'}
        />
      );

    case 'distribution_histogram':
      // 分布直方图
      return (
        <DistributionHistogram
          bins={config.bins as number[] || []}
          counts={config.counts as number[] || []}
          userValue={config.userValue as number || config.athleteValue as number || 0}
          userPercentile={config.userPercentile as number || 50}
          totalAthletes={config.totalAthletes as number || 1000}
          title={config.title as string || '全球分布'}
        />
      );

    default:
      // 未知类型，显示占位符
      return (
        <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
          <span className="text-white/40 text-sm">未知图表类型: {chartType}</span>
        </div>
      );
  }
};

// 创建降级配置
function createFallbackConfig() {
  return {
    backgroundColor: 'transparent',
    title: {
      text: '数据加载中...',
      left: 'center',
      top: 'center',
      textStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
    },
  };
}

export default ReportChart;


/**
 * 解析报告内容中的图表标记
 * 将 [CHART:chart_id] 标记替换为实际图表
 */
export interface ChartConfig {
  config: Record<string, unknown>;
  purpose?: string;
  chart_type?: string;
}

export interface ParsedContentPart {
  type: 'text' | 'chart';
  content?: string;
  chartId?: string;
  config?: Record<string, unknown>;
  purpose?: string;
  chartType?: string;
}

export function parseChartMarkers(
  content: string,
  charts: Record<string, ChartConfig>
): ParsedContentPart[] {
  const result: ParsedContentPart[] = [];
  
  // 匹配 [CHART:xxx] 标记
  const chartPattern = /\[CHART:([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = chartPattern.exec(content)) !== null) {
    // 添加标记前的文本
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        result.push({ type: 'text', content: textContent });
      }
    }

    // 添加图表
    const chartId = match[1];
    const chartData = charts[chartId];
    if (chartData) {
      result.push({
        type: 'chart',
        chartId,
        config: chartData.config,
        purpose: chartData.purpose,
        chartType: chartData.chart_type,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      result.push({ type: 'text', content: textContent });
    }
  }

  return result;
}
