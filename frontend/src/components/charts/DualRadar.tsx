/**
 * DualRadar - 双雷达图组件
 * 版本: v1.0
 * 
 * 功能：
 * - 左侧: Workout Stations 雷达 (8个功能站)
 * - 右侧: Running + Roxzone 雷达 (8段跑步+转换区)
 * - 对比运动员表现与组别平均
 */
import React, { useMemo } from 'react';
import ChartRenderer, { CHART_COLORS } from './ChartRenderer';
import type { EChartsOption } from 'echarts';

export interface RadarDataPoint {
  name: string;       // 分段名称
  athleteValue: number;  // 运动员得分 (0-100, 百分位倒数)
  avgValue: number;      // 组别平均得分
  percentile?: number;   // 原始百分位
}

export interface DualRadarProps {
  workoutData: RadarDataPoint[];   // 功能站数据
  runningData: RadarDataPoint[];   // 跑步+转换数据
  athleteName?: string;
  title?: string;
  className?: string;
}

const DualRadar: React.FC<DualRadarProps> = ({
  workoutData,
  runningData,
  athleteName = '运动员',
  title = '对标分析',
  className = '',
}) => {
  // 功能站雷达配置
  const workoutOption = useMemo<EChartsOption>(() => {
    const indicators = workoutData.map(d => ({
      name: d.name,
      max: 100,
    }));
    
    return {
      radar: {
        indicator: indicators,
        shape: 'polygon',
        radius: '65%',
        center: ['50%', '55%'],
        startAngle: 90,
        splitNumber: 4,
        axisName: {
          color: CHART_COLORS.textSecondary,
          fontSize: 9,
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.05)'],
          },
        },
      },
      legend: {
        data: [athleteName, '组别平均'],
        bottom: 0,
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        itemWidth: 12,
        itemHeight: 8,
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (!data) return '';
          
          let html = `<div style="font-weight:bold;margin-bottom:8px">${params.seriesName}</div>`;
          const values = data.value || [];
          workoutData.forEach((item, i) => {
            html += `<div>${item.name}: ${values[i] || 0}</div>`;
          });
          return html;
        },
      },
      series: [
        {
          name: athleteName,
          type: 'radar',
          data: [
            {
              value: workoutData.map(d => d.athleteValue),
              symbol: 'circle',
              symbolSize: 6,
              lineStyle: {
                color: CHART_COLORS.cyan,
                width: 2,
              },
              itemStyle: {
                color: CHART_COLORS.cyan,
              },
              areaStyle: {
                color: `${CHART_COLORS.cyan}30`,
              },
            },
          ],
        },
        {
          name: '组别平均',
          type: 'radar',
          data: [
            {
              value: workoutData.map(d => d.avgValue),
              symbol: 'circle',
              symbolSize: 4,
              lineStyle: {
                color: CHART_COLORS.warning,
                width: 1,
                type: 'dashed',
              },
              itemStyle: {
                color: CHART_COLORS.warning,
              },
              areaStyle: {
                color: `${CHART_COLORS.warning}15`,
              },
            },
          ],
        },
      ],
    };
  }, [workoutData, athleteName]);

  // 跑步雷达配置
  const runningOption = useMemo<EChartsOption>(() => {
    const indicators = runningData.map(d => ({
      name: d.name,
      max: 100,
    }));
    
    return {
      radar: {
        indicator: indicators,
        shape: 'polygon',
        radius: '65%',
        center: ['50%', '55%'],
        startAngle: 90,
        splitNumber: 4,
        axisName: {
          color: CHART_COLORS.textSecondary,
          fontSize: 9,
        },
        axisLine: {
          lineStyle: { color: CHART_COLORS.border },
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.gridLine },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(168,85,247,0.02)', 'rgba(168,85,247,0.05)'],
          },
        },
      },
      legend: {
        data: [athleteName, '组别平均'],
        bottom: 0,
        textStyle: {
          color: CHART_COLORS.textSecondary,
          fontSize: 10,
        },
        itemWidth: 12,
        itemHeight: 8,
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (!data) return '';
          
          let html = `<div style="font-weight:bold;margin-bottom:8px">${params.seriesName}</div>`;
          const values = data.value || [];
          runningData.forEach((item, i) => {
            html += `<div>${item.name}: ${values[i] || 0}</div>`;
          });
          return html;
        },
      },
      series: [
        {
          name: athleteName,
          type: 'radar',
          data: [
            {
              value: runningData.map(d => d.athleteValue),
              symbol: 'circle',
              symbolSize: 6,
              lineStyle: {
                color: CHART_COLORS.purple,
                width: 2,
              },
              itemStyle: {
                color: CHART_COLORS.purple,
              },
              areaStyle: {
                color: `${CHART_COLORS.purple}30`,
              },
            },
          ],
        },
        {
          name: '组别平均',
          type: 'radar',
          data: [
            {
              value: runningData.map(d => d.avgValue),
              symbol: 'circle',
              symbolSize: 4,
              lineStyle: {
                color: CHART_COLORS.warning,
                width: 1,
                type: 'dashed',
              },
              itemStyle: {
                color: CHART_COLORS.warning,
              },
              areaStyle: {
                color: `${CHART_COLORS.warning}15`,
              },
            },
          ],
        },
      ],
    };
  }, [runningData, athleteName]);

  // 计算综合得分
  const workoutScore = useMemo(() => {
    const scores = workoutData.map(d => d.athleteValue);
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  }, [workoutData]);

  const runningScore = useMemo(() => {
    const scores = runningData.map(d => d.athleteValue);
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  }, [runningData]);

  return (
    <div className={`dual-radar ${className}`}>
      {/* 标题 */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="size-1.5 bg-purple-400 rounded-full"></span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          功能站与跑步能力双维度对比分析
        </p>
      </div>

      {/* 双雷达图 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 功能站雷达 */}
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Workout Stations</span>
            <span className={`text-sm font-bold ${workoutScore >= 60 ? 'text-green-400' : workoutScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {workoutScore} 分
            </span>
          </div>
          <ChartRenderer
            option={workoutOption}
            style={{ height: '220px' }}
          />
        </div>

        {/* 跑步雷达 */}
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Running + Roxzone</span>
            <span className={`text-sm font-bold ${runningScore >= 60 ? 'text-green-400' : runningScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {runningScore} 分
            </span>
          </div>
          <ChartRenderer
            option={runningOption}
            style={{ height: '220px' }}
          />
        </div>
      </div>

      {/* 底部说明 */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-[10px]">
        <div className="text-gray-500">
          <span className="text-cyan-400">■</span> 功能站得分基于各站点百分位排名，
          分数越高表现越好（100=Top 1%）
        </div>
        <div className="text-gray-500">
          <span className="text-purple-400">■</span> 跑步得分基于8段跑步的配速排名，
          包含转换区效率评估
        </div>
      </div>
    </div>
  );
};

export default DualRadar;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockDualRadarData(): DualRadarProps {
  return {
    athleteName: 'Yuanmin Chen',
    workoutData: [
      { name: 'SkiErg', athleteValue: 65, avgValue: 50 },
      { name: 'Sled Push', athleteValue: 45, avgValue: 50 },
      { name: 'Sled Pull', athleteValue: 70, avgValue: 50 },
      { name: 'Burpees', athleteValue: 55, avgValue: 50 },
      { name: 'Row Erg', athleteValue: 60, avgValue: 50 },
      { name: "Farmer's", athleteValue: 72, avgValue: 50 },
      { name: 'Lunges', athleteValue: 48, avgValue: 50 },
      { name: 'Wall Balls', athleteValue: 58, avgValue: 50 },
    ],
    runningData: [
      { name: 'Run 1', athleteValue: 62, avgValue: 50 },
      { name: 'Run 2', athleteValue: 58, avgValue: 50 },
      { name: 'Run 3', athleteValue: 55, avgValue: 50 },
      { name: 'Run 4', athleteValue: 52, avgValue: 50 },
      { name: 'Run 5', athleteValue: 48, avgValue: 50 },
      { name: 'Run 6', athleteValue: 45, avgValue: 50 },
      { name: 'Run 7', athleteValue: 42, avgValue: 50 },
      { name: 'Run 8', athleteValue: 38, avgValue: 50 },
    ],
  };
}
