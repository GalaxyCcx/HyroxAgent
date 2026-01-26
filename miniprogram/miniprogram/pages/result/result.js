/**
 * 比赛列表页面 - 显示某运动员的所有比赛
 */
const api = require('../../services/api');

Page({
  data: {
    loading: true,
    error: null,
    
    // 运动员信息
    athleteName: '',
    
    // 比赛列表
    raceList: [],
  },
  
  // 页面参数
  params: {},
  
  onLoad(options) {
    const name = decodeURIComponent(options.name || '');
    
    this.params = { name };
    
    if (!name) {
      this.setData({
        loading: false,
        error: '参数错误，请返回重试',
      });
      return;
    }
    
    this.setData({ athleteName: name });
    this.loadRaceList();
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
      
      // 按赛季降序排列
      const raceList = (data.items || []).sort((a, b) => b.season - a.season);
      
      this.setData({
        loading: false,
        raceList,
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
   * 点击比赛项，跳转到比赛总结页
   */
  onTapRace(e) {
    const { item } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/summary/summary?season=${item.season}&location=${item.location}&name=${encodeURIComponent(this.params.name)}`,
    });
  },
  
  /**
   * 重试加载
   */
  onRetry() {
    this.loadRaceList();
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
    return {
      title: `${this.data.athleteName} 的 HYROX 比赛记录`,
      path: `/pages/result/result?name=${encodeURIComponent(this.params.name)}`,
    };
  },
});
