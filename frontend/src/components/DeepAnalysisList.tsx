/**
 * DeepAnalysisList - 深度归因分析列表
 * 支持两种结构：
 * 1. categories：固定四大方向（转换区、跑步、功能站、节奏），每方向 status + summary，坏则 details 明细
 * 2. items：旧版平铺数组，渲染多条 DeepAnalysisCard
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';
import DeepAnalysisCard, { type DeepAnalysisItem } from './DeepAnalysisCard';

export interface DeepAnalysisCategory {
  key: string;
  label: string;
  status: 'good' | 'bad';
  summary: string;
  details: Array<{
    source: string;
    loss_display: string;
    difficulty: string;
    analysis_title: string;
    analysis_content: string;
  }>;
}

interface DeepAnalysisListProps {
  /** 新版：按大方向分组 */
  categories?: DeepAnalysisCategory[];
  /** 旧版：平铺明细列表（兼容） */
  items?: DeepAnalysisItem[];
}

const DeepAnalysisList: React.FC<DeepAnalysisListProps> = ({ categories, items = [] }) => {
  // 新版：按四大方向渲染
  if (categories && categories.length > 0) {
    return (
      <div
        className="rounded-xl p-5 mb-4"
        style={{
          backgroundColor: REPORT_THEME.bg.card,
          border: `1px solid ${REPORT_THEME.border}`,
        }}
      >
        {categories.map((cat, i) => (
          <div
            key={cat.key}
            className={i > 0 ? 'pt-4 mt-4 border-t' : ''}
            style={{ borderColor: REPORT_THEME.border }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[15px] font-semibold text-white">{cat.label}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  color: cat.status === 'good' ? REPORT_THEME.accent : REPORT_THEME.warning,
                  backgroundColor: cat.status === 'good' ? REPORT_THEME.accentDim : 'rgba(255, 107, 107, 0.15)',
                }}
              >
                {cat.status === 'good' ? '表现良好' : '需改进'}
              </span>
            </div>
            <p className="text-[13px] mb-3" style={{ color: REPORT_THEME.text.secondary }}>
              {cat.summary}
            </p>
            {cat.status === 'bad' && cat.details && cat.details.length > 0 && (
              <div className="space-y-0">
                {cat.details.map((d, j) => (
                  <DeepAnalysisCard
                    key={j}
                    source={d.source}
                    loss_display={d.loss_display}
                    difficulty={d.difficulty}
                    analysis_title={d.analysis_title}
                    analysis_content={d.analysis_content}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 旧版：平铺 items
  if (!items.length) return null;

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        backgroundColor: REPORT_THEME.bg.card,
        border: `1px solid ${REPORT_THEME.border}`,
      }}
    >
      {items.map((item, i) => (
        <DeepAnalysisCard
          key={i}
          source={item.source}
          loss_display={item.loss_display}
          difficulty={item.difficulty}
          analysis_title={item.analysis_title}
          analysis_content={item.analysis_content}
        />
      ))}
    </div>
  );
};

export default DeepAnalysisList;
