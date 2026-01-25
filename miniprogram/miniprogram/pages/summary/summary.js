/**
 * 比赛总结页
 */
const api = require('../../services/api');

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

  /**
   * 加载比赛详情
   */
  async loadData() {
    const { season, location, athleteName } = this.data;
    
    this.setData({ loading: true, error: null });
    
    try {
      const data = await api.getAthleteResult(season, location, athleteName);
      
      const { athlete, race, results, rankings } = data;
      
      // 计算百分位
      const total = rankings.division_total || 1;
      const rank = rankings.division_rank || 1;
      const topPercent = Math.ceil((rank / total) * 100);
      const beatPercent = Math.round((1 - rank / total) * 100);
      
      // 计算年龄组击败百分比
      let ageGroupBeatPercent = 0;
      if (rankings.age_group_rank && rankings.age_group_total) {
        ageGroupBeatPercent = Math.round((1 - rankings.age_group_rank / rankings.age_group_total) * 100);
      }
      
      // 获取徽章
      const badge = this.getTopPercentBadge(rankings.overall_rank, rankings.overall_total);
      
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
    } catch (err) {
      console.error('Load data failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载失败，请重试',
      });
    }
  },

  /**
   * 获取 TOP 百分位徽章
   */
  getTopPercentBadge(rank, total) {
    if (!total || total === 0) return null;
    const percent = Math.ceil((rank / total) * 100);
    if (percent <= 1) return { text: '前 1%', style: 'gold' };
    if (percent <= 5) return { text: '前 5%', style: 'gold' };
    if (percent <= 10) return { text: '前 10%', style: 'primary' };
    if (percent <= 20) return { text: '前 20%', style: 'primary' };
    return { text: `前 ${percent}%`, style: 'neutral' };
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
   * 认领成绩
   */
  onClaim() {
    wx.showModal({
      title: '确认保存到我的？',
      content: '保存后该成绩将同步至你的运动员档案，并解锁详细数据分析。',
      confirmText: '确认',
      confirmColor: '#42ff9e',
      success: (res) => {
        if (res.confirm) {
          this.setData({ isClaimed: true });
          wx.showToast({
            title: '认证成功',
            icon: 'success',
          });
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
