/**
 * HYROX Frontend 类型定义
 * 版本: v4.0
 * 
 * 更新记录:
 * - v4.0: Tab 导航重构为 3 Tab (HOME/RACE/ME)，新增 Profile 相关类型
 */

// ========== Tab 导航 ==========
export enum AppTab {
  HOME = 'home',   // 首页 - LiveTab
  RACE = 'race',   // 比赛 - PlanTab (备赛/比赛准备)
  ME = 'me'        // 我的 - DataTab (个人数据/历史记录)
}

// ========== 用户个人资料 ==========
export interface ProfileStats {
  completed: number;      // 已完成比赛数
  pb: string;             // 个人最佳成绩
  ageGroup: string;       // 年龄组
  rank: string;           // 最近排名
}

export interface UserProfile {
  name: string;
  id: string;
  avatar?: string;
  isPro?: boolean;
  stats: ProfileStats;
}

// ========== 赛事信息 ==========
export interface RaceEvent {
  id: string;
  name: string;
  location: string;
  venue: string;
  year?: number;        // 年份 (从 event_name 提取，如 2025)
  season?: number;      // 赛季 (如 8)
  participants?: number;
  status: 'upcoming' | 'live' | 'completed';
  synced_at?: string;
}

export interface RecentRacesData {
  races: RaceEvent[];
  total: number;
}

// ========== 排行榜数据 ==========
export interface LeaderboardEntry {
  rank: number;
  name: string;
  age_group: string;
  total_time: string;
  total_time_minutes: number;
  gender: string;
  division: string;
  nationality?: string;
}

export interface RaceLeaderboardData {
  race: {
    season: number;
    location: string;
    event_name: string;
    total_participants: number;
  };
  leaderboard: LeaderboardEntry[];
  total: number;
  has_more: boolean;
}

// ========== API 响应基础类型 ==========
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ========== 名称建议（第一阶段） ==========
export interface SuggestionItem {
  name: string;
  match_count: number;
}

export interface SuggestData {
  suggestions: SuggestionItem[];
  total: number;
}

// ========== 搜索结果（第二阶段） ==========
export interface AthleteSearchItem {
  id: string;
  name: string;
  nationality?: string;
  event_id: string;
  event_name: string;
  location: string;
  season: number;
  total_time: string;
  total_time_minutes: number;
  gender: string;
  division: string;
  age_group?: string;
}

export interface SearchData {
  items: AthleteSearchItem[];
  total: number;
  has_more: boolean;
}

// ========== 成绩详情（第三步） ==========
export interface AthleteInfo {
  name: string;
  nationality?: string;
  nationality_name?: string;
  gender: string;
  division: string;
  age_group?: string;
}

export interface RaceInfo {
  event_id: string;
  event_name: string;
  location: string;
  season: number;
  date?: string;
}

export interface ResultsInfo {
  total_time: string;
  total_time_minutes: number;
  run_time: string;
  run_time_minutes: number;
  run_time_percent: number;
  work_time: string;
  work_time_minutes: number;
  work_time_percent: number;
  roxzone_time: string;
  roxzone_time_minutes: number;
  roxzone_time_percent: number;
}

export interface RankingsInfo {
  overall_rank: number;
  overall_total: number;
  gender_rank: number;
  gender_total: number;
  division_rank: number;
  division_total: number;
  age_group_rank?: number;
  age_group_total?: number;
}

export interface SplitItem {
  name: string;
  time: string;
  time_minutes?: number;
  distance?: string;
}

export interface SplitsInfo {
  runs: SplitItem[];
  workouts: SplitItem[];
}

export interface AthleteResultData {
  athlete: AthleteInfo;
  race: RaceInfo;
  results: ResultsInfo;
  rankings: RankingsInfo;
  splits: SplitsInfo;
}

// ========== 分段统计（v3.0 新增） ==========
export interface SplitAnalyticsItem {
  name: string;
  type: 'run' | 'workout';
  time: string;
  time_minutes: number;
  rank: number;
  total: number;
  top_percent: number;
  avg_time_minutes: number;
  diff_seconds: number;
  diff_display: string;
}

export interface SplitAnalyticsData {
  athlete_name: string;
  race_location: string;
  season: number;
  splits_analytics: SplitAnalyticsItem[];
}

// ========== 前端展示用的类型（兼容原有代码） ==========
export interface SplitDetail {
  name: string;
  split: string;
  total: string;
  pace?: string;
  hrZone?: string;
  vsAvg?: string;
  progress: number;
}

