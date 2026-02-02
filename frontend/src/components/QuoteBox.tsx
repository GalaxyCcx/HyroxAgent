/**
 * QuoteBox - 绿色左边框引用框（价值主张等）
 * 样式对齐 demo .quote-box
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

interface QuoteBoxProps {
  content?: string;
  value_proposition?: string;
}

const QuoteBox: React.FC<QuoteBoxProps> = ({ content, value_proposition }) => {
  const text = content ?? value_proposition ?? '';
  if (!text) return null;

  return (
    <div
      className="rounded-r-xl p-4 my-4"
      style={{
        background: 'rgba(0, 255, 136, 0.08)',
        borderLeft: `4px solid ${REPORT_THEME.accent}`,
      }}
    >
      <p className="text-[15px] italic text-white leading-relaxed" style={{ color: REPORT_THEME.text.primary }}>
        "{text}"
      </p>
    </div>
  );
};

export default QuoteBox;
