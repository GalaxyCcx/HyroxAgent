/**
 * SplitsBreakdown - 分段时间柱状图
 * 版本: v1.0
 * 参考: RoxOpt 样式
 * 
 * 功能：
 * - 16 段分段时间柱状图
 * - 运动员 vs 组别平均对比
 * - X轴标签45度旋转
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatTime } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

// 16段名称
const SEGMENT_NAMES = [
  'Run 1', 'SkiErg', 'Run 2', 'Sled Push',
  'Run 3', 'Sled Pull', 'Run 4', 'Burpees',
  'Run 5', 'Rowing', 'Run 6', "Farmer's",
  'Run 7', 'Lunges', 'Run 8', 'Wall Balls'
];

export interface SplitData {
  name: string;
  athleteTime: number;    // 运动员时间（秒）
  avgTime: number;        // 组别平均时间（秒）
  diff?: number;          // 差值（秒，负=快于平均）
}

interface SplitsBreakdownProps {
  data: SplitData[];
  athleteName?: string;
  groupName?: string;
  title?: string;
  showDiff?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const SplitsBreakdown: React.FC<SplitsBreakdownProps> = ({
  data,
  athleteName = '运动员',
  groupName = '组别平均',
  title = '分段时间对比',
  showDiff = true,
  style,
  className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const names = data.map(d => d.name);
    const athleteTimes = data.map(d => d.athleteTime);
    const avgTimes = data.map(d => d.avgTime);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          if (idx === undefined) return '';
          
          const item = data[idx];
          const diff = item.athleteTime - item.avgTime;
          const diffStr = diff > 0 ? `+${formatTime(diff)}` : `-${formatTime(Math.abs(diff))}`;
          const diffColor = diff > 0 ? CHART_COLORS.danger : CHART_COLORS.success;
          
          return `
            <div style="font-weight:bold;margin-bottom:8px">${item.name}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;background:${CHART_COLORS.cyan};border-radius:2px"></span>
              <span>${athleteName}: ${formatTime(item.athleteTime)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;background:${CHART_COLORS.textMuted};border-radius:2px"></span>
              <span>${groupName}: ${formatTime(item.avgTime)}</span>
            </div>
            ${showDiff ? `<div style="color:${diffColor};margin-top:6px;font-weight:bold">差值: ${diffStr}</div>` : ''}
          `;
        },
      },
      legend: {
        data: [athleteName, groupName],
        top: 0,
        right: 0,
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 16,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '18%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          rotate: 45,
          color: CHART_COLORS.textSecondary,
          fontSize: 9,
          interval: 0,
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
        axisTick: {
          alignWithLabel: true,
          lineStyle: { color: CHART_COLORS.border },
        },
      },
      yAxis: {
        type: 'value',
        name: '时间 (秒)',
        nameTextStyle: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
          formatter: (value: number) => formatTime(value),
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
        },
      },
      series: [
        {
          name: athleteName,
          type: 'bar',
          data: athleteTimes,
          barWidth: '35%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLORS.cyan },
                { offset: 1, color: `${CHART_COLORS.cyan}80` },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: `${CHART_COLORS.cyan}60`,
            },
          },
          label: {
            show: false,
          },
        },
        {
          name: groupName,
          type: 'bar',
          data: avgTimes,
          barWidth: '35%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,255,255,0.3)' },
                { offset: 1, color: 'rgba(255,255,255,0.1)' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [data, athleteName, groupName, showDiff]);

  // 计算总体统计
  const totalDiff = useMemo(() => {
    const total = data.reduce((sum, d) => sum + (d.athleteTime - d.avgTime), 0);
    return total;
  }, [data]);

  const fasterCount = useMemo(() => {
    return data.filter(d => d.athleteTime < d.avgTime).length;
  }, [data]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          
          {/* 总体统计 */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className={`font-bold ${totalDiff <= 0 ? 'text-green-400' : 'text-red-400'}`}>
              总计: {totalDiff <= 0 ? '' : '+'}{formatTime(Math.abs(totalDiff))}
            </span>
            <span className="text-gray-400">
              {fasterCount}/{data.length} 段领先
            </span>
          </div>
        </div>
      )}
      
      <ChartRenderer
        option={option}
        style={{ height: '300px', ...style }}
      />
    </div>
  );
};

export default SplitsBreakdown;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockSplitsData(): SplitData[] {
  return SEGMENT_NAMES.map((name) => {
    const avgTime = Math.floor(Math.random() * 180) + 120; // 2-5分钟
    const athleteTime = avgTime + Math.floor(Math.random() * 60) - 30; // ±30秒
    return {
      name,
      athleteTime: Math.max(60, athleteTime),
      avgTime,
      diff: athleteTime - avgTime,
    };
  });
}
