/**
 * API 接口定义
 */
const { get } = require('./request');

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

module.exports = {
  suggestAthletes,
  searchAthletes,
  getAthleteResult,
  getAnalytics,
  getRecentRaces,
  getLeaderboard,
};




