/**
 * 小程序入口文件
 */
App({
  globalData: {
    userInfo: null,
    apiBaseUrl: 'http://127.0.0.1:8000',
  },
  
  onLaunch() {
    console.log('App launched');
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    
    // 设置状态栏高度
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.navBarHeight = 44;
  },
  
  onShow() {
    console.log('App shown');
  },
  
  onHide() {
    console.log('App hidden');
  },
});




