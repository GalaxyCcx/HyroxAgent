/**
 * RadarChart - ZONEØ 能力雷达图
 * 版本: v1.0
 * 
 * 功能：
 * - 三维/多维能力评估：力量、有氧底座、转换效率等
 * - 运动员 vs 组别平均对比
 * - 支持自定义维度
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface RadarDimension {
  name: string;       // 维度名称
  max: number;        // 最大值
  description?: string; // 维度描述
}

export interface RadarDataSet {
  name: string;       // 数据集名称（如"运动员"、"组别平均"）
  values: number[];   // 各维度的值
  color?: string;     // 自定义颜色
}

interface RadarChartProps {
  dimensions: RadarDimension[];
  dataSets: RadarDataSet[];
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  shape?: 'polygon' | 'circle';
  style?: React.CSSProperties;
  className?: string;
}

// 默认三维配置（ZONEØ 标准）
export const DEFAULT_ZONEX_DIMENSIONS: RadarDimension[] = [
  { name: '力量', max: 100, description: '功能站表现' },
  { name: '有氧底座', max: 100, description: '跑步耐力' },
  { name: '转换效率', max: 100, description: 'Roxzone时间' },
];

// 扩展六维配置
export const EXTENDED_DIMENSIONS: RadarDimension[] = [
  { name: '力量', max: 100 },
  { name: '有氧耐力', max: 100 },
  { name: '转换效率', max: 100 },
  { name: '配速控制', max: 100 },
  { name: '心率管理', max: 100 },
  { name: '后程能力', max: 100 },
];

const RadarChart: React.FC<RadarChartProps> = ({
  dimensions,
  dataSets,
  title = '能力评估',
  subtitle,
  showLegend = true,
  shape = 'polygon',
  style,
  className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    // 默认颜色
    const defaultColors = [CHART_COLORS.cyan, CHART_COLORS.purple, CHART_COLORS.success];
    const dims = dimensions ?? [];
    const indicator = dims.map(d => ({
      name: d.name,
      max: d.max,
    }));

    const seriesData = dataSets.map((ds, idx) => ({
      value: ds.values,
      name: ds.name,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: ds.color || defaultColors[idx % defaultColors.length],
        shadowColor: `${ds.color || defaultColors[idx % defaultColors.length]}40`,
        shadowBlur: 8,
      },
      areaStyle: {
        color: {
          type: 'radial',
          x: 0.5, y: 0.5, r: 0.5,
          colorStops: [
            { offset: 0, color: `${ds.color || defaultColors[idx % defaultColors.length]}40` },
            { offset: 1, color: `${ds.color || defaultColors[idx % defaultColors.length]}10` },
          ],
        },
      },
      itemStyle: {
        color: ds.color || defaultColors[idx % defaultColors.length],
        borderColor: '#fff',
        borderWidth: 1,
      },
    }));

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: any) => {
          const data = params.data;
          let html = `<div style="font-weight:bold;margin-bottom:8px">${data.name}</div>`;
          dims.forEach((dim, idx) => {
            const value = data.value[idx];
            const color = value >= 70 ? CHART_COLORS.success : value >= 40 ? CHART_COLORS.warning : CHART_COLORS.danger;
            html += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px">
              <span>${dim.name}</span>
              <span style="color:${color};font-weight:bold">${value}</span>
            </div>`;
          });
          return html;
        },
      },
      legend: showLegend ? {
        data: (dataSets ?? []).map(d => d.name),
        top: 0,
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        itemWidth: 16,
        itemHeight: 8,
      } : undefined,
      radar: {
        indicator,
        shape,
        radius: '65%',
        center: ['50%', '55%'],
        axisName: {
          color: CHART_COLORS.textSecondary,
          fontSize: 11,
          fontWeight: 'bold',
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)', 'rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)'],
          },
        },
        splitNumber: 4,
      },
      series: [{
        type: 'radar',
        data: seriesData,
        emphasis: {
          lineStyle: {
            width: 3,
          },
        },
      }],
    };
  }, [dimensions, dataSets, showLegend, shape]);

  // 计算各数据集的综合得分
  const scores = useMemo(() => {
    const dims = dimensions ?? [];
    const sets = dataSets ?? [];
    return sets.map(ds => ({
      name: ds.name,
      avgScore: (ds.values?.length ? Math.round(ds.values.reduce((sum, v) => sum + v, 0) / ds.values.length) : 0),
      maxDim: dims[ds.values?.indexOf(Math.max(...(ds.values || []))) ?? -1]?.name || '',
      minDim: dims[ds.values?.indexOf(Math.min(...(ds.values || []))) ?? -1]?.name || '',
    }));
  }, [dataSets, dimensions]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      )}
      
      <ChartRenderer
        option={option}
        style={{ height: '280px', ...style }}
      />
      
      {/* 综合得分 */}
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min((dataSets ?? []).length, 3)}, 1fr)` }}>
        {scores.map((score, idx) => (
          <div key={idx} className="bg-[#252525] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-400 mb-1">{score.name}</div>
            <div className={`text-xl font-bold ${score.avgScore >= 70 ? 'text-green-400' : score.avgScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {score.avgScore}
            </div>
            <div className="text-[9px] text-gray-500 mt-1">
              强项: {score.maxDim} | 弱项: {score.minDim}
            </div>
          </div>
        ))}
      </div>
      
      {/* 维度说明 */}
      {(dimensions ?? []).some(d => d.description) && (
        <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-gray-500">
          {(dimensions ?? []).filter(d => d.description).map((dim, idx) => (
            <span key={idx} className="bg-[#252525] px-2 py-1 rounded">
              {dim.name}: {dim.description}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default RadarChart;

/**
 * 生成 Mock 数据用于测试（三维 ZONEØ）
 */
export function generateMockRadarData(): { dimensions: RadarDimension[]; dataSets: RadarDataSet[] } {
  return {
    dimensions: DEFAULT_ZONEX_DIMENSIONS,
    dataSets: [
      {
        name: '运动员',
        values: [75, 62, 58],
        color: CHART_COLORS.cyan,
      },
      {
        name: '组别平均',
        values: [55, 55, 55],
        color: CHART_COLORS.purple,
      },
    ],
  };
}

/**
 * 生成 Mock 数据用于测试（六维扩展）
 */
export function generateMockExtendedRadarData(): { dimensions: RadarDimension[]; dataSets: RadarDataSet[] } {
  return {
    dimensions: EXTENDED_DIMENSIONS,
    dataSets: [
      {
        name: '运动员',
        values: [75, 62, 58, 70, 55, 48],
        color: CHART_COLORS.cyan,
      },
      {
        name: '组别平均',
        values: [55, 55, 55, 55, 55, 55],
        color: CHART_COLORS.purple,
      },
    ],
  };
}
