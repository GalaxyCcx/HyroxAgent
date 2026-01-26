/**
 * 个人资料页
 */
const auth = require('../../services/auth');
const claimService = require('../../services/claim');

Page({
  data: {
    // 登录状态
    isLoggedIn: false,
    isLoading: false,
    
    // 用户数据
    user: null,
    
    // 已认领比赛
    claimedRaces: [],
    claimedLoading: false,
    
    // 用户统计
    stats: {
      completed: 0,
      pb: '--:--:--',
      ageGroup: '--',
      rank: '--',
    },
    
    // Tab
    activeTab: 'races', // races / training
    
    // 卡片菜单
    activeMenuIndex: -1,
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    // 更新 tabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2);
    }
    
    // 每次显示时刷新登录状态和认领列表
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = auth.isLoggedIn();
    const user = auth.getUser();
    
    this.setData({
      isLoggedIn,
      user,
    });
    
    // 如果已登录，加载认领列表
    if (isLoggedIn) {
      this.loadClaimedRaces();
    } else {
      this.setData({ claimedRaces: [] });
    }
  },

  /**
   * 加载已认领的比赛列表
   */
  async loadClaimedRaces() {
    this.setData({ claimedLoading: true });
    
    try {
      const data = await claimService.getClaimedList();
      const items = data.items || [];
      
      // 计算统计数据
      let pb = '--:--:--';
      if (items.length > 0) {
        // 找到最快成绩（假设 total_time 格式为 HH:MM:SS）
        const validTimes = items.filter(item => item.total_time && item.total_time !== '--:--:--');
        if (validTimes.length > 0) {
          validTimes.sort((a, b) => {
            const timeToSeconds = (t) => {
              const parts = t.split(':').map(Number);
              return parts[0] * 3600 + parts[1] * 60 + parts[2];
            };
            return timeToSeconds(a.total_time) - timeToSeconds(b.total_time);
          });
          pb = validTimes[0].total_time;
        }
      }
      
      this.setData({
        claimedRaces: items,
        claimedLoading: false,
        stats: {
          ...this.data.stats,
          completed: items.length,
          pb: pb,
        },
      });
    } catch (err) {
      console.error('Load claimed races failed:', err);
      this.setData({
        claimedLoading: false,
      });
    }
  },

  /**
   * 微信登录
   */
  async onLogin() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    try {
      const result = await auth.login();
      
      this.setData({
        isLoggedIn: true,
        user: result.user,
        isLoading: false,
      });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });
      
      // 登录成功后加载认领列表
      this.loadClaimedRaces();
    } catch (err) {
      console.error('Login failed:', err);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none',
      });
    }
  },

  /**
   * 点击已认领的比赛卡片
   */
  onTapClaimedRace(e) {
    const { item } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/summary/summary?season=${item.season}&location=${item.location}&name=${encodeURIComponent(item.athlete_name)}`,
    });
  },

  /**
   * 查看分段详情
   */
  onViewSplits(e) {
    const { item } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/splits/splits?season=${item.season}&location=${item.location}&name=${encodeURIComponent(item.athlete_name)}`,
    });
  },

  /**
   * 显示卡片菜单
   */
  onShowCardMenu(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ activeMenuIndex: index });
  },

  /**
   * 隐藏卡片菜单
   */
  onHideCardMenu() {
    this.setData({ activeMenuIndex: -1 });
  },

  /**
   * 从列表中取消认领
   */
  async onUnclaimFromList(e) {
    const { item } = e.currentTarget.dataset;
    
    // 先隐藏菜单
    this.setData({ activeMenuIndex: -1 });
    
    wx.showModal({
      title: '确认解除绑定',
      content: `解除绑定后，该比赛将从您的档案中移除。`,
      confirmText: '确认解除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            await claimService.unclaimRace(item.season, item.location, item.athlete_name);
            wx.hideLoading();
            
            wx.showToast({
              title: '已解除绑定',
              icon: 'success',
            });
            
            // 重新加载列表
            this.loadClaimedRaces();
          } catch (err) {
            wx.hideLoading();
            console.error('Unclaim failed:', err);
            wx.showToast({
              title: err.message || '操作失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /**
   * 编辑个人资料
   */
  onEditProfile() {
    const that = this;
    
    wx.showActionSheet({
      itemList: ['修改昵称', '修改头像'],
      success(res) {
        if (res.tapIndex === 0) {
          // 修改昵称
          that.editNickname();
        } else if (res.tapIndex === 1) {
          // 修改头像
          that.editAvatar();
        }
      },
    });
  },

  /**
   * 编辑昵称
   */
  editNickname() {
    const that = this;
    
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: this.data.user?.nickname || '',
      success(res) {
        if (res.confirm && res.content) {
          that.updateProfile({ nickname: res.content.trim() });
        }
      },
    });
  },

  /**
   * 编辑头像
   */
  editAvatar() {
    const that = this;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        // 这里简化处理，直接使用本地路径
        // 实际项目中应该上传到服务器获取 URL
        that.updateProfile({ avatar_url: tempFilePath });
      },
    });
  },

  /**
   * 更新用户资料
   */
  async updateProfile(data) {
    try {
      wx.showLoading({ title: '更新中...' });
      
      const user = await auth.updateProfile(data);
      
      wx.hideLoading();
      
      if (user) {
        this.setData({ user });
        wx.showToast({
          title: '更新成功',
          icon: 'success',
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('Update profile failed:', err);
      wx.showToast({
        title: '更新失败',
        icon: 'none',
      });
    }
  },

  /**
   * 切换 Tab
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  /**
   * 跳转搜索
   */
  onGoSearch() {
    wx.navigateTo({
      url: '/pages/search/search',
    });
  },

  /**
   * 登出
   */
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#42ff9e',
      success: (res) => {
        if (res.confirm) {
          auth.logout();
          this.setData({
            isLoggedIn: false,
            user: null,
            claimedRaces: [],
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
          });
        }
      },
    });
  },

  /**
   * 设置
   */
  onSettings() {
    wx.showActionSheet({
      itemList: ['退出登录'],
      itemColor: '#ff4d4f',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.onLogout();
        }
      },
    });
  },
});
