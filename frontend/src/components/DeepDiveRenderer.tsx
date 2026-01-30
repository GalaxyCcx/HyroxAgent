/**
 * DeepDiveRenderer - 第3章「ZONEØ 引擎深度复盘」专用渲染组件
 * 
 * 功能：
 * - 解析 deep_dive 章节的 Markdown 内容
 * - 将阶段分析渲染为卡片式 UI
 * - 支持心率/配速数据的可视化展示
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PhaseData {
  name: string;
  nameZh: string;
  segments: string;
  avgHr?: number;
  avgPace?: number;
  description: string;
}

interface DeepDiveRendererProps {
  content: string;
  className?: string;
}

/**
 * 解析 deep_dive 章节内容，提取阶段数据
 */
function parseDeepDiveContent(content: string): {
  phases: PhaseData[];
  summary: string;
  otherContent: string;
} {
  const phases: PhaseData[] = [];
  let summary = '';
  let otherContent = '';
  
  // 匹配阶段模式：**穩態期 (Steady State)** (Run1, Run2...) 平均心率: xxx bpm 平均配速: xxx 分/公里
  const phaseRegex = /\*\*([^(]+)\s*\(([^)]+)\)\*\*\s*\(([^)]+)\)\s*(?:平均心率:\s*(\d+)\s*bpm\s*)?(?:平均配速:\s*([\d.]+)\s*分\/公里)?\s*\n\n([^\n*]+(?:\n[^\n*#]+)*)/g;
  
  let match;
  let lastIndex = 0;
  
  while ((match = phaseRegex.exec(content)) !== null) {
    const [fullMatch, nameZh, nameEn, segments, avgHr, avgPace, description] = match;
    
    phases.push({
      name: nameEn.trim(),
      nameZh: nameZh.trim(),
      segments: segments.trim(),
      avgHr: avgHr ? parseInt(avgHr) : undefined,
      avgPace: avgPace ? parseFloat(avgPace) : undefined,
      description: description.trim(),
    });
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // 提取分析总结
  const summaryMatch = content.match(/###\s*分析總結\s*\n\n([^\n#]+(?:\n[^\n#]+)*)/);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  }
  
  // 如果没有匹配到阶段数据，返回原始内容
  if (phases.length === 0) {
    otherContent = content;
  }
  
  return { phases, summary, otherContent };
}

/**
 * 阶段卡片组件
 */
const PhaseCard: React.FC<{
  phase: PhaseData;
  index: number;
}> = ({ phase, index }) => {
  // 阶段颜色配置
  const phaseColors: Record<string, { bg: string; border: string; icon: string; gradient: string }> = {
    'Steady State': {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: '🟢',
      gradient: 'from-emerald-500 to-green-400',
    },
    'Decoupling': {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: '🟡',
      gradient: 'from-amber-500 to-yellow-400',
    },
    'Collapse': {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: '🔴',
      gradient: 'from-red-500 to-orange-400',
    },
  };
  
  const colors = phaseColors[phase.name] || {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    icon: '⚪',
    gradient: 'from-gray-500 to-gray-400',
  };
  
  // 格式化配速
  const formatPace = (pace: number) => {
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };
  
  return (
    <div className={`relative rounded-xl ${colors.bg} border ${colors.border} p-4 mb-4 overflow-hidden`}>
      {/* 左侧渐变条 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${colors.gradient}`}></div>
      
      <div className="pl-3">
        {/* 阶段标题 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{colors.icon}</span>
            <h4 className="text-white font-bold text-sm">
              {phase.nameZh} <span className="text-white/50 font-normal">({phase.name})</span>
            </h4>
          </div>
          <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
            {phase.segments}
          </span>
        </div>
        
        {/* 数据指标 */}
        <div className="flex gap-4 mb-3">
          {phase.avgHr && (
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
              <span className="text-red-400 text-xs">❤️</span>
              <div>
                <div className="text-white font-bold text-sm">{phase.avgHr}</div>
                <div className="text-white/40 text-[10px]">bpm</div>
              </div>
            </div>
          )}
          {phase.avgPace && (
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
              <span className="text-blue-400 text-xs">⚡</span>
              <div>
                <div className="text-white font-bold text-sm">{formatPace(phase.avgPace)}</div>
                <div className="text-white/40 text-[10px]">/km</div>
              </div>
            </div>
          )}
        </div>
        
        {/* 阶段描述 */}
        <p className="text-white/70 text-xs leading-relaxed">
          {phase.description}
        </p>
      </div>
    </div>
  );
};

/**
 * 分析总结卡片
 */
const SummaryCard: React.FC<{ summary: string }> = ({ summary }) => {
  if (!summary) return null;
  
  return (
    <div className="relative rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-4 mt-4">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-blue-500"></div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-purple-400">📊</span>
        <h4 className="text-white font-bold text-sm">分析總結</h4>
      </div>
      
      <p className="text-white/80 text-xs leading-relaxed">
        {summary}
      </p>
    </div>
  );
};

/**
 * DeepDiveRenderer 主组件
 */
const DeepDiveRenderer: React.FC<DeepDiveRendererProps> = ({ content, className }) => {
  const { phases, summary, otherContent } = parseDeepDiveContent(content);
  
  // 如果没有解析到阶段数据，使用普通 Markdown 渲染
  if (phases.length === 0) {
    return (
      <div className={`prose prose-sm prose-invert max-w-none ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* 章节标题 */}
      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
        <span className="text-cyan-400">💓</span>
        心率與配速解耦分析
      </h3>
      
      {/* 阶段卡片列表 */}
      <div className="space-y-2">
        {phases.map((phase, index) => (
          <PhaseCard key={phase.name} phase={phase} index={index} />
        ))}
      </div>
      
      {/* 分析总结 */}
      <SummaryCard summary={summary} />
      
      {/* 其他内容（如图表标记） */}
      {otherContent && (
        <div className="mt-4 prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {otherContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default DeepDiveRenderer;
