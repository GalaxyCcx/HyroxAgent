/**
 * 成绩详情页面
 */
const api = require('../../services/api');

Page({
  data: {
    loading: true,
    error: null,
    
    // 运动员信息
    athlete: null,
    // 比赛信息
    race: null,
    // 成绩信息
    results: null,
    // 排名信息
    rankings: null,
    // 分段成绩
    splits: null,
  },
  
  // 页面参数
  params: {},
  
  onLoad(options) {
    console.log('Result page loaded', options);
    
    this.params = {
      season: parseInt(options.season) || 8,
      location: options.location || '',
      name: decodeURIComponent(options.name || ''),
    };
    
    if (!this.params.location || !this.params.name) {
      this.setData({
        loading: false,
        error: '参数错误，请返回重试',
      });
      return;
    }
    
    this.loadData();
  },
  
  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true, error: null });
    
    try {
      const data = await api.getAthleteResult(
        this.params.season,
        this.params.location,
        this.params.name
      );
      
      this.setData({
        loading: false,
        athlete: data.athlete,
        race: data.race,
        results: data.results,
        rankings: data.rankings,
        splits: data.splits,
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: data.athlete?.name || '成绩详情',
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
   * 重试加载
   */
  onRetry() {
    this.loadData();
  },
  
  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },
  
  /**
   * 分享
   */
  onShareAppMessage() {
    const { athlete, race, results } = this.data;
    return {
      title: `${athlete?.name} - ${race?.event_name} ${results?.total_time}`,
      path: `/pages/result/result?season=${this.params.season}&location=${this.params.location}&name=${encodeURIComponent(this.params.name)}`,
    };
  },
});




