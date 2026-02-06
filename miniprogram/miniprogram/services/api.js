/**
 * API 接口定义
 */
const { get, post } = require('./request');
const config = require('./config');

/**
 * 搜索运动员建议（模糊搜索）
 * @param {string} keyword 搜索关键词
 * @param {Object} options 可选参数
 * @param {number} options.limit 结果数量限制
 * @returns {Promise} 建议列表
 */
function suggestAthletes(keyword, options = {}) {
  const params = { keyword };
  if (options.limit) params.limit = options.limit;
  return get('/athletes/suggest', params);
}

/**
 * 搜索运动员比赛记录（精确姓名匹配）
 * @param {string} name 精确姓名（从 suggest 接口获取）
 * @param {Object} options 可选参数
 * @param {number} options.season 赛季
 * @param {number} options.limit 结果数量限制
 * @returns {Promise} 比赛记录列表
 */
function searchAthletes(name, options = {}) {
  const params = { name };
  if (options.season) params.season = options.season;
  if (options.limit) params.limit = options.limit;
  return get('/athletes/search', params);
}

/**
 * 获取运动员成绩详情
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @returns {Promise} 成绩详情
 */
function getAthleteResult(season, location, athleteName) {
  const encodedName = encodeURIComponent(athleteName);
  return get(`/results/${season}/${location}/${encodedName}`);
}

/**
 * 获取分段统计分析
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @returns {Promise} 分段分析数据
 */
function getAnalytics(season, location, athleteName) {
  const encodedName = encodeURIComponent(athleteName);
  return get(`/results/${season}/${location}/${encodedName}/analytics`);
}

/**
 * 获取近期赛事列表
 * @param {number} limit 返回数量，默认5
 * @returns {Promise} 近期赛事列表
 */
function getRecentRaces(limit = 5) {
  return get('/races/recent', { limit });
}

/**
 * 获取赛事排行榜
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {Object} filters 筛选条件
 * @returns {Promise} 排行榜数据
 */
function getLeaderboard(season, location, filters = {}) {
  const params = {};
  if (filters.division) params.division = filters.division;
  if (filters.gender) params.gender = filters.gender;
  if (filters.age_group) params.age_group = filters.age_group;
  if (filters.limit) params.limit = filters.limit;
  if (filters.offset) params.offset = filters.offset;
  return get(`/races/${season}/${location}/leaderboard`, params);
}

/**
 * 获取 LLM 快速分析
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @returns {Promise} 分析数据 {summary, strengths, weaknesses, cached}
 */
function getAnalysisLite(season, location, athleteName) {
  const encodedName = encodeURIComponent(athleteName);
  return get(`/results/${season}/${location}/${encodedName}/analysis`);
}

// ==================== 专业报告 API ====================

/**
 * 创建专业分析报告（V2 新架构）
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @param {Object} options 可选参数
 * @param {number} options.userId 用户ID
 * @param {string[]} options.heartRateImages 心率图片路径列表
 * @param {boolean} options.forceRegenerate 强制重新生成（默认 true）
 * @returns {Promise} { report_id, status, message }
 */
function createReport(season, location, athleteName, options = {}) {
  const data = {
    season,
    location,
    athlete_name: athleteName,
    force_regenerate: options.forceRegenerate !== false, // 默认 true
  };
  if (options.userId) data.user_id = options.userId;
  if (options.heartRateImages) data.heart_rate_images = options.heartRateImages;
  return post('/reports/v2/create', data);
}

/**
 * 触发报告生成（小程序版本）
 * 使用后台任务端点触发生成，然后通过轮询获取状态
 * @param {string} reportId 报告ID
 * @param {string[]} heartRateImages 心率图片路径列表（可选）
 * @returns {Promise} 触发结果
 */
function triggerGenerate(reportId, heartRateImages = []) {
  // 使用新的后台任务触发端点（POST /v2/trigger/{reportId}）
  // 始终发送完整格式，避免 FastAPI 422 错误
  return post(`/reports/v2/trigger/${reportId}`, {
    heart_rate_images: heartRateImages.length > 0 ? heartRateImages : null,
  });
}

/**
 * 获取报告生成状态
 * @param {string} reportId 报告ID
 * @returns {Promise} { report_id, status, progress, current_step, title }
 */
function getReportStatus(reportId) {
  return get(`/reports/status/${reportId}`);
}

/**
 * 获取报告详情
 * @param {string} reportId 报告ID
 * @returns {Promise} 完整报告数据（包含所有章节和图表配置）
 */
function getReportDetail(reportId) {
  return get(`/reports/detail/${reportId}`);
}

/**
 * 获取报告列表
 * @param {Object} options 筛选条件
 * @param {number} options.userId 用户ID
 * @param {string} options.athleteName 运动员姓名
 * @returns {Promise} { reports: ProReportSummary[] }
 */
function listReports(options = {}) {
  const params = {};
  if (options.userId) params.user_id = options.userId;
  if (options.athleteName) params.athlete_name = options.athleteName;
  return get('/reports/list', params);
}

/**
 * 获取心率图片列表
 * @param {string} reportId 报告ID
 * @returns {Promise} { images, total }
 */
function getHeartRateImages(reportId) {
  return get(`/upload/${reportId}/images`);
}

module.exports = {
  // 运动员相关
  suggestAthletes,
  searchAthletes,
  getAthleteResult,
  getAnalytics,
  getAnalysisLite,
  // 赛事相关
  getRecentRaces,
  getLeaderboard,
  // 专业报告相关
  createReport,
  triggerGenerate,
  getReportStatus,
  getReportDetail,
  listReports,
  getHeartRateImages,
};




