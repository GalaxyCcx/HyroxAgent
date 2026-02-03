/**
 * DecouplingChart - 第2章心率-配速解耦图
 * 双 Y 轴：左轴配速 (s/km) 绿色，右轴心率 (bpm) 红色；支持脱钩区域背景高亮
 */
import React, { useMemo } from 'react';
import ChartRenderer from './ChartRenderer';
import type { EChartsOption } from 'echarts';
import { REPORT_THEME } from '../../styles/report-theme';

export interface DecouplingDataPoint {
  segment: string;
  pace_seconds: number;
  hr: number;
}

interface DecouplingZone {
  start?: string;
  end?: string;
}

interface DecouplingChartProps {
  data?: DecouplingDataPoint[];
  decoupling_zone?: DecouplingZone;
  style?: React.CSSProperties;
  className?: string;
}

const formatPaceSeconds = (s: number) => {
  const min = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const DecouplingChart: React.FC<DecouplingChartProps> = ({
  data = [],
  decoupling_zone,
  style,
  className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    if (!data.length) return {};
    const segments = data.map((d) => d.segment);
    const paceData = data.map((d) => d.pace_seconds);
    const hrData = data.map((d) => d.hr);
    const minPace = Math.min(...paceData) - 15;
    const maxPace = Math.max(...paceData) + 15;
    const minHr = Math.max(0, Math.min(...hrData) - 10);
    const maxHr = Math.min(220, Math.max(...hrData) + 10);

    let markArea: EChartsOption['series'] extends (infer S)[] ? (S extends { markArea?: infer M } ? M : never) : never;
    if (decoupling_zone?.start && decoupling_zone?.end) {
      const startIdx = segments.indexOf(decoupling_zone.start);
      const endIdx = segments.indexOf(decoupling_zone.end);
      if (startIdx >= 0 && endIdx >= 0) {
        const xStart = Math.max(0, startIdx - 0.5);
        const xEnd = Math.min(segments.length - 1, endIdx + 0.5);
        markArea = {
          silent: true,
          data: [[{ xAxis: xStart, itemStyle: { color: 'rgba(255, 107, 107, 0.12)' } }, { xAxis: xEnd }]],
        };
      }
    }

    return {
      backgroundColor: 'transparent',
      grid: { top: 40, right: 60, bottom: 40, left: 60 },
      xAxis: {
        type: 'category',
        data: segments,
        axisLine: { lineStyle: { color: REPORT_THEME.border } },
        axisLabel: { color: REPORT_THEME.text.secondary, fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          name: '配速(s/km)',
          min: minPace,
          max: maxPace,
          position: 'left',
          axisLine: { lineStyle: { color: REPORT_THEME.accent } },
          axisLabel: {
            color: REPORT_THEME.accent,
            formatter: (value: number) => formatPaceSeconds(value),
          },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        },
        {
          type: 'value',
          name: '心率',
          min: minHr,
          max: maxHr,
          position: 'right',
          axisLine: { lineStyle: { color: REPORT_THEME.warning } },
          axisLabel: { color: REPORT_THEME.warning, formatter: '{value}' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '配速 (s/km)',
          type: 'line',
          data: paceData,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: REPORT_THEME.accent, width: 3 },
          itemStyle: { color: REPORT_THEME.accent },
          markArea,
        },
        {
          name: '心率 (bpm)',
          type: 'line',
          data: hrData,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: REPORT_THEME.warning, width: 3 },
          itemStyle: { color: REPORT_THEME.warning },
        },
      ],
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = params as { dataIndex: number; seriesName: string; value: number }[][];
          if (!p?.length || !data[p[0].dataIndex]) return '';
          const d = data[p[0].dataIndex];
          return `<div style="font-weight:bold">${d.segment}</div>
            <div style="color:${REPORT_THEME.accent}">配速: ${formatPaceSeconds(d.pace_seconds)}/km</div>
            <div style="color:${REPORT_THEME.warning}">心率: ${d.hr} bpm</div>`;
        },
      },
    };
  }, [data, decoupling_zone]);

  if (!data.length) return null;

  return (
    <div className={className}>
      <div className="bg-[#1A1A1A] rounded-xl p-4">
        <div className="text-base font-semibold text-white mb-3">心率-配速解耦图</div>
        <ChartRenderer option={option} style={{ height: 280, ...style }} />
        <div className="flex justify-center gap-6 mt-3 text-xs" style={{ color: REPORT_THEME.text.secondary }}>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded" style={{ background: REPORT_THEME.warning }} />
            心率 (bpm)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded" style={{ background: REPORT_THEME.accent }} />
            配速 (s/km)
          </span>
        </div>
      </div>
    </div>
  );
};

export default DecouplingChart;
