/**
 * DistributionHistogram - 分布直方图组件
 * 版本: v1.0
 * 
 * 功能：
 * - 展示全球运动员成绩分布
 * - 高亮用户当前位置
 * - 显示百分位信息
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface DistributionHistogramProps {
  bins: number[];           // 区间边界值 (分钟)
  counts: number[];         // 每个区间的人数
  userValue: number;        // 用户成绩 (分钟)
  userPercentile: number;   // 用户百分位
  totalAthletes: number;    // 总运动员数
  title?: string;
  subtitle?: string;
  unit?: string;           // 单位 (默认 "分钟")
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 格式化分钟为 H:MM:SS
 */
function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '--:--';
  
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const DistributionHistogram: React.FC<DistributionHistogramProps> = ({
  bins,
  counts,
  userValue,
  userPercentile,
  totalAthletes,
  title = '全球成绩分布',
  subtitle,
  unit = '分钟',
  className = '',
  style,
}) => {
  // 找到用户所在的区间
  const userBinIndex = useMemo(() => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (userValue >= bins[i] && userValue < bins[i + 1]) {
        return i;
      }
    }
    return -1;
  }, [bins, userValue]);

  // 生成柱状图数据
  const barData = useMemo(() => {
    return counts.map((count, index) => {
      const isUserBin = index === userBinIndex;
      
      return {
        value: count,
        itemStyle: {
          color: isUserBin ? CHART_COLORS.cyan : 'rgba(255, 255, 255, 0.2)',
          borderRadius: [4, 4, 0, 0],
          shadowColor: isUserBin ? CHART_COLORS.cyan : 'transparent',
          shadowBlur: isUserBin ? 10 : 0,
        },
        label: isUserBin ? {
          show: true,
          position: 'top',
          formatter: '你在这里',
          color: CHART_COLORS.cyan,
          fontSize: 10,
          fontWeight: 'bold',
        } : undefined,
      };
    });
  }, [counts, userBinIndex]);

  // X轴标签
  const xAxisLabels = useMemo(() => {
    return bins.slice(0, -1).map((bin, i) => {
      const nextBin = bins[i + 1];
      // 简化显示，只显示起始值
      return Math.floor(bin).toString();
    });
  }, [bins]);

  const option = useMemo<EChartsOption>(() => {
    const maxCount = Math.max(...counts);
    
    return {
      grid: {
        left: '3%',
        right: '4%',
        bottom: '18%',
        top: '10%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          if (idx === undefined || idx >= bins.length - 1) return '';
          
          const binStart = bins[idx];
          const binEnd = bins[idx + 1];
          const count = counts[idx];
          const percentage = ((count / totalAthletes) * 100).toFixed(1);
          
          return `
            <div style="font-weight:bold;margin-bottom:6px">
              ${formatMinutes(binStart)} - ${formatMinutes(binEnd)}
            </div>
            <div>运动员数: ${count.toLocaleString()}</div>
            <div>占比: ${percentage}%</div>
            ${idx === userBinIndex ? `<div style="color:${CHART_COLORS.cyan};margin-top:4px;font-weight:bold">✓ 你的成绩区间</div>` : ''}
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: xAxisLabels,
        axisLabel: {
          rotate: 45,
          color: CHART_COLORS.textSecondary,
          fontSize: 9,
          interval: Math.floor(xAxisLabels.length / 10), // 显示约10个标签
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '人数',
        nameTextStyle: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            return value.toString();
          },
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
        },
      },
      series: [
        {
          type: 'bar',
          data: barData,
          barWidth: '80%',
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                xAxis: userBinIndex >= 0 ? userBinIndex : undefined,
                lineStyle: {
                  color: CHART_COLORS.cyan,
                  width: 2,
                  type: 'solid',
                },
                label: {
                  show: false,
                },
              },
            ],
          },
        },
      ],
      animation: true,
      animationDuration: 1000,
    };
  }, [bins, counts, barData, xAxisLabels, userBinIndex, totalAthletes]);

  // 百分位等级描述
  const getPercentileDescription = () => {
    if (userPercentile <= 5) return { text: '顶尖', color: 'text-yellow-400' };
    if (userPercentile <= 10) return { text: '精英', color: 'text-purple-400' };
    if (userPercentile <= 25) return { text: '优秀', color: 'text-green-400' };
    if (userPercentile <= 50) return { text: '中上', color: 'text-cyan-400' };
    if (userPercentile <= 75) return { text: '中等', color: 'text-blue-400' };
    return { text: '待提升', color: 'text-gray-400' };
  };

  const percentileDesc = getPercentileDescription();

  return (
    <div className={`distribution-histogram ${className}`}>
      {/* 标题 */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <div className="text-xs text-gray-400">
            共 {totalAthletes.toLocaleString()} 名运动员
          </div>
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>

      {/* 用户位置摘要 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500">你的成绩</div>
          <div className="text-lg font-bold text-white font-display">{formatMinutes(userValue)}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500">百分位排名</div>
          <div className="text-lg font-bold text-cyan-400 font-display">Top {userPercentile.toFixed(1)}%</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500">水平评级</div>
          <div className={`text-lg font-bold font-display ${percentileDesc.color}`}>{percentileDesc.text}</div>
        </div>
      </div>

      {/* 图表 */}
      <ChartRenderer
        option={option}
        style={{ height: '220px', ...style }}
      />

      {/* 底部说明 */}
      <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
        <span className="text-gray-400">说明:</span>{' '}
        直方图展示同组别运动员成绩分布，
        <span className="text-cyan-400">高亮区域</span>
        为你的成绩所在区间。百分位排名 Top {userPercentile.toFixed(1)}% 表示你超过了 {(100 - userPercentile).toFixed(1)}% 的运动员。
      </div>
    </div>
  );
};

export default DistributionHistogram;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockDistributionData(): DistributionHistogramProps {
  // 模拟 HYROX 成绩分布 (正态分布偏右)
  const bins: number[] = [];
  const counts: number[] = [];
  
  // 50-120 分钟，每 2 分钟一个区间
  for (let i = 50; i <= 120; i += 2) {
    bins.push(i);
  }
  bins.push(122); // 最后一个边界
  
  // 生成类似正态分布的人数
  const mean = 85;
  const std = 12;
  for (let i = 0; i < bins.length - 1; i++) {
    const binCenter = bins[i] + 1;
    const z = (binCenter - mean) / std;
    const density = Math.exp(-0.5 * z * z);
    counts.push(Math.round(density * 500 + Math.random() * 50));
  }
  
  return {
    bins,
    counts,
    userValue: 86.1, // 1:26:06
    userPercentile: 35.2,
    totalAthletes: counts.reduce((sum, c) => sum + c, 0),
    title: '总成绩分布',
    subtitle: 'Men Open Division - 全球数据',
  };
}
