/**
 * SummaryText - 总评文本组件（图2/图3 demo：绿底 #223c31 + 左边框，紧跟图1 下方）
 */

import React from 'react';

interface SummaryTextProps {
  content?: string;
}

const SummaryText: React.FC<SummaryTextProps> = ({ content }) => {
  if (!content) return null;

  return (
    <div
      className="rounded-r-lg text-sm leading-relaxed"
      style={{
        background: '#223c31',
        borderLeft: '3px solid #00FF88',
        padding: '16px 20px',
      }}
    >
      <p className="text-white/95 m-0">
        <strong className="text-white">总评：</strong>
        {content}
      </p>
    </div>
  );
};

export default SummaryText;
