/**
 * ReportView - 报告渲染页面
 * 版本: v1.0
 * 
 * 功能：
 * - 报告头部（选手名、比赛信息）
 * - 章节渲染（标题 + 结构化内容 + 图表）
 * - 不同章节类型的结构化输出渲染
 *   - summary: ROXSCAN 评分卡片 + 三维能力值
 *   - time_loss: 损耗列表 + 理论最佳
 *   - heart_rate: 脱钩分析
 *   - prediction: 预测区间
 *   - training: 训练计划表
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { reportApi } from '../services/api';
import ReportChart, { parseChartMarkers } from '../components/ReportChart';
import ImageUploader from '../components/ImageUploader';
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
} from '../components/charts';
import BlockRenderer from '../components/BlockRenderer';
import type {
  ProReport,
  RenderableReportSection,
  SummaryStructuredOutput,
  TimeLossStructuredOutput,
  HeartRateStructuredOutput,
  PredictionStructuredOutput,
  ComparisonStructuredOutput,
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
      const response = await reportApi.getReport(reportId);
      const data = (response as { code?: number; data?: unknown }).code === 0 && (response as { data?: unknown }).data
        ? (response as { data: Record<string, unknown> }).data
        : (response as Record<string, unknown>).report_id
          ? (response as Record<string, unknown>)
          : null;
      if (data) {
        const d = data as Record<string, unknown>;
        const sections = Array.isArray(d.sections) ? d.sections : [];
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
          },
          introduction: typeof d.introduction === 'string' ? d.introduction : '',
          sections: sections as RenderableReportSection[],
          conclusion: typeof d.conclusion === 'string' ? d.conclusion : '',
          generated_at: (d.completed_at ?? d.created_at) != null ? String(d.completed_at ?? d.created_at) : '',
          charts: chartsObj as Record<string, ChartConfig>,
        };
        
        setReport(transformedReport);
      } else {
        setError((response as { message?: string }).message || '加载报告失败');
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // --- 加载心率图片 ---
  const loadHeartRateImages = useCallback(async () => {
    try {
      const response = await reportApi.getHeartRateImages(reportId);
      if (response.code === 0 && response.data) {
        setHeartRateImages(response.data);
      }
    } catch (err) {
      console.error('Failed to load heart rate images:', err);
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
      <div className="flex flex-col min-h-screen bg-[#101013]">
        <header className="px-4 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#101013]/95 backdrop-blur-md z-30">
          <button onClick={onBack} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-white font-bold">分析报告</span>
          <div className="w-8"></div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="size-12 border-2 border-[#42ff9e] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white/60 text-sm">加载报告中...</p>
        </div>
      </div>
    );
  }

  // --- Error 状态 ---
  if (error || !report) {
    return (
      <div className="flex flex-col min-h-screen bg-[#101013]">
        <header className="px-4 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#101013]/95 backdrop-blur-md z-30">
          <button onClick={onBack} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-white font-bold">分析报告</span>
          <div className="w-8"></div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <span className="material-symbols-outlined text-4xl text-white/30 mb-4">error</span>
          <p className="text-white/60 text-sm mb-4">{error || '报告加载失败'}</p>
          <button 
            onClick={loadReport}
            className="px-6 py-2 bg-[#42ff9e] text-black font-bold rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#101013] animate-in fade-in duration-300">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#101013]/95 backdrop-blur-md z-30">
        <button onClick={onBack} className="text-white hover:text-[#42ff9e] transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="text-white font-bold text-sm">分析报告</span>
        <button className="text-white/60 hover:text-white transition-colors">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      <main className="flex-1 p-4 pb-32 overflow-y-auto">
        {/* 报告头部 */}
        <ReportHeader report={report} />

        {/* 核心摘要：ROXSCAN 卡片 */}
        {report.introduction && (
          <IntroductionRenderer introduction={report.introduction} />
        )}

        {/* 章节渲染 */}
        {(report.sections ?? []).map((section, index) => (
          <SectionRenderer
            key={section.section_id ?? index}
            section={section}
            index={index}
            charts={report.charts ?? {}}
            dataSnapshots={((report as any).data_snapshots ?? (report as any).charts ?? {}) as Record<string, DataSnapshot>}
          />
        ))}

        {/* 心率图片上传区域 */}
        <div className="mt-6">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#42ff9e]">favorite</span>
            心率数据
          </h3>
          <ImageUploader 
            reportId={reportId}
            onUploadSuccess={handleImagesUploaded}
          />
          
          {/* 已上传图片展示 */}
          {heartRateImages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {heartRateImages.map((img) => (
                <div key={img.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5">
                  <img 
                    src={img.image_url} 
                    alt="心率数据" 
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2 flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      img.extraction_status === 'completed' 
                        ? 'bg-[#42ff9e]/20 text-[#42ff9e]'
                        : img.extraction_status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {img.extraction_status === 'completed' ? '已提取' 
                        : img.extraction_status === 'failed' ? '提取失败'
                        : img.extraction_status === 'processing' ? '处理中'
                        : '等待处理'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 总结部分 */}
        {report.conclusion && (
          <div className="bg-gradient-to-br from-[#1a2e22] to-[#1a1a1a] rounded-xl p-4 mt-6 border border-[#42ff9e]/20">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#42ff9e]">tips_and_updates</span>
              总结与建议
            </h3>
            <div className="prose prose-sm prose-invert max-w-none text-white/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.conclusion}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="text-center mt-8 text-white/30 text-[10px]">
          <p>生成于 {new Date(report.generated_at).toLocaleString()}</p>
          <p className="mt-1">Powered by HYROX AI Analysis</p>
        </div>
      </main>
    </div>
  );
};

// ========== 报告头部组件 ==========
interface ReportHeaderProps {
  report: ProReport;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ report }) => {
  return (
    <div className="relative overflow-hidden rounded-xl mb-6">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1923] via-[#0a1628] to-[#101013]"></div>
      {/* 网格效果 */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(66,255,158,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(66,255,158,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>
      {/* 边框发光 */}
      <div className="absolute inset-0 rounded-xl border border-[#42ff9e]/20"></div>
      
      {/* 内容 */}
      <div className="relative p-5 z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#42ff9e] to-[#2dd87a] flex items-center justify-center shadow-[0_0_15px_rgba(66,255,158,0.4)]">
            <span className="material-symbols-outlined text-black text-lg">analytics</span>
          </div>
          <span className="text-[10px] text-[#42ff9e] font-bold uppercase tracking-[0.2em]">HYROX Analysis</span>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">{report.athlete_name}</h1>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/60">
            S{report.race_info?.season ?? '-'}
          </span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/60">
            {(report.race_info?.location ?? '').toUpperCase() || '-'}
          </span>
          <span className="px-3 py-1 bg-[#42ff9e]/10 border border-[#42ff9e]/30 rounded-full text-[10px] text-[#42ff9e]">
            {report.race_info?.division ?? '-'}
          </span>
        </div>
        
        {/* 完赛时间 */}
        <div className="bg-black/30 rounded-lg p-3 inline-block">
          <div className="text-[10px] text-white/40 mb-1">完赛时间</div>
          <div className="text-2xl font-bold text-[#42ff9e] font-display tracking-tight">
            {report.race_info?.total_time ?? '-'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== 章节渲染组件 ==========
interface SectionRendererProps {
  section: RenderableReportSection & { 
    blocks?: ContentBlock[];  // V3: blocks 数组
    order?: number;
    type?: string;
  };
  index: number;
  charts?: Record<string, ChartConfig>;
  dataSnapshots?: Record<string, DataSnapshot>;  // V3: 数据快照
}

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, index, charts, dataSnapshots }) => {
  const hasBlocks = section.blocks && section.blocks.length > 0;
  
  // 章节颜色主题
  const sectionColors = [
    { border: 'border-[#42ff9e]/20', accent: '#42ff9e' },
    { border: 'border-blue-500/20', accent: '#3b82f6' },
    { border: 'border-purple-500/20', accent: '#a855f7' },
    { border: 'border-orange-500/20', accent: '#f59e0b' },
    { border: 'border-pink-500/20', accent: '#ec4899' },
  ];
  const color = sectionColors[index % sectionColors.length];

  // V3 模式：使用 blocks 数组渲染（hasBlocks 已在上面为 log 计算）

  // 解析内容中的图表标记（V2 兼容）
  const contentParts = !hasBlocks && section.content && charts 
    ? parseChartMarkers(section.content, charts as Record<string, { config: Record<string, unknown>; purpose?: string; chart_type?: string }>)
    : [];

  return (
    <div className={`bg-[#1a1a1a] rounded-xl mb-4 overflow-hidden border ${color.border}`}>
      {/* 章节标题 */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div 
          className="w-1 h-6 rounded-full"
          style={{ backgroundColor: color.accent }}
        ></div>
        <h2 className="text-white font-bold">{section.title}</h2>
      </div>

      <div className="p-4">
        {/* V3 模式：使用 BlockRenderer 渲染 blocks */}
        {hasBlocks && (
          <div className="space-y-4">
            {section.blocks!.map((block, blockIndex) => (
              <BlockRenderer 
                key={`block-${blockIndex}`}
                block={block}
                dataSnapshots={dataSnapshots}
              />
            ))}
          </div>
        )}

        {/* V2 兼容：结构化输出渲染 */}
        {!hasBlocks && section.structured_output && (
          <StructuredOutputRenderer 
            sectionType={section.section_type}
            data={section.structured_output}
          />
        )}

        {/* V2 兼容：Markdown 内容 + 图表 */}
        {!hasBlocks && contentParts.length > 0 && (
          <div className="prose prose-sm prose-invert max-w-none text-white/70 mt-4">
            {contentParts.map((part, partIndex) => {
              if (part.type === 'chart' && part.config) {
                return (
                  <div key={`chart-${partIndex}`} className="my-4 p-4 bg-[#101013] rounded-xl">
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
        {!hasBlocks && section.charts && section.charts.length > 0 && (
          <div className="space-y-4 mt-4">
            {section.charts.map((chart) => (
              <div key={chart.chart_id} className="p-4 bg-[#101013] rounded-xl">
                <SmartChartRenderer
                  chartId={chart.chart_id}
                  chartType={chart.chart_type}
                  config={chart.config as Record<string, unknown>}
                  title={chart.title}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
      return <SummaryOutput data={data as SummaryStructuredOutput} />;
    case 'time_loss':
      return <TimeLossOutput data={data as TimeLossStructuredOutput} />;
    case 'heart_rate':
      return <HeartRateOutput data={data as HeartRateStructuredOutput} />;
    case 'prediction':
      return <PredictionOutput data={data as PredictionStructuredOutput} />;
    case 'comparison':
      return <ComparisonOutput data={data as ComparisonStructuredOutput} />;
    case 'training':
      return <TrainingOutput data={data as TrainingStructuredOutput} />;
    default:
      return null;
  }
};

// ========== Introduction 渲染器（核心摘要） ==========
const IntroductionRenderer: React.FC<{ introduction: string }> = ({ introduction }) => {
  // 尝试解析 JSON 格式的核心摘要数据
  let summaryData: SummaryStructuredOutput | null = null;
  
  try {
    const parsed = JSON.parse(introduction);
    // 验证是否包含必要字段
    if (parsed && typeof parsed.roxscan_score === 'number') {
      summaryData = parsed as SummaryStructuredOutput;
    }
  } catch {
    // 解析失败，可能是纯文本格式（旧版本兼容）
    summaryData = null;
  }

  // 如果成功解析为结构化数据，渲染 ROXSCAN 卡片
  if (summaryData) {
    return (
      <div className="mb-6">
        {/* 核心摘要标题 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 rounded-full bg-[#42ff9e]"></div>
          <h2 className="text-white font-bold text-lg">核心摘要：ZONEØ 戰力值</h2>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#42ff9e]/20">
          <SummaryOutput data={summaryData} />
        </div>
      </div>
    );
  }

  // 回退到 Markdown 渲染（旧版本兼容）
  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 mb-4 border border-white/5">
      <div className="prose prose-sm prose-invert max-w-none text-white/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {introduction}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// ========== Summary 章节输出（复用于 Introduction）==========
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
  const levelColor = levelColors[data.level] || '#42ff9e';

  return (
    <div className="space-y-4">
      {/* ROXSCAN 评分卡片 */}
      <div className="bg-gradient-to-r from-[#42ff9e]/10 to-transparent rounded-xl p-4 border border-[#42ff9e]/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ROXSCAN Score</div>
            <div className="text-4xl font-bold text-[#42ff9e] font-display">{data.roxscan_score}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: levelColor }}>{data.level}</div>
            <div className="text-sm text-white/60">{data.level_name}</div>
          </div>
        </div>
      </div>

      {/* 三维能力值 - 匹配后端 dimensions: strength, aerobic_base, transition */}
      {data.dimensions && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'strength', label: '力量', icon: 'fitness_center', color: '#42ff9e' },
            { key: 'aerobic_base', label: '有氧基礎', icon: 'directions_run', color: '#3b82f6' },
            { key: 'transition', label: '轉換效率', icon: 'swap_horiz', color: '#a855f7' },
          ].map((item) => (
            <div key={item.key} className="bg-[#101013] rounded-xl p-3 text-center">
              <span className="material-symbols-outlined text-lg mb-2" style={{ color: item.color }}>
                {item.icon}
              </span>
              <div className="text-xl font-bold text-white">
                {data.dimensions[item.key as keyof typeof data.dimensions]}
              </div>
              <div className="text-[10px] text-white/40">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 总结文本 */}
      {data.summary_text && (
        <div className="bg-[#101013] rounded-xl p-4 text-sm text-white/70 leading-relaxed">
          {data.summary_text}
        </div>
      )}

      {/* 亮点 - 支持对象数组格式 { type, content } */}
      {data.highlights && data.highlights.length > 0 && (
        <div className="space-y-2">
          {data.highlights.map((highlight, i) => {
            // 根据类型选择图标和颜色
            const isStrength = highlight.type === 'strength';
            const isWeakness = highlight.type === 'weakness';
            const dotColor = isStrength ? 'bg-[#42ff9e]' : isWeakness ? 'bg-red-400' : 'bg-blue-400';
            const icon = isStrength ? '💪' : isWeakness ? '📊' : '💡';
            
            return (
              <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className={`size-1.5 ${dotColor} rounded-full mt-1.5 shrink-0`}></span>
                <span>
                  <span className="mr-1">{icon}</span>
                  {highlight.content}
                </span>
              </div>
            );
          })}
        </div>
      )}
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
        <div className="bg-[#42ff9e]/10 border border-[#42ff9e]/20 rounded-xl p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1">理论最佳</div>
          <div className="text-2xl font-bold text-[#42ff9e]">{data.theoretical_best}</div>
        </div>
      </div>

      {/* 损耗列表 */}
      <div className="space-y-2">
        {data.loss_items.map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-[#101013] rounded-lg p-3">
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
      {data.zones_distribution && data.zones_distribution.length > 0 && (
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
            <div className="text-lg font-bold text-[#42ff9e]">{data.confidence_interval.low}</div>
          </div>
        </div>
      )}

      {data.improvement_potential && (
        <div className="text-center text-sm text-white/60">
          提升潜力：<span className="text-[#42ff9e] font-bold">{data.improvement_potential}</span>
        </div>
      )}
    </div>
  );
};

// ========== Training 章节输出 (V2.1 升级 - 使用 TrainingWeekView) ==========
const TrainingOutput: React.FC<{ data: TrainingStructuredOutput }> = ({ data }) => {
  if (!data.weekly_plan) return null;

  // 转换数据格式以适配 TrainingWeekView
  const weeklyPlanForView = data.weekly_plan.map(day => ({
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
      {data.key_workouts && data.key_workouts.length > 0 && (
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
      {data.weakness_analysis && data.weakness_analysis.length > 0 && (
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
        {data.strengths && data.strengths.length > 0 && (
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
        {data.weaknesses && data.weaknesses.length > 0 && (
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
