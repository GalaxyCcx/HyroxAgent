/**
 * ComparisonChart - 柱状图 + 折线图叠加（你 vs Top10%）
 * 用于第1章分段对比
 */

import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatTime } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface ComparisonChartPoint {
  segment: string;
  you: number;   // 秒
  top10: number; // 秒
}

interface ComparisonChartProps {
  chart_data?: ComparisonChartPoint[];
  title?: string;
  highlightIndex?: number; // 高亮柱子的索引（由数据确定的最差段）
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  chart_data = [],
  title = '分段对比 (vs Top 10%)',
  highlightIndex,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const categories = chart_data.map((d) => d.segment);
    const youData = chart_data.map((d) => d.you);
    const top10Data = chart_data.map((d) => d.top10);

    return {
      grid: {
        top: 30,
        right: 24,
        bottom: 40,
        left: 56,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 10,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        min: (value: { min: number }) => Math.max(0, value.min - 30),
        axisLabel: {
          formatter: (value: number) => {
            const m = Math.floor(value / 60);
            const s = Math.floor(value % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
          },
        },
      },
      series: [
        {
          name: '你',
          type: 'bar',
          data: youData.map((v, i) => ({
            value: v,
            itemStyle: {
              color: i === highlightIndex ? CHART_COLORS.danger : '#00FF88',
            },
          })),
          barWidth: '36%',
        },
        {
          name: 'Top 10%',
          type: 'line',
          data: top10Data,
          lineStyle: { color: CHART_COLORS.textSecondary, type: 'dashed' },
          itemStyle: { color: CHART_COLORS.textSecondary },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
      legend: {
        data: ['你', 'Top 10%'],
        bottom: 0,
      },
      tooltip: {
        formatter: (params: any) => {
          const arr = Array.isArray(params) ? params : [params];
          const point = chart_data[arr[0]?.dataIndex];
          if (!point) return '';
          return `
            <div style="font-weight:bold;margin-bottom:6px">${point.segment}</div>
            <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#9ca3af">你</span><span style="color:#00FF88">${formatTime(point.you)}</span></div>
            <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#9ca3af">Top 10%</span><span>${formatTime(point.top10)}</span></div>
          `;
        },
      },
    };
  }, [chart_data, highlightIndex]);

  if (!chart_data.length) return null;

  return (
    <div className="mb-4">
      {title && (
        <div className="text-sm font-semibold text-white mb-2">{title}</div>
      )}
      <ChartRenderer option={option} style={{ height: '260px' }} />
    </div>
  );
};

export default ComparisonChart;
