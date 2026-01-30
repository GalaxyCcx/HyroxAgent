/**
 * PredictionTiers - 五档预测卡片组件
 * 版本: v1.0
 * 
 * 功能：
 * - 展示五档预测 (Excellent/Great/Expected/Subpar/Poor)
 * - 显示各档位时间和相对于当前成绩的差值
 * - 颜色编码：绿色(好) -> 红色(差)
 */
import React from 'react';

export interface PredictionTier {
  label: string;
  percentile: number;
  time_seconds: number;
  delta: number;
}

interface PredictionTiersProps {
  tiers: {
    excellent: PredictionTier;
    great: PredictionTier;
    expected: PredictionTier;
    subpar: PredictionTier;
    poor: PredictionTier;
  };
  currentTime: string;
  currentTimeSeconds: number;
  statistics?: {
    sample_size: number;
    improvement_rate: number;
    avg_improvement: number;
    variance: number;
  };
  className?: string;
}

/**
 * 将秒数格式化为 H:MM:SS 或 MM:SS 格式
 */
function formatTimeFromSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化时间差值
 */
function formatDelta(delta: number): string {
  if (delta === null || delta === undefined) return '';
  
  const absDelta = Math.abs(delta);
  const mins = Math.floor(absDelta / 60);
  const secs = Math.floor(absDelta % 60);
  
  const sign = delta < 0 ? '-' : '+';
  
  if (mins > 0) {
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${sign}${secs}s`;
}

const PredictionTiers: React.FC<PredictionTiersProps> = ({
  tiers,
  currentTime,
  currentTimeSeconds,
  statistics,
  className = '',
}) => {
  // 配置各档位样式
  const tierConfig = [
    { key: 'excellent', label: 'Excellent', percentile: 5, color: 'from-green-500 to-green-600', borderColor: 'border-green-500', textColor: 'text-green-400', bgColor: 'bg-green-500/10' },
    { key: 'great', label: 'Great', percentile: 25, color: 'from-lime-500 to-lime-600', borderColor: 'border-lime-500', textColor: 'text-lime-400', bgColor: 'bg-lime-500/10' },
    { key: 'expected', label: 'Expected', percentile: 50, color: 'from-orange-500 to-orange-600', borderColor: 'border-orange-500', textColor: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    { key: 'subpar', label: 'Subpar', percentile: 75, color: 'from-orange-600 to-red-500', borderColor: 'border-orange-600', textColor: 'text-orange-500', bgColor: 'bg-orange-600/10' },
    { key: 'poor', label: 'Poor', percentile: 95, color: 'from-red-500 to-red-600', borderColor: 'border-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/10' },
  ];

  return (
    <div className={`prediction-tiers ${className}`}>
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="size-1.5 bg-cyan-400 rounded-full"></span>
          下场比赛预测区间
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          基于同水平运动员历史表现的统计预测
        </p>
      </div>

      {/* 五档卡片 */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {tierConfig.map((config) => {
          const tier = tiers[config.key as keyof typeof tiers];
          if (!tier) return null;
          
          return (
            <div
              key={config.key}
              className={`relative rounded-lg border ${config.borderColor} ${config.bgColor} p-3 text-center overflow-hidden`}
            >
              {/* 百分位标签 */}
              <div className={`absolute top-1 right-1 ${config.textColor} text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/30`}>
                {config.percentile}%
              </div>
              
              {/* 档位名称 */}
              <div className={`text-[10px] ${config.textColor} font-bold uppercase tracking-wide mb-1`}>
                {config.label}
              </div>
              
              {/* 预测时间 */}
              <div className="text-lg font-bold text-white font-display tracking-tight">
                {formatTimeFromSeconds(tier.time_seconds)}
              </div>
              
              {/* 相对当前差值 */}
              <div className={`text-xs mt-1 ${tier.delta < 0 ? 'text-green-400' : tier.delta > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                vs Last Race
                <br />
                <span className="font-bold">{formatDelta(tier.delta)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 统计信息 */}
      {statistics && (
        <div className="bg-[#1a1a1a] rounded-lg p-3 border border-white/5">
          <p className="text-xs text-gray-400 leading-relaxed">
            See your predicted performance range for your next race. These predictions are based on your current time and variance patterns from athletes in your cohort.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Sample Size</div>
              <div className="text-sm font-bold text-white">{statistics.sample_size?.toLocaleString() || '--'}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Improvement Rate</div>
              <div className="text-sm font-bold text-green-400">
                {statistics.improvement_rate ? `${Math.round(statistics.improvement_rate * 100)}%` : '--'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Avg Improvement</div>
              <div className="text-sm font-bold text-cyan-400">
                {statistics.avg_improvement ? `-${Math.floor(statistics.avg_improvement / 60)}:${(statistics.avg_improvement % 60).toString().padStart(2, '0')}` : '--'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionTiers;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockPredictionTiers(): PredictionTiersProps {
  const currentTimeSeconds = 5166; // 1:26:06
  
  return {
    currentTime: '1:26:06',
    currentTimeSeconds,
    tiers: {
      excellent: { label: 'Excellent', percentile: 5, time_seconds: 4396, delta: -770 },
      great: { label: 'Great', percentile: 25, time_seconds: 4740, delta: -426 },
      expected: { label: 'Expected', percentile: 50, time_seconds: 4989, delta: -177 },
      subpar: { label: 'Subpar', percentile: 75, time_seconds: 5258, delta: 92 },
      poor: { label: 'Poor', percentile: 95, time_seconds: 5829, delta: 663 },
    },
    statistics: {
      sample_size: 4158,
      improvement_rate: 0.68,
      avg_improvement: 130,
      variance: 602,
    },
  };
}
