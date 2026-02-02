/**
 * WarningBox - 红色左边框警告框
 * 样式对齐 demo .warning-box
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

interface WarningBoxProps {
  title?: string;
  content?: string;
}

const WarningBox: React.FC<WarningBoxProps> = ({ title, content }) => {
  if (!title && !content) return null;

  return (
    <div
      className="rounded-r-xl p-4 my-4"
      style={{
        background: 'rgba(255, 107, 107, 0.08)',
        borderLeft: `4px solid ${REPORT_THEME.warning}`,
      }}
    >
      {title && (
        <div
          className="text-sm font-semibold mb-2"
          style={{ color: REPORT_THEME.warning }}
        >
          {title}
        </div>
      )}
      {content && (
        <div
          className="text-[13px] leading-relaxed"
          style={{ color: REPORT_THEME.text.secondary }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default WarningBox;
