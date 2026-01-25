/**
 * 请求封装
 */
const config = require('./config');

/**
 * 发起网络请求
 * @param {Object} options 请求选项
 * @returns {Promise} 请求结果
 */
function request(options) {
  const { url, method = 'GET', data = {}, header = {} } = options;
  
  const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${config.apiPrefix}${url}`;
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
      timeout: config.timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 统一响应格式处理
          const data = res.data;
          if (data.code === 0) {
            resolve(data.data);
          } else {
            reject({
              code: data.code,
              message: data.message || '请求失败',
            });
          }
        } else {
          reject({
            code: res.statusCode,
            message: res.data?.message || `请求失败: ${res.statusCode}`,
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

module.exports = {
  request,
  get,
  post,
};




