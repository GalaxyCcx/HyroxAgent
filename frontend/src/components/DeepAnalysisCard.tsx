/**
 * DeepAnalysisCard - 单条深度归因分析
 * ▸ 来源、损耗时间、星级 + 分析标题与正文
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

export interface DeepAnalysisItem {
  source: string;
  loss_display: string;
  difficulty: string;
  analysis_title: string;
  analysis_content: string;
}

interface DeepAnalysisCardProps {
  source: string;
  loss_display: string;
  difficulty: string;
  analysis_title: string;
  analysis_content: string;
}

const DeepAnalysisCard: React.FC<DeepAnalysisCardProps> = ({
  source,
  loss_display,
  difficulty,
  analysis_title,
  analysis_content,
}) => (
  <div
    className="py-4 border-b last:border-b-0"
    style={{ borderColor: REPORT_THEME.border }}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[15px] font-semibold text-white">▸ {source}</span>
      <span
        className="text-sm font-semibold"
        style={{ color: REPORT_THEME.warning }}
      >
        {loss_display} {difficulty}
      </span>
    </div>
    <div className="text-[13px] leading-relaxed" style={{ color: REPORT_THEME.text.secondary }}>
      <strong className="text-white">{analysis_title}：</strong>
      {analysis_content}
    </div>
  </div>
);

export default DeepAnalysisCard;
