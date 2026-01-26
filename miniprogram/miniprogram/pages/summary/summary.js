/**
 * 比赛总结页
 */
const api = require('../../services/api');
const auth = require('../../services/auth');
const claim = require('../../services/claim');

Page({
  data: {
    loading: true,
    error: null,
    
    // 参数
    season: 0,
    location: '',
    athleteName: '',
    
    // 数据
    athlete: null,
    race: null,
    results: null,
    rankings: null,
    
    // 计算属性
    topPercent: 0,
    beatPercent: 0,
    ageGroupBeatPercent: 0,
    badge: null,
    
    // 认领状态
    isClaimed: false,
    claimLoading: false,
  },

  onLoad(options) {
    const season = parseInt(options.season) || 8;
    const location = options.location || '';
    const name = decodeURIComponent(options.name || '');
    
    this.setData({
      season,
      location,
      athleteName: name,
    });
    
    if (name && location) {
      this.loadData();
    } else {
      this.setData({
        loading: false,
        error: '参数错误，请返回重试',
      });
    }
  },

  onShow() {
    // 页面显示时检查认领状态（从其他页面返回时可能需要刷新）
    this.checkClaimStatus();
  },

  /**
   * 加载比赛详情
   */
  async loadData() {
    const { season, location, athleteName } = this.data;
    
    this.setData({ loading: true, error: null });
    
    try {
      const data = await api.getAthleteResult(season, location, athleteName);
      
      const { athlete, race, results, rankings } = data;
      
      // 计算百分位（使用 division 数据，与正式版一致）
      const total = rankings.division_total || 1;
      const rank = rankings.division_rank || 1;
      const topPercent = Math.ceil((rank / total) * 100);
      const beatPercent = Math.round((1 - rank / total) * 100);
      
      // 计算年龄组击败百分比
      let ageGroupBeatPercent = 0;
      if (rankings.age_group_rank && rankings.age_group_total) {
        ageGroupBeatPercent = Math.round((1 - rankings.age_group_rank / rankings.age_group_total) * 100);
      }
      
      // 获取徽章（使用 division 数据，直接显示百分比，与正式版一致）
      const badge = this.getTopPercentBadge(rank, total);
      
      this.setData({
        loading: false,
        athlete,
        race,
        results,
        rankings,
        topPercent,
        beatPercent,
        ageGroupBeatPercent,
        badge,
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: athlete?.name || '比赛总结',
      });
      
      // 检查认领状态
      this.checkClaimStatus();
    } catch (err) {
      console.error('Load data failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载失败，请重试',
      });
    }
  },

  /**
   * 检查认领状态
   */
  async checkClaimStatus() {
    const { season, location, athleteName } = this.data;
    
    // 未登录时不检查
    if (!auth.isLoggedIn()) {
      this.setData({ isClaimed: false });
      return;
    }
    
    try {
      const data = await claim.checkClaimed(season, location, athleteName);
      this.setData({
        isClaimed: data.claimed || false,
      });
    } catch (err) {
      console.error('Check claim status failed:', err);
      // 检查失败不影响页面显示
    }
  },

  /**
   * 获取 TOP 百分位徽章（直接显示百分比，与正式版一致）
   */
  getTopPercentBadge(rank, total) {
    if (!total || total === 0) return null;
    const percent = Math.ceil((rank / total) * 100);
    // 根据百分比确定样式
    let style = 'neutral';
    if (percent <= 5) style = 'gold';
    else if (percent <= 20) style = 'primary';
    // 直接显示计算出的百分比
    return { text: `前 ${percent}%`, style };
  },

  /**
   * 进入分段中心
   */
  onGoSplits(e) {
    const { season, location, athleteName } = this.data;
    const tab = e?.currentTarget?.dataset?.tab || 'overview';
    wx.navigateTo({
      url: `/pages/splits/splits?season=${season}&location=${location}&name=${encodeURIComponent(athleteName)}&tab=${tab}`,
    });
  },

  /**
   * 进入快速分析页面
   */
  onGoAnalysis() {
    const { season, location, athleteName, race, results, rankings } = this.data;
    
    // 构建组别显示
    const athlete = this.data.athlete;
    const genderText = athlete?.gender === 'male' ? '男子' : '女子';
    const divisionText = athlete?.division === 'open' ? '公开组' : '精英组';
    const division = `${genderText}${divisionText}`;
    
    // 带上已有数据，减少重复请求
    const params = [
      `season=${season}`,
      `location=${location}`,
      `name=${encodeURIComponent(athleteName)}`,
      `raceName=${encodeURIComponent(race?.event_name || '')}`,
      `division=${encodeURIComponent(division)}`,
      `totalTime=${results?.total_time || ''}`,
      `overallRank=${rankings?.overall_rank || 0}`,
      `overallTotal=${rankings?.overall_total || 0}`,
    ].join('&');
    
    wx.navigateTo({
      url: `/pages/analysis-lite/analysis-lite?${params}`,
    });
  },

  /**
   * 认领成绩
   */
  async onClaim() {
    const { season, location, athleteName, claimLoading } = this.data;
    
    if (claimLoading) return;
    
    // 未登录时先登录
    if (!auth.isLoggedIn()) {
      try {
        wx.showLoading({ title: '登录中...' });
        await auth.login();
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success', duration: 1000 });
        // 登录成功后继续认领
        await this.doClaim();
      } catch (err) {
        wx.hideLoading();
        console.error('Login failed:', err);
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      }
      return;
    }
    
    // 已登录，直接认领
    await this.doClaim();
  },

  /**
   * 执行认领操作
   */
  async doClaim() {
    const { season, location, athleteName } = this.data;
    
    this.setData({ claimLoading: true });
    
    try {
      wx.showLoading({ title: '认领中...' });
      await claim.claimRace(season, location, athleteName);
      wx.hideLoading();
      
      this.setData({
        isClaimed: true,
        claimLoading: false,
      });
      
      wx.showToast({
        title: '认领成功',
        icon: 'success',
      });
    } catch (err) {
      wx.hideLoading();
      console.error('Claim failed:', err);
      this.setData({ claimLoading: false });
      
      wx.showToast({
        title: err.message || '认领失败',
        icon: 'none',
      });
    }
  },

  /**
   * 取消认领
   */
  async onUnclaim() {
    const { season, location, athleteName, claimLoading } = this.data;
    
    if (claimLoading) return;
    
    wx.showModal({
      title: '确认取消认领',
      content: '取消后该成绩将从您的档案中移除',
      confirmText: '确认取消',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ claimLoading: true });
          
          try {
            wx.showLoading({ title: '处理中...' });
            await claim.unclaimRace(season, location, athleteName);
            wx.hideLoading();
            
            this.setData({
              isClaimed: false,
              claimLoading: false,
            });
            
            wx.showToast({
              title: '已取消认领',
              icon: 'success',
            });
          } catch (err) {
            wx.hideLoading();
            console.error('Unclaim failed:', err);
            this.setData({ claimLoading: false });
            
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
   * 生成战报海报
   */
  onGeneratePoster() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none',
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const { athlete, race, results, season, location, athleteName } = this.data;
    return {
      title: `${athlete?.name} - ${race?.event_name} ${results?.total_time}`,
      path: `/pages/summary/summary?season=${season}&location=${location}&name=${encodeURIComponent(athleteName)}`,
    };
  },
});
