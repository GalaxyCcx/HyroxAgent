/**
 * PerformanceHeatmap - 表现热力图组件
 * 版本: v1.0
 * 参考: RoxPoster 样式
 * 
 * 功能：
 * - 显示 16 段（8跑步+8功能站）表现
 * - 颜色映射：Top25%=绿色, 25-50%=浅绿, 50-75%=橙色, Bottom25%=红色
 * - 显示百分位排名
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, getPercentileColor } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

// 16段名称
const SEGMENT_NAMES = [
  'Run 1', 'SkiErg', 'Run 2', 'Sled Push',
  'Run 3', 'Sled Pull', 'Run 4', 'Burpees',
  'Run 5', 'Rowing', 'Run 6', "Farmer's Carry",
  'Run 7', 'Lunges', 'Run 8', 'Wall Balls'
];

const SEGMENT_SHORT_NAMES = [
  'R1', 'SKI', 'R2', 'PUSH',
  'R3', 'PULL', 'R4', 'BUR',
  'R5', 'ROW', 'R6', 'FARM',
  'R7', 'LUNG', 'R8', 'WALL'
];

export interface SegmentPerformance {
  name: string;
  percentile: number;  // 百分位排名 (1-100, 1=最好)
  time?: string;       // 分段时间
  rank?: number;       // 排名
  total?: number;      // 总人数
}

interface PerformanceHeatmapProps {
  data: SegmentPerformance[];
  title?: string;
  showRank?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({
  data,
  title = '16段表现热力图',
  showRank = true,
  style,
  className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    // 准备数据 - 转换为热力图格式
    // 4行4列布局
    const heatmapData: [number, number, number][] = [];
    const labels: string[][] = [];
    
    data.forEach((item, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      heatmapData.push([col, 3 - row, item.percentile]); // y轴反向，让第一行在上面
      
      if (!labels[3 - row]) labels[3 - row] = [];
      labels[3 - row][col] = SEGMENT_SHORT_NAMES[index] || item.name;
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const idx = (3 - params.data[1]) * 4 + params.data[0];
          const item = data[idx];
          if (!item) return '';
          
          let html = `<div style="font-weight:bold;margin-bottom:4px">${SEGMENT_NAMES[idx] || item.name}</div>`;
          html += `<div>百分位: Top ${item.percentile}%</div>`;
          if (item.time) html += `<div>用时: ${item.time}</div>`;
          if (item.rank && item.total) html += `<div>排名: ${item.rank}/${item.total}</div>`;
          return html;
        },
      },
      grid: {
        left: '5%',
        right: '12%',
        top: '8%',
        bottom: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['', '', '', ''],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: ['', '', '', ''],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      visualMap: {
        min: 1,
        max: 100,
        calculable: false,
        orient: 'vertical',
        right: '2%',
        top: 'center',
        itemWidth: 12,
        itemHeight: 100,
        inRange: {
          color: [
            CHART_COLORS.percentile.top25,      // 1-25%
            CHART_COLORS.percentile.mid25_50,   // 25-50%
            CHART_COLORS.percentile.mid50_75,   // 50-75%
            CHART_COLORS.percentile.bottom25,   // 75-100%
          ],
        },
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 9,
        },
        text: ['差', '优'],
        formatter: (value: number) => {
          if (value === 1) return 'Top';
          if (value === 100) return 'Bottom';
          return '';
        },
      },
      series: [{
        type: 'heatmap',
        data: heatmapData,
        itemStyle: {
          borderColor: CHART_COLORS.cardBg,
          borderWidth: 3,
          borderRadius: 6,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: (params: any) => {
            const idx = (3 - params.data[1]) * 4 + params.data[0];
            const item = data[idx];
            if (!item) return '';
            
            const name = SEGMENT_SHORT_NAMES[idx] || '';
            const percentile = item.percentile;
            
            if (showRank && item.rank) {
              return `{name|${name}}\n{rank|#${item.rank}}`;
            }
            return `{name|${name}}\n{pct|${percentile}%}`;
          },
          rich: {
            name: {
              fontSize: 11,
              fontWeight: 'bold',
              color: '#fff',
              lineHeight: 16,
            },
            rank: {
              fontSize: 10,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 14,
            },
            pct: {
              fontSize: 9,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 14,
            },
          },
        },
      }],
    };
  }, [data, showRank]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 bg-cyan-400 rounded-full"></span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
      )}
      
      {/* 图例说明 */}
      <div className="flex items-center justify-center gap-4 mb-3 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="size-3 rounded" style={{ backgroundColor: CHART_COLORS.percentile.top25 }}></span>
          <span className="text-gray-400">Top 25%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-3 rounded" style={{ backgroundColor: CHART_COLORS.percentile.mid25_50 }}></span>
          <span className="text-gray-400">25-50%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-3 rounded" style={{ backgroundColor: CHART_COLORS.percentile.mid50_75 }}></span>
          <span className="text-gray-400">50-75%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-3 rounded" style={{ backgroundColor: CHART_COLORS.percentile.bottom25 }}></span>
          <span className="text-gray-400">Bottom 25%</span>
        </div>
      </div>
      
      <ChartRenderer
        option={option}
        style={{ height: '260px', ...style }}
      />
    </div>
  );
};

export default PerformanceHeatmap;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockHeatmapData(): SegmentPerformance[] {
  return SEGMENT_NAMES.map((name, index) => ({
    name,
    percentile: Math.floor(Math.random() * 100) + 1,
    time: `${Math.floor(Math.random() * 3) + 2}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    rank: Math.floor(Math.random() * 200) + 1,
    total: 500,
  }));
}
