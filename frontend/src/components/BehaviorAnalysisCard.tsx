/**
 * BehaviorAnalysisCard - 第2章行为分析卡片
 * 接收 roxzone_behavior_analysis 数组，每项 title + content（LLM 输出）
 */
import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

export interface BehaviorAnalysisItem {
  title?: string;
  content?: string;
}

interface BehaviorAnalysisCardProps {
  items?: BehaviorAnalysisItem[];
}

const BehaviorAnalysisCard: React.FC<BehaviorAnalysisCardProps> = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: REPORT_THEME.bg.card,
        border: `1px solid ${REPORT_THEME.border}`,
      }}
    >
      <div className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <span>📋</span>
        行为分析
      </div>
      <div className="space-y-0">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`pb-4 ${idx < items.length - 1 ? 'border-b' : ''}`}
            style={idx < items.length - 1 ? { borderColor: REPORT_THEME.border } : undefined}
          >
            {idx > 0 && <div className="mt-4" />}
            {item.title && (
              <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
            )}
            {item.content && (
              <div className="text-[13px] leading-relaxed" style={{ color: REPORT_THEME.text.secondary }}>
                {item.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BehaviorAnalysisCard;
