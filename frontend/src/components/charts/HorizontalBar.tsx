/**
 * HorizontalBar - 时间损耗排行横向柱状图
 * 版本: v1.0
 * 
 * 功能：
 * - 按损耗大小排列显示各项时间损耗
 * - 按类别着色：station=紫色, transition=橙色, pacing=红色
 * - 显示参考值与实际值对比
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatTime } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface HorizontalBarItem {
  name: string;
  value: number;        // 损耗秒数
  category: 'station' | 'transition' | 'pacing';
  reference: number;    // 参考值（秒）
  actual: number;       // 实际值（秒）
}

interface HorizontalBarProps {
  items: HorizontalBarItem[];
  totalLoss: number;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
}

const categoryColors = {
  station: CHART_COLORS.purple,
  transition: CHART_COLORS.warning,
  pacing: CHART_COLORS.danger,
};

const categoryLabels = {
  station: '功能站',
  transition: '转换区',
  pacing: '配速',
};

const HorizontalBar: React.FC<HorizontalBarProps> = ({
  items,
  totalLoss,
  title = '时间损耗排行',
  style,
  className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    // 按损耗大小排序（从大到小）
    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = sortedItems[params[0]?.dataIndex];
          if (!item) return '';
          
          return `
            <div style="font-weight:bold;margin-bottom:8px">${item.name}</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px">
              <span style="color:#9ca3af">参考值:</span>
              <span style="font-weight:bold">${formatTime(item.reference)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px">
              <span style="color:#9ca3af">实际值:</span>
              <span style="font-weight:bold;color:${CHART_COLORS.danger}">${formatTime(item.actual)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid #374151;padding-top:4px;margin-top:4px">
              <span style="color:#9ca3af">损耗:</span>
              <span style="font-weight:bold;color:${CHART_COLORS.danger}">+${formatTime(item.value)}</span>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '15%',
        top: '8%',
        bottom: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '秒',
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
      yAxis: {
        type: 'category',
        data: sortedItems.map(d => d.name),
        inverse: true,
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
      },
      series: [
        {
          type: 'bar',
          barWidth: '60%',
          data: sortedItems.map(item => ({
            value: item.value,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: categoryColors[item.category] },
                  { offset: 1, color: `${categoryColors[item.category]}80` },
                ],
              },
              borderRadius: [0, 4, 4, 0],
            },
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => `+${Math.round(params.value)}s`,
            color: CHART_COLORS.textSecondary,
            fontSize: 10,
            fontWeight: 'bold',
          },
        },
      ],
    };
  }, [items]);

  // 按类别统计
  const categoryStats = useMemo(() => {
    const stats = { station: 0, transition: 0, pacing: 0 };
    items.forEach(item => {
      stats[item.category] += item.value;
    });
    return stats;
  }, [items]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`} style={style}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          
          <div className="text-sm font-bold text-red-400">
            总损耗 {formatTime(totalLoss)}
          </div>
        </div>
      )}
      
      {/* 类别图例 */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        {Object.entries(categoryStats).map(([cat, val]) => val > 0 && (
          <div key={cat} className="flex items-center gap-1">
            <span 
              className="size-2 rounded-full" 
              style={{ backgroundColor: categoryColors[cat as keyof typeof categoryColors] }}
            ></span>
            <span className="text-gray-400">
              {categoryLabels[cat as keyof typeof categoryLabels]}: {formatTime(val)}
            </span>
          </div>
        ))}
      </div>
      
      <ChartRenderer
        option={option}
        style={{ height: Math.max(200, items.length * 40) + 'px' }}
      />
    </div>
  );
};

export default HorizontalBar;
