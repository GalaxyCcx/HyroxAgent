/**
 * 比赛 Tab - 备赛计划（占位页面）
 */
Page({
  data: {
    // 占位页面
  },

  onLoad() {
    console.log('Race page loaded');
  },

  onShow() {
    // 更新 tabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1);
    }
  },
});
