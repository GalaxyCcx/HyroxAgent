/**
 * TrainingWeekView - 周训练日历组件
 * 版本: v1.0
 * 
 * 功能：
 * - 周历视图 (7天卡片布局)
 * - 训练类型颜色编码 (Key=绿色, Recovery=蓝色, Long=紫色, Rest=灰色)
 * - 每日训练内容 + 时长
 * - 交互式设计
 */
import React, { useMemo } from 'react';

export interface TrainingDay {
  day: string;              // 星期几 (Mon/Tue/Wed/Thu/Fri/Sat/Sun)
  dayName: string;          // 中文名称 (周一/周二...)
  type: 'Key' | 'Recovery' | 'Rest' | 'Long' | 'Easy';  // 训练类型
  content: string;          // 训练内容描述
  duration_minutes?: number; // 时长（分钟）
  intensity?: 'low' | 'medium' | 'high';  // 强度
  notes?: string;           // 备注
}

interface TrainingWeekViewProps {
  weeklyPlan: TrainingDay[];
  weekNumber?: number;      // 周次
  phase?: string;           // 训练阶段 (如 "基础期"/"强化期")
  focusAreas?: string[];    // 本周重点
  className?: string;
}

// 类型配色映射
const TYPE_COLORS = {
  Key: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    icon: '🟢',
    label: '关键训练',
  },
  Recovery: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    icon: '🔵',
    label: '恢复训练',
  },
  Long: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    icon: '🟣',
    label: '长跑训练',
  },
  Easy: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    icon: '🔷',
    label: '轻松训练',
  },
  Rest: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-500',
    icon: '⚪',
    label: '休息',
  },
};

// 星期映射
const DAY_MAP: Record<string, string> = {
  Mon: '周一',
  Tue: '周二',
  Wed: '周三',
  Thu: '周四',
  Fri: '周五',
  Sat: '周六',
  Sun: '周日',
};

