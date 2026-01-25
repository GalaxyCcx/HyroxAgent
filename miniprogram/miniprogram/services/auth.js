/**
 * 认证服务 - 微信登录和用户状态管理
 */
const { post, get, put } = require('./request');

// 本地存储 key
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

/**
 * 获取本地存储的 token
 */
function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || null;
}

/**
 * 设置 token 到本地存储
 */
function setToken(token) {
  if (token) {
    wx.setStorageSync(TOKEN_KEY, token);
  } else {
    wx.removeStorageSync(TOKEN_KEY);
  }
}

/**
 * 获取本地存储的用户信息
 */
function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

/**
 * 设置用户信息到本地存储
 */
function setUser(user) {
  if (user) {
    wx.setStorageSync(USER_KEY, user);
  } else {
    wx.removeStorageSync(USER_KEY);
  }
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * 微信登录
 * @returns {Promise} 登录结果，包含 token 和 user
 */
async function login() {
  return new Promise((resolve, reject) => {
    // 1. 调用 wx.login 获取 code
    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('获取登录凭证失败'));
          return;
        }
        
        try {
          // 2. 发送 code 到后端换取 token
          const data = await post('/auth/login', { code: loginRes.code });
          
          if (data.token && data.user) {
            // 3. 保存 token 和用户信息
            setToken(data.token);
            setUser(data.user);
            
            resolve({
              token: data.token,
              user: data.user,
            });
          } else {
            reject(new Error('登录失败：服务器未返回有效数据'));
          }
        } catch (err) {
          reject(err);
        }
      },
      fail: (err) => {
        reject(new Error('微信登录失败：' + (err.errMsg || '未知错误')));
      },
    });
  });
}

/**
 * 获取当前用户资料（从服务器）
 * @returns {Promise} 用户资料
 */
async function getProfile() {
  const data = await get('/auth/profile');
  if (data.user) {
    setUser(data.user);
  }
  return data.user;
}

/**
 * 更新用户资料
 * @param {Object} profile 要更新的资料
 * @param {string} profile.nickname 昵称
 * @param {string} profile.avatar_url 头像 URL
 * @returns {Promise} 更新后的用户资料
 */
async function updateProfile(profile) {
  const data = await put('/auth/profile', profile);
  if (data.user) {
    setUser(data.user);
  }
  return data.user;
}

/**
 * 登出
 */
function logout() {
  setToken(null);
  setUser(null);
}

/**
 * 清除登录状态（用于 token 过期等情况）
 */
function clearAuth() {
  logout();
}

module.exports = {
  getToken,
  getUser,
  isLoggedIn,
  login,
  getProfile,
  updateProfile,
  logout,
  clearAuth,
};
