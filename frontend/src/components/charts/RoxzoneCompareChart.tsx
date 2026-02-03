/**
 * RoxzoneCompareChart - 第2章转换区总耗时对比
 * 横向条形图：你 / Top10% / 平均
 */
import React, { useMemo } from 'react';
import ChartRenderer from './ChartRenderer';
import type { EChartsOption } from 'echarts';
import { REPORT_THEME } from '../../styles/report-theme';

interface CompareItem {
  label?: string;
  value?: string;
  seconds?: number;
}

interface RoxzoneCompareChartProps {
  you?: CompareItem;
  top10?: CompareItem;
  avg?: CompareItem;
  style?: React.CSSProperties;
  className?: string;
}

const RoxzoneCompareChart: React.FC<RoxzoneCompareChartProps> = ({
  you,
  top10,
  avg,
  style,
  className,
}) => {
  const rows = useMemo(() => {
    const items: { label: string; value: number; color: string }[] = [];
    if (avg?.seconds != null) items.push({ label: avg.label || '平均', value: avg.seconds, color: REPORT_THEME.text.muted });
    if (top10?.seconds != null) items.push({ label: top10.label || 'Top 10%', value: top10.seconds, color: REPORT_THEME.accent });
    if (you?.seconds != null) items.push({ label: you.label || '你', value: you.seconds, color: REPORT_THEME.warning });
    return items;
  }, [you, top10, avg]);

  const option = useMemo<EChartsOption>(() => {
    if (!rows.length) return {};
    const maxVal = Math.max(...rows.map((r) => r.value), 1);
    return {
      backgroundColor: 'transparent',
      grid: { top: 20, right: 90, bottom: 20, left: 80 },
      xAxis: {
        type: 'value',
        max: maxVal * 1.1,
        axisLine: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: rows.map((r) => r.label),
        axisLine: { lineStyle: { color: REPORT_THEME.border } },
        axisLabel: { color: REPORT_THEME.text.secondary },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => ({
            value: r.value,
            itemStyle: { color: r.color },
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'right',
            color: REPORT_THEME.text.primary,
            formatter: (params: { value: number }) => {
              const m = Math.floor(params.value / 60);
              const s = Math.round(params.value % 60);
              return `${m}:${s < 10 ? '0' : ''}${s}`;
            },
          },
        },
      ],
    };
  }, [rows]);

  if (!rows.length) return null;

  return (
    <div className={className}>
      <div className="bg-[#1A1A1A] rounded-xl p-4">
        <div className="text-base font-semibold text-white mb-3">Roxzone 总耗时对比</div>
        <ChartRenderer option={option} style={{ height: 180, ...style }} />
        <div className="flex flex-col gap-2 mt-3">
          {you?.value != null && (
            <div className="flex justify-between text-sm">
              <span style={{ color: REPORT_THEME.text.secondary }}>你的 Roxzone 总耗时</span>
              <span className="font-semibold" style={{ color: REPORT_THEME.warning }}>{you.value}</span>
            </div>
          )}
          {top10?.value != null && (
            <div className="flex justify-between text-sm">
              <span style={{ color: REPORT_THEME.text.secondary }}>Top 10% 平均</span>
              <span className="font-semibold" style={{ color: REPORT_THEME.accent }}>{top10.value}</span>
            </div>
          )}
          {avg?.value != null && (
            <div className="flex justify-between text-sm">
              <span style={{ color: REPORT_THEME.text.secondary }}>全场平均</span>
              <span className="font-semibold text-white">{avg.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoxzoneCompareChart;
