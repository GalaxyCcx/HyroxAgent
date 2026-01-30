/**
 * SplitBreakdownTable - 预测分段拆解表格组件
 * 版本: v1.0
 * 
 * 功能：
 * - 展示达到各目标时间所需的各分段参考值
 * - 对比当前成绩和目标成绩的差距
 * - 颜色编码显示需要提升的幅度
 */
import React from 'react';

export interface SplitTarget {
  segment: string;
  field: string;
  current?: number;       // 当前成绩（秒）
  excellent?: number;     // 5% 目标（秒）
  great?: number;         // 25% 目标（秒）
  expected?: number;      // 50% 目标（秒）
  subpar?: number;        // 75% 目标（秒）
  poor?: number;          // 95% 目标（秒）
}

interface SplitBreakdownTableProps {
  athleteName: string;
  athleteTime: string;    // 当前总成绩 (如 "01:26:06")
  splits: SplitTarget[];
  targetTimes: {
    excellent: string;    // 如 "1:13:16"
    great: string;
    expected: string;
    subpar: string;
    poor: string;
  };
  className?: string;
}

/**
 * 格式化秒数为 M:SS 格式
 */
function formatSeconds(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return '--';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 计算差值并格式化
 */
function formatDelta(current: number | undefined, target: number | undefined): { text: string; className: string } {
  if (current === undefined || target === undefined) {
    return { text: '', className: '' };
  }
  
  const delta = target - current;
  const absDelta = Math.abs(delta);
  const mins = Math.floor(absDelta / 60);
  const secs = Math.floor(absDelta % 60);
  
  let text = '';
  if (mins > 0) {
    text = delta < 0 ? `↓${mins}:${secs.toString().padStart(2, '0')}` : `↑${mins}:${secs.toString().padStart(2, '0')}`;
  } else {
    text = delta < 0 ? `↓0:${secs.toString().padStart(2, '0')}` : `↑0:${secs.toString().padStart(2, '0')}`;
  }
  
  const className = delta < 0 ? 'text-green-400' : delta > 0 ? 'text-red-400' : 'text-gray-400';
  
  return { text, className };
}

// 分段序号映射
const SEGMENT_ORDER: Record<string, string> = {
  'SkiErg': '01',
  'Sled Push': '02',
  'Sled Pull': '03',
  'Burpee Broad Jump': '04',
  'Row Erg': '05',
  'Farmers Carry': '06',
  'Sandbag Lunges': '07',
  'Wall Balls': '08',
  'Run 1': 'R1',
  'Run 2': 'R2',
  'Run 3': 'R3',
  'Run 4': 'R4',
  'Run 5': 'R5',
  'Run 6': 'R6',
  'Run 7': 'R7',
  'Run 8': 'R8',
};

const SplitBreakdownTable: React.FC<SplitBreakdownTableProps> = ({
  athleteName,
  athleteTime,
  splits,
  targetTimes,
  className = '',
}) => {
  // 分组：功能站和跑步
  const stationSplits = splits.filter(s => !s.segment.startsWith('Run'));
  const runningSplits = splits.filter(s => s.segment.startsWith('Run'));

  const renderTableSection = (sectionSplits: SplitTarget[], title: string) => (
    <div className="mb-4">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-gray-400 font-medium">Segment</th>
              <th className="text-center py-2 px-2 text-gray-400 font-medium">
                <div>{athleteName}</div>
                <div className="text-[10px] text-gray-500">{athleteTime}</div>
              </th>
              <th className="text-center py-2 px-2 font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                <div>Excellent</div>
                <div className="text-[10px]">{targetTimes.excellent}</div>
              </th>
              <th className="text-center py-2 px-2 font-medium" style={{ backgroundColor: 'rgba(132, 204, 22, 0.1)', color: '#84cc16' }}>
                <div>Great</div>
                <div className="text-[10px]">{targetTimes.great}</div>
              </th>
              <th className="text-center py-2 px-2 font-medium" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
                <div>Expected</div>
                <div className="text-[10px]">{targetTimes.expected}</div>
              </th>
              <th className="text-center py-2 px-2 font-medium" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
                <div>Subpar</div>
                <div className="text-[10px]">{targetTimes.subpar}</div>
              </th>
              <th className="text-center py-2 px-2 font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <div>Poor</div>
                <div className="text-[10px]">{targetTimes.poor}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectionSplits.map((split, index) => {
              const segNum = SEGMENT_ORDER[split.segment] || (index + 1).toString().padStart(2, '0');
              const excellentDelta = formatDelta(split.current, split.excellent);
              const greatDelta = formatDelta(split.current, split.great);
              const expectedDelta = formatDelta(split.current, split.expected);
              const subparDelta = formatDelta(split.current, split.subpar);
              const poorDelta = formatDelta(split.current, split.poor);
              
              return (
                <tr key={split.segment} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        split.segment.startsWith('Run') ? 'bg-yellow-500/20 text-yellow-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {segNum}
                      </span>
                      <span className="text-white font-medium">{split.segment}</span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-2 text-white font-mono">
                    {formatSeconds(split.current)}
                  </td>
                  <td className="text-center py-2 px-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                    <div className="text-white font-mono">{formatSeconds(split.excellent)}</div>
                    <div className={`text-[10px] ${excellentDelta.className}`}>{excellentDelta.text}</div>
                  </td>
                  <td className="text-center py-2 px-2" style={{ backgroundColor: 'rgba(132, 204, 22, 0.05)' }}>
                    <div className="text-white font-mono">{formatSeconds(split.great)}</div>
                    <div className={`text-[10px] ${greatDelta.className}`}>{greatDelta.text}</div>
                  </td>
                  <td className="text-center py-2 px-2" style={{ backgroundColor: 'rgba(249, 115, 22, 0.05)' }}>
                    <div className="text-white font-mono">{formatSeconds(split.expected)}</div>
                    <div className={`text-[10px] ${expectedDelta.className}`}>{expectedDelta.text}</div>
                  </td>
                  <td className="text-center py-2 px-2" style={{ backgroundColor: 'rgba(234, 88, 12, 0.05)' }}>
                    <div className="text-white font-mono">{formatSeconds(split.subpar)}</div>
                    <div className={`text-[10px] ${subparDelta.className}`}>{subparDelta.text}</div>
                  </td>
                  <td className="text-center py-2 px-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                    <div className="text-white font-mono">{formatSeconds(split.poor)}</div>
                    <div className={`text-[10px] ${poorDelta.className}`}>{poorDelta.text}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={`split-breakdown-table ${className}`}>
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="size-1.5 bg-purple-400 rounded-full"></span>
          Prediction Split Breakdown
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Compare your splits against what athletes at each goal time typically achieve
        </p>
      </div>

      {/* 功能站表格 */}
      {stationSplits.length > 0 && renderTableSection(stationSplits, 'Workout Stations')}

      {/* 跑步表格 */}
      {runningSplits.length > 0 && renderTableSection(runningSplits, 'Running Segments')}
    </div>
  );
};

export default SplitBreakdownTable;

/**
 * 生成 Mock 数据用于测试
 */
export function generateMockSplitBreakdown(): SplitBreakdownTableProps {
  return {
    athleteName: 'Yuanmin Chen',
    athleteTime: '01:26:06',
    targetTimes: {
      excellent: '1:13:16',
      great: '1:19:00',
      expected: '1:23:09',
      subpar: '1:27:38',
      poor: '1:37:09',
    },
    splits: [
      { segment: 'SkiErg', field: 'skierg_time', current: 275, excellent: 256, great: 263, expected: 268, subpar: 273, poor: 284 },
      { segment: 'Sled Push', field: 'sled_push_time', current: 120, excellent: 98, great: 108, expected: 115, subpar: 122, poor: 135 },
      { segment: 'Sled Pull', field: 'sled_pull_time', current: 95, excellent: 78, great: 85, expected: 90, subpar: 96, poor: 108 },
      { segment: 'Burpee Broad Jump', field: 'burpee_broad_jump_time', current: 210, excellent: 185, great: 195, expected: 205, subpar: 215, poor: 235 },
      { segment: 'Row Erg', field: 'row_erg_time', current: 240, excellent: 215, great: 225, expected: 235, subpar: 245, poor: 265 },
      { segment: 'Farmers Carry', field: 'farmers_carry_time', current: 85, excellent: 72, great: 78, expected: 82, subpar: 87, poor: 98 },
      { segment: 'Sandbag Lunges', field: 'sandbag_lunges_time', current: 195, excellent: 170, great: 180, expected: 190, subpar: 200, poor: 220 },
      { segment: 'Wall Balls', field: 'wall_balls_time', current: 165, excellent: 145, great: 155, expected: 162, subpar: 170, poor: 188 },
      { segment: 'Run 1', field: 'run1_time', current: 302, excellent: 285, great: 292, expected: 298, subpar: 304, poor: 320 },
      { segment: 'Run 2', field: 'run2_time', current: 310, excellent: 290, great: 298, expected: 305, subpar: 312, poor: 328 },
      { segment: 'Run 3', field: 'run3_time', current: 315, excellent: 295, great: 302, expected: 310, subpar: 318, poor: 335 },
      { segment: 'Run 4', field: 'run4_time', current: 320, excellent: 298, great: 308, expected: 315, subpar: 322, poor: 340 },
      { segment: 'Run 5', field: 'run5_time', current: 325, excellent: 302, great: 312, expected: 320, subpar: 328, poor: 345 },
      { segment: 'Run 6', field: 'run6_time', current: 330, excellent: 308, great: 318, expected: 325, subpar: 335, poor: 352 },
      { segment: 'Run 7', field: 'run7_time', current: 335, excellent: 312, great: 322, expected: 330, subpar: 340, poor: 358 },
      { segment: 'Run 8', field: 'run8_time', current: 340, excellent: 318, great: 328, expected: 336, subpar: 345, poor: 365 },
    ],
  };
}
