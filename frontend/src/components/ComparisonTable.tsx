/**
 * ComparisonTable - 分段对比表（你 vs Top10%）
 * 支持高亮最差行（红色）
 */

import React from 'react';
import { REPORT_THEME } from '../styles/report-theme';

export interface ComparisonTableRow {
  segment: string;
  you: string;
  top10: string;
  diff: string;
  highlight?: boolean;
}

interface ComparisonTableProps {
  table_data?: ComparisonTableRow[];
  segments?: string[];
  you?: string[];
  top10?: string[];
  diff?: string[];
  highlightIndex?: number;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  table_data = [],
  segments,
  you: youArr,
  top10: top10Arr,
  diff: diffArr,
  highlightIndex,
}) => {
  let rows: ComparisonTableRow[] = table_data;

  if (!rows.length && segments?.length) {
    rows = (segments as string[]).map((segment, i) => ({
      segment,
      you: youArr?.[i] ?? '-',
      top10: top10Arr?.[i] ?? '-',
      diff: diffArr?.[i] ?? '-',
      highlight: highlightIndex === i,
    }));
  }

  if (!rows.length) return null;

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{
        backgroundColor: REPORT_THEME.bg.card,
        border: `1px solid ${REPORT_THEME.border}`,
      }}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left text-xs font-medium" style={{ color: REPORT_THEME.text.secondary }}>段落</th>
            <th className="p-3 text-left text-xs font-medium" style={{ color: REPORT_THEME.text.secondary }}>你</th>
            <th className="p-3 text-left text-xs font-medium" style={{ color: REPORT_THEME.text.secondary }}>Top 10%</th>
            <th className="p-3 text-left text-xs font-medium" style={{ color: REPORT_THEME.text.secondary }}>差距</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t"
              style={{
                borderColor: REPORT_THEME.border,
                backgroundColor: row.highlight ? 'rgba(255, 107, 107, 0.1)' : undefined,
              }}
            >
              <td className="p-3 text-sm font-medium text-white">{row.segment}</td>
              <td className={`p-3 text-sm ${row.highlight ? 'font-semibold' : ''}`} style={{ color: row.highlight ? REPORT_THEME.warning : REPORT_THEME.text.primary }}>{row.you}</td>
              <td className="p-3 text-sm" style={{ color: REPORT_THEME.text.secondary }}>{row.top10}</td>
              <td className={`p-3 text-sm ${row.highlight ? 'font-semibold' : ''}`} style={{ color: REPORT_THEME.warning }}>{row.diff}{row.highlight ? ' ⚠️' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
