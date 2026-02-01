/**
 * RadarChart5D - 5维能力雷达图适配器
 * 将后端的 5 维数据格式转换为 RadarChart 组件所需的格式
 */

import React from 'react';
import RadarChart, { type RadarDimension, type RadarDataSet } from './RadarChart';
import { CHART_COLORS } from './ChartRenderer';

interface RadarChart5DProps {
  dimensions?: {
    strength: number;
    aerobic: number;
    speed: number;
    recovery: number;
    transition: number;
  };
  data_id?: string;
  /** 是否显示图表下方的综合得分块和维度说明（核心摘要中不显示，与 demo 一致） */
  compact?: boolean;
}

// 5维能力配置
const FIVE_DIMENSIONS: RadarDimension[] = [
  { name: '力量', max: 100, description: '功能站表现' },
  { name: '有氧', max: 100, description: '跑步耐力' },
  { name: '速度', max: 100, description: '爆发力' },
  { name: '恢复', max: 100, description: '后程维持' },
  { name: '转换', max: 100, description: 'Roxzone效率' },
];

const RadarChart5D: React.FC<RadarChart5DProps> = ({ dimensions, compact = false }) => {
  if (!dimensions || typeof dimensions !== 'object') {
    return (
      <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
        <p className="text-[#888888] text-sm">暂无雷达图数据</p>
      </div>
    );
  }

  // 转换后端格式为前端格式
  const values = [
    dimensions.strength ?? 0,
    dimensions.aerobic ?? 0,
    dimensions.speed ?? 0,
    dimensions.recovery ?? 0,
    dimensions.transition ?? 0,
  ];

  const dataSets: RadarDataSet[] = [
    {
      name: '运动员',
      values: values,
      color: '#00FF88', // 使用新主题的绿色
    },
  ];

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📊</span>
        <span className="text-white font-bold">能力雷达图</span>
      </div>

      <RadarChart
        dimensions={FIVE_DIMENSIONS}
        dataSets={dataSets}
        title=""
        showLegend={false}
        shape="polygon"
        style={{ height: '260px' }}
        className="!bg-transparent !p-0"
        showScoreBlock={!compact}
        showDimensionLabels={!compact}
      />
    </div>
  );
};

export default RadarChart5D;