const TrainingWeekView: React.FC<TrainingWeekViewProps> = ({
  weeklyPlan,
  weekNumber,
  phase,
  focusAreas,
  className = '',
}) => {
  // 计算周统计数据
  const weekStats = useMemo(() => {
    const plan = weeklyPlan ?? [];
    const keyDays = plan.filter(d => d.type === 'Key').length;
    const recoveryDays = plan.filter(d => d.type === 'Recovery' || d.type === 'Easy').length;
    const restDays = plan.filter(d => d.type === 'Rest').length;
    const longDays = plan.filter(d => d.type === 'Long').length;
    const totalMinutes = plan.reduce((sum, d) => sum + (d.duration_minutes || 0), 0);
    
    return {
      keyDays,
      recoveryDays,
      restDays,
      longDays,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      trainingDays: 7 - restDays,
    };
  }, [weeklyPlan]);

  // 格式化时长
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '-';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={`training-week-view ${className}`}>
      {/* 标题和周统计 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-green-400 rounded-full"></span>
            <h3 className="text-sm font-bold text-white">
              {weekNumber ? `Week ${weekNumber} ` : ''}训练计划
            </h3>
            {phase && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                {phase}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            共 {weekStats.totalHours} 小时 / {weekStats.trainingDays} 天
          </div>
        </div>
        
        {/* 图例 */}
        <div className="flex gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="text-xs">{TYPE_COLORS.Key.icon}</span>
            关键
          </span>
          <span className="flex items-center gap-1">
            <span className="text-xs">{TYPE_COLORS.Long.icon}</span>
            长跑
          </span>
          <span className="flex items-center gap-1">
            <span className="text-xs">{TYPE_COLORS.Recovery.icon}</span>
            恢复
          </span>
          <span className="flex items-center gap-1">
            <span className="text-xs">{TYPE_COLORS.Rest.icon}</span>
            休息
          </span>
        </div>
      </div>

      {/* 7天日历卡片 */}
      <div className="grid grid-cols-7 gap-2">
        {(weeklyPlan ?? []).map((day, index) => {
          const colors = TYPE_COLORS[day.type] || TYPE_COLORS.Rest;
          
          return (
            <div
              key={day.day || index}
              className={`
                rounded-lg border p-2 transition-all duration-200
                ${colors.bg} ${colors.border}
                hover:scale-105 hover:shadow-lg cursor-pointer
                min-h-[120px] flex flex-col
              `}
            >
              {/* 星期标签 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-gray-400">
                  {day.dayName || DAY_MAP[day.day] || day.day}
                </span>
                <span className="text-xs">{colors.icon}</span>
              </div>
              
              {/* 训练类型 */}
              <div className={`text-xs font-bold ${colors.text} mb-1`}>
                {colors.label}
              </div>
              
              {/* 时长 */}
              {day.duration_minutes && day.type !== 'Rest' && (
                <div className="text-lg font-bold text-white mb-1">
                  {formatDuration(day.duration_minutes)}
                </div>
              )}
              
              {/* 内容描述 */}
              <div className="text-[10px] text-gray-300 mt-auto line-clamp-3 leading-relaxed">
                {day.content || (day.type === 'Rest' ? '完全休息' : '')}
              </div>
              
              {/* 强度指示器 */}
              {day.intensity && day.type !== 'Rest' && (
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={`
                        size-1.5 rounded-full
                        ${level <= (day.intensity === 'high' ? 3 : day.intensity === 'medium' ? 2 : 1)
                          ? day.intensity === 'high' ? 'bg-red-400' : day.intensity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                          : 'bg-gray-600'
                        }
                      `}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 本周重点 */}
      {focusAreas && focusAreas.length > 0 && (
        <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg border border-white/5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">本周重点</div>
          <div className="flex flex-wrap gap-2">
            {focusAreas.map((area, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 rounded bg-white/5 text-gray-300"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 周统计摘要 */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">关键训练</div>
          <div className="text-sm font-bold text-green-400">{weekStats.keyDays} 天</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">长跑训练</div>
          <div className="text-sm font-bold text-purple-400">{weekStats.longDays} 天</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">恢复/轻松</div>
          <div className="text-sm font-bold text-blue-400">{weekStats.recoveryDays} 天</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">休息日</div>
          <div className="text-sm font-bold text-gray-400">{weekStats.restDays} 天</div>
        </div>
      </div>
    </div>
  );
};

export default TrainingWeekView;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockTrainingWeek(): TrainingWeekViewProps {
  return {
    weekNumber: 4,
    phase: '基础期',
    focusAreas: ['有氧耐力', '功能站技术', '配速控制'],
    weeklyPlan: [
      {
        day: 'Mon',
        dayName: '周一',
        type: 'Key',
        content: '间歇跑 8x400m + 核心训练',
        duration_minutes: 45,
        intensity: 'high',
      },
      {
        day: 'Tue',
        dayName: '周二',
        type: 'Recovery',
        content: '恢复跑 30分钟 Z2 + 拉伸',
        duration_minutes: 30,
        intensity: 'low',
      },
      {
        day: 'Wed',
        dayName: '周三',
        type: 'Key',
        content: '力量训练：深蹲/硬拉/壶铃',
        duration_minutes: 50,
        intensity: 'high',
      },
      {
        day: 'Thu',
        dayName: '周四',
        type: 'Rest',
        content: '',
        duration_minutes: 0,
      },
      {
        day: 'Fri',
        dayName: '周五',
        type: 'Key',
        content: '节奏跑 6km + 功能站练习',
        duration_minutes: 45,
        intensity: 'medium',
      },
      {
        day: 'Sat',
        dayName: '周六',
        type: 'Long',
        content: '长距离跑 90分钟 Z2',
        duration_minutes: 90,
        intensity: 'medium',
      },
      {
        day: 'Sun',
        dayName: '周日',
        type: 'Rest',
        content: '',
        duration_minutes: 0,
      },
    ],
  };
}
