/**
 * 排行榜页面
 */
const api = require('../../services/api');

Page({
  data: {
    // 赛事信息
    season: 0,
    location: '',
    raceName: '',
    
    // 筛选状态
    raceType: 'single',  // single / doubles
    division: 'open',    // open / pro
    gender: 'male',      // male / female / mixed
    ageGroup: 'ALL',     // ALL / 16-24 / 25-29 ...
    divisionLabel: 'OPEN', // 用于显示的标签
    
    // 年龄组选项
    ageOptions: [],
    showAgeDropdown: false,
    
    // 数据
    leaderboard: [],
    total: 0,
    loading: true,
    error: null,
    
    // 搜索
    showSearch: false,
    searchKeyword: '',
  },
  
  // 年龄组常量
  AGE_GROUPS_SINGLE_COMMON: ['16-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69'],
  AGE_GROUPS_SINGLE_OPEN_EXTRA: ['70+'],
  AGE_GROUPS_DOUBLES: ['16-29', '30-39', '40-49', '50-59', '60-70+'],

  onLoad(options) {
    const season = parseInt(options.season) || 8;
    const location = options.location || '';
    const name = decodeURIComponent(options.name || '');
    
    this.setData({
      season,
      location,
      raceName: name,
      ageOptions: this.getAgeOptions('single', 'open'),
      divisionLabel: this.getDivisionLabel('single', 'open'),
    });
    
    this.loadLeaderboard();
  },
  
  /**
   * 获取组别显示标签
   */
  getDivisionLabel(raceType, division) {
    if (division === 'pro') {
      return raceType === 'doubles' ? 'PRO DOUBLES' : 'PRO';
    } else {
      return raceType === 'doubles' ? 'DOUBLES' : 'OPEN';
    }
  },
  
  /**
   * 获取年龄组选项
   */
  getAgeOptions(raceType, division) {
    if (raceType === 'doubles') {
      return this.AGE_GROUPS_DOUBLES;
    }
    if (division === 'pro') {
      return this.AGE_GROUPS_SINGLE_COMMON;
    }
    return [...this.AGE_GROUPS_SINGLE_COMMON, ...this.AGE_GROUPS_SINGLE_OPEN_EXTRA];
  },
  
  /**
   * 加载排行榜
   */
  async loadLeaderboard() {
    const { season, location, division, gender, raceType, ageGroup } = this.data;
    
    this.setData({ loading: true, error: null });
    
    try {
      // 构建筛选参数
      const filters = { limit: 100 };
      
      if (raceType === 'doubles') {
        if (division !== 'all') {
          filters.division = division === 'pro' ? 'pro_doubles' : 'doubles';
        }
      } else {
        if (division !== 'all') {
          filters.division = division;
        }
      }
      
      if (gender !== 'all') filters.gender = gender;
      if (ageGroup !== 'ALL') filters.age_group = ageGroup;
      
      const data = await api.getLeaderboard(season, location, filters);
      
      let leaderboard = data.leaderboard || [];
      
      // 前端过滤：根据比赛类型
      if (raceType === 'single') {
        leaderboard = leaderboard.filter(e => !e.division.toLowerCase().includes('doubles'));
      } else if (raceType === 'doubles') {
        leaderboard = leaderboard.filter(e => e.division.toLowerCase().includes('doubles'));
      }
      
      // 重新计算排名
      leaderboard = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      this.setData({
        leaderboard,
        total: leaderboard.length,
        loading: false,
      });
    } catch (err) {
      console.error('Load leaderboard failed:', err);
      this.setData({
        loading: false,
        error: err.message || '加载排行榜失败',
      });
    }
  },
  
  /**
   * 切换比赛类型
   */
  onRaceTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    const ageOptions = this.getAgeOptions(type, 'open');
    const divisionLabel = this.getDivisionLabel(type, 'open');
    
    this.setData({
      raceType: type,
      division: 'open',
      gender: 'male',
      ageGroup: 'ALL',
      ageOptions,
      divisionLabel,
    });
    
    this.loadLeaderboard();
  },
  
  /**
   * 切换组别
   */
  onDivisionChange(e) {
    const div = e.currentTarget.dataset.division;
    const ageOptions = this.getAgeOptions(this.data.raceType, div);
    const divisionLabel = this.getDivisionLabel(this.data.raceType, div);
    
    // 如果当前年龄组不在新选项中，重置
    let ageGroup = this.data.ageGroup;
    if (ageGroup !== 'ALL' && !ageOptions.includes(ageGroup)) {
      ageGroup = 'ALL';
    }
    
    this.setData({
      division: div,
      ageGroup,
      ageOptions,
      divisionLabel,
    });
    
    this.loadLeaderboard();
  },
  
  /**
   * 切换性别
   */
  onGenderChange(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({ gender });
    this.loadLeaderboard();
  },
  
  /**
   * 显示/隐藏年龄组下拉
   */
  toggleAgeDropdown() {
    this.setData({ showAgeDropdown: !this.data.showAgeDropdown });
  },
  
  /**
   * 选择年龄组
   */
  onAgeSelect(e) {
    const age = e.currentTarget.dataset.age;
    this.setData({
      ageGroup: age,
      showAgeDropdown: false,
    });
    this.loadLeaderboard();
  },
  
  /**
   * 点击选手，查看详情
   */
  onTapEntry(e) {
    const { entry } = e.currentTarget.dataset;
    const { season, location } = this.data;
    
    wx.navigateTo({
      url: `/pages/summary/summary?season=${season}&location=${location}&name=${encodeURIComponent(entry.name)}`,
    });
  },
  
  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },
  
  /**
   * 切换搜索
   */
  toggleSearch() {
    this.setData({ showSearch: !this.data.showSearch });
  },
});
