/**
 * 认领服务 - 比赛成绩认领管理
 */
const { post, get } = require('./request');
const auth = require('./auth');

/**
 * 认领比赛（自动处理登录）
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @returns {Promise<{claimed: boolean}>}
 */
async function claimRace(season, location, athleteName) {
  // 检查登录状态，未登录则先登录
  if (!auth.isLoggedIn()) {
    await auth.login();
  }
  
  const data = await post('/claim/add', {
    season,
    location,
    athlete_name: athleteName,
  });
  
  return data;
}

/**
 * 取消认领
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @returns {Promise<{claimed: boolean}>}
 */
async function unclaimRace(season, location, athleteName) {
  const data = await post('/claim/remove', {
    season,
    location,
    athlete_name: athleteName,
  });
  
  return data;
}

/**
 * 获取当前用户已认领的比赛列表
 * @returns {Promise<{items: Array, total: number}>}
 */
async function getClaimedList() {
  const data = await get('/claim/list');
  return data;
}

/**
 * 检查某比赛是否已被当前用户认领
 * @param {number} season 赛季
 * @param {string} location 比赛地点
 * @param {string} athleteName 运动员姓名
 * @returns {Promise<{claimed: boolean, claim_id: number|null}>}
 */
async function checkClaimed(season, location, athleteName) {
  const data = await get('/claim/check', {
    season,
    location,
    athlete_name: athleteName,
  });
  
  return data;
}

module.exports = {
  claimRace,
  unclaimRace,
  getClaimedList,
  checkClaimed,
};
