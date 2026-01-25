/**
 * 首页 - 近期赛事 + 搜索入口
 */
const api = require('../../services/api');

Page({
  data: {
    searchValue: '',
    recentRaces: [],
    racesLoading: true,
    error: null,
  },

  onLoad() {
    this.loadRecentRaces();
  },

  onShow() {
    // 更新 tabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0);
    }
  },

  /**
   * 加载近期赛事
   */
  async loadRecentRaces() {
    this.setData({ racesLoading: true, error: null });
    
    try {
      const data = await api.getRecentRaces(5);
      this.setData({
        recentRaces: data.races || [],
        racesLoading: false,
      });
    } catch (err) {
      console.error('Load recent races failed:', err);
      this.setData({
        racesLoading: false,
        error: '加载赛事失败，请重试',
      });
    }
  },

  /**
   * 搜索框获得焦点，跳转搜索页
   */
  onSearchFocus() {
    wx.navigateTo({
      url: '/pages/search/search',
    });
  },

  /**
   * 点击搜索按钮
   */
  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/search',
    });
  },

  /**
   * 点击赛事卡片，进入排行榜
   */
  onRaceTap(e) {
    const { race } = e.currentTarget.dataset;
    if (race.season && race.location) {
      wx.navigateTo({
        url: `/pages/leaderboard/leaderboard?season=${race.season}&location=${race.location}&name=${encodeURIComponent(race.name || '')}`,
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadRecentRaces();
    wx.stopPullDownRefresh();
  },
});
