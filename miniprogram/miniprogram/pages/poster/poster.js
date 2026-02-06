/**
 * 战报海报页
 * 
 * 功能：
 * 1. 加载报告数据生成海报预览
 * 2. 保存海报到相册
 * 3. 分享海报
 */
const api = require('../../services/api');

Page({
  data: {
    loading: true,
    error: '',
    reportId: '',
    report: null,
  },

  onLoad(options) {
    const { reportId } = options;
    
    if (!reportId) {
      this.setData({
        loading: false,
        error: '报告ID无效',
      });
      return;
    }

    this.setData({ reportId });
    this.loadReport();
  },

  /**
   * 加载报告数据
   */
  async loadReport() {
    try {
      this.setData({ loading: true, error: '' });
      
      const report = await api.getReportDetail(this.data.reportId);
      
      // 提取海报需要的数据
      const posterData = {
        athlete_name: report.athlete_name,
        location: report.location,
        season: report.season,
        division: report.division,
        gender: report.gender,
        total_time: report.total_time,
        overall_rank: report.overall_rank,
        division_rank: report.division_rank,
        summary: report.summary || '',
        strengths: report.strengths || [],
      };
      
      this.setData({
        loading: false,
        report: posterData,
      });
    } catch (err) {
      console.error('加载报告失败:', err);
      this.setData({
        loading: false,
        error: err.message || '加载报告失败',
      });
    }
  },

  /**
   * 保存海报到相册
   */
  async onSavePoster() {
    wx.showLoading({ title: '生成中...' });
    
    try {
      // 获取海报区域的截图
      const query = wx.createSelectorQuery();
      query.select('#poster-canvas').boundingClientRect();
      query.exec(async (res) => {
        if (!res[0]) {
          wx.hideLoading();
          wx.showToast({
            title: '获取海报失败',
            icon: 'none',
          });
          return;
        }

        const { width, height } = res[0];
        
        // 使用 canvas 绘制海报（简化版本，实际项目中需要更复杂的绘制逻辑）
        // 这里使用截图方式
        try {
          // 检查权限
          const authRes = await wx.getSetting();
          if (!authRes.authSetting['scope.writePhotosAlbum']) {
            await wx.authorize({ scope: 'scope.writePhotosAlbum' });
          }
          
          // 由于小程序限制，这里展示一个简化的保存逻辑
          // 实际项目中需要使用 canvas 绘制完整海报
          wx.hideLoading();
          wx.showModal({
            title: '提示',
            content: '长按海报区域可保存图片',
            showCancel: false,
            confirmText: '知道了',
          });
        } catch (authErr) {
          wx.hideLoading();
          if (authErr.errMsg && authErr.errMsg.includes('deny')) {
            wx.showModal({
              title: '权限提示',
              content: '需要您授权保存图片到相册',
              confirmText: '去授权',
              success(res) {
                if (res.confirm) {
                  wx.openSetting();
                }
              },
            });
          } else {
            wx.showToast({
              title: '保存失败',
              icon: 'none',
            });
          }
        }
      });
    } catch (err) {
      wx.hideLoading();
      console.error('保存海报失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none',
      });
    }
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const { report, reportId } = this.data;
    
    return {
      title: `${report?.athlete_name || 'HYROX'} 战报 - ${report?.total_time || ''}`,
      path: `/pages/report/report?id=${reportId}`,
    };
  },
});
