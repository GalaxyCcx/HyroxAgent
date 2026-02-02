/**
 * SegmentTabs - Running / Workout / Roxzone 三 Tab 切换
 * 每 Tab：图表 + 表格 + 警告/提示框
 */

import React, { useState } from 'react';
import { REPORT_THEME } from '../styles/report-theme';
import { formatTime } from './charts/ChartRenderer';
import ComparisonChart from './charts/ComparisonChart';
import ComparisonTable from './ComparisonTable';
import WarningBox from './WarningBox';
import QuoteBox from './QuoteBox';

interface TabData {
  chart_data?: Array<{ segment: string; you: number; top10: number }>;
  table_data?: Array<{ segment: string; you: string; top10: string; diff: string; highlight?: boolean }>;
  warning?: { title?: string; content?: string };
  highlight?: { title?: string; content?: string };
}

interface RoxzoneComparison {
  you?: { value?: string; seconds?: number };
  top10?: { value?: string; seconds?: number };
  avg?: { value?: string; seconds?: number };
}

interface SegmentTabsProps {
  running?: TabData;
  workout?: TabData;
  roxzone?: {
    comparison?: RoxzoneComparison;
    warning?: { title?: string; content?: string };
  };
}

const TABS = [
  { id: 'running', label: 'Running' },
  { id: 'workout', label: 'Workout' },
  { id: 'roxzone', label: 'Roxzone' },
] as const;

const SegmentTabs: React.FC<SegmentTabsProps> = ({ running, workout, roxzone }) => {
  const [active, setActive] = useState<'running' | 'workout' | 'roxzone'>('running');

  const hasRunning = running && (running.chart_data?.length || running.table_data?.length);
  const hasWorkout = workout && (workout.chart_data?.length || workout.table_data?.length);
  const hasRoxzone = roxzone?.comparison;

  if (!hasRunning && !hasWorkout && !hasRoxzone) return null;

  const renderRunning = () => {
    if (!running) return null;
    const chartData = running.chart_data ?? [];
    const highlightIdx = running.table_data?.findIndex((r) => r.highlight) ?? -1;
    return (
      <div className="space-y-4">
        {chartData.length > 0 && (
          <ComparisonChart
            chart_data={chartData}
            highlightIndex={highlightIdx >= 0 ? highlightIdx : undefined}
          />
        )}
        {running.table_data && running.table_data.length > 0 && (
          <ComparisonTable table_data={running.table_data} />
        )}
        {running.warning && (
          <WarningBox title={running.warning.title} content={running.warning.content} />
        )}
      </div>
    );
  };

  const renderWorkout = () => {
    if (!workout) return null;
    const chartData = workout.chart_data ?? [];
    const highlightIdx = workout.table_data?.findIndex((r) => r.highlight) ?? -1;
    return (
      <div className="space-y-4">
        {chartData.length > 0 && (
          <ComparisonChart
            chart_data={chartData}
            title="功能站分段对比 (vs Top 10%)"
            highlightIndex={highlightIdx >= 0 ? highlightIdx : undefined}
          />
        )}
        {workout.table_data && workout.table_data.length > 0 && (
          <ComparisonTable table_data={workout.table_data} />
        )}
        {workout.highlight && (
          <QuoteBox content={`💡 ${workout.highlight.title || ''} ${workout.highlight.content || ''}`} />
        )}
        {workout.warning && (
          <WarningBox title={workout.warning.title} content={workout.warning.content} />
        )}
      </div>
    );
  };

  const renderRoxzone = () => {
    const comp = roxzone?.comparison;
    if (!comp) return null;
    const youSec = comp.you?.seconds ?? 0;
    const top10Sec = comp.top10?.seconds ?? 0;
    const avgSec = comp.avg?.seconds ?? 0;
    const maxSec = Math.max(youSec, top10Sec, avgSec, 1);
    const rows = [
      { label: '你', value: comp.you?.value ?? formatTime(youSec), seconds: youSec, color: REPORT_THEME.warning },
      { label: 'Top 10%', value: comp.top10?.value ?? formatTime(top10Sec), seconds: top10Sec, color: REPORT_THEME.accent },
      { label: '平均', value: comp.avg?.value ?? formatTime(avgSec), seconds: avgSec, color: REPORT_THEME.text.secondary },
    ];
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            backgroundColor: REPORT_THEME.bg.card,
            border: `1px solid ${REPORT_THEME.border}`,
          }}
        >
          <div className="text-sm font-semibold text-white mb-3">转换区总耗时对比</div>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 text-xs shrink-0" style={{ color: REPORT_THEME.text.secondary }}>{r.label}</div>
                <div className="flex-1 h-6 rounded overflow-hidden bg-white/5">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${(r.seconds / maxSec) * 100}%`, backgroundColor: r.color }}
                  />
                </div>
                <div className="w-16 text-sm font-semibold text-right text-white shrink-0">{r.value}</div>
              </div>
            ))}
          </div>
        </div>
        {roxzone.warning && (
          <WarningBox title={roxzone.warning.title} content={roxzone.warning.content} />
        )}
      </div>
    );
  };

  return (
    <div className="mb-4">
      <div
        className="flex rounded-lg p-1 mb-4"
        style={{ backgroundColor: REPORT_THEME.bg.card }}
      >
        {TABS.map((tab) => {
          const hasContent = tab.id === 'running' ? hasRunning : tab.id === 'workout' ? hasWorkout : hasRoxzone;
          if (!hasContent) return null;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className="flex-1 py-2.5 px-2 text-center text-sm font-medium rounded-md transition-all"
              style={{
                color: isActive ? REPORT_THEME.bg.primary : REPORT_THEME.text.secondary,
                backgroundColor: isActive ? REPORT_THEME.accent : 'transparent',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className="rounded-xl p-5 min-h-[200px]"
        style={{
          backgroundColor: REPORT_THEME.bg.card,
          border: `1px solid ${REPORT_THEME.border}`,
        }}
      >
        {active === 'running' && renderRunning()}
        {active === 'workout' && renderWorkout()}
        {active === 'roxzone' && renderRoxzone()}
      </div>
    </div>
  );
};

export default SegmentTabs;
