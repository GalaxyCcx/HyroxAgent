/**
 * HYROX 报告系统图表组件导出
 * 版本: v2.0
 * 
 * 包含组件：
 * - ChartRenderer: 通用 ECharts 渲染器
 * - PerformanceHeatmap: 16段表现热力图
 * - SplitsBreakdown: 分段时间对比柱状图
 * - HRPaceDualAxis: 心率配速双轴图
 * - TimeLossWaterfall: 时间损耗瀑布图
 * - RadarChart: 能力雷达图
 * - PredictionTiers: 五档预测卡片 (v2.1新增)
 * - PredictionDensity: 预测概率密度曲线 (v2.1新增)
 * - SplitBreakdownTable: 预测分段拆解表格 (v2.1新增)
 */

// 基础渲染器和工具函数
export { default as ChartRenderer } from './ChartRenderer';
export {
  CHART_COLORS,
  DEFAULT_COLOR_PALETTE,
  getPercentileColor,
  getDifficultyColor,
  formatTime,
  formatPace,
} from './ChartRenderer';

// 表现热力图
export { default as PerformanceHeatmap } from './PerformanceHeatmap';
export { generateMockHeatmapData } from './PerformanceHeatmap';
export type { SegmentPerformance } from './PerformanceHeatmap';

// 分段时间对比
export { default as SplitsBreakdown } from './SplitsBreakdown';
export { generateMockSplitsData } from './SplitsBreakdown';
export type { SplitData } from './SplitsBreakdown';

// 心率配速双轴图
export { default as HRPaceDualAxis } from './HRPaceDualAxis';
export { generateMockHRPaceData } from './HRPaceDualAxis';
export type { HRPaceDataPoint } from './HRPaceDualAxis';

// 时间损耗瀑布图
export { default as TimeLossWaterfall } from './TimeLossWaterfall';
export { generateMockTimeLossData } from './TimeLossWaterfall';
export type { TimeLossItem } from './TimeLossWaterfall';

// 能力雷达图
export { default as RadarChart } from './RadarChart';
export {
  DEFAULT_ZONEX_DIMENSIONS,
  EXTENDED_DIMENSIONS,
  generateMockRadarData,
  generateMockExtendedRadarData,
} from './RadarChart';
export type { RadarDimension, RadarDataSet } from './RadarChart';

// 5维能力雷达图 (V4 新增)
export { default as RadarChart5D } from './RadarChart5D';

// 环形评分组件 (V4 新增)
export { default as ScoreRing } from './ScoreRing';

// ==================== v2.1 新增组件 ====================

// 五档预测卡片
export { default as PredictionTiers } from './PredictionTiers';
export { generateMockPredictionTiers } from './PredictionTiers';
export type { PredictionTier } from './PredictionTiers';

// 预测概率密度曲线
export { default as PredictionDensity } from './PredictionDensity';
export { generateMockPredictionDensity } from './PredictionDensity';
export type { PredictionDensityProps } from './PredictionDensity';

// 预测分段拆解表格
export { default as SplitBreakdownTable } from './SplitBreakdownTable';
export { generateMockSplitBreakdown } from './SplitBreakdownTable';
export type { SplitTarget } from './SplitBreakdownTable';

// 配速走势图 (第3章无心率时的降级图表)
export { default as PaceTrendChart } from './PaceTrendChart';
export { generateMockPaceTrendData } from './PaceTrendChart';
export type { PaceTrendDataPoint } from './PaceTrendChart';

// 周训练日历 (第6章训练计划展示)
export { default as TrainingWeekView } from './TrainingWeekView';
export { generateMockTrainingWeek } from './TrainingWeekView';
export type { TrainingDay } from './TrainingWeekView';

// 分布直方图 (第1章全球分布展示)
export { default as DistributionHistogram } from './DistributionHistogram';
export { generateMockDistributionData } from './DistributionHistogram';
export type { DistributionHistogramProps } from './DistributionHistogram';

// 配速一致性卡片 (第2/3章配速分析)
export { default as PacingConsistencyCard } from './PacingConsistencyCard';
export { generateMockPacingConsistency } from './PacingConsistencyCard';
export type { PacingConsistencyData } from './PacingConsistencyCard';

// 双雷达图 (第5章对标分析)
export { default as DualRadar } from './DualRadar';
export { generateMockDualRadarData } from './DualRadar';
export type { RadarDataPoint, DualRadarProps } from './DualRadar';

// ==================== v2.1 新增图表组件 (第二批) ====================

// 横向柱状图 (第2章损耗排行)
export { default as HorizontalBar } from './HorizontalBar';
export type { HorizontalBarItem } from './HorizontalBar';

// 同水平对比卡片 (第5章对标分析)
export { default as CohortComparison } from './CohortComparison';

// 训练优先级矩阵 (第6章训练建议)
export { default as PriorityMatrix } from './PriorityMatrix';

// 同水平选手群体分布 (第4章预测分析)
export { default as CohortDistribution } from './CohortDistribution';
export { generateMockCohortDistribution } from './CohortDistribution';
