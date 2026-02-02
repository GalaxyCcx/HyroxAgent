/**
 * ReportView - 报告渲染页面
 * 版本: v4.0 (重构版)
 * 
 * 功能：
 * - 报告头部（选手名、比赛信息、三统计卡片）
 * - 章节渲染（section_tag + title + subtitle + 结构化内容）
 * - 基于 Demo 的深色科技风格主题
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { reportApi } from '../services/api';
import ReportChart, { parseChartMarkers } from '../components/ReportChart';
import REPORT_THEME from '../styles/report-theme';
import {
  TrainingWeekView,
  PredictionTiers,
  PredictionDensity,
  PacingConsistencyCard,
  DualRadar,
  DistributionHistogram,
  PaceTrendChart,
  SplitBreakdownTable,
  HorizontalBar,
  CohortComparison,
  PriorityMatrix,
  RadarChart5D,
} from '../components/charts';
import BlockRenderer from '../components/BlockRenderer';
import type {
  ProReport,
  RenderableReportSection,
  SummaryStructuredOutput,
  TimeLossStructuredOutput,
  HeartRateStructuredOutput,
  PredictionStructuredOutput,
  TrainingStructuredOutput,
  ChartConfig,
  HeartRateImage,
  ContentBlock,
  DataSnapshot,
} from '../types';

interface ReportViewProps {
  reportId: string;
  onBack?: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ reportId, onBack }) => {
  // --- 状态管理 ---
  const [report, setReport] = useState<ProReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heartRateImages, setHeartRateImages] = useState<HeartRateImage[]>([]);

  // --- 加载报告数据 ---
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const raw = await reportApi.getReport(reportId) as unknown;
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportView.tsx:loadReport',message:'API raw response',data:{rawType:typeof raw,rawKeys:raw?Object.keys(raw as object):null,rawSections:raw?(raw as any).sections:undefined,rawSectionsType:raw?typeof (raw as any).sections:undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = raw as { code?: number; data?: unknown; report_id?: string; message?: string };
      const data = response.code === 0 && response.data != null
        ? (response.data as Record<string, unknown>)
        : response.report_id != null
          ? (raw as Record<string, unknown>)
          : null;
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportView.tsx:loadReport:dataExtracted',message:'Data extracted from response',data:{hasData:!!data,dataKeys:data?Object.keys(data):null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (data) {
        const d = data as Record<string, unknown>;
        const sections = Array.isArray(d.sections) ? d.sections : [];
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportView.tsx:loadReport:sectionsCheck',message:'Sections data check',data:{dSectionsType:typeof d.sections,dSectionsIsArray:Array.isArray(d.sections),dSectionsValue:d.sections,sectionsLength:sections.length,firstSection:sections[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const chartsObj = d.charts != null && typeof d.charts === 'object' ? d.charts : {};
        
        // 转换后端数据结构为前端期望的格式（防御性：避免 null/undefined 导致渲染抛错）
        const transformedReport: ProReport = {
          report_id: String(d.report_id ?? ''),
          athlete_name: String(d.athlete_name ?? ''),
          race_info: {
            season: Number(d.season) || 0,
            location: String(d.location ?? ''),
            division: String(d.division ?? ''),
            total_time: String(d.total_time ?? ''),
            event_name: String(d.event_name ?? ''),
            age_group: String(d.age_group ?? ''),
            overall_rank: d.overall_rank as number | undefined,
            total_participants: d.total_participants as number | undefined,
            age_group_rank: d.age_group_rank as number | undefined,
            age_group_total: d.age_group_total as number | undefined,
          },
          introduction: typeof d.introduction === 'string' ? d.introduction : '',
          sections: sections as RenderableReportSection[],
          conclusion: typeof d.conclusion === 'string' ? d.conclusion : '',
          generated_at: (d.completed_at ?? d.created_at) != null ? String(d.completed_at ?? d.created_at) : '',
          charts: chartsObj as Record<string, ChartConfig>,
        };
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportView.tsx:loadReport:transformedReport',message:'Transformed report',data:{sectionsIsArray:Array.isArray(transformedReport.sections),sectionsLength:transformedReport.sections?.length,sectionsFirst:transformedReport.sections?.[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        setReport(transformedReport);
      } else {
        setError(response.message || '加载报告失败');
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // --- 加载心率图片（接口失败时保持空数组，避免 .map 报错）---
  const loadHeartRateImages = useCallback(async () => {
    try {
      const response = await reportApi.getHeartRateImages(reportId);
      const list = Array.isArray(response?.data) ? response.data : [];
      setHeartRateImages(list);
    } catch (err) {
      console.error('Failed to load heart rate images:', err);
      setHeartRateImages([]);
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();
    loadHeartRateImages();
  }, [loadReport, loadHeartRateImages]);

  // --- 图片上传成功回调 ---
  const handleImagesUploaded = (images: HeartRateImage[]) => {
    setHeartRateImages(prev => [...prev, ...images]);
  };

  // --- Loading 状态 ---
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0D0D0D]">
        <header className="px-4 py-4 flex items-center justify-between border-b border-[#333333] sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md z-30">
          <button onClick={onBack} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-white font-bold">ROXSCAN 深度分析报告</span>
          <div className="w-8"></div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="size-12 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white/60 text-sm">加载报告中...</p>
        </div>
      </div>
    );
  }

  // --- Error 状态 ---
  if (error || !report) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0D0D0D]">
        <header className="px-4 py-4 flex items-center justify-between border-b border-[#333333] sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md z-30">
          <button onClick={onBack} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-white font-bold">ROXSCAN 深度分析报告</span>
          <div className="w-8"></div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <span className="material-symbols-outlined text-4xl text-white/30 mb-4">error</span>
          <p className="text-white/60 text-sm mb-4">{error || '报告加载失败'}</p>
          <button 
            onClick={loadReport}
            className="px-6 py-2 bg-[#00FF88] text-black font-bold rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] animate-in fade-in duration-300">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-[#333333] sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md z-30">
        <button onClick={onBack} className="text-white hover:text-[#00FF88] transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="text-white font-bold text-sm">ROXSCAN 深度分析报告</span>
        <button className="text-white/60 hover:text-white transition-colors">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      <main className="flex-1 p-4 pb-32 overflow-y-auto">
        {/* 报告头部 */}
        <ReportHeader report={report} />

        {/* 章节渲染 */}
        {(() => { fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportView.tsx:renderSections',message:'Before sections map',data:{reportExists:!!report,sectionsExists:!!report?.sections,sectionsIsArray:Array.isArray(report?.sections),sectionsLength:report?.sections?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{}); return null; })()}
        {(Array.isArray(report.sections) ? report.sections : []).map((section, index) => (
          <SectionRenderer
            key={section.section_id ?? index}
            section={section}
            index={index}
            charts={report.charts ?? {}}
            dataSnapshots={((report as any).data_snapshots ?? (report as any).charts ?? {}) as Record<string, DataSnapshot>}
          />
        ))}

        {/* 心率图片上传区域 - 暂时隐藏，后续章节完成后再启用 */}
        {/* TODO: 在深度复盘章节中集成心率数据上传功能 */}

        {/* 底部信息 */}
        <div className="text-center mt-8 text-white/30 text-[10px]">
          <p>生成于 {new Date(report.generated_at).toLocaleString()}</p>
          <p className="mt-1">Powered by HYROX AI Analysis</p>
        </div>
      </main>
    </div>
  );
};

// ========== 报告头部组件 (V4 重构) ==========
interface ReportHeaderProps {
  report: ProReport;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ report }) => {
  // 从 race_info 中提取赛季年份
  const seasonYear = report.race_info?.event_name?.match(/\d{4}/)?.[0] || '2025';
  const seasonNumber = report.race_info?.season ?? 8;
  // 提取日期
  const dateMatch = report.race_info?.event_name?.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  const formattedDate = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : '';
  // 组别行：Division (AgeGroup)，如 "Men Open (30-34)"
  const divisionDisplay = report.race_info?.division
    ? (report.race_info?.age_group ? `${report.race_info.division} (${report.race_info.age_group})` : report.race_info.division)
    : (report.race_info?.age_group ? report.race_info.age_group : '-');
  
  return (
    <header 
      className="text-center pt-6 pb-6 px-4 mb-0 border-b border-[#333333]"
      style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)' }}
    >
      <div className="max-w-[450px] mx-auto">
        {/* 赛季徽章 - demo: report-badge */}
        <div className="inline-flex bg-[#1A1A1A] px-4 py-2 rounded-lg mb-4">
          <div>
            <div className="text-xs text-[#888888]">{seasonYear}</div>
            <div className="text-2xl font-bold text-[#00FF88]">S{seasonNumber}</div>
          </div>
        </div>
        
        {/* 报告标题 - demo: report-title + report-subtitle */}
        <h1 className="text-[20px] font-semibold text-white mb-1">
          📊 ROXSCAN 深度竞技分析报告
        </h1>
        <p className="text-sm text-[#00FF88] mb-4">专业版 V2.0</p>
        
        {/* 运动员姓名 - demo: athlete-name */}
        <h2 className="text-[28px] font-bold text-white mb-2">{report.athlete_name}</h2>
        
        {/* 比赛信息 - demo: event-info 两行 */}
        <p className="text-sm text-[#888888]">
          HYROX {report.race_info?.location} S{seasonNumber}
          {formattedDate ? ` · ${formattedDate}` : ''}
        </p>
        <p className="text-sm text-[#888888]">{divisionDisplay}</p>
        
        {/* 三统计卡片 - demo: 三个 value 均为 accent 绿色 */}
        <div className="flex gap-3 justify-center mt-5" style={{ maxWidth: 360 }}>
          <div className="flex-1 max-w-[120px] bg-[#1A1A1A] rounded-xl py-4 px-5 text-center">
            <div className="text-[20px] font-bold text-[#00FF88]">
              {report.race_info?.total_time || '-'}
            </div>
            <div className="text-xs text-[#888888] mt-1">完赛时间</div>
          </div>
          <div className="flex-1 max-w-[120px] bg-[#1A1A1A] rounded-xl py-4 px-5 text-center">
            <div className="text-[20px] font-bold text-[#00FF88]">
              {report.race_info?.overall_rank != null ? `#${report.race_info.overall_rank}` : '--'}
            </div>
            <div className="text-xs text-[#888888] mt-1">总排名</div>
          </div>
          <div className="flex-1 max-w-[120px] bg-[#1A1A1A] rounded-xl py-4 px-5 text-center">
            <div className="text-[20px] font-bold text-[#00FF88]">
              {report.race_info?.age_group_rank != null ? `#${report.race_info.age_group_rank}` : '--'}
            </div>
            <div className="text-xs text-[#888888] mt-1">年龄组排名</div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ========== 章节渲染组件 ==========
interface SectionRendererProps {
  section: RenderableReportSection & { 
    blocks?: ContentBlock[];  // V3/V4: blocks 数组
    order?: number;
    type?: string;
    section_tag?: string;     // V4: 章节标签 (如 "核心摘要", "第1章")
    subtitle?: string | null; // V4: 副标题
  };
  index: number;
  charts?: Record<string, ChartConfig>;
  dataSnapshots?: Record<string, DataSnapshot>;  // V3/V4: 数据快照
}

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, index, charts, dataSnapshots }) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportView.tsx:SectionRenderer',message:'Section render start',data:{index,sectionExists:!!section,sectionId:section?.section_id,blocksExists:!!section?.blocks,blocksIsArray:Array.isArray(section?.blocks),blocksLength:section?.blocks?.length,chartsExists:!!section?.charts,chartsIsArray:Array.isArray(section?.charts)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  // 防御性检查：确保 section 存在
  if (!section) {
    console.error('[SectionRenderer] section is undefined');
    return null;
  }

  const rawBlocks = section.blocks && Array.isArray(section.blocks) ? section.blocks : [];
  // 核心摘要章节不渲染心率/上传类块，避免第一章出现心率模块
  const isSummary = (section.section_id ?? '').toLowerCase().includes('summary');
  const heartRateOrUpload = (c: string) => /heart|hr|upload|心率|上传/i.test(String(c));
  let blocks = isSummary
    ? rawBlocks.filter((b) => b && !heartRateOrUpload((b as { component?: string }).component ?? ''))
    : rawBlocks;
  // 图2：核心摘要 blocks 顺序固定为 图1(ScoreRing) → 总评(SummaryText) → 雷达图 → 其他，保证总评紧接在图1下方
  if (isSummary && blocks.length > 1) {
    const order = ['ScoreRing', 'SummaryText', 'RadarChart5D', 'DimensionList'];
    const getOrder = (c: string) => { const i = order.indexOf(c); return i >= 0 ? i : order.length; };
    blocks = [...blocks].sort((a, b) => {
      const ca = (a as { component?: string }).component ?? '';
      const cb = (b as { component?: string }).component ?? '';
      return getOrder(ca) - getOrder(cb);
    });
  }
  const hasBlocks = blocks.length > 0;

  // V4 章节颜色主题（统一使用绿色主色调）
  const sectionsTheme = REPORT_THEME.sections || [];
  const sectionTheme = sectionsTheme[index % Math.max(sectionsTheme.length, 1)] || { accent: '#00FF88', border: 'rgba(0, 255, 136, 0.2)' };

  // 解析内容中的图表标记（V2 兼容）
  const contentParts = !hasBlocks && section.content && charts 
    ? parseChartMarkers(section.content, charts as Record<string, { config: Record<string, unknown>; purpose?: string; chart_type?: string }>)
    : [];

  // 核心摘要章节固定显示「核心摘要」标题（与 demo 一致）
  const displayTag = section.section_tag || (isSummary ? '核心摘要' : '');
  return (
    <section className="py-6 border-b border-[#333333]">
      {/* demo: section-header + section-tag(绿色) + section-title */}
      <div className="mb-5">
        {displayTag && (
          <div className="text-xs text-[#00FF88] tracking-wider mb-2">
            {displayTag}
          </div>
        )}
        <h2 className="text-[22px] font-bold text-white mb-2">{section.title}</h2>
        {section.subtitle && (
          <p className="text-sm text-[#888888]">{section.subtitle}</p>
        )}
      </div>

      <div>
        {/* 核心摘要：有 structured_output 时优先用 SummaryOutput（无圆环、无雷达下多余板块），与 demo 一致 */}
        {isSummary && section.structured_output && (
          <StructuredOutputRenderer
            sectionType={section.section_type}
            data={section.structured_output as unknown as Record<string, unknown>}
          />
        )}
        {/* V3 模式：使用 BlockRenderer 渲染 blocks；核心摘要中的 ScoreRing 改为 demo 风格无圆环卡片 */}
        {hasBlocks && !(isSummary && section.structured_output) && (
          <div className="space-y-4">
            {(() => {
              const isTimeLoss = (section.section_id ?? '') === 'time_loss';
              const subSectionTitles: Record<string, string> = {
                LossOverviewTable: '📋 1.1 时间损耗总览',
                SegmentTabs: '🏃 1.2 数据证明：跑步分段',
                DeepAnalysisList: '🔍 1.3 深度归因分析',
              };
              return blocks.map((block, blockIndex) => {
                if (!block) return null;
                const blockComponent = (block as { component?: string }).component;
                const subTitle = isTimeLoss && blockComponent ? subSectionTitles[blockComponent] : null;
                return (
                  <React.Fragment key={`block-${blockIndex}`}>
                    {subTitle && (
                      <h3 className="text-base font-semibold text-white mb-4 pb-2 border-b border-[#333333] flex items-center gap-2">
                        {subTitle}
                      </h3>
                    )}
                    {isSummary && blockComponent === 'ScoreRing' ? (() => {
                      const props = block.props as { score?: number; level?: string; level_name?: string; level_description?: string };
                      const score = props?.score ?? 0;
                      const level = props?.level ?? 'D';
                      const levelName = props?.level_name ?? '';
                      const levelDescriptions: Record<string, string> = {
                        'S': '你的综合实力位于全球前 5% 的选手行列',
                        'A': '你的综合实力位于全球前 15% 的选手行列',
                        'B': '你的综合实力位于全球前 30% 的选手行列',
                        'C': '你的综合实力位于全球前 50% 的选手行列',
                        'D': '你的综合实力有较大提升空间',
                      };
                      return (
                        <div className="bg-[#1A1A1A] rounded-xl mb-0 overflow-hidden">
                          <div className="px-6 pt-5 pb-2 text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎯</span>
                              <span className="text-base font-semibold">ROXSCAN</span>
                              <span className="text-sm text-white/90">综合评分</span>
                            </div>
                          </div>
                          <div className="px-6 pt-4 pb-6 flex items-start gap-8">
                            <div className="flex flex-col items-start shrink-0">
                              <span className="text-[40px] font-bold text-[#00FF88] leading-none tracking-tight">{score}</span>
                              <span className="text-sm text-[#888888] mt-1 ml-0.5">/100</span>
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="text-lg font-semibold text-[#00FF88] mb-2 leading-tight">{levelName || `${level}级`}</div>
                              <div className="text-[13px] text-[#888888] leading-relaxed">
                                {props?.level_description ?? levelDescriptions[level] ?? ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })() : (
                      <BlockRenderer
                        block={block}
                        dataSnapshots={dataSnapshots}
                      />
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}

        {/* V2 兼容：结构化输出渲染（核心摘要已在上面单独渲染，此处跳过避免重复） */}
        {!hasBlocks && section.structured_output && !(isSummary && section.structured_output) && (
          <StructuredOutputRenderer 
            sectionType={section.section_type}
            data={section.structured_output as unknown as Record<string, unknown>}
          />
        )}

        {/* V2 兼容：Markdown 内容 + 图表 */}
        {!hasBlocks && Array.isArray(contentParts) && contentParts.length > 0 && (
          <div className="prose prose-sm prose-invert max-w-none text-white/70 mt-4">
            {contentParts.map((part, partIndex) => {
              if (part.type === 'chart' && part.config) {
                return (
                  <div key={`chart-${partIndex}`} className="my-4 p-4 bg-[#0D0D0D] rounded-xl border border-[#333333]">
                    <ReportChart
                      chartId={part.chartId || `chart-${index}-${partIndex}`}
                      config={part.config}
                      purpose={part.purpose}
                    />
                  </div>
                );
              }
              return (
                <ReactMarkdown key={`text-${partIndex}`} remarkPlugins={[remarkGfm]}>
                  {part.content || ''}
                </ReactMarkdown>
              );
            })}
          </div>
        )}

        {/* V2 兼容：章节独立图表 - 使用智能图表路由 */}
        {!hasBlocks && Array.isArray(section.charts) && section.charts.length > 0 && (
          <div className="space-y-4 mt-4">
            {section.charts.map((chart) => (
              <div key={chart.chart_id} className="p-4 bg-[#0D0D0D] rounded-xl border border-[#333333]">
                <SmartChartRenderer
                  chartId={chart.chart_id}
                  chartType={chart.chart_type}
                  config={chart.config as Record<string, unknown>}
                  title={(chart as { title?: string }).title}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ========== 智能图表路由器 (V2.1) ==========
interface SmartChartRendererProps {
  chartId: string;
  chartType: string;
  config: Record<string, unknown>;
  title?: string;
}

const SmartChartRenderer: React.FC<SmartChartRendererProps> = ({ chartId, chartType, config, title }) => {
  // 根据 chart_type 选择渲染不同的组件
  switch (chartType) {
    // V2.1 新增自定义组件
    case 'prediction_tiers': {
      // 转换后端数据格式为组件期望的格式
      const tiersData = config.tiers as Record<string, { percentile: number; time_seconds: number; delta: number }>;
      const formattedTiers = {
        excellent: { label: 'Excellent', percentile: tiersData?.excellent?.percentile || 5, time_seconds: tiersData?.excellent?.time_seconds || 0, delta: tiersData?.excellent?.delta || 0 },
        great: { label: 'Great', percentile: tiersData?.great?.percentile || 25, time_seconds: tiersData?.great?.time_seconds || 0, delta: tiersData?.great?.delta || 0 },
        expected: { label: 'Expected', percentile: tiersData?.expected?.percentile || 50, time_seconds: tiersData?.expected?.time_seconds || 0, delta: tiersData?.expected?.delta || 0 },
        subpar: { label: 'Subpar', percentile: tiersData?.subpar?.percentile || 75, time_seconds: tiersData?.subpar?.time_seconds || 0, delta: tiersData?.subpar?.delta || 0 },
        poor: { label: 'Poor', percentile: tiersData?.poor?.percentile || 95, time_seconds: tiersData?.poor?.time_seconds || 0, delta: tiersData?.poor?.delta || 0 },
      };
      return (
        <PredictionTiers
          tiers={formattedTiers}
          currentTime={config.currentTime as string || ''}
          currentTimeSeconds={config.currentTimeSeconds as number || 0}
          statistics={config.statistics as { sample_size: number; improvement_rate: number; avg_improvement: number; variance: number }}
        />
      );
    }
    
    case 'prediction_density': {
      // 转换曲线数据格式
      const rawCurve = config.curveData as Array<{ x: number; y: number }> | Array<[number, number]> | undefined;
      const curveData: [number, number][] = rawCurve?.map((p: { x: number; y: number } | [number, number]) => 
        Array.isArray(p) ? p : [p.x, p.y]
      ) || [];
      return (
        <PredictionDensity
          curveData={curveData}
          expected={config.expected as number || 0}
          variance={config.variance as number || 0}
          range={config.range as { low: number; high: number } || { low: 0, high: 0 }}
          sampleSize={config.sampleSize as number || 0}
          improvementRate={config.improvementRate as number || 0}
        />
      );
    }
    
    case 'pacing_consistency': {
      // 包装为 data prop
      const pacingData = {
        lapSwing: config.lapSwing as number || 0,
        maxLapSwing: config.maxLapSwing as number || 0,
        avgPace: config.avgPace as number || 0,
        spread: config.spread as number || 0,
        cohortAvgSpread: config.cohortAvgSpread as number || 0,
        vsCohort: config.vsCohort as number || 0,
        rating: config.rating as string || 'Variable',
        lapDeviations: (config.lapDeviations as Array<{ lap: number; time: number; deviation: number }>) || [],
        fastestLap: config.fastestLap as number || 1,
        slowestLap: config.slowestLap as number || 8,
      };
      return (
        <PacingConsistencyCard data={pacingData} />
      );
    }
    
    case 'dual_radar': {
      // 转换数据格式：value -> athleteValue, 添加 avgValue
      const workoutRaw = config.workoutData as Array<{ name: string; value: number; max: number }> || [];
      const runningRaw = config.runningData as Array<{ name: string; value: number; max: number }> || [];
      const workoutData = workoutRaw.map(d => ({
        name: d.name,
        athleteValue: d.value,
        avgValue: 50, // 组别平均默认50%
        percentile: 100 - d.value,
      }));
      const runningData = runningRaw.map(d => ({
        name: d.name,
        athleteValue: d.value,
        avgValue: 50,
        percentile: 100 - d.value,
      }));
      return (
        <DualRadar
          workoutData={workoutData}
          runningData={runningData}
          athleteName={config.athleteName as string}
        />
      );
    }
    
    case 'distribution_histogram': {
      // 转换 bins 为数字数组
      const rawBins = config.bins as (string[] | number[]) || [];
      const bins = rawBins.map((b: string | number) => typeof b === 'string' ? parseFloat(b) : b);
      return (
        <DistributionHistogram
          bins={bins}
          counts={config.counts as number[] || []}
          userValue={config.userValue as number || 0}
          userPercentile={config.userPercentile as number || 50}
          totalAthletes={config.totalAthletes as number || 0}
          title={title || config.title as string}
        />
      );
    }
    
    case 'pace_trend': {
      const strategyType = config.strategy_type as string;
      const validStrategy = ['positive', 'negative', 'even'].includes(strategyType) 
        ? strategyType as 'positive' | 'negative' | 'even' 
        : undefined;
      return (
        <PaceTrendChart
          data={config.run_data as Array<{ lap: string; time_minutes: number; pace_seconds: number }> || []}
          trendLine={config.trend_line as Array<{ lap: string; trend: number }>}
          decayPoints={config.decay_points as number[]}
          strategyType={validStrategy}
          paceDecayPercent={config.pace_decay_percent as number}
        />
      );
    }
    
    case 'split_breakdown_table': {
      // 转换后端格式为组件期望格式
      const rawSplits = config.splits as Array<{ segment: string; current: number; target: number; improvement: number; priority: string }> || [];
      const formattedSplits = rawSplits.map(s => ({
        segment: s.segment,
        field: s.segment.toLowerCase().replace(/\s+/g, '_'),
        current: s.current,
        expected: s.target,
      }));
      return (
        <SplitBreakdownTable
          athleteName=""
          athleteTime=""
          splits={formattedSplits}
          targetTimes={{
            excellent: '',
            great: '',
            expected: '',
            subpar: '',
            poor: '',
          }}
        />
      );
    }
    
    case 'training_week_view': {
      const rawPlan = (config.weeklyPlan || config.days) as Array<{ day: string; dayName?: string; type: string; content: string; duration_minutes?: number; duration?: number; intensity?: string }> || [];
      const weeklyPlan = rawPlan.map(d => ({
        day: d.day,
        dayName: d.dayName || d.day,
        type: (['Key', 'Recovery', 'Rest', 'Long', 'Easy'].includes(d.type) ? d.type : 'Easy') as 'Key' | 'Recovery' | 'Rest' | 'Long' | 'Easy',
        content: d.content || '',
        duration_minutes: d.duration_minutes || d.duration || 0,
        intensity: d.intensity as 'low' | 'medium' | 'high' | undefined,
      }));
      return (
        <TrainingWeekView
          weeklyPlan={weeklyPlan}
          weekNumber={config.weekNumber as number}
          phase={config.phase as string}
          focusAreas={config.focusAreas as string[]}
        />
      );
    }
    
    case 'horizontal_bar':
      return (
        <HorizontalBar
          items={config.items as Array<{ name: string; value: number; category: 'station' | 'transition' | 'pacing'; reference: number; actual: number }>}
          totalLoss={config.totalLoss as number}
          title={title || config.title as string}
        />
      );
    
    case 'cohort_comparison':
      return (
        <CohortComparison
          athleteName={config.athleteName as string}
          athleteRank={config.athleteRank as number}
          athleteTime={config.athleteTime as number}
          peerRange={config.peerRange as string}
          peersAhead={config.peersAhead as Array<{ name: string; rank: number; totalTime: number; gap: number }>}
          peersBehind={config.peersBehind as Array<{ name: string; rank: number; totalTime: number; gap: number }>}
          timeToNextLevel={config.timeToNextLevel as number | null}
          title={title || config.title as string}
        />
      );
    
    case 'priority_matrix':
      return (
        <PriorityMatrix
          items={config.items as Array<{ name: string; impact: number; difficulty: number; lossSeconds: number; quadrant: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft' }>}
          xLabel={config.xLabel as string}
          yLabel={config.yLabel as string}
          quadrants={config.quadrants as { topRight: string; topLeft: string; bottomRight: string; bottomLeft: string }}
          title={title || config.title as string}
        />
      );
    
    // 默认使用 ECharts 渲染器
    default:
      return (
        <ReportChart
          chartId={chartId}
          config={config}
          chartType={chartType}
        />
      );
  }
};

// ========== 结构化输出渲染器 ==========
interface StructuredOutputRendererProps {
  sectionType?: string;
  data: Record<string, unknown>;
}

const StructuredOutputRenderer: React.FC<StructuredOutputRendererProps> = ({ sectionType, data }) => {
  switch (sectionType) {
    case 'summary':
      return <SummaryOutput data={data as unknown as SummaryStructuredOutput} />;
    case 'time_loss':
      return <TimeLossOutput data={data as unknown as TimeLossStructuredOutput} />;
    case 'heart_rate':
      return <HeartRateOutput data={data as unknown as HeartRateStructuredOutput} />;
    case 'prediction':
      return <PredictionOutput data={data as unknown as PredictionStructuredOutput} />;
    case 'comparison':
      return <ComparisonOutput data={data as unknown as ComparisonStructuredOutput} />;
    case 'training':
      return <TrainingOutput data={data as unknown as TrainingStructuredOutput} />;
    default:
      return null;
  }
};

// ========== Summary 章节输出 (V4 Demo 风格) ==========
const SummaryOutput: React.FC<{ data: SummaryStructuredOutput }> = ({ data }) => {
  if (!data.roxscan_score) return null;

  // 等级颜色映射
  const levelColors: Record<string, string> = {
    'S': '#fbbf24', // 金色
    'A': '#a855f7', // 紫色
    'B': '#3b82f6', // 蓝色
    'C': '#22c55e', // 绿色
    'D': '#9ca3af', // 灰色
  };
  const levelColor = levelColors[data.level] || '#00FF88';
  
  // 等级描述映射
  const levelDescriptions: Record<string, string> = {
    'S': '你的综合实力位于全球前 5% 的选手行列',
    'A': '你的综合实力位于全球前 15% 的选手行列',
    'B': '你的综合实力位于全球前 30% 的选手行列',
    'C': '你的综合实力位于全球前 50% 的选手行列',
    'D': '你的综合实力有较大提升空间',
  };

  // 维度配置
  const dimensionConfig = [
    { key: 'strength', label: '绝对力量 (Strength)', icon: '💪', desc: 'Sled Pull 成绩击败全球 {percentile}% 同组别选手' },
    { key: 'aerobic_base', label: '有氧底座 (Aerobic Base)', icon: '❤️‍🔥', desc: '后半程心率漂移显著' },
    { key: 'transition', label: '转换效率 (Transition)', icon: '⚡', desc: 'Roxzone 耗时击败全球 {percentile}% 选手' },
  ];

  // 获取等级标签颜色
  const getLevelBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-yellow-500/20 text-yellow-400';
    if (score >= 75) return 'bg-purple-500/20 text-purple-400';
    if (score >= 60) return 'bg-blue-500/20 text-blue-400';
    if (score >= 45) return 'bg-green-500/20 text-green-400';
    return 'bg-gray-500/20 text-gray-400';
  };
  
  const getLevelLabel = (score: number) => {
    if (score >= 90) return 'S级';
    if (score >= 75) return 'A级';
    if (score >= 60) return 'B级';
    if (score >= 45) return 'C级';
    return 'D级';
  };

  return (
    <div className="space-y-4">
      {/* 图1：ROXSCAN 综合评分卡片，内容区左右上下间距统一（上 20px 下 24px 左 24px 右 24px） */}
      <div className="bg-[#1A1A1A] rounded-xl mb-0 overflow-hidden">
        <div className="px-6 pt-5 pb-2 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="text-base font-semibold">ROXSCAN</span>
            <span className="text-sm text-white/90">综合评分</span>
          </div>
        </div>
        <div className="px-6 pt-4 pb-6 flex items-start gap-8">
          <div className="flex flex-col items-start shrink-0">
            <span className="text-[40px] font-bold text-[#00FF88] leading-none tracking-tight">{data.roxscan_score}</span>
            <span className="text-sm text-[#888888] mt-1 ml-0.5">/100</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-lg font-semibold text-[#00FF88] mb-2 leading-tight">{data.level_name}</div>
            <div className="text-[13px] text-[#888888] leading-relaxed">
              {levelDescriptions[data.level] || ''}
            </div>
          </div>
        </div>
      </div>

      {/* 图2/图3：总评必须紧接在图1正下方，demo 绿底 #223c31 + 左边框 + 内边距 */}
      {data.summary_text && (
        <div 
          className="rounded-r-lg mt-4"
          style={{ 
            background: '#223c31', 
            borderLeft: '3px solid #00FF88',
            padding: '16px 20px',
          }}
        >
          <p className="text-sm text-white/95 leading-relaxed m-0">
            <strong className="text-white">总评：</strong>
            {data.summary_text}
          </p>
        </div>
      )}

      {/* 图4：能力雷达图，compact 下不显示下方综合得分/强项弱项/维度标签块 */}
      {data.dimensions && (
        <RadarChart5D
          compact
          dimensions={{
            strength: data.dimensions.strength || 50,
            aerobic: data.dimensions.aerobic_base || 50,
            transition: data.dimensions.transition || 50,
            speed: (data.dimensions as Record<string, number>).speed || 50,
            recovery: (data.dimensions as Record<string, number>).recovery || 50,
          }}
        />
      )}

      {/* demo: dimension-list - dimension-item 带 border-bottom、icon 背景色 */}
      <div className="mt-4">
        {dimensionConfig.map((dim) => {
          const score = data.dimensions?.[dim.key as keyof typeof data.dimensions] || 0;
          const iconBgClass = dim.key === 'strength' ? 'bg-[rgba(255,107,107,0.2)]' : dim.key === 'aerobic_base' ? 'bg-[rgba(100,181,246,0.2)]' : 'bg-[rgba(255,215,0,0.2)]';
          return (
            <div key={dim.key} className="flex items-center py-3 border-b border-[#333333] last:border-b-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mr-3 shrink-0 ${iconBgClass}`}>
                {dim.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{dim.label}</div>
                <div className="text-xs text-[#888888]">{dim.desc.replace('{percentile}', String(score))}</div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="text-lg font-bold text-white">{score}</div>
                <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${getLevelBadgeClass(score)}`}>
                  {getLevelLabel(score)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ========== Time Loss 章节输出 ==========
const TimeLossOutput: React.FC<{ data: TimeLossStructuredOutput }> = ({ data }) => {
  if (!data.loss_items) return null;

  return (
    <div className="space-y-4">
      {/* 总损耗 + 理论最佳 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1">总时间损耗</div>
          <div className="text-2xl font-bold text-red-400">
            +{Math.floor(data.total_loss_seconds / 60)}:{String(data.total_loss_seconds % 60).padStart(2, '0')}
          </div>
        </div>
        <div className="bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-xl p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1">理论最佳</div>
          <div className="text-2xl font-bold text-[#00FF88]">{data.theoretical_best}</div>
        </div>
      </div>

      {/* 损耗列表 */}
      <div className="space-y-2">
        {(Array.isArray(data.loss_items) ? data.loss_items : []).map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-[#0D0D0D] rounded-lg p-3">
            <div>
              <div className="text-sm text-white">{item.segment}</div>
              <div className="text-[10px] text-white/40">{item.reason}</div>
            </div>
            <div className="text-sm font-bold text-red-400">
              {item.loss_display}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== Heart Rate 章节输出 ==========
const HeartRateOutput: React.FC<{ data: HeartRateStructuredOutput }> = ({ data }) => {
  if (!data.decoupling_score && !data.zones_distribution) return null;

  return (
    <div className="space-y-4">
      {/* 脱钩分数 */}
      {data.decoupling_score !== undefined && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">心率脱钩分数</div>
              <div className="text-3xl font-bold text-purple-400">{data.decoupling_score}%</div>
            </div>
            <span className="material-symbols-outlined text-purple-400 text-3xl">favorite</span>
          </div>
          {data.analysis && (
            <p className="text-sm text-white/60 mt-3">{data.analysis}</p>
          )}
        </div>
      )}

      {/* 心率区间分布 */}
      {Array.isArray(data.zones_distribution) && data.zones_distribution.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-white/40 mb-2">心率区间分布</div>
          {data.zones_distribution.map((zone, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 text-xs text-white/60">{zone.zone}</div>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${zone.percent}%` }}
                ></div>
              </div>
              <div className="w-16 text-xs text-white/60 text-right">{zone.percent}%</div>
              <div className="w-14 text-xs text-white/40 text-right">{zone.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== Prediction 章节输出 ==========
const PredictionOutput: React.FC<{ data: PredictionStructuredOutput }> = ({ data }) => {
  if (!data.target_time) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
      <div className="text-center mb-4">
        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">目标成绩预测</div>
        <div className="text-4xl font-bold text-white font-display">{data.target_time}</div>
      </div>

      {data.confidence_interval && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-[10px] text-white/40">保守估计</div>
            <div className="text-lg font-bold text-white/60">{data.confidence_interval.high}</div>
          </div>
          <span className="text-white/20">—</span>
          <div className="text-center">
            <div className="text-[10px] text-white/40">理想发挥</div>
            <div className="text-lg font-bold text-[#00FF88]">{data.confidence_interval.low}</div>
          </div>
        </div>
      )}

      {data.improvement_potential && (
        <div className="text-center text-sm text-white/60">
          提升潜力：<span className="text-[#00FF88] font-bold">{data.improvement_potential}</span>
        </div>
      )}
    </div>
  );
};

// ========== Training 章节输出 (V2.1 升级 - 使用 TrainingWeekView) ==========
const TrainingOutput: React.FC<{ data: TrainingStructuredOutput }> = ({ data }) => {
  const plan = data.weekly_plan ?? [];
  if (!plan.length) return null;

  // 转换数据格式以适配 TrainingWeekView
  const weeklyPlanForView = plan.map(day => ({
    day: day.day,
    dayName: day.dayName || day.day,
    type: day.type as 'Key' | 'Recovery' | 'Rest' | 'Long' | 'Easy',
    content: day.content,
    duration_minutes: typeof day.duration === 'string' 
      ? parseInt(day.duration) || 0 
      : day.duration_minutes || 0,
    intensity: day.intensity as 'low' | 'medium' | 'high' | undefined,
  }));

  return (
    <div className="space-y-4">
      {/* V2.1: 使用可视化周训练日历 */}
      <TrainingWeekView
        weeklyPlan={weeklyPlanForView}
        weekNumber={data.weekNumber}
        phase={data.phase}
        focusAreas={data.focusAreas || data.focus_areas}
      />

      {/* 关键训练课程 (如果有) */}
      {Array.isArray(data.key_workouts) && data.key_workouts.length > 0 && (
        <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-white/5">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-3">关键训练课程</h4>
          <div className="space-y-3">
            {data.key_workouts.slice(0, 4).map((workout, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-sm text-green-400 font-bold">{i + 1}</span>
                <div>
                  <div className="text-sm text-white font-medium">{workout.workout_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{workout.description}</div>
                  {workout.frequency && (
                    <div className="text-[10px] text-cyan-400 mt-1">{workout.frequency}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 弱项分析 (如果有) */}
      {Array.isArray(data.weakness_analysis) && data.weakness_analysis.length > 0 && (
        <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-white/5">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-3">弱项分析</h4>
          <div className="grid grid-cols-2 gap-3">
            {data.weakness_analysis.slice(0, 4).map((item, i) => (
              <div key={i} className="bg-[#252525] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`size-2 rounded-full ${
                    item.severity === 'critical' ? 'bg-red-500' :
                    item.severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></span>
                  <span className="text-sm text-white font-medium">{item.area}</span>
                </div>
                <div className="text-xs text-gray-400">{item.training_focus}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== Comparison 章节输出 (V2.1 新增 - 对标分析) ==========
interface ComparisonStructuredOutput {
  strengths?: Array<{
    segment: string;
    percentile: number;
    vs_cohort?: string;
  }>;
  weaknesses?: Array<{
    segment: string;
    percentile: number;
    gap_seconds?: number;
  }>;
  workout_vs_running?: {
    workout_percentile: number;
    running_percentile: number;
    balance_type: 'balanced' | 'workout_dominant' | 'running_dominant';
  };
  cohort_position?: {
    cohort_size: number;
    rank_in_cohort: number;
    above_average_segments?: string[];
    below_average_segments?: string[];
  };
  analysis_text?: string;
}

const ComparisonOutput: React.FC<{ data: ComparisonStructuredOutput }> = ({ data }) => {
  if (!data.strengths && !data.weaknesses) return null;

  const balanceTypeLabels: Record<string, string> = {
    'balanced': '均衡發展',
    'workout_dominant': '功能站主導',
    'running_dominant': '跑步主導',
  };

  return (
    <div className="space-y-4">
      {/* 能力平衡分析 */}
      {data.workout_vs_running && (
        <div className="bg-gradient-to-r from-purple-500/10 to-transparent rounded-xl p-4 border border-purple-500/20">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-3">能力平衡</h4>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-cyan-400">{data.workout_vs_running.workout_percentile}%</div>
              <div className="text-xs text-gray-400">功能站百分位</div>
            </div>
            <div className="px-4">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                data.workout_vs_running.balance_type === 'balanced' ? 'bg-green-500/20 text-green-400' :
                data.workout_vs_running.balance_type === 'workout_dominant' ? 'bg-purple-500/20 text-purple-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {balanceTypeLabels[data.workout_vs_running.balance_type] || '未知'}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-orange-400">{data.workout_vs_running.running_percentile}%</div>
              <div className="text-xs text-gray-400">跑步百分位</div>
            </div>
          </div>
        </div>
      )}

      {/* 优势与弱势对比 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 优势项目 */}
        {Array.isArray(data.strengths) && data.strengths.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-green-500/20">
            <h4 className="text-xs text-green-400 uppercase tracking-wider mb-3">💪 優勢項目</h4>
            <div className="space-y-2">
              {data.strengths.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white">{item.segment}</span>
                  <span className="text-xs text-green-400 font-mono">前{item.percentile}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 弱势项目 */}
        {Array.isArray(data.weaknesses) && data.weaknesses.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-red-500/20">
            <h4 className="text-xs text-red-400 uppercase tracking-wider mb-3">📊 提升空間</h4>
            <div className="space-y-2">
              {data.weaknesses.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white">{item.segment}</span>
                  <div className="text-right">
                    <span className="text-xs text-red-400 font-mono">后{100 - item.percentile}%</span>
                    {item.gap_seconds && (
                      <span className="text-[10px] text-gray-500 ml-1">(-{item.gap_seconds}s)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 同水平定位 */}
      {data.cohort_position && (
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-3">同水平定位</h4>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <div className="text-xl font-bold text-white">#{data.cohort_position.rank_in_cohort}</div>
              <div className="text-[10px] text-gray-500">排名</div>
            </div>
            <div className="text-gray-600">/</div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-400">{data.cohort_position.cohort_size}</div>
              <div className="text-[10px] text-gray-500">同水平人數</div>
            </div>
          </div>
          {data.cohort_position.above_average_segments && data.cohort_position.above_average_segments.length > 0 && (
            <div className="text-xs text-gray-400">
              <span className="text-green-400">高於平均: </span>
              {data.cohort_position.above_average_segments.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 分析文本 */}
      {data.analysis_text && (
        <div className="text-sm text-gray-300 leading-relaxed mt-3 p-3 bg-white/5 rounded-lg">
          {data.analysis_text}
        </div>
      )}
    </div>
  );
};

export default ReportView;
