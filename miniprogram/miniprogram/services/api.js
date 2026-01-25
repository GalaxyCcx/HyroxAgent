/**
 * API 接口定义
 */
const { get } = require('./request');

/**
 * 搜索运动员
 * @param {string} name 搜索关键词
 * @param {Object} options 可选参数
 * @param {number} options.season 赛季
 * @param {number} options.limit 结果数量限制
 * @returns {Promise} 搜索结果
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

module.exports = {
  searchAthletes,
  getAthleteResult,
};




