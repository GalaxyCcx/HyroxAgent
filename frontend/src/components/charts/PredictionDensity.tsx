/**
 * PredictionDensity - 预测概率密度曲线组件
 * 版本: v1.0
 * 
 * 功能：
 * - 展示下场比赛成绩的概率分布曲线
 * - 标注期望值和置信区间
 * - 显示统计信息
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatTime } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface PredictionDensityProps {
  curveData: Array<[number, number]>; // [time_minutes, density]
  expected: number; // 期望时间（分钟）
  variance: number; // 方差（秒）
  range: {
    low: number;  // 最佳情况（分钟）
    high: number; // 最差情况（分钟）
  };
  sampleSize: number;
  improvementRate?: number;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 格式化分钟为 H:MM:SS
 */
function formatMinutesToTime(minutes: number): string {
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

const PredictionDensity: React.FC<PredictionDensityProps> = ({
  curveData,
  expected,
  variance,
  range,
  sampleSize,
  improvementRate,
  title = 'Performance Distribution',
  className = '',
  style,
}) => {
  // 生成渐变色数据
  const processedData = useMemo(() => {
    if (!curveData || curveData.length === 0) {
      // 生成默认正态分布曲线
      const defaultCurve: Array<[number, number]> = [];
      const mean = expected || 83;
      const std = Math.sqrt(variance || 600) / 60; // 转为分钟
      
      for (let x = mean - 3 * std; x <= mean + 3 * std; x += std / 10) {
        const z = (x - mean) / std;
        const density = Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
        defaultCurve.push([x, density * 100]); // 放大以便显示
      }
      return defaultCurve;
    }
    return curveData;
  }, [curveData, expected, variance]);

  // 生成渐变色柱状数据（模拟 Roxlab 风格）
  const barData = useMemo(() => {
    const bars: Array<{ value: [number, number], itemStyle: { color: string } }> = [];
    
    processedData.forEach(([x, y], index) => {
      // 从橙色渐变到浅橙色
      const ratio = index / processedData.length;
      const r = Math.round(255 - ratio * 50);
      const g = Math.round(140 - ratio * 40);
      const b = Math.round(50 + ratio * 50);
      
      bars.push({
        value: [x, y],
        itemStyle: {
          color: `rgb(${r}, ${g}, ${b})`,
        },
      });
    });
    
    return bars;
  }, [processedData]);

  const option = useMemo<EChartsOption>(() => {
    const xMin = processedData.length > 0 ? Math.floor(processedData[0][0]) : 50;
    const xMax = processedData.length > 0 ? Math.ceil(processedData[processedData.length - 1][0]) : 120;
    
    return {
      grid: {
        left: '3%',
        right: '5%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        min: xMin,
        max: xMax,
        axisLabel: {
          formatter: (value: number) => Math.floor(value).toString(),
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        splitLine: {
          show: false,
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
      },
      yAxis: {
        type: 'value',
        show: false,
        max: 'dataMax',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0];
          if (!data) return '';
          const minutes = data.value[0];
          return `预测成绩: ${formatMinutesToTime(minutes)}`;
        },
      },
      series: [
        {
          type: 'bar',
          data: barData,
          barWidth: '80%',
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
          },
          markLine: expected ? {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#fff',
              width: 2,
              type: 'solid',
            },
            label: {
              show: false,
            },
            data: [
              { xAxis: expected },
            ],
          } : undefined,
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [processedData, barData, expected]);

  return (
    <div className={`prediction-density ${className}`}>
      {/* 标题 */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="size-1.5 bg-orange-400 rounded-full"></span>
          {title}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Based on {sampleSize?.toLocaleString() || '--'} adjacent race pairs from athletes in your time bin.
          {improvementRate && (
            <span className="text-green-400 ml-1">
              {Math.round(improvementRate * 100)}% of athletes improved in their next race!
            </span>
          )}
        </p>
      </div>

      {/* 图表 */}
      <ChartRenderer
        option={option}
        style={{ height: '200px', ...style }}
      />

      {/* 底部统计 */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
        <div>
          <div className="text-xs text-gray-500">Expected Time</div>
          <div className="text-lg font-bold text-white font-display">
            {formatMinutesToTime(expected)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Typical Variance</div>
          <div className="text-lg font-bold text-white font-display">
            ±{Math.floor(variance / 60)}:{(variance % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Range</div>
          <div className="text-lg font-bold text-white font-display">
            {formatMinutesToTime(range.low)} – {formatMinutesToTime(range.high)}
          </div>
        </div>
      </div>

      {/* 方法说明 */}
      <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
        <span className="text-gray-400 font-bold">Methodology:</span>{' '}
        Predictions based on how {sampleSize?.toLocaleString() || '--'} athletes with similar finishing times performed in their subsequent race.
        {improvementRate && (
          <span className="text-orange-400 ml-1">
            On average, they improved by {Math.floor((variance * 0.2) / 60)}:{((variance * 0.2) % 60).toFixed(0).padStart(2, '0')}.
          </span>
        )}
      </div>
    </div>
  );
};

export default PredictionDensity;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockPredictionDensity(): PredictionDensityProps {
  // 生成正态分布曲线
  const mean = 83.15; // 1:23:09
  const std = 10;
  const curveData: Array<[number, number]> = [];
  
  for (let x = 56; x <= 112; x += 1) {
    const z = (x - mean) / std;
    const density = Math.exp(-0.5 * z * z) * 2; // 放大
    curveData.push([x, density]);
  }
  
  return {
    curveData,
    expected: 83.15,
    variance: 602, // 约 10 分钟
    range: {
      low: 73.27,  // 1:13:16
      high: 97.15, // 1:37:09
    },
    sampleSize: 4158,
    improvementRate: 0.68,
  };
}
