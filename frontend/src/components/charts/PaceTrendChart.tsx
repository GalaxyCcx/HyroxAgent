/**
 * PaceTrendChart - 配速走势图组件
 * 版本: v1.0
 * 
 * 功能：
 * - 第3章无心率数据时的降级图表
 * - 显示8段跑步的配速趋势
 * - 标记配速衰减点
 * - 显示趋势线和配速策略分析
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatPace } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface PaceTrendDataPoint {
  lap: string;          // 分段名称 (Run 1-8)
  time_minutes: number; // 跑步时间 (分钟)
  pace_seconds?: number; // 配速 (秒/km)
}

interface PaceTrendChartProps {
  data: PaceTrendDataPoint[];
  trendLine?: Array<{ lap: string; trend: number }>;
  decayPoints?: number[];  // 配速衰减点索引
  strategyType?: 'positive' | 'negative' | 'even';  // 配速策略类型
  paceDecayPercent?: number;  // 配速衰减百分比
  title?: string;
  subtitle?: string;
  style?: React.CSSProperties;
  className?: string;
}

const PaceTrendChart: React.FC<PaceTrendChartProps> = ({
  data,
  trendLine,
  decayPoints = [],
  strategyType,
  paceDecayPercent,
  title = '配速走势分析',
  subtitle = '8段跑步配速趋势与衰减识别',
  style,
  className,
}) => {
  // 计算统计数据
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const times = data.map(d => d.time_minutes);
    const avgPace = times.reduce((sum, t) => sum + t, 0) / times.length;
    const minPace = Math.min(...times);
    const maxPace = Math.max(...times);
    const spread = maxPace - minPace;
    
    // 找出最快和最慢的圈
    const fastestIdx = times.indexOf(minPace);
    const slowestIdx = times.indexOf(maxPace);
    
    // 前后半程对比
    const firstHalf = times.slice(0, 4).reduce((sum, t) => sum + t, 0) / 4;
    const secondHalf = times.slice(4).reduce((sum, t) => sum + t, 0) / 4;
    const halfDiff = ((secondHalf - firstHalf) / firstHalf) * 100;
    
    return {
      avgPace,
      minPace,
      maxPace,
      spread,
      fastestLap: data[fastestIdx]?.lap || 'Run 1',
      slowestLap: data[slowestIdx]?.lap || 'Run 8',
      firstHalf,
      secondHalf,
      halfDiff,
    };
  }, [data]);

  // 生成 ECharts 配置
  const option = useMemo<EChartsOption>(() => {
    // 防护检查：如果 data 不存在或为空，返回空配置
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {};
    }
    const segments = data.map(d => d.lap);
    const times = data.map(d => d.time_minutes);
    
    // 计算 Y 轴范围
    const minY = Math.floor(Math.min(...times) - 0.3);
    const maxY = Math.ceil(Math.max(...times) + 0.3);
    
    // 生成渐变颜色数据
    const barData = times.map((time, idx) => {
      // 根据相对表现着色：低于平均绿色，高于平均红色
      const avgTime = stats?.avgPace || time;
      const diff = (time - avgTime) / avgTime;
      
      let color = CHART_COLORS.cyan;
      if (diff < -0.03) {
        color = CHART_COLORS.success;  // 比平均快 3%+
      } else if (diff > 0.03) {
        color = CHART_COLORS.danger;   // 比平均慢 3%+
      } else if (diff > 0) {
        color = CHART_COLORS.warning;  // 略慢
      }
      
      // 衰减点特别标记
      if (decayPoints.includes(idx)) {
        color = CHART_COLORS.danger;
      }
      
      return {
        value: time,
        itemStyle: {
          color,
          borderRadius: [4, 4, 0, 0],
        },
      };
    });
    
    // 趋势线数据
    const trendData = trendLine?.map(t => t.trend) || [];
    
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
          const avgPace = stats?.avgPace || 0;
          const diff = ((item.time_minutes - avgPace) / avgPace) * 100;
          const isDecay = decayPoints.includes(idx);
          
          return `
            <div style="font-weight:bold;margin-bottom:6px">${item.lap}</div>
            <div>时间: <span style="color:${CHART_COLORS.cyan};font-weight:bold">${item.time_minutes.toFixed(2)} 分钟</span></div>
            <div style="margin-top:4px">vs 平均: <span style="color:${diff > 0 ? CHART_COLORS.danger : CHART_COLORS.success}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%</span></div>
            ${isDecay ? `<div style="color:${CHART_COLORS.warning};margin-top:6px;font-weight:bold">⚠️ 配速衰减点</div>` : ''}
          `;
        },
      },
      legend: trendData.length > 0 ? {
        data: ['实际配速', '趋势线'],
        top: 0,
        right: 0,
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
      } : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: trendData.length > 0 ? '12%' : '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: segments,
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        name: '时间 (分钟)',
        min: minY,
        max: maxY,
        nameTextStyle: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
          formatter: (value: number) => value.toFixed(1),
        },
      },
      series: [
        {
          name: '实际配速',
          type: 'bar',
          data: barData,
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            color: CHART_COLORS.textSecondary,
            fontSize: 9,
            formatter: (params: any) => params.value.toFixed(2),
          },
          markPoint: {
            data: [
              {
                type: 'min',
                name: '最快',
                symbol: 'pin',
                symbolSize: 40,
                itemStyle: { color: CHART_COLORS.success },
                label: {
                  color: '#fff',
                  fontSize: 10,
                  formatter: '最快',
                },
              },
              {
                type: 'max',
                name: '最慢',
                symbol: 'pin',
                symbolSize: 40,
                itemStyle: { color: CHART_COLORS.danger },
                label: {
                  color: '#fff',
                  fontSize: 10,
                  formatter: '最慢',
                },
              },
            ],
          },
          markLine: {
            silent: true,
            data: [
              {
                type: 'average',
                name: '平均',
                lineStyle: {
                  type: 'dashed',
                  color: CHART_COLORS.warning,
                  width: 1.5,
                },
                label: {
                  color: CHART_COLORS.warning,
                  fontSize: 10,
                  formatter: '平均: {c}',
                },
              },
            ],
          },
        },
        ...(trendData.length > 0 ? [{
          name: '趋势线',
          type: 'line',
          data: trendData,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            type: 'dashed',
            color: CHART_COLORS.purple,
            width: 2,
          },
        }] : []),
      ],
    };
  }, [data, stats, trendLine, decayPoints]);

  // 获取策略类型描述
  const getStrategyDescription = () => {
    switch (strategyType) {
      case 'positive':
        return { text: '后程加速', color: 'text-green-400', desc: '后半程比前半程更快，配速控制出色' };
      case 'negative':
        return { text: '前程领跑', color: 'text-yellow-400', desc: '前半程较快，后半程有所下降' };
      case 'even':
        return { text: '均匀配速', color: 'text-cyan-400', desc: '全程配速相对均匀，节奏稳定' };
      default:
        return { text: '配速分析', color: 'text-gray-400', desc: '' };
    }
  };

  const strategy = getStrategyDescription();

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
      {/* 标题 */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          {strategyType && (
            <span className={`text-xs px-2 py-1 rounded ${strategy.color} bg-white/5`}>
              {strategy.text}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>

      {/* 统计指标 */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-[#252525] rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-400">平均配速</div>
            <div className="text-sm font-bold text-cyan-400">{stats.avgPace.toFixed(2)} <span className="text-[10px] text-gray-500">min</span></div>
          </div>
          <div className="bg-[#252525] rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-400">最快/最慢</div>
            <div className="text-sm font-bold text-white">
              <span className="text-green-400">{stats.minPace.toFixed(2)}</span>
              <span className="text-gray-500">/</span>
              <span className="text-red-400">{stats.maxPace.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-[#252525] rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-400">极差</div>
            <div className={`text-sm font-bold ${stats.spread > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
              {(stats.spread * 60).toFixed(0)} <span className="text-[10px] text-gray-500">秒</span>
            </div>
          </div>
          <div className="bg-[#252525] rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-400">前后差</div>
            <div className={`text-sm font-bold ${stats.halfDiff > 5 ? 'text-red-400' : stats.halfDiff < -5 ? 'text-green-400' : 'text-cyan-400'}`}>
              {stats.halfDiff >= 0 ? '+' : ''}{stats.halfDiff.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* 图表 */}
      <ChartRenderer
        option={option}
        style={{ height: '260px', ...style }}
      />

      {/* 底部说明 */}
      {strategyType && (
        <div className="mt-3 flex items-start gap-2 text-xs">
          <span className={`${strategy.color} text-lg`}>💡</span>
          <div>
            <span className={`font-bold ${strategy.color}`}>{strategy.text}策略: </span>
            <span className="text-gray-400">{strategy.desc}</span>
            {paceDecayPercent !== undefined && (
              <span className={`ml-2 ${paceDecayPercent > 5 ? 'text-yellow-400' : 'text-gray-400'}`}>
                后半程{paceDecayPercent > 0 ? '衰减' : '提速'} {Math.abs(paceDecayPercent).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaceTrendChart;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockPaceTrendData(): {
  data: PaceTrendDataPoint[];
  trendLine: Array<{ lap: string; trend: number }>;
  decayPoints: number[];
  strategyType: 'positive' | 'negative' | 'even';
  paceDecayPercent: number;
} {
  // 模拟 8 段跑步数据 - 略微正向配速
  const basePaces = [5.1, 5.15, 5.2, 5.25, 5.3, 5.4, 5.5, 5.6];
  
  const data: PaceTrendDataPoint[] = basePaces.map((pace, idx) => ({
    lap: `Run ${idx + 1}`,
    time_minutes: pace + (Math.random() * 0.1 - 0.05),
    pace_seconds: pace * 60,
  }));
  
  // 计算趋势线（简单线性）
  const trendLine = data.map((d, idx) => ({
    lap: d.lap,
    trend: 5.1 + idx * 0.07,
  }));
  
  // 标记衰减点
  const decayPoints = [5, 7]; // Run 6 和 Run 8
  
  return {
    data,
    trendLine,
    decayPoints,
    strategyType: 'negative',
    paceDecayPercent: 8.5,
  };
}
