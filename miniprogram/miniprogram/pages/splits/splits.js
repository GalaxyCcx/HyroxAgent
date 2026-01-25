/**
 * 分段中心页
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
    
    // 基础数据
    results: null,
    rankings: null,
    raceName: '',
    
    // 分段数据
    splitsAnalytics: [],
    runAnalytics: [],
    stationAnalytics: [],
    
    // Tab
    activeTab: 'overview', // overview / run / station
    
    // 计算属性
    badge: null,
  },

  onLoad(options) {
    const season = parseInt(options.season) || 8;
    const location = options.location || '';
    const name = decodeURIComponent(options.name || '');
    
    this.setData({
      season,
      location,
      athleteName: name,
    });
    
    if (name && location) {
      this.loadData();
    } else {
      this.setData({
        loading: false,
        error: '参数错误，请返回重试',
      });
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    const { season, location, athleteName } = this.data;
    
    this.setData({ loading: true, error: null });
    
    try {
      // 并行请求基础数据和分段分析
      const [resultData, analyticsData] = await Promise.all([
        api.getAthleteResult(season, location, athleteName),
        api.getAnalytics(season, location, athleteName),
      ]);
      
      const { results, rankings, race } = resultData;
      const splitsAnalytics = analyticsData.splits_analytics || [];
      
      // 分离 Run 和 Station 数据
      const runAnalytics = splitsAnalytics.filter(s => s.type === 'run');
      const stationAnalytics = splitsAnalytics.filter(s => s.type === 'workout');
      
      // 获取徽章
      const badge = this.getTopPercentBadge(rankings.overall_rank, rankings.overall_total);
      
      this.setData({
        loading: false,
        results,
        rankings,
        raceName: race?.event_name || '',
        splitsAnalytics,
        runAnalytics,
        stationAnalytics,
        badge,
      });
    } catch (err) {
      console.error('Load data failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载失败，请重试',
      });
    }
  },

  /**
   * 获取徽章
   */
  getTopPercentBadge(rank, total) {
    if (!total || total === 0) return null;
    const percent = (rank / total) * 100;
    if (percent <= 5) return { text: 'TOP 5%' };
    if (percent <= 10) return { text: 'TOP 10%' };
    if (percent <= 20) return { text: 'TOP 20%' };
    if (percent <= 50) return { text: 'TOP 50%' };
    return null;
  },

  /**
   * 切换 Tab
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },
});
