/**
 * LossOverviewTable - 时间损耗总览表
 * 来源 + 描述、损耗时间、难度星级；底部总计
 * 样式对齐 demo .loss-table
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

export interface LossOverviewItem {
  source: string;
  source_desc: string;
  loss_seconds: number;
  loss_display: string;
  difficulty: string;
  difficulty_level?: number;
}

interface LossOverviewTableProps {
  total_loss_seconds?: number;
  total_loss_display?: string;
  items?: LossOverviewItem[];
}

const LossOverviewTable: React.FC<LossOverviewTableProps> = ({
  total_loss_seconds = 0,
  total_loss_display,
  items = [],
}) => {
  const totalDisplay = total_loss_display ?? (total_loss_seconds >= 60
    ? `-${Math.floor(total_loss_seconds / 60)}:${String(total_loss_seconds % 60).padStart(2, '0')}`
    : `-${total_loss_seconds}秒`);

  return (
    <div
      className="rounded-xl p-5 mb-4 overflow-hidden"
      style={{
        backgroundColor: REPORT_THEME.bg.card,
        border: `1px solid ${REPORT_THEME.border}`,
      }}
    >
      <div className="space-y-0">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center py-3.5 border-b last:border-b-0"
            style={{ borderColor: REPORT_THEME.border }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{item.source}</div>
              <div className="text-xs mt-0.5" style={{ color: REPORT_THEME.text.secondary }}>
                {item.source_desc}
              </div>
            </div>
            <div
              className="text-base font-semibold mx-4 shrink-0"
              style={{ color: REPORT_THEME.warning }}
            >
              {item.loss_display}
            </div>
            <div className="text-sm shrink-0" style={{ color: REPORT_THEME.gold }}>
              {item.difficulty}
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-4 py-4 text-center rounded-xl"
        style={{ background: REPORT_THEME.accentDim }}
      >
        <div className="text-xs mb-1" style={{ color: REPORT_THEME.text.secondary }}>
          總計時間損耗
        </div>
        <div className="text-2xl font-bold" style={{ color: REPORT_THEME.accent }}>
          {totalDisplay}
        </div>
      </div>
    </div>
  );
};

export default LossOverviewTable;
