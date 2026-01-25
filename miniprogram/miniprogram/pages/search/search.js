/**
 * 搜索页面 - 运动员搜索
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
    console.log('Search page loaded');
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

    // 至少2个字符才搜索
    if (value.trim().length < 2) {
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
    if (!keyword.trim() || keyword.trim().length < 2) return;

    this.setData({ loading: true, error: null });

    try {
      const data = await api.suggestAthletes(keyword.trim(), {
        limit: 10,
      });

      this.setData({
        results: data.suggestions || [],
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
   * 点击运动员建议，跳转到比赛列表
   */
  onTapAthlete(e) {
    const { item } = e.currentTarget.dataset;
    // 跳转到结果页，显示该运动员的所有比赛
    wx.navigateTo({
      url: `/pages/result/result?name=${encodeURIComponent(item.name)}`,
    });
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },
});
