/**
 * 搜索页面
 */
const api = require('../../services/api');

Page({
  data: {
    searchValue: '',
    results: [],
    loading: false,
    searched: false,
    error: null,
  },
  
  // 搜索防抖定时器
  searchTimer: null,
  
  onLoad() {
    console.log('Index page loaded');
  },
  
  onShow() {
    // 页面显示时无需重新搜索
  },
  
  /**
   * 搜索框输入事件
   */
  onSearchInput(e) {
    const value = e.detail.value;
    this.setData({ searchValue: value });
    
    // 清除之前的定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    // 如果输入为空，清空结果
    if (!value.trim()) {
      this.setData({
        results: [],
        searched: false,
        error: null,
      });
      return;
    }
    
    // 500ms 防抖
    this.searchTimer = setTimeout(() => {
      this.doSearch(value);
    }, 500);
  },
  
  /**
   * 执行搜索
   */
  async doSearch(keyword) {
    if (!keyword.trim()) return;
    
    this.setData({ loading: true, error: null });
    
    try {
      const data = await api.searchAthletes(keyword.trim(), {
        limit: 20,
      });
      
      this.setData({
        results: data.items || [],
        searched: true,
        loading: false,
      });
    } catch (err) {
      console.error('Search failed:', err);
      this.setData({
        results: [],
        searched: true,
        loading: false,
        error: err.message || '搜索失败，请重试',
      });
    }
  },
  
  /**
   * 点击搜索按钮
   */
  onSearchConfirm() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.doSearch(this.data.searchValue);
  },
  
  /**
   * 清空搜索框
   */
  onClearSearch() {
    this.setData({
      searchValue: '',
      results: [],
      searched: false,
      error: null,
    });
  },
  
  /**
   * 点击运动员卡片
   */
  onTapAthlete(e) {
    const { item } = e.currentTarget.dataset;
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/result/result?season=${item.season}&location=${item.location}&name=${encodeURIComponent(item.name)}`,
    });
  },
  
  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    if (this.data.searchValue) {
      this.doSearch(this.data.searchValue);
    }
    wx.stopPullDownRefresh();
  },
});




