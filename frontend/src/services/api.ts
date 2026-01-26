/**
 * HYROX API 客户端
 * 版本: v2.0
 * 
 * 对接后端三个 API：
 * - GET /api/v1/athletes/suggest - 名称建议（第一阶段）
 * - GET /api/v1/athletes/search - 运动员搜索（第二阶段）
 * - GET /api/v1/results/{season}/{location}/{name} - 成绩详情
 */

import type {
  ApiResponse,
  SuggestData,
  SearchData,
  AthleteResultData,
  SplitAnalyticsData,
  RecentRacesData,
  RaceLeaderboardData,
  AnalysisLiteData,
} from '../types';

// API 基础地址，可通过环境变量覆盖
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * 通用请求函数
 */
async function request<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  } catch (err) {
    throw err;
  }
}

/**
 * API 客户端
 */
export const athleteApi = {
  /**
   * 第一阶段：名称建议
   * 根据关键词返回匹配的运动员姓名候选列表
   * 
   * @param keyword - 搜索关键词（至少2个字符）
   * @param limit - 返回数量上限，默认5
   */
  suggest: async (keyword: string, limit = 5): Promise<ApiResponse<SuggestData>> => {
    const url = `${API_BASE_URL}/athletes/suggest?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    return request<SuggestData>(url);
  },

  /**
   * 第二阶段：搜索运动员
   * 根据精确姓名搜索该运动员的所有比赛记录
   * 
   * @param name - 运动员姓名（从 suggest 接口获取）
   * @param season - 赛季筛选（可选）
   * @param limit - 返回数量上限，默认20
   */
  search: async (name: string, season?: number, limit = 20): Promise<ApiResponse<SearchData>> => {
    let url = `${API_BASE_URL}/athletes/search?name=${encodeURIComponent(name)}&limit=${limit}`;
    if (season) {
      url += `&season=${season}`;
    }
    return request<SearchData>(url);
  },

  /**
   * 第三步：获取成绩详情
   * 获取运动员在特定比赛中的完整成绩详情
   * 
   * @param season - 赛季
   * @param location - 比赛地点（如 hong-kong）
   * @param athleteName - 运动员姓名
   */
  getResult: async (
    season: number,
    location: string,
    athleteName: string
  ): Promise<ApiResponse<AthleteResultData>> => {
    const url = `${API_BASE_URL}/results/${season}/${location}/${encodeURIComponent(athleteName)}`;
    return request<AthleteResultData>(url);
  },

  /**
   * v3.0 新增：获取分段统计
   * 获取运动员在特定比赛中各分段的排名和与平均值的对比
   * 
   * @param season - 赛季
   * @param location - 比赛地点（如 hong-kong）
   * @param athleteName - 运动员姓名
   */
  getAnalytics: async (
    season: number,
    location: string,
    athleteName: string
  ): Promise<ApiResponse<SplitAnalyticsData>> => {
    const url = `${API_BASE_URL}/results/${season}/${location}/${encodeURIComponent(athleteName)}/analytics`;
    return request<SplitAnalyticsData>(url);
  },

  /**
   * v4.0 新增：获取 LLM 快速分析
   * 获取 AI 生成的比赛分析，包括一句话总结、优势、短板
   * 
   * @param season - 赛季
   * @param location - 比赛地点（如 hong-kong）
   * @param athleteName - 运动员姓名
   */
  getAnalysisLite: async (
    season: number,
    location: string,
    athleteName: string
  ): Promise<ApiResponse<AnalysisLiteData>> => {
    const url = `${API_BASE_URL}/results/${season}/${location}/${encodeURIComponent(athleteName)}/analysis`;
    return request<AnalysisLiteData>(url);
  },
};

/**
 * 赛事 API
 */
export const racesApi = {
  /**
   * 获取近期比赛列表（已完赛）
   * 
   * @param limit - 返回数量，默认5
   */
  getRecent: async (limit = 5): Promise<ApiResponse<RecentRacesData>> => {
    const url = `${API_BASE_URL}/races/recent?limit=${limit}`;
    return request<RecentRacesData>(url);
  },

  /**
   * 获取赛事排行榜
   * 
   * @param season - 赛季
   * @param location - 比赛地点
   * @param filters - 筛选条件
   */
  getLeaderboard: async (
    season: number,
    location: string,
    filters?: {
      division?: string;
      gender?: string;
      age_group?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<RaceLeaderboardData>> => {
    let url = `${API_BASE_URL}/races/${season}/${location}/leaderboard`;
    const params = new URLSearchParams();
    
    if (filters?.division) params.append('division', filters.division);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.age_group) params.append('age_group', filters.age_group);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return request<RaceLeaderboardData>(url);
  },
};

export default athleteApi;
