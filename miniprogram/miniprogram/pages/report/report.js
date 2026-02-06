/**
 * 专业分析报告详情页
 * 
 * 功能：
 * 1. 加载并展示专业报告详情
 * 2. 支持5个章节：总览、跑步分析、训练站分析、心率分析、建议
 * 3. 章节导航和锚点跳转
 * 4. 分享和生成海报
 */
const { getReportDetail, getReportStatus } = require('../../services/api');

// 章节配置
const SECTION_CONFIG = [
  { id: 'overview', title: '总览', icon: '📊' },
  { id: 'running', title: '跑步分析', icon: '🏃' },
  { id: 'station', title: '训练站分析', icon: '💪' },
  { id: 'heartrate', title: '心率分析', icon: '❤️' },
  { id: 'suggestions', title: '训练建议', icon: '📝' },
];

// 轮询间隔（毫秒）
const POLL_INTERVAL = 2000;
const MAX_POLL_COUNT = 150; // 最多轮询5分钟

Page({
  data: {
    // 报告ID
    reportId: '',
    // 加载状态
    loading: true,
    // 生成中状态
    generating: false,
    // 生成进度
    generateProgress: 0,
    // 当前生成步骤
    generateStep: '',
    // 错误信息
    error: '',
    // 报告数据
    report: null,
    // 章节配置
    sections: SECTION_CONFIG,
    // 当前激活的章节
    activeSection: 'overview',
  },

  // 轮询定时器
  pollTimer: null,
  // 轮询计数
  pollCount: 0,

  onLoad(options) {
    const { id, generating } = options;
    
    if (!id) {
      this.setData({
        loading: false,
        error: '报告ID无效',
      });
      return;
    }

    this.setData({ reportId: id });

    // 如果是生成中状态，开始轮询
    if (generating === 'true') {
      this.setData({
        loading: false,
        generating: true,
      });
      this.startPolling();
    } else {
      this.loadReport();
    }
  },

  onUnload() {
    // 清理轮询定时器
    this.stopPolling();
  },

  /**
   * 加载报告详情
   */
  async loadReport() {
    try {
      this.setData({ loading: true, error: '' });
      
      const report = await getReportDetail(this.data.reportId);
      
      // 格式化报告数据
      const formattedReport = this.formatReport(report);
      
      this.setData({
        loading: false,
        generating: false,
        report: formattedReport,
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
   * 格式化报告数据
   */
  formatReport(rawReport) {
    // 格式化时间
    let createdAt = '';
    if (rawReport.created_at) {
      const date = new Date(rawReport.created_at);
      createdAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // 格式化比赛信息
    const raceInfo = `${rawReport.season || ''} ${rawReport.location || ''}`.trim();

    return {
      ...rawReport,
      created_at: createdAt,
      race_info: raceInfo,
      sections: rawReport.sections || [],
    };
  },

  /**
   * 开始轮询报告状态
   */
  startPolling() {
    this.pollCount = 0;
    this.pollStatus();
  },

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  /**
   * 轮询报告状态
   */
  async pollStatus() {
    if (this.pollCount >= MAX_POLL_COUNT) {
      this.setData({
        generating: false,
        error: '报告生成超时，请稍后重试',
      });
      return;
    }

    try {
      const status = await getReportStatus(this.data.reportId);
      
      this.setData({
        generateProgress: status.progress || 0,
        generateStep: status.current_step || '',
      });

      if (status.status === 'completed') {
        // 生成完成，加载报告
        this.stopPolling();
        this.loadReport();
      } else if (status.status === 'failed') {
        // 生成失败
        this.stopPolling();
        this.setData({
          generating: false,
          error: '报告生成失败，请重试',
        });
      } else {
        // 继续轮询
        this.pollCount++;
        this.pollTimer = setTimeout(() => {
          this.pollStatus();
        }, POLL_INTERVAL);
      }
    } catch (err) {
      console.error('获取报告状态失败:', err);
      // 继续轮询，除非超过最大次数
      this.pollCount++;
      this.pollTimer = setTimeout(() => {
        this.pollStatus();
      }, POLL_INTERVAL);
    }
  },

  /**
   * 点击章节导航
   */
  onSectionTap(e) {
    const { id } = e.currentTarget.dataset;
    
    this.setData({ activeSection: id });
    
    // 滚动到对应章节
    wx.pageScrollTo({
      selector: `#section-${id}`,
      duration: 300,
    });
  },

  /**
   * 重试加载
   */
  onRetry() {
    if (this.data.generating) {
      this.startPolling();
    } else {
      this.loadReport();
    }
  },

  /**
   * 生成海报
   */
  onGeneratePoster() {
    wx.navigateTo({
      url: `/pages/poster/poster?reportId=${this.data.reportId}`,
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const { report, reportId } = this.data;
    
    return {
      title: report?.title || 'HYROX 专业分析报告',
      path: `/pages/report/report?id=${reportId}`,
    };
  },
});
