/**
 * PriorityMatrix - 训练优先级矩阵
 * 版本: v1.0
 * 
 * 功能：
 * - 2x2 象限图显示训练优先级
 * - X轴：影响程度 (0-100)
 * - Y轴：改进难度 (0-100)
 * - 四个象限：快速见效、长期投资、可忽略、低优先级
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatTime } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

interface MatrixItem {
  name: string;
  impact: number;       // 影响程度 (0-100)
  difficulty: number;   // 改进难度 (0-100)
  lossSeconds: number;  // 时间损耗（秒）
  quadrant: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
}

interface PriorityMatrixProps {
  items: MatrixItem[];
  xLabel?: string;
  yLabel?: string;
  quadrants?: {
    topRight: string;
    topLeft: string;
    bottomRight: string;
    bottomLeft: string;
  };
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const quadrantColors = {
  bottomRight: CHART_COLORS.success,   // 快速见效 - 绿色
  topRight: CHART_COLORS.warning,      // 长期投资 - 黄色
  bottomLeft: CHART_COLORS.textMuted,  // 可忽略 - 灰色
  topLeft: CHART_COLORS.purple,        // 低优先级 - 紫色
};

const PriorityMatrix: React.FC<PriorityMatrixProps> = ({
  items,
  xLabel = '影响程度',
  yLabel = '改进难度',
  quadrants = {
    topRight: '长期投资',
    topLeft: '低优先级',
    bottomRight: '快速见效',
    bottomLeft: '可忽略',
  },
  title = '训练优先级矩阵',
  className,
  style,
}) => {
  const option = useMemo<EChartsOption>(() => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = items[params.dataIndex];
          if (!item) return '';
          
          const quadrantLabel = quadrants[item.quadrant];
          
          return `
            <div style="font-weight:bold;margin-bottom:8px">${item.name}</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px">
              <span style="color:#9ca3af">时间损耗:</span>
              <span style="font-weight:bold;color:${CHART_COLORS.danger}">+${formatTime(item.lossSeconds)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px">
              <span style="color:#9ca3af">影响程度:</span>
              <span style="font-weight:bold">${Math.round(item.impact)}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px">
              <span style="color:#9ca3af">改进难度:</span>
              <span style="font-weight:bold">${Math.round(item.difficulty)}%</span>
            </div>
            <div style="border-top:1px solid #374151;padding-top:4px;margin-top:4px;color:${quadrantColors[item.quadrant]}">
              ${quadrantLabel}
            </div>
          `;
        },
      },
      grid: {
        left: '12%',
        right: '8%',
        top: '15%',
        bottom: '15%',
      },
      xAxis: {
        type: 'value',
        name: xLabel,
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 11,
        },
        min: 0,
        max: 100,
        axisLabel: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
      },
      yAxis: {
        type: 'value',
        name: yLabel,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 11,
        },
        min: 0,
        max: 100,
        axisLabel: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
      },
      // 分割线标记50%位置
      markLine: {
        silent: true,
        data: [
          { xAxis: 50, lineStyle: { color: CHART_COLORS.border, type: 'solid', width: 1 } },
          { yAxis: 50, lineStyle: { color: CHART_COLORS.border, type: 'solid', width: 1 } },
        ],
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (data: any) => {
            // 根据损耗大小调整点的大小
            return Math.max(20, Math.min(50, data[2] / 3));
          },
          data: items.map(item => [
            item.impact,
            item.difficulty,
            item.lossSeconds,
            item.name,
          ]),
          itemStyle: {
            color: (params: any) => {
              const item = items[params.dataIndex];
              return quadrantColors[item.quadrant];
            },
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)',
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => params.data[3],
            color: CHART_COLORS.textSecondary,
            fontSize: 9,
          },
        },
      ],
    };
  }, [items, xLabel, yLabel, quadrants]);

  // 分类统计
  const quadrantStats = useMemo(() => {
    const stats = {
      bottomRight: [] as string[],
      topRight: [] as string[],
      bottomLeft: [] as string[],
      topLeft: [] as string[],
    };
    items.forEach(item => {
      stats[item.quadrant].push(item.name);
    });
    return stats;
  }, [items]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`} style={style}>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="size-1.5 bg-cyan-400 rounded-full"></span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      
      {/* 图表 */}
      <ChartRenderer
        option={option}
        style={{ height: '280px' }}
      />
      
      {/* 象限图例 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="flex items-center gap-2 p-2 bg-[#252525] rounded-lg">
          <span className="size-3 rounded" style={{ backgroundColor: quadrantColors.bottomRight }}></span>
          <div>
            <span className="text-xs font-bold text-green-400">{quadrants.bottomRight}</span>
            <p className="text-[10px] text-gray-500">高影响 + 低难度</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-[#252525] rounded-lg">
          <span className="size-3 rounded" style={{ backgroundColor: quadrantColors.topRight }}></span>
          <div>
            <span className="text-xs font-bold text-yellow-400">{quadrants.topRight}</span>
            <p className="text-[10px] text-gray-500">高影响 + 高难度</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-[#252525] rounded-lg">
          <span className="size-3 rounded" style={{ backgroundColor: quadrantColors.bottomLeft }}></span>
          <div>
            <span className="text-xs font-bold text-gray-400">{quadrants.bottomLeft}</span>
            <p className="text-[10px] text-gray-500">低影响 + 低难度</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-[#252525] rounded-lg">
          <span className="size-3 rounded" style={{ backgroundColor: quadrantColors.topLeft }}></span>
          <div>
            <span className="text-xs font-bold text-purple-400">{quadrants.topLeft}</span>
            <p className="text-[10px] text-gray-500">低影响 + 高难度</p>
          </div>
        </div>
      </div>
      
      {/* 优先建议 */}
      {quadrantStats.bottomRight.length > 0 && (
        <div className="mt-4 p-3 bg-[#252525] rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-green-400 text-base">priority_high</span>
            <span className="text-white font-bold">优先改进</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {quadrantStats.bottomRight.join('、')} 是最容易见效的改进项
          </p>
        </div>
      )}
    </div>
  );
};

export default PriorityMatrix;
