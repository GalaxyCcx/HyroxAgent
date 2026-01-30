/**
 * HRPaceDualAxis - 心率配速双轴图
 * 版本: v1.0
 * 
 * 功能：
 * - 左Y轴：心率(bpm)
 * - 右Y轴：配速(min/km，反向)
 * - 标记脱钩点（心率升高但配速下降的区域）
 * - 心率用红色，配速用蓝色
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatPace } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface HRPaceDataPoint {
  segment: string;        // 分段名称
  hr: number;             // 心率 (bpm)
  pace: number;           // 配速 (min/km)
  isDecoupling?: boolean; // 是否为脱钩点
}

interface HRPaceDualAxisProps {
  data: HRPaceDataPoint[];
  title?: string;
  athleteName?: string;
  showDecouplingMarkers?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const HRPaceDualAxis: React.FC<HRPaceDualAxisProps> = ({
  data,
  title = '心率配速走势',
  athleteName,
  showDecouplingMarkers = true,
  style,
  className,
}) => {
  // 检测脱钩点
  const decouplingPoints = useMemo(() => {
    const points: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      // 心率上升但配速变慢（数值变大）
      if (curr.hr > prev.hr && curr.pace > prev.pace) {
        points.push(i);
      }
    }
    return points;
  }, [data]);

  const option = useMemo<EChartsOption>(() => {
    const segments = data.map(d => d.segment);
    const hrData = data.map(d => d.hr);
    const paceData = data.map(d => d.pace);

    // 计算配速Y轴范围（反向显示，数值小的在上面）
    const minPace = Math.floor(Math.min(...paceData) - 0.5);
    const maxPace = Math.ceil(Math.max(...paceData) + 0.5);

    // 脱钩点标记
    const markPointData = showDecouplingMarkers ? decouplingPoints.map(idx => ({
      coord: [idx, data[idx].hr],
      symbol: 'triangle',
      symbolSize: 12,
      itemStyle: {
        color: CHART_COLORS.warning,
      },
      label: {
        show: true,
        position: 'top',
        formatter: '脱钩',
        color: CHART_COLORS.warning,
        fontSize: 9,
        fontWeight: 'bold',
      },
    })) : [];

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: CHART_COLORS.textMuted,
          },
        },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          if (idx === undefined) return '';
          
          const item = data[idx];
          const isDecoupling = decouplingPoints.includes(idx);
          
          return `
            <div style="font-weight:bold;margin-bottom:8px">${item.segment}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;background:${CHART_COLORS.danger};border-radius:50%"></span>
              <span>心率: ${item.hr} bpm</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="display:inline-block;width:10px;height:10px;background:${CHART_COLORS.primary};border-radius:50%"></span>
              <span>配速: ${formatPace(item.pace)}/km</span>
            </div>
            ${isDecoupling ? `<div style="color:${CHART_COLORS.warning};margin-top:6px;font-weight:bold">⚠️ 心率配速脱钩</div>` : ''}
          `;
        },
      },
      legend: {
        data: ['心率 (bpm)', '配速 (min/km)'],
        top: 0,
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        itemWidth: 16,
        itemHeight: 8,
      },
      grid: {
        left: '3%',
        right: '5%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: segments,
        axisLabel: {
          rotate: 45,
          color: CHART_COLORS.textSecondary,
          fontSize: 9,
          interval: 0,
        },
        axisPointer: {
          type: 'shadow',
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '心率',
          position: 'left',
          min: 100,
          max: 200,
          interval: 20,
          nameTextStyle: {
            color: CHART_COLORS.danger,
            fontSize: 10,
          },
          axisLabel: {
            color: CHART_COLORS.danger,
            fontSize: 10,
            formatter: '{value}',
          },
          axisLine: {
            show: true,
            lineStyle: { color: CHART_COLORS.danger },
          },
          splitLine: {
            lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
          },
        },
        {
          type: 'value',
          name: '配速',
          position: 'right',
          min: minPace,
          max: maxPace,
          inverse: true, // 反向，配速小的在上面
          nameTextStyle: {
            color: CHART_COLORS.primary,
            fontSize: 10,
          },
          axisLabel: {
            color: CHART_COLORS.primary,
            fontSize: 10,
            formatter: (value: number) => formatPace(value),
          },
          axisLine: {
            show: true,
            lineStyle: { color: CHART_COLORS.primary },
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '心率 (bpm)',
          type: 'line',
          yAxisIndex: 0,
          data: hrData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: CHART_COLORS.danger,
            width: 2,
            shadowColor: `${CHART_COLORS.danger}40`,
            shadowBlur: 8,
          },
          itemStyle: {
            color: CHART_COLORS.danger,
            borderColor: '#fff',
            borderWidth: 1,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${CHART_COLORS.danger}30` },
                { offset: 1, color: `${CHART_COLORS.danger}05` },
              ],
            },
          },
          markPoint: {
            data: markPointData,
          },
        },
        {
          name: '配速 (min/km)',
          type: 'line',
          yAxisIndex: 1,
          data: paceData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: CHART_COLORS.primary,
            width: 2,
            shadowColor: `${CHART_COLORS.primary}40`,
            shadowBlur: 8,
          },
          itemStyle: {
            color: CHART_COLORS.primary,
            borderColor: '#fff',
            borderWidth: 1,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${CHART_COLORS.primary}30` },
                { offset: 1, color: `${CHART_COLORS.primary}05` },
              ],
            },
          },
        },
      ],
    };
  }, [data, decouplingPoints, showDecouplingMarkers]);

  // 计算统计信息
  const stats = useMemo(() => {
    const avgHR = Math.round(data.reduce((sum, d) => sum + d.hr, 0) / data.length);
    const avgPace = data.reduce((sum, d) => sum + d.pace, 0) / data.length;
    const maxHR = Math.max(...data.map(d => d.hr));
    const decouplingCount = decouplingPoints.length;
    
    return { avgHR, avgPace, maxHR, decouplingCount };
  }, [data, decouplingPoints]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {athleteName && <span className="text-xs text-gray-400">- {athleteName}</span>}
          </div>
        </div>
      )}
      
      {/* 统计指标 */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-[#252525] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-400">平均心率</div>
          <div className="text-sm font-bold text-red-400">{stats.avgHR} <span className="text-[10px] text-gray-500">bpm</span></div>
        </div>
        <div className="bg-[#252525] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-400">最大心率</div>
          <div className="text-sm font-bold text-red-400">{stats.maxHR} <span className="text-[10px] text-gray-500">bpm</span></div>
        </div>
        <div className="bg-[#252525] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-400">平均配速</div>
          <div className="text-sm font-bold text-blue-400">{formatPace(stats.avgPace)}</div>
        </div>
        <div className="bg-[#252525] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-400">脱钩次数</div>
          <div className={`text-sm font-bold ${stats.decouplingCount > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
            {stats.decouplingCount} <span className="text-[10px] text-gray-500">次</span>
          </div>
        </div>
      </div>
      
      <ChartRenderer
        option={option}
        style={{ height: '280px', ...style }}
      />
      
      {/* 说明文字 */}
      {showDecouplingMarkers && decouplingPoints.length > 0 && (
        <div className="mt-2 text-[10px] text-yellow-400/80 flex items-center gap-1">
          <span>⚠️</span>
          <span>检测到 {decouplingPoints.length} 处心率配速脱钩，建议关注配速控制</span>
        </div>
      )}
    </div>
  );
};

export default HRPaceDualAxis;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockHRPaceData(): HRPaceDataPoint[] {
  const segments = [
    'Run 1', 'SkiErg', 'Run 2', 'Sled Push',
    'Run 3', 'Sled Pull', 'Run 4', 'Burpees',
    'Run 5', 'Rowing', 'Run 6', "Farmer's",
    'Run 7', 'Lunges', 'Run 8', 'Wall Balls'
  ];
  
  let baseHR = 145;
  let basePace = 5.2;
  
  return segments.map((segment, idx) => {
    // 模拟心率逐渐上升
    baseHR += Math.random() * 3 - 1;
    baseHR = Math.min(Math.max(baseHR, 140), 185);
    
    // 模拟配速波动
    basePace += Math.random() * 0.4 - 0.2;
    basePace = Math.min(Math.max(basePace, 4.5), 6.5);
    
    return {
      segment,
      hr: Math.round(baseHR),
      pace: Math.round(basePace * 100) / 100,
    };
  });
}
