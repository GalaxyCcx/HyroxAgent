/**
 * TimeLossWaterfall - 时间损耗瀑布图
 * 版本: v1.0
 * 
 * 功能：
 * - 显示各来源时间损耗
 * - 按难度着色：easy=绿色, medium=黄色, hard=红色
 * - 顶部显示损耗秒数
 * - 累计显示总损耗
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS, formatTime, getDifficultyColor } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface TimeLossItem {
  source: string;           // 损耗来源
  lossSeconds: number;      // 损耗秒数（正数=损耗，负数=节省）
  difficulty: 'easy' | 'medium' | 'hard';  // 改进难度
  suggestion?: string;      // 改进建议
}

interface TimeLossWaterfallProps {
  data: TimeLossItem[];
  title?: string;
  targetSaveSeconds?: number;  // 目标节省时间
  style?: React.CSSProperties;
  className?: string;
}

const TimeLossWaterfall: React.FC<TimeLossWaterfallProps> = ({
  data,
  title = '时间损耗分析',
  targetSaveSeconds,
  style,
  className,
}) => {
  // 安全检查：确保 data 是数组
  const safeData = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/c8808ce8-dcad-4626-9391-90f90312b4f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TimeLossWaterfall.tsx:safeData',message:'Received data',data:{isArray:Array.isArray(data),dataLength:Array.isArray(data)?data.length:0,dataPreview:Array.isArray(data)?data.slice(0,3):data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    return data;
  }, [data]);

  // 计算累计值
  const processedData = useMemo(() => {
    let cumulative = 0;
    return safeData.map(item => {
      cumulative += item.lossSeconds;
      return {
        ...item,
        cumulative,
      };
    });
  }, [safeData]);

  const totalLoss = useMemo(() => {
    return safeData.reduce((sum, item) => sum + item.lossSeconds, 0);
  }, [safeData]);

  // 如果没有数据，显示空状态
  if (safeData.length === 0) {
    return (
      <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
        )}
        <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
          暂无时间损耗数据
        </div>
      </div>
    );
  }

  const option = useMemo<EChartsOption>(() => {
    // 当只有一个损耗项时，不显示"总计"标签，避免重复
    const showTotal = safeData.length > 1;
    const sources = showTotal 
      ? [...safeData.map(d => d.source), '总计']
      : safeData.map(d => d.source);
    
    // 瀑布图数据
    // 使用堆叠柱状图模拟瀑布图
    const helperData: (number | string)[] = [];
    const positiveData: (number | { value: number; itemStyle: any })[] = [];
    const negativeData: (number | { value: number; itemStyle: any })[] = [];
    
    let cumulative = 0;
    
    safeData.forEach((item, idx) => {
      if (item.lossSeconds >= 0) {
        // 损耗（正值）
        helperData.push(cumulative);
        positiveData.push({
          value: item.lossSeconds,
          itemStyle: {
            color: getDifficultyColor(item.difficulty),
            borderRadius: [4, 4, 0, 0],
          },
        });
        negativeData.push(0);
      } else {
        // 节省（负值）
        helperData.push(cumulative + item.lossSeconds);
        positiveData.push(0);
        negativeData.push({
          value: Math.abs(item.lossSeconds),
          itemStyle: {
            color: CHART_COLORS.success,
            borderRadius: [4, 4, 0, 0],
          },
        });
      }
      cumulative += item.lossSeconds;
    });
    
    // 只有当有多个损耗项时才添加总计柱
    // 总计柱从0开始，高度为总损耗，使用特殊样式突出显示
    if (showTotal) {
      helperData.push(0); // 从0开始
      if (totalLoss >= 0) {
        positiveData.push({
          value: totalLoss, // 总计柱高度为总损耗
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#9333ea' }, // 紫色
                { offset: 0.5, color: '#a855f7' },
                { offset: 1, color: '#c084fc' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
            borderWidth: 2,
            borderColor: '#9333ea',
          },
        });
        negativeData.push(0);
      } else {
        positiveData.push(0);
        negativeData.push({
          value: Math.abs(totalLoss),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLORS.success },
                { offset: 1, color: `${CHART_COLORS.success}80` },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        });
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          // 只显示"损耗"系列的信息（第一个有效系列）
          const lossSeries = params.find((p: any) => p.seriesName === '损耗');
          if (!lossSeries) return '';
          
          const idx = lossSeries.dataIndex;
          if (idx === undefined) return '';
          
          // 总计列（仅当有多个损耗项时显示）
          const showTotal = safeData.length > 1;
          if (showTotal && idx === safeData.length) {
            return `
              <div style="font-weight:bold;margin-bottom:8px;color:#9333ea">📊 总计</div>
              <div style="color:#9333ea;font-size:16px;font-weight:bold">
                ${formatTime(Math.abs(totalLoss))}
              </div>
              <div style="font-size:11px;color:#9ca3af;margin-top:4px">累计总损耗</div>
            `;
          }
          
          const item = safeData[idx];
          const difficultyLabel = {
            easy: '🟢 容易改进',
            medium: '🟡 中等难度',
            hard: '🔴 较难改进',
          }[item.difficulty];
          
          return `
            <div style="font-weight:bold;margin-bottom:8px">${item.source}</div>
            <div style="color:${getDifficultyColor(item.difficulty)};font-size:14px;font-weight:bold;margin-bottom:4px">
              +${formatTime(Math.abs(item.lossSeconds))}
            </div>
            <div style="font-size:11px;margin-bottom:4px">${difficultyLabel}</div>
            ${item.suggestion ? `<div style="font-size:11px;color:#9ca3af;margin-top:6px">💡 ${item.suggestion}</div>` : ''}
          `;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sources,
        axisLabel: {
          rotate: 30,
          color: (value: string, index: number) => {
            // 总计列使用特殊颜色突出显示
            const showTotal = safeData.length > 1;
            if (showTotal && index === safeData.length) {
              return '#9333ea'; // 紫色
            }
            return CHART_COLORS.textSecondary;
          },
          fontSize: 9,
          interval: 0,
          fontWeight: (value: string, index: number) => {
            // 总计列加粗
            const showTotal = safeData.length > 1;
            if (showTotal && index === safeData.length) {
              return 'bold';
            }
            return 'normal';
          },
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
      },
      yAxis: {
        type: 'value',
        name: '秒',
        nameTextStyle: {
          color: CHART_COLORS.textMuted,
          fontSize: 10,
        },
        axisLabel: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
          formatter: (value: number) => value > 0 ? `+${value}` : value,
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine, type: 'dashed' },
        },
      },
      series: [
        {
          name: '辅助',
          type: 'bar',
          stack: 'total',
          silent: true, // 禁用交互（包括tooltip）
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          label: {
            show: false, // 明确禁用标签
          },
          data: helperData,
        },
        {
          name: '损耗',
          type: 'bar',
          stack: 'total',
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              const val = typeof params.value === 'object' ? params.value.value : params.value;
              const idx = params.dataIndex;
              const showTotal = safeData.length > 1;
              
              // 总计列：显示总损耗标签，使用特殊样式
              if (showTotal && idx === safeData.length) {
                return `总计\n${Math.round(totalLoss)}s`;
              }
              
              // 其他列：只在有值时显示
              if (val === 0 || val === null || val === undefined) return '';
              return `${Math.round(val)}s`;
            },
            color: (params: any) => {
              const idx = params.dataIndex;
              const showTotal = safeData.length > 1;
              // 总计列使用紫色
              if (showTotal && idx === safeData.length) {
                return '#9333ea';
              }
              return CHART_COLORS.textSecondary;
            },
            fontSize: (params: any) => {
              const idx = params.dataIndex;
              const showTotal = safeData.length > 1;
              // 总计列字体稍大
              if (showTotal && idx === safeData.length) {
                return 11;
              }
              return 10;
            },
            fontWeight: 'bold',
            offset: [0, -2],
          },
          data: positiveData,
        },
        {
          name: '节省',
          type: 'bar',
          stack: 'total',
          barWidth: '50%',
          silent: true, // 禁用交互（因为当前数据都是损耗，没有节省）
          label: {
            show: false, // 隐藏节省系列的标签，避免显示0
          },
          data: negativeData,
        },
      ],
    };
  }, [safeData, totalLoss]);

  // 按难度分组统计
  const difficultyStats = useMemo(() => {
    const stats = { easy: 0, medium: 0, hard: 0 };
    safeData.forEach(item => {
      if (item.lossSeconds > 0) {
        stats[item.difficulty] += item.lossSeconds;
      }
    });
    return stats;
  }, [safeData]);

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-cyan-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          
          {/* 总损耗 */}
          <div className={`text-sm font-bold ${totalLoss >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {totalLoss >= 0 ? '损耗' : '节省'} {formatTime(Math.abs(totalLoss))}
          </div>
        </div>
      )}
      
      {/* 难度分布 */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.difficulty.easy }}></span>
          <span className="text-gray-400">容易改进: {formatTime(difficultyStats.easy)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.difficulty.medium }}></span>
          <span className="text-gray-400">中等难度: {formatTime(difficultyStats.medium)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.difficulty.hard }}></span>
          <span className="text-gray-400">较难改进: {formatTime(difficultyStats.hard)}</span>
        </div>
      </div>
      
      <ChartRenderer
        option={option}
        style={{ height: '280px', ...style }}
      />
      
      {/* 改进建议 */}
      {targetSaveSeconds && (
        <div className="mt-3 p-3 bg-[#252525] rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-green-400 text-base">tips_and_updates</span>
            <span className="text-white font-bold">改进潜力</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            通过优化「容易改进」项，预计可节省 <span className="text-green-400 font-bold">{formatTime(targetSaveSeconds)}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default TimeLossWaterfall;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockTimeLossData(): TimeLossItem[] {
  return [
    { source: 'Roxzone转换', lossSeconds: 45, difficulty: 'easy', suggestion: '优化站点间的跑动路线' },
    { source: 'SkiErg配速', lossSeconds: 30, difficulty: 'medium', suggestion: '提高功率输出稳定性' },
    { source: 'Sled Push启动', lossSeconds: 25, difficulty: 'hard', suggestion: '加强腿部爆发力训练' },
    { source: 'Run 5掉速', lossSeconds: 40, difficulty: 'medium', suggestion: '加强有氧耐力基础' },
    { source: 'Wall Balls节奏', lossSeconds: 20, difficulty: 'easy', suggestion: '保持稳定的投掷节奏' },
    { source: 'Rowing效率', lossSeconds: -15, difficulty: 'easy', suggestion: '继续保持' },  // 节省的时间
  ];
}
