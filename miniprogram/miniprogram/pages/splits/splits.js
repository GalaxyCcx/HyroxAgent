/**
 * 分段中心页
 */
const api = require('../../services/api');

// 站点名称中文映射
const STATION_NAME_CN = {
  'SkiErg': '滑雪机',
  'Sled Push': '雪橇推',
  'Sled Pull': '雪橇拉',
  'Burpee Broad Jump': '波比跳远',
  'Row': '划船机',
  'Farmers Carry': '农夫行走',
  'Sandbag Lunges': '沙袋弓步',
  'Wall Balls': '墙球',
};

// 跑步名称中文映射
const RUN_NAME_CN = {
  'Run 1': '跑步 1',
  'Run 2': '跑步 2',
  'Run 3': '跑步 3',
  'Run 4': '跑步 4',
  'Run 5': '跑步 5',
  'Run 6': '跑步 6',
  'Run 7': '跑步 7',
  'Run 8': '跑步 8',
};

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
    activeTab: 'overview', // overview / run / station / roxzone
    
    // 计算属性
    badge: null,
  },

  onLoad(options) {
    const season = parseInt(options.season) || 8;
    const location = options.location || '';
    const name = decodeURIComponent(options.name || '');
    // 读取 tab 参数，支持从 summary 页点击跑步/站点/转换区跳转到对应 tab
    const tab = options.tab || 'overview';
    
    this.setData({
      season,
      location,
      athleteName: name,
      activeTab: tab,
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
      const rawSplits = analyticsData.splits_analytics || [];
      
      // 分离 Run 和 Station 数据，并添加索引和中文名称
      let runIndex = 0;
      let stationIndex = 0;
      
      const processedSplits = rawSplits.map(item => {
        const newItem = { ...item };
        if (item.type === 'run') {
          runIndex++;
          newItem.index = runIndex;
          newItem.round = runIndex; // 用于排序：R1=round 1, R2=round 2...
          newItem.order = 0; // run 在同一圈内排第一
          newItem.label = `R${runIndex}`;
          newItem.displayName = RUN_NAME_CN[item.name] || item.name;
        } else {
          stationIndex++;
          newItem.index = stationIndex;
          newItem.round = stationIndex; // S1=round 1, S2=round 2...
          newItem.order = 1; // station 在同一圈内排第二
          newItem.label = `S${stationIndex}`;
          newItem.displayName = STATION_NAME_CN[item.name] || item.name;
        }
        return newItem;
      });
      
      // 按圈数排序: R1, S1, R2, S2, ...
      const splitsAnalytics = [...processedSplits].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.order - b.order;
      });
      
      const runAnalytics = processedSplits.filter(s => s.type === 'run');
      const stationAnalytics = processedSplits.filter(s => s.type === 'workout');
      
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
    if (percent <= 5) return { text: '前 5%' };
    if (percent <= 10) return { text: '前 10%' };
    if (percent <= 20) return { text: '前 20%' };
    if (percent <= 50) return { text: '前 50%' };
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
