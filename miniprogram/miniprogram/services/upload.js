/**
 * 文件上传服务
 * 封装微信小程序文件上传 API
 */
const config = require('./config');
const { getToken } = require('./auth');

/**
 * 上传单个文件
 * @param {string} filePath 本地文件路径（来自 wx.chooseImage 等）
 * @param {Object} options 上传选项
 * @param {string} options.url 上传接口路径（相对于 apiPrefix）
 * @param {string} options.name 文件字段名，默认 'file'
 * @param {Object} options.formData 额外的表单数据
 * @param {Function} options.onProgress 上传进度回调 (progress) => void
 * @returns {Promise} 上传结果
 */
function uploadFile(filePath, options = {}) {
  const {
    url,
    name = 'file',
    formData = {},
    onProgress,
  } = options;

  const fullUrl = `${config.baseUrl}${config.apiPrefix}${url}`;
  const token = getToken();

  return new Promise((resolve, reject) => {
    const uploadTask = wx.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: config.timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // 解析响应 JSON
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data.data);
            } else {
              reject({
                code: data.code,
                message: data.message || '上传失败',
              });
            }
          } catch (e) {
            reject({
              code: -2,
              message: '解析响应失败',
            });
          }
        } else if (res.statusCode === 401) {
          reject({
            code: 401,
            message: '登录已过期，请重新登录',
          });
        } else {
          reject({
            code: res.statusCode,
            message: `上传失败: ${res.statusCode}`,
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

    // 监听上传进度
    if (onProgress && typeof onProgress === 'function') {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress);
      });
    }
  });
}

/**
 * 上传多个文件
 * @param {string[]} filePaths 本地文件路径数组
 * @param {Object} options 上传选项
 * @param {string} options.url 上传接口路径
 * @param {string} options.name 文件字段名，默认 'files'
 * @param {Object} options.formData 额外的表单数据（每个请求都会携带）
 * @param {Function} options.onProgress 总体进度回调 (progress, current, total) => void
 * @returns {Promise<Array>} 所有文件的上传结果数组
 */
async function uploadFiles(filePaths, options = {}) {
  const { onProgress, ...restOptions } = options;
  const results = [];
  const total = filePaths.length;

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    try {
      const result = await uploadFile(filePath, {
        ...restOptions,
        onProgress: (progress) => {
          // 计算总体进度
          const overallProgress = Math.floor(((i + progress / 100) / total) * 100);
          if (onProgress) {
            onProgress(overallProgress, i + 1, total);
          }
        },
      });
      results.push({ success: true, data: result, filePath });
    } catch (err) {
      results.push({ success: false, error: err, filePath });
    }
  }

  return results;
}

/**
 * 上传心率图片
 * @param {string} reportId 报告ID
 * @param {string[]} filePaths 图片本地路径数组
 * @param {Function} onProgress 进度回调
 * @returns {Promise} 上传结果
 */
async function uploadHeartRateImages(reportId, filePaths, onProgress) {
  // 后端接口支持多文件，但小程序 wx.uploadFile 只支持单文件
  // 需要逐个上传
  const results = [];
  const total = filePaths.length;
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    try {
      const result = await uploadFile(filePath, {
        url: '/upload/heart-rate',
        name: 'files',
        formData: { report_id: reportId },
        onProgress: (progress) => {
          const overallProgress = Math.floor(((i + progress / 100) / total) * 100);
          if (onProgress) {
            onProgress(overallProgress, i + 1, total);
          }
        },
      });
      results.push({
        success: true,
        data: result,
        filePath,
      });
    } catch (err) {
      results.push({
        success: false,
        error: err,
        filePath,
      });
    }
  }

  // 汇总结果
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  // 收集所有成功上传的图片路径
  const uploadedImages = results
    .filter(r => r.success && r.data)
    .flatMap(r => (r.data.uploaded || []).map(item => item.image_path));

  return {
    total: total,
    success: successCount,
    failed: failedCount,
    images: uploadedImages,
    results,
  };
}

/**
 * 从相册或拍照选择图片
 * @param {Object} options 选择选项
 * @param {number} options.count 最大数量，默认 9
 * @param {string[]} options.sourceType 来源，默认 ['album', 'camera']
 * @returns {Promise<string[]>} 选中的图片临时路径数组
 */
function chooseImages(options = {}) {
  const {
    count = 9,
    sourceType = ['album', 'camera'],
  } = options;

  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sourceType,
      sizeType: ['original', 'compressed'],
      success(res) {
        resolve(res.tempFilePaths);
      },
      fail(err) {
        // 用户取消不算错误
        if (err.errMsg && err.errMsg.includes('cancel')) {
          resolve([]);
        } else {
          reject({
            code: -1,
            message: err.errMsg || '选择图片失败',
          });
        }
      },
    });
  });
}

/**
 * 从相册选择图片（使用新 API chooseMedia，兼容更多场景）
 * @param {Object} options 选择选项
 * @param {number} options.count 最大数量，默认 9
 * @param {string[]} options.sourceType 来源，默认 ['album', 'camera']
 * @returns {Promise<string[]>} 选中的图片临时路径数组
 */
function chooseMedia(options = {}) {
  const {
    count = 9,
    sourceType = ['album', 'camera'],
  } = options;

  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType,
      sizeType: ['original', 'compressed'],
      success(res) {
        const paths = res.tempFiles.map(file => file.tempFilePath);
        resolve(paths);
      },
      fail(err) {
        // 用户取消不算错误
        if (err.errMsg && err.errMsg.includes('cancel')) {
          resolve([]);
        } else {
          reject({
            code: -1,
            message: err.errMsg || '选择图片失败',
          });
        }
      },
    });
  });
}

module.exports = {
  uploadFile,
  uploadFiles,
  uploadHeartRateImages,
  chooseImages,
  chooseMedia,
};
