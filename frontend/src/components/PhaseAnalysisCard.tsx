/**
 * PhaseAnalysisCard - 第2章阶段分析卡片（stage-box）
 * 接收 phase_analysis 数组，每项：title、icon、metrics、detail、status、conclusion
 */
import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

export interface PhaseAnalysisItem {
  title?: string;
  icon?: string;
  metrics?: string;
  detail?: string;
  status?: 'success' | 'warning';
  conclusion?: string;
}

interface PhaseAnalysisCardProps {
  items?: PhaseAnalysisItem[];
}

const PhaseAnalysisCard: React.FC<PhaseAnalysisCardProps> = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="rounded-lg p-4"
          style={{
            background: REPORT_THEME.bg.cardHover,
            border: `1px solid ${REPORT_THEME.border}`,
          }}
        >
          {item.title && (
            <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              {item.icon && <span>{item.icon}</span>}
              {item.title}
            </div>
          )}
          {item.metrics && (
            <div className="text-[13px] mb-1" style={{ color: REPORT_THEME.text.secondary }}>
              {item.metrics}
            </div>
          )}
          {item.detail && (
            <div className="text-[13px] mb-1" style={{ color: REPORT_THEME.text.secondary }}>
              {item.detail}
            </div>
          )}
          {item.conclusion && (
            <div
              className="text-[13px] mt-3 pt-3 border-t"
              style={{
                color: REPORT_THEME.text.primary,
                borderColor: REPORT_THEME.border,
              }}
            >
              {item.status === 'warning' && '⚠️ '}
              {item.status === 'success' && '✅ '}
              {item.conclusion}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PhaseAnalysisCard;
