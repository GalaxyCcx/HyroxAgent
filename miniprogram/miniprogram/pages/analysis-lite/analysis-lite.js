/**
 * 快速分析 (Lite) 页面
 * 
 * 新增功能：
 * - 心率图片上传弹窗
 * - 专业报告生成入口
 * - 生成进度轮询
 */
const api = require('../../services/api');
const { uploadHeartRateImages } = require('../../services/upload');
const { isLoggedIn, login } = require('../../services/auth');

// 轮询配置
const POLL_INTERVAL = 2000;
const MAX_POLL_COUNT = 150;

Page({
  data: {
    loading: true,
    error: null,
    
    // 参数
    season: 0,
    location: '',
    athleteName: '',
    
    // 基础数据 (从 URL 参数或重新获取)
    raceName: '',
    division: '',
    totalTime: '',
    overallRank: 0,
    overallTotal: 0,
    ageGroupRank: 0,
    ageGroupTotal: 0,
    
    // LLM 分析数据
    summary: '',
    summaryHtml: '', // 带关键词高亮的 HTML
    strengths: [],
    weaknesses: [],
    cached: false,
    analysisScope: '', // 分析口径
    
    // 导航栏相关
    statusBarHeight: 0,
    navBarHeight: 0,
    menuRight: 0,
    
    // 心率图片上传弹窗
    showUploadModal: false,
    heartRateImages: [],
    
    // 生成进度弹窗
    showProgressModal: false,
    generateProgress: 0,
    generateStep: '',
    currentReportId: '',
  },
  
  // 轮询相关
  pollTimer: null,
  pollCount: 0,

  onLoad(options) {
    // 获取胶囊按钮位置
    this.initNavBar();
    const season = parseInt(options.season) || 8;
    const location = options.location || '';
    const name = decodeURIComponent(options.name || '');
    
    // 从 URL 获取已有数据 (可选)
    const raceName = decodeURIComponent(options.raceName || '');
    const division = decodeURIComponent(options.division || '');
    const totalTime = options.totalTime || '';
    const overallRank = parseInt(options.overallRank) || 0;
    const overallTotal = parseInt(options.overallTotal) || 0;
    const ageGroupRank = parseInt(options.ageGroupRank) || 0;
    const ageGroupTotal = parseInt(options.ageGroupTotal) || 0;
    
    this.setData({
      season,
      location,
      athleteName: name,
      raceName,
      division,
      totalTime,
      overallRank,
      overallTotal,
      ageGroupRank,
      ageGroupTotal,
    });
    
    if (name && location) {
      this.loadAnalysis();
    } else {
      this.setData({
        loading: false,
        error: '参数错误，请返回重试',
      });
    }
  },

  /**
   * 初始化导航栏高度
   */
  initNavBar() {
    const systemInfo = wx.getSystemInfoSync();
    const menuButton = wx.getMenuButtonBoundingClientRect();
    
    const statusBarHeight = systemInfo.statusBarHeight;
    // 导航栏高度 = 胶囊按钮高度 + 上下间距
    const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
    // 右侧需要预留的空间 = 屏幕宽度 - 胶囊按钮左边距
    const menuRight = systemInfo.windowWidth - menuButton.left;
    
    this.setData({
      statusBarHeight,
      navBarHeight,
      menuRight,
    });
  },

  /**
   * 加载分析数据
   */
  async loadAnalysis() {
    const { season, location, athleteName } = this.data;
    
    this.setData({ loading: true, error: null });
    
    try {
      // 如果没有基础数据，先获取
      if (!this.data.raceName) {
        const resultData = await api.getAthleteResult(season, location, athleteName);
        const { athlete, race, results, rankings } = resultData;
        
        // 构建组别显示
        const genderText = athlete.gender === 'male' ? '男子' : '女子';
        const divisionText = athlete.division === 'open' ? '公开组' : '精英组';
        
        this.setData({
          raceName: race.event_name,
          division: `${genderText}${divisionText}`,
          totalTime: results.total_time,
          overallRank: rankings.overall_rank,
          overallTotal: rankings.overall_total,
          ageGroupRank: rankings.age_group_rank || 0,
          ageGroupTotal: rankings.age_group_total || 0,
        });
      }
      
      // 获取 LLM 分析
      const analysisData = await api.getAnalysisLite(season, location, athleteName);
      
      // 格式化优势/短板数据（确保是对象格式）
      const formatItems = (items) => {
        if (!items || !Array.isArray(items)) return [];
        return items.map(item => {
          if (typeof item === 'string') {
            return { text: item, percentile: null };
          }
          return {
            text: item.text || '',
            percentile: item.percentile != null ? item.percentile : null,
          };
        });
      };
      
      const summaryText = analysisData.summary || '暂无分析数据';
      
      this.setData({
        loading: false,
        summary: summaryText,
        summaryHtml: this.highlightKeywords(summaryText),
        strengths: formatItems(analysisData.strengths),
        weaknesses: formatItems(analysisData.weaknesses),
        cached: analysisData.cached || false,
        analysisScope: analysisData.analysis_scope || '',
      });
    } catch (err) {
      console.error('Load analysis failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载失败，请重试',
      });
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 回到比赛总结
   */
  onBackToSummary() {
    wx.navigateBack();
  },

  /**
   * 分享战报
   */
  onShare() {
    // 触发分享
  },

  /**
   * 解锁详细报告 - 显示心率上传弹窗
   */
  async onUnlockPro() {
    // 检查登录状态
    if (!isLoggedIn()) {
      try {
        wx.showLoading({ title: '登录中...' });
        await login();
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none',
        });
        return;
      }
    }
    
    // 显示心率上传弹窗
    this.setData({
      showUploadModal: true,
      heartRateImages: [],
    });
  },

  /**
   * 关闭上传弹窗
   */
  onCloseModal() {
    this.setData({ showUploadModal: false });
  },

  /**
   * 心率图片选择变化
   */
  onHeartRateImagesChange(e) {
    this.setData({
      heartRateImages: e.detail.images,
    });
  },

  /**
   * 跳过上传，直接生成
   */
  onSkipUpload() {
    this.setData({ showUploadModal: false });
    this.startGenerateReport([]);
  },

  /**
   * 确认上传并生成报告
   */
  onConfirmUpload() {
    this.setData({ showUploadModal: false });
    this.startGenerateReport(this.data.heartRateImages);
  },

  /**
   * 开始生成报告
   */
  async startGenerateReport(imagesPaths) {
    const { season, location, athleteName } = this.data;
    
    this.setData({
      showProgressModal: true,
      generateProgress: 0,
      generateStep: '初始化...',
    });

    let uploadedImagePaths = [];

    try {
      // 1. 创建报告
      this.setData({ generateStep: '创建报告...' });
      const createResult = await api.createReport(season, location, athleteName, {
        forceRegenerate: true,
      });
      
      const reportId = createResult.report_id;
      this.setData({ currentReportId: reportId });

      // 2. 如果有心率图片，先上传
      if (imagesPaths.length > 0) {
        this.setData({ generateStep: '上传心率图片...' });
        try {
          const uploadResult = await uploadHeartRateImages(reportId, imagesPaths, (progress) => {
            this.setData({ generateProgress: Math.floor(progress * 0.15) }); // 上传占 15%
          });
          // 收集上传成功的图片路径
          uploadedImagePaths = uploadResult.images || [];
        } catch (uploadErr) {
          console.warn('心率图片上传失败:', uploadErr);
          // 继续生成报告，不中断
        }
      }

      // 3. 触发报告生成（小程序不支持 SSE，使用请求触发 + 轮询模式）
      this.setData({
        generateProgress: 15,
        generateStep: '启动 AI 分析...',
      });
      
      // 触发生成（传递已上传的图片路径）
      await api.triggerGenerate(reportId, uploadedImagePaths);
      
      // 4. 开始轮询报告生成状态
      this.setData({
        generateProgress: 20,
        generateStep: 'AI 分析中...',
      });
      this.startPolling(reportId);

    } catch (err) {
      console.error('创建报告失败:', err);
      this.setData({ showProgressModal: false });
      wx.showToast({
        title: err.message || '创建报告失败',
        icon: 'none',
      });
    }
  },

  /**
   * 开始轮询报告状态
   */
  startPolling(reportId) {
    this.pollCount = 0;
    this.pollReportStatus(reportId);
  },

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  /**
   * 轮询报告状态
   */
  async pollReportStatus(reportId) {
    if (this.pollCount >= MAX_POLL_COUNT) {
      this.setData({ showProgressModal: false });
      wx.showToast({
        title: '报告生成超时，请稍后重试',
        icon: 'none',
      });
      return;
    }

    try {
      const status = await api.getReportStatus(reportId);
      
      // 更新进度 (20-100)
      const progress = 20 + Math.floor((status.progress || 0) * 0.8);
      this.setData({
        generateProgress: progress,
        generateStep: status.current_step || 'AI 分析中...',
      });

      if (status.status === 'completed') {
        // 生成完成，跳转到报告页
        this.stopPolling();
        this.setData({ showProgressModal: false });
        wx.navigateTo({
          url: `/pages/report/report?id=${reportId}`,
        });
      } else if (status.status === 'failed') {
        // 生成失败
        this.stopPolling();
        this.setData({ showProgressModal: false });
        wx.showToast({
          title: '报告生成失败，请重试',
          icon: 'none',
        });
      } else {
        // 继续轮询
        this.pollCount++;
        this.pollTimer = setTimeout(() => {
          this.pollReportStatus(reportId);
        }, POLL_INTERVAL);
      }
    } catch (err) {
      console.error('获取报告状态失败:', err);
      this.pollCount++;
      this.pollTimer = setTimeout(() => {
        this.pollReportStatus(reportId);
      }, POLL_INTERVAL);
    }
  },

  /**
   * 页面卸载时清理轮询
   */
  onUnload() {
    this.stopPolling();
  },

  /**
   * 关键词高亮处理
   * 将特定关键词包装为带样式的 HTML
   */
  highlightKeywords(text) {
    if (!text || typeof text !== 'string') return '';
    
    const keywords = [
      'SkiErg', 'Sled Push', 'Sled Pull', 'Burpee Broad Jump',
      'Rowing', 'Farmers Carry', 'Sandbag Lunges', 'Wall Balls',
      'Roxzone', 'Run 1', 'Run 2', 'Run 3', 'Run 4', 'Run 5', 'Run 6', 'Run 7', 'Run 8',
      '转换区', '站点效率', '跑步', '滑雪机', '雪橇推', '雪橇拉',
      '波比跳', '划船', '农夫行走', '沙袋弓步', '墙球', '力量项目',
    ];
    
    // 转义正则特殊字符并构建模式
    const pattern = keywords
      .map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    
    // 替换为带内联样式的 span（rich-text 不支持外部 CSS 类）
    return text.replace(regex, '<span style="color:#42ff9e;font-weight:600;">$1</span>');
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const { athleteName, raceName, season, location } = this.data;
    return {
      title: `${athleteName} - ${raceName} 赛后分析`,
      path: `/pages/analysis-lite/analysis-lite?season=${season}&location=${location}&name=${encodeURIComponent(athleteName)}`,
    };
  },
});
