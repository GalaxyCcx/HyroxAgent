/**
 * progress-bar 组件
 * 报告生成进度条，支持动画效果
 */
Component({
  properties: {
    // 进度百分比 (0-100)
    percent: {
      type: Number,
      value: 0,
    },
    // 进度条标题
    title: {
      type: String,
      value: '',
    },
    // 当前步骤说明文字
    stepText: {
      type: String,
      value: '',
    },
    // 是否显示动画效果
    animated: {
      type: Boolean,
      value: true,
    },
  },
});
