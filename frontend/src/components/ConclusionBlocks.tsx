/**
 * ConclusionBlocks - 1.2 Running/Workout 分块结论
 * 每个 highlight 段一块：与 Top 10% 差距、问题简述、提升空间与计算逻辑
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

export interface ConclusionBlock {
  segment: string;
  gap_vs_top10: string;
  pacing_issue: string;
  improvement_display: string;
  improvement_logic: string;
}

interface ConclusionBlocksProps {
  blocks: ConclusionBlock[];
  /** 第二项标签：Running 用「配速问题」，Workout 用「该站问题」 */
  issueLabel?: string;
}

const ConclusionBlocks: React.FC<ConclusionBlocksProps> = ({ blocks, issueLabel = '配速问题' }) => {
  if (!blocks?.length) return null;

  return (
    <div className="space-y-4 mt-4">
      {blocks.map((block, index) => (
        <div
          key={block.segment + index}
          className="rounded-r-xl p-4"
          style={{
            background: 'rgba(255, 107, 107, 0.08)',
            borderLeft: `4px solid ${REPORT_THEME.warning}`,
          }}
        >
          <div
            className="text-sm font-semibold mb-3"
            style={{ color: REPORT_THEME.warning }}
          >
            {block.segment}
          </div>
          <div className="space-y-2 text-[13px] leading-relaxed" style={{ color: REPORT_THEME.text.secondary }}>
            <p><strong>与 Top 10% 的差距：</strong>{block.gap_vs_top10}</p>
            <p><strong>{issueLabel}：</strong>{block.pacing_issue}</p>
            <p><strong>提升空间：</strong><span style={{ color: REPORT_THEME.accent }}>{block.improvement_display}</span></p>
            <p className="text-[12px] opacity-90"><strong>计算逻辑：</strong>{block.improvement_logic}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConclusionBlocks;
