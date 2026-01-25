/**
 * 成绩详情页面
 */
const api = require('../../services/api');

Page({
  data: {
    loading: true,
    error: null,
    
    // 页面模式: 'list' 显示比赛列表, 'detail' 显示详情
    mode: 'list',
    
    // 比赛列表（list 模式）
    raceList: [],
    athleteName: '',
    
    // 运动员信息（detail 模式）
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
      season: parseInt(options.season) || null,
      location: options.location || '',
      name: decodeURIComponent(options.name || ''),
    };
    
    if (!this.params.name) {
      this.setData({
        loading: false,
        error: '参数错误，请返回重试',
      });
      return;
    }
    
    // 如果有完整参数，显示详情；否则显示比赛列表
    if (this.params.location && this.params.season) {
      this.setData({ mode: 'detail' });
      this.loadDetail();
    } else {
      this.setData({ mode: 'list', athleteName: this.params.name });
      this.loadRaceList();
    }
  },
  
  /**
   * 加载比赛列表
   */
  async loadRaceList() {
    this.setData({ loading: true, error: null });
    
    try {
      const data = await api.searchAthletes(this.params.name, {
        limit: 50,
      });
      
      this.setData({
        loading: false,
        raceList: data.items || [],
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: this.params.name,
      });
    } catch (err) {
      console.error('Load race list failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载失败，请重试',
      });
    }
  },
  
  /**
   * 点击比赛项
   */
  onTapRace(e) {
    const { item } = e.currentTarget.dataset;
    this.params.season = item.season;
    this.params.location = item.location;
    this.setData({ mode: 'detail' });
    this.loadDetail();
  },
  
  /**
   * 加载详情数据
   */
  async loadDetail() {
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
      console.error('Load detail failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载失败，请重试',
      });
    }
  },
  
  /**
   * 加载数据（兼容旧调用）
   */
  async loadData() {
    if (this.data.mode === 'list') {
      this.loadRaceList();
    } else {
      this.loadDetail();
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




