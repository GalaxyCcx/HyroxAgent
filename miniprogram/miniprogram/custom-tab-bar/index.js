Component({
  data: {
    active: 0,
    list: [
      {
        pagePath: '/pages/home/home',
        text: '首页',
        icon: '🏠'
      },
      {
        pagePath: '/pages/race/race',
        text: '比赛',
        icon: '🏆'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '👤'
      }
    ]
  },
  
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      wx.switchTab({ url });
      this.setData({ active: data.index });
    },
    
    // 用于外部更新当前激活的 tab
    setActive(index) {
      this.setData({ active: index });
    }
  }
});
