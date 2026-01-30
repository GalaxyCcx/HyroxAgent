/**
 * CohortComparison - 同水平选手对比卡片
 * 版本: v1.0
 * 
 * 功能：
 * - 显示排名相近的选手
 * - 前面和后面各5名选手
 * - 突出显示当前运动员
 * - 显示时间差距
 */
import React from 'react';
import { formatTime } from './ChartRenderer';

interface PeerData {
  name: string;
  rank: number;
  totalTime: number;  // 秒
  gap: number;        // 与运动员的时间差（秒）
}

interface CohortComparisonProps {
  athleteName: string;
  athleteRank: number;
  athleteTime: number;  // 秒
  peerRange: string;
  peersAhead: PeerData[];
  peersBehind: PeerData[];
  timeToNextLevel?: number | null;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const CohortComparison: React.FC<CohortComparisonProps> = ({
  athleteName,
  athleteRank,
  athleteTime,
  peerRange,
  peersAhead,
  peersBehind,
  timeToNextLevel,
  title = '同水平选手对比',
  className,
  style,
}) => {
  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 ${className || ''}`} style={style}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="size-1.5 bg-cyan-400 rounded-full"></span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <span className="text-xs text-gray-400">{peerRange}</span>
      </div>
      
      {/* 前面的选手 */}
      {peersAhead.length > 0 && (
        <div className="mb-2">
          {peersAhead.slice().reverse().map((peer, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between py-2 px-3 mb-1 bg-[#252525] rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-6">#{peer.rank}</span>
                <span className="text-sm text-gray-300 truncate max-w-[120px]">{peer.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{formatTime(peer.totalTime)}</span>
                <span className="text-xs font-bold text-green-400 w-16 text-right">
                  {peer.gap < 0 ? '' : '+'}{formatTime(Math.abs(peer.gap))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 当前运动员（高亮） */}
      <div className="flex items-center justify-between py-3 px-4 mb-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl border-2 border-cyan-400/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-cyan-400 w-6">#{athleteRank}</span>
          <span className="text-sm font-bold text-white truncate max-w-[120px]">{athleteName}</span>
          <span className="text-[10px] px-2 py-0.5 bg-cyan-500/30 rounded text-cyan-300">YOU</span>
        </div>
        <span className="text-sm font-bold text-white">{formatTime(athleteTime)}</span>
      </div>
      
      {/* 后面的选手 */}
      {peersBehind.length > 0 && (
        <div className="mt-2">
          {peersBehind.map((peer, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between py-2 px-3 mb-1 bg-[#252525] rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-6">#{peer.rank}</span>
                <span className="text-sm text-gray-300 truncate max-w-[120px]">{peer.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{formatTime(peer.totalTime)}</span>
                <span className="text-xs font-bold text-red-400 w-16 text-right">
                  +{formatTime(peer.gap)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 提升提示 */}
      {timeToNextLevel && timeToNextLevel > 0 && (
        <div className="mt-4 p-3 bg-[#252525] rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-green-400 text-base">trending_up</span>
            <span className="text-white">距离前一名</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            再快 <span className="text-green-400 font-bold">{formatTime(timeToNextLevel)}</span> 即可超越
          </p>
        </div>
      )}
    </div>
  );
};

export default CohortComparison;
