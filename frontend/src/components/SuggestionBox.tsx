/**
 * SuggestionBox - 第2章建议框（绿色左边框 + 💡）
 * 接收 roxzone_suggestion 文案
 */
import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

interface SuggestionBoxProps {
  content?: string;
}

const SuggestionBox: React.FC<SuggestionBoxProps> = ({ content }) => {
  if (!content) return null;

  return (
    <div
      className="rounded-r-xl p-4 my-4"
      style={{
        background: 'rgba(0, 255, 136, 0.08)',
        borderLeft: `4px solid ${REPORT_THEME.accent}`,
      }}
    >
      <p className="text-[15px] italic leading-relaxed" style={{ color: REPORT_THEME.text.primary }}>
        💡 {content}
      </p>
    </div>
  );
};

export default SuggestionBox;
