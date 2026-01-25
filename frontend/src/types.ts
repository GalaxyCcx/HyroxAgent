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
