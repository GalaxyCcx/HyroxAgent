/**
 * 快速分析 (Lite) 页面
 */
const api = require('../../services/api');

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
    
    // LLM 分析数据
    summary: '',
    strengths: [],
    weaknesses: [],
    cached: false,
    
    // 导航栏相关
    statusBarHeight: 0,
    navBarHeight: 0,
    menuRight: 0,
  },

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
    
    this.setData({
      season,
      location,
      athleteName: name,
      raceName,
      division,
      totalTime,
      overallRank,
      overallTotal,
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
        });
      }
      
      // 获取 LLM 分析
      const analysisData = await api.getAnalysisLite(season, location, athleteName);
      
      this.setData({
        loading: false,
        summary: analysisData.summary || '暂无分析数据',
        strengths: analysisData.strengths || [],
        weaknesses: analysisData.weaknesses || [],
        cached: analysisData.cached || false,
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
   * 解锁详细报告 (占位)
   */
  onUnlockPro() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none',
    });
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
