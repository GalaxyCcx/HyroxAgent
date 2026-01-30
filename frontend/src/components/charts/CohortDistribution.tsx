/**
 * CohortDistribution - 同水平选手群体分布卡片
 * 版本: v1.0
 * 
 * 功能：
 * - 展示四组分布（退步组/维持组/进阶组/精英突破组）
 * - 显示各组百分比和平均成绩
 * - 显示精英突破组的关键改进指标
 */
import React from 'react';

interface CohortGroup {
  percentage: number;
  avg_time: number;  // 分钟
  characteristics: string;
  key_improvements?: string[];  // 仅精英突破组
}

interface CohortDistributionProps {
  cohortSize: number;
  timeRange: string;
  groups: {
    regress: CohortGroup;
    maintain: CohortGroup;
    improve: CohortGroup;
    elite: CohortGroup;
  };
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 将分钟数格式化为 H:MM:SS 格式
 */
function formatTimeFromMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '--:--:--';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const CohortDistribution: React.FC<CohortDistributionProps> = ({
  cohortSize,
  timeRange,
  groups,
  title = '同水平选手下场表现分布',
  className = '',
  style,
}) => {
  // 四组配置
  const groupConfig = [
    {
      key: 'regress',
      name: '退步组',
      emoji: '📉',
      color: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      key: 'maintain',
      name: '维持组',
      emoji: '➖',
      color: 'from-gray-500/20 to-gray-600/10',
      borderColor: 'border-gray-500/30',
      textColor: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    },
    {
      key: 'improve',
      name: '进阶组',
      emoji: '📈',
      color: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      key: 'elite',
      name: '精英突破组',
      emoji: '🚀',
      color: 'from-cyan-500/20 to-purple-500/10',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-cyan-400',
      bgColor: 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10',
    },
  ];

  return (
    <div className={`cohort-distribution ${className}`} style={style}>
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="size-1.5 bg-cyan-400 rounded-full"></span>
          {title}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          追踪了 <span className="text-cyan-400 font-bold">{cohortSize.toLocaleString()}</span> 位
          成绩在 <span className="text-white">{timeRange}</span> 区间的运动员下一场比赛表现
        </p>
      </div>

      {/* 四组分布卡片 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {groupConfig.map((config) => {
          const group = groups[config.key as keyof typeof groups];
          if (!group) return null;

          return (
            <div
              key={config.key}
              className={`relative rounded-xl border ${config.borderColor} ${config.bgColor} p-3 overflow-hidden transition-all hover:scale-[1.02]`}
            >
              {/* 背景装饰 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-50`}></div>
              
              <div className="relative z-10">
                {/* 顶部：图标和百分比 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{config.emoji}</span>
                  <span className={`text-xl font-bold ${config.textColor}`}>
                    {group.percentage}%
                  </span>
                </div>

                {/* 组名 */}
                <div className="text-xs font-bold text-white mb-1">
                  {config.name}
                </div>

                {/* 平均成绩 */}
                <div className="text-lg font-bold text-white font-display tracking-tight mb-2">
                  {formatTimeFromMinutes(group.avg_time)}
                </div>

                {/* 特征 */}
                <div className="text-[10px] text-gray-400 leading-relaxed">
                  {group.characteristics}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 精英突破组关键指标 */}
      {groups.elite?.key_improvements && groups.elite.key_improvements.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🚀</span>
            <span className="text-xs font-bold text-cyan-400">精英突破组是如何做到的？</span>
          </div>
          <div className="space-y-2">
            {groups.elite.key_improvements.map((improvement, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-white/80">
                <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                <span>{improvement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部说明 */}
      <div className="mt-4 text-[10px] text-gray-500 text-center">
        基于 ROXSCAN 全球数据库 - 队列追踪分析
      </div>
    </div>
  );
};

export default CohortDistribution;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockCohortDistribution(): CohortDistributionProps {
  return {
    cohortSize: 1248,
    timeRange: '85-87分钟',
    groups: {
      regress: {
        percentage: 15,
        avg_time: 89.17,  // 1:29:10
        characteristics: '缺乏系统训练，或伤病',
      },
      maintain: {
        percentage: 35,
        avg_time: 85.75,  // 1:25:45
        characteristics: '维持原有训练强度，未修正短板',
      },
      improve: {
        percentage: 40,
        avg_time: 81.5,   // 1:21:30
        characteristics: '针对短板进行了专项修正',
      },
      elite: {
        percentage: 10,
        avg_time: 78.25,  // 1:18:15
        characteristics: '执行了极其严格的周期化训练',
        key_improvements: [
          'Run 8 必须守住: 平均配速从掉速20%+提升到仅掉速5%',
          'SkiErg 技术红利: 优化技术，将 SkiErg 时间缩短30秒',
          '零步行策略: 在 Roxzone 的耗时平均减少35%',
        ],
      },
    },
  };
}
