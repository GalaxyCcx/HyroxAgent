/**
 * 请求封装
 */
const config = require('./config');

// Token 存储 key（与 auth.js 保持一致）
const TOKEN_KEY = 'auth_token';

/**
 * 获取本地存储的 token
 */
function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || null;
}

/**
 * 清除认证信息（用于 401 处理）
 */
function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync('user_info');
}

/**
 * 发起网络请求
 * @param {Object} options 请求选项
 * @returns {Promise} 请求结果
 */
function request(options) {
  const { url, method = 'GET', data = {}, header = {} } = options;
  
  const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${config.apiPrefix}${url}`;
  
  // 自动添加 Authorization 头
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...header,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: headers,
      timeout: config.timeout,
      success(res) {
        // 处理 401 未授权（token 过期）
        if (res.statusCode === 401) {
          clearAuth();
          reject({
            code: 401,
            message: '登录已过期，请重新登录',
          });
          return;
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 统一响应格式处理
          const data = res.data;
          
          // 标准格式: { code: 0, data: { ... } }
          if (data.code === 0) {
            resolve(data.data);
          } 
          // 报告 API 直接返回对象格式: { report_id, status, ... }
          else if (data.report_id !== undefined) {
            resolve(data);
          }
          // 其他直接返回的数据格式（无 code 字段但有有效数据）
          else if (data.code === undefined && Object.keys(data).length > 0) {
            resolve(data);
          }
          else {
            reject({
              code: data.code,
              message: data.message || '请求失败',
            });
          }
        } else {
          // 兼容 FastAPI 422 验证错误格式
          const message = res.data?.message || (Array.isArray(res.data?.detail) ? res.data.detail[0]?.msg : res.data?.detail) || `请求失败: ${res.statusCode}`;
          reject({
            code: res.statusCode,
            message,
          });
        }
      },
      fail(err) {
        reject({
          code: -1,
          message: err.errMsg || '网络错误',
        });
      },
    });
  });
}

/**
 * GET 请求
 */
function get(url, params = {}) {
  return request({ url, method: 'GET', data: params });
}

/**
 * POST 请求
 */
function post(url, data = {}) {
  return request({ url, method: 'POST', data });
}

/**
 * PUT 请求
 */
function put(url, data = {}) {
  return request({ url, method: 'PUT', data });
}

/**
 * DELETE 请求
 */
function del(url, data = {}) {
  return request({ url, method: 'DELETE', data });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
};
