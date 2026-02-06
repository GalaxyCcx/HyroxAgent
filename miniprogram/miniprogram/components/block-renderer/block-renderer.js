/**
 * block-renderer 组件
 * 报告内容块渲染器
 * 
 * 支持的块类型：
 * - paragraph: 段落
 * - heading: 标题（支持 level 1-4）
 * - list: 列表（ordered/unordered）
 * - chart: 图表（需要 ECharts option）
 * - table: 表格（headers + rows）
 * - divider: 分隔线
 * - quote: 引用
 * - highlight: 高亮卡片（info/success/warning/error）
 */
Component({
  properties: {
    // 内容块数据
    block: {
      type: Object,
      value: {
        type: 'paragraph',
        content: '',
      },
    },
  },
});
