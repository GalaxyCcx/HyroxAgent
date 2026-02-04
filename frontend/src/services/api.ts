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
  CreateReportResponse,
  ProReportSummary,
  ProReportDetail,
  ProReport,
  HeartRateImage,
  HeartRateUploadResponse,
} from '../types';

// API 基础地址：开发时用相对路径走 Vite 代理，生产或显式配置时用环境变量
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
      ? '/api/v1'
      : 'http://localhost:8000/api/v1';

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

/**
 * 专业报告 API
 */
export const reportApi = {
  /**
   * V2 创建专业分析报告（新架构）
   * 
   * @param season - 赛季
   * @param location - 比赛地点
   * @param athleteName - 运动员姓名
   * @param userId - 用户ID（可选）
   * @param heartRateImages - 心率图片路径列表（可选）
   * @param forceRegenerate - 强制重新生成（默认 true）
   */
  create: async (
    season: number,
    location: string,
    athleteName: string,
    userId?: number,
    heartRateImages?: string[],
    forceRegenerate: boolean = true
  ): Promise<CreateReportResponse> => {
    const url = `${API_BASE_URL}/reports/v2/create`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        season,
        location,
        athlete_name: athleteName,
        user_id: userId,
        heart_rate_images: heartRateImages,
        force_regenerate: forceRegenerate,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  },

  /**
   * V2 订阅报告生成进度（SSE）- 新架构
   * 返回 EventSource 实例，调用者需要自行处理事件
   * 
   * @param reportId - 报告ID
   * @param heartRateImagePaths - 心率图片路径数组（可选）
   */
  subscribeGenerate: (reportId: string, heartRateImagePaths?: string[]): EventSource => {
    let url = `${API_BASE_URL}/reports/v2/generate/${reportId}`;
    
    // 如果有心率图片，添加到 query parameter
    if (heartRateImagePaths && heartRateImagePaths.length > 0) {
      const imagePaths = heartRateImagePaths.join(',');
      url += `?heart_rate_images=${encodeURIComponent(imagePaths)}`;
    }
    
    return new EventSource(url);
  },

  /**
   * 获取报告状态
   * 
   * @param reportId - 报告ID
   */
  getStatus: async (reportId: string): Promise<{
    report_id: string;
    status: string;
    progress: number;
    current_step: string | null;
    title: string | null;
  }> => {
    const url = `${API_BASE_URL}/reports/status/${reportId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  },

  /**
   * 获取报告详情
   * 
   * @param reportId - 报告ID
   */
  getDetail: async (reportId: string): Promise<ProReportDetail> => {
    const url = `${API_BASE_URL}/reports/detail/${reportId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  },

  /**
   * 列出用户的报告
   * 
   * @param options - 筛选条件
   */
  list: async (options?: {
    userId?: number;
    athleteName?: string;
  }): Promise<{ reports: ProReportSummary[] }> => {
    const params = new URLSearchParams();
    if (options?.userId) params.append('user_id', String(options.userId));
    if (options?.athleteName) params.append('athlete_name', options.athleteName);
    
    const url = `${API_BASE_URL}/reports/list?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  },

  /**
   * 获取报告（用于渲染页面）
   * 返回完整的报告数据，包含所有章节和图表配置
   * 
   * @param reportId - 报告ID
   */
  getReport: async (reportId: string): Promise<ApiResponse<ProReport>> => {
    const url = `${API_BASE_URL}/reports/detail/${reportId}`;
    return request<ProReport>(url);
  },

  /**
   * 上传心率图片
   * 支持多文件上传，返回上传后的图片列表
   * 
   * @param reportId - 报告ID
   * @param files - 图片文件数组（支持 PNG/JPG/JPEG）
   */
  uploadHeartRateImages: async (
    reportId: string, 
    files: File[]
  ): Promise<ApiResponse<HeartRateUploadResponse>> => {
    const url = `${API_BASE_URL}/upload/heart-rate`;
    const formData = new FormData();
    
    // report_id 作为 Form 字段
    formData.append('report_id', reportId);
    
    // 多个文件
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  },

  /**
   * 获取心率图片列表（后端: GET /api/v1/upload/{report_id}/images，返回 { code, data: { images, total } }）
   */
  getHeartRateImages: async (reportId: string): Promise<ApiResponse<HeartRateImage[]>> => {
    const url = `${API_BASE_URL}/upload/${reportId}/images`;
    const raw = await fetch(url).then(r => r.ok ? r.json() : { code: 1, data: { images: [], total: 0 } }).catch(() => ({ code: 1, data: { images: [], total: 0 } }));
    const list = (raw?.data?.images ?? []) as HeartRateImage[];
    return { code: 0, data: list } as ApiResponse<HeartRateImage[]>;
  },
};

export default athleteApi;