export interface TrainingSession {
  id: string;
  type: 'Key' | 'Endurance' | 'Power' | 'Strength' | 'Recovery';
  title: string;
  description: string;
  day: string;
  imageUrl: string;
  color: string;
  icon: string;
}

export interface AthleteResult {
  id: string;
  name: string;
  bib: string;
  status: 'Finished' | 'Running' | 'DNF' | 'Registered';
  group: string;
  rank: string;
  globalRank?: string;
  groupTotal?: string;
  globalTotal?: string;
  time: string;
  avgPace?: string;
  avgHR?: string;
  splits?: SplitDetail[];
  event?: string;
  date?: string;
  // 后端数据关联
  _searchItem?: AthleteSearchItem;
}

// ========== LLM 分析数据 ==========
export interface AnalysisLiteData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  cached: boolean;
}

// ========== 专业分析报告 ==========
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'error';

export interface ProReportSummary {
  report_id: string;
  season: number;
  location: string;
  athlete_name: string;
  title: string | null;
  status: ReportStatus;
  progress: number;
  current_step: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReportSection {
  section_id: string;
  title: string;
  content: string;  // Markdown
}

export interface ChartConfig {
  chart_id: string;
  purpose: string;
  chart_type: string;
  config: Record<string, unknown>;
  is_fallback?: boolean;
}

export interface ProReportDetail extends ProReportSummary {
  gender: string | null;
  division: string | null;
  introduction: string | null;
  sections: ReportSection[];
  charts: Record<string, ChartConfig>;
  conclusion: string | null;
  error_message: string | null;
}

export interface CreateReportResponse {
  report_id: string;
  status: 'created' | 'exists' | 'generating';
  message: string;
}

export interface ReportProgressEvent {
  progress: number;
  step: string;
}

export interface ReportCompleteEvent {
  report_id: string;
  title: string;
  status: string;
}

export interface ReportErrorEvent {
  message: string;
}

// ========== 报告渲染类型 ==========

/**
 * 章节结构化输出 - 用于渲染特定章节类型
 */
export interface SummaryStructuredOutput {
  roxscan_score: number;
  level: string;                // S/A/B/C/D
  level_name: string;           // 頂尖精英、進階精英等
  dimensions: {
    strength: number;           // 力量能力 (0-100)
    aerobic_base: number;       // 有氧基础 (0-100)
    transition: number;         // 转换效率 (0-100)
  };
  summary_text?: string;        // 总结文本
  highlights: Array<{
    type: 'strength' | 'weakness' | 'insight';
    content: string;
  }>;
}

export interface TimeLossStructuredOutput {
  total_loss_seconds: number;
  theoretical_best: string;
  loss_items: {
    segment: string;
    loss_seconds: number;
    loss_display: string;
    reason: string;
  }[];
}

export interface HeartRateStructuredOutput {
  decoupling_score: number;
  zones_distribution: {
    zone: string;
    percent: number;
    time: string;
  }[];
  analysis: string;
}

export interface PredictionStructuredOutput {
  target_time: string;
  confidence_interval: {
    low: string;
    high: string;
  };
  improvement_potential: string;
}

export interface TrainingStructuredOutput {
  weeks?: number;
  focus_areas?: string[];
  // V2.1: 新增字段
  weekNumber?: number;
  phase?: string;
  focusAreas?: string[];
  weekly_plan: {
    day: string;
    dayName?: string;
    type: string;
    content: string;
    duration?: string;
    duration_minutes?: number;
    intensity?: 'low' | 'medium' | 'high';
  }[];
  key_workouts?: {
    workout_name: string;
    target_area?: string;
    description: string;
    frequency?: string;
    progression?: string;
  }[];
  weakness_analysis?: {
    area: string;
    severity: 'critical' | 'moderate' | 'minor';
    root_cause?: string;
    training_focus: string;
  }[];
}

export interface ComparisonStructuredOutput {
  strengths?: {
    segment: string;
    percentile: number;
    vs_cohort?: string;
  }[];
  weaknesses?: {
    segment: string;
    percentile: number;
    gap_seconds?: number;
  }[];
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

export type SectionStructuredOutput = 
  | SummaryStructuredOutput 
  | TimeLossStructuredOutput 
  | HeartRateStructuredOutput
  | PredictionStructuredOutput
  | ComparisonStructuredOutput
  | TrainingStructuredOutput
  | Record<string, unknown>;

/**
 * 章节输出 - 带结构化数据
 */
export interface RenderableReportSection {
  section_id: string;
  title: string;
  section_type?: 'summary' | 'time_loss' | 'heart_rate' | 'prediction' | 'comparison' | 'training' | 'general';
  content?: string;  // Markdown 内容
  structured_output?: SectionStructuredOutput;
  charts: ChartConfig[];
}

/**
 * 完整报告 - 用于渲染页面
 */
export interface ProReport {
  report_id: string;
  athlete_name: string;
  race_info: {
    season: number;
    location: string;
    division: string;
    total_time: string;
    event_name?: string;
    age_group?: string;
    overall_rank?: number;
    total_participants?: number;
    age_group_rank?: number;
    age_group_total?: number;
  };
  introduction?: string;
  sections: RenderableReportSection[];
  conclusion?: string;
  generated_at: string;
  charts?: Record<string, ChartConfig>;
}

/**
 * 心率图片
 */
export interface HeartRateImage {
  id: string;
  report_id: string;
  user_id?: number;
  image_path: string;  // 后端返回的是 image_path
  original_filename?: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data?: {
    avg_hr?: number;
    max_hr?: number;
    zones?: { zone: string; percent: number }[];
  };
  created_at?: string;
}

/**
 * 心率图片上传响应
 */
export interface HeartRateUploadResponse {
  uploaded: HeartRateImage[];
  failed: string[];
}

// ========== V3 配置化架构类型 ==========

/**
 * 内容块 - V3 架构的基础渲染单元
 */
export interface ContentBlock {
  type: 'card' | 'chart' | 'text' | 'list' | 'table';
  component: string;  // 前端组件名称，如 'RoxscanCard', 'RadarChart', 'Paragraph'
  props: Record<string, unknown>;  // 组件属性
}

/**
 * 数据快照 - 存储在 data_snapshots 中
 */
export interface DataSnapshot {
  data_type: string;  // 如 'athlete_result', 'percentile_ranking'
  content: Record<string, unknown>;  // 实际数据内容
}

/**
 * V3 章节结构 - 使用 blocks 数组替代 content
 */
export interface RenderableReportSectionV3 {
  section_id: string;
  title: string;
  order: number;
  type: 'static' | 'dynamic';
  blocks: ContentBlock[];  // V3: 使用 blocks 数组
}

/**
 * V3 完整报告结构
 */
export interface ProReportV3 {
  report_id: string;
  athlete_name: string;
  race_info: {
    season: number;
    location: string;
    division: string;
    total_time?: string;
    event_name?: string;
  };
  title: string;
  sections: RenderableReportSectionV3[];
  data_snapshots: Record<string, DataSnapshot>;  // data_id -> DataSnapshot
  introduction?: string;
  conclusion?: string;
  generated_at: string;
}

/**
 * 块渲染器 Props 基础类型
 */
export interface BlockRendererProps {
  block: ContentBlock;
  dataSnapshots?: Record<string, DataSnapshot>;
}

/**
 * RoxscanCard Props
 */
export interface RoxscanCardProps {
  score: number;
  level: 'S' | 'A' | 'B' | 'C' | 'D';
  level_name: string;
}

/**
 * RadarChart Props
 */
export interface RadarChartProps {
  data_id?: string;
  dimensions: {
    strength: number;
    aerobic_base: number;
    transition: number;
  };
}

/**
 * LossTable Props
 */
export interface LossTableProps {
  data_id?: string;
  total_loss_seconds: number;
  theoretical_best: string;
  items: Array<{
    source: string;
    loss_seconds: number;
    root_cause_analysis: string;
    difficulty: '极易' | '技术' | '节奏' | '体能';
  }>;
}

/**
 * TrainingWeekView Props
 */
export interface TrainingWeekProps {
  data_id?: string;
  week_number?: number;
  phase?: string;
  focus_areas?: string[];
  days: Array<{
    day: string;
    day_name?: string;
    type: 'Key' | 'Recovery' | 'Rest' | 'Long' | 'Easy';
    content: string;
    duration_minutes?: number;
    intensity?: 'low' | 'medium' | 'high';
  }>;
}

/**
 * PredictionTiers Props
 */
export interface PredictionTiersProps {
  data_id?: string;
  tiers: {
    excellent: { percentile: number; time_seconds: number; time_display: string; delta: number };
    great: { percentile: number; time_seconds: number; time_display: string; delta: number };
    expected: { percentile: number; time_seconds: number; time_display: string; delta: number };
    subpar: { percentile: number; time_seconds: number; time_display: string; delta: number };
    poor: { percentile: number; time_seconds: number; time_display: string; delta: number };
  };
}

/**
 * Highlights 列表 Props
 */
export interface HighlightsListProps {
  items: Array<{
    type: 'strength' | 'weakness' | 'insight';
    content: string;
  }>;
}
