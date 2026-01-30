/**
 * PacingConsistencyCard - 配速一致性卡片组件
 * 版本: v1.0
 * 
 * 功能：
 * - 展示 Lap-to-Lap Swing（相邻圈配速变化）
 * - 展示 Avg Pace (R2-R7)（中间圈平均配速）
 * - 展示 Spread（最快-最慢极差）
 * - 配速一致性评级
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface PacingConsistencyData {
  lapSwing: number;          // 平均 Lap-to-Lap 变化 (秒)
  maxLapSwing: number;       // 最大单次变化 (秒)
  avgPace: number;           // 中间圈平均配速 (秒)
  spread: number;            // 最快-最慢极差 (秒)
  cohortAvgSpread: number;   // 同组平均极差 (秒)
  vsCohort: number;          // 相对组别差值 (秒)
  rating: string;            // 评级: Excellent/Consistent/Variable/Erratic
  lapDeviations: Array<{
    lap: number;
    time: number;
    deviation: number;
  }>;
  fastestLap: number;
  slowestLap: number;
}

interface PacingConsistencyCardProps {
  data: PacingConsistencyData;
  title?: string;
  className?: string;
}

const PacingConsistencyCard: React.FC<PacingConsistencyCardProps> = ({
  data,
  title = '配速一致性分析',
  className = '',
}) => {
  // 评级颜色映射
  const getRatingStyle = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: '🟢' };
      case 'Consistent':
        return { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', icon: '🔵' };
      case 'Variable':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', icon: '🟡' };
      case 'Erratic':
        return { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: '🔴' };
      default:
        return { color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30', icon: '⚪' };
    }
  };

  const ratingStyle = getRatingStyle(data.rating);

  // 格式化秒数为 M:SS
  const formatSeconds = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.round(Math.abs(seconds) % 60);
    const sign = seconds < 0 ? '-' : '';
    return mins > 0 ? `${sign}${mins}:${secs.toString().padStart(2, '0')}` : `${sign}${secs}s`;
  };

  // 偏差图表配置
  const deviationChartOption = useMemo<EChartsOption>(() => {
    const deviations = data.lapDeviations || [];
    
    return {
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          if (idx === undefined) return '';
          const item = deviations[idx];
          return `
            <div style="font-weight:bold">Run ${item.lap}</div>
            <div>时间: ${formatSeconds(item.time)}</div>
            <div style="color:${item.deviation > 0 ? CHART_COLORS.danger : CHART_COLORS.success}">
              偏差: ${item.deviation > 0 ? '+' : ''}${formatSeconds(item.deviation)}
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: deviations.map(d => `R${d.lap}`),
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        name: '偏差 (秒)',
        nameTextStyle: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
        },
      },
      series: [
        {
          type: 'bar',
          data: deviations.map(d => ({
            value: d.deviation,
            itemStyle: {
              color: d.deviation > 0 ? CHART_COLORS.danger : CHART_COLORS.success,
              borderRadius: d.deviation > 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          barWidth: '60%',
          markLine: {
            silent: true,
            data: [{ yAxis: 0 }],
            lineStyle: { color: CHART_COLORS.textMuted, type: 'solid', width: 1 },
            label: { show: false },
          },
        },
      ],
    };
  }, [data.lapDeviations]);

  return (
    <div className={`pacing-consistency-card ${className}`}>
      {/* 标题 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          {/* 评级徽章 */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded border ${ratingStyle.bgColor} ${ratingStyle.borderColor}`}>
            <span className="text-xs">{ratingStyle.icon}</span>
            <span className={`text-xs font-bold ${ratingStyle.color}`}>{data.rating}</span>
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Lap-to-Lap Swing */}
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">Lap-to-Lap Swing</div>
          <div className={`text-xl font-bold ${data.lapSwing < 15 ? 'text-green-400' : data.lapSwing < 25 ? 'text-yellow-400' : 'text-red-400'}`}>
            {formatSeconds(data.lapSwing)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            最大变化: {formatSeconds(data.maxLapSwing)}
          </div>
        </div>

        {/* Avg Pace (R2-R7) */}
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">Avg Pace (R2-R7)</div>
          <div className="text-xl font-bold text-white">
            {Math.floor(data.avgPace / 60)}:{(data.avgPace % 60).toFixed(0).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            中间圈平均
          </div>
        </div>

        {/* Spread */}
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">Spread (极差)</div>
          <div className={`text-xl font-bold ${data.spread < data.cohortAvgSpread ? 'text-green-400' : 'text-yellow-400'}`}>
            {formatSeconds(data.spread)}
          </div>
          <div className={`text-[10px] mt-1 ${data.vsCohort < 0 ? 'text-green-400' : 'text-red-400'}`}>
            vs 组别: {data.vsCohort > 0 ? '+' : ''}{formatSeconds(data.vsCohort)}
          </div>
        </div>
      </div>

      {/* 偏差分布图 */}
      <div className="bg-[#1a1a1a] rounded-lg p-3">
        <div className="text-[10px] text-gray-500 mb-2">各圈相对于平均的偏差</div>
        <ChartRenderer
          option={deviationChartOption}
          style={{ height: '150px' }}
        />
      </div>

      {/* 快慢圈提示 */}
      <div className="mt-3 flex justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2 bg-green-500 rounded-full"></span>
          <span className="text-gray-400">最快: Run {data.fastestLap}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 bg-red-500 rounded-full"></span>
          <span className="text-gray-400">最慢: Run {data.slowestLap}</span>
        </div>
      </div>

      {/* 建议说明 */}
      <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
        <span className="text-gray-400">配速一致性建议:</span>{' '}
        {data.rating === 'Excellent' || data.rating === 'Consistent' ? (
          <span className="text-green-400">配速控制出色，保持当前策略</span>
        ) : data.rating === 'Variable' ? (
          <span className="text-yellow-400">配速有波动，建议在前半程稍微保守，后半程发力</span>
        ) : (
          <span className="text-red-400">配速波动较大，建议加强节奏感训练，关注心率控制</span>
        )}
      </div>
    </div>
  );
};

export default PacingConsistencyCard;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockPacingConsistency(): PacingConsistencyData {
  return {
    lapSwing: 18.5,
    maxLapSwing: 32,
    avgPace: 312, // 5:12
    spread: 45,
    cohortAvgSpread: 38,
    vsCohort: 7,
    rating: 'Variable',
    lapDeviations: [
      { lap: 1, time: 302, deviation: -10 },
      { lap: 2, time: 310, deviation: -2 },
      { lap: 3, time: 315, deviation: 3 },
      { lap: 4, time: 320, deviation: 8 },
      { lap: 5, time: 325, deviation: 13 },
      { lap: 6, time: 330, deviation: 18 },
      { lap: 7, time: 335, deviation: 23 },
      { lap: 8, time: 340, deviation: 28 },
    ],
    fastestLap: 1,
    slowestLap: 8,
  };
}
