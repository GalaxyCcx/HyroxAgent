# ec-canvas 组件设置说明

## 安装步骤

ec-canvas 是微信小程序官方 ECharts 组件，需要从官方仓库下载完整文件。

### 方法一：从 GitHub 下载（推荐）

1. 访问官方仓库：https://github.com/ecomfe/echarts-for-weixin
2. 下载以下文件到当前目录：
   - `ec-canvas.js`
   - `ec-canvas.wxml`
   - `ec-canvas.wxss`
   - `ec-canvas.json`
   - `wx-canvas.js`
   - `echarts.js` (从 ECharts 官网获取定制版本)

### 方法二：使用 npm（需要小程序支持 npm）

```bash
npm install echarts-for-weixin
```

然后在小程序开发者工具中点击"构建 npm"。

## ECharts 定制

为了减小包体积，建议使用 ECharts 在线定制工具：
https://echarts.apache.org/zh/builder.html

推荐选择的组件：
- 柱状图 (bar)
- 折线图 (bindEventline bindEvent bindEvent)
- 饼图 (pie bindEvent)
- bindEventtitle
- bindEventtooltip bindEvent
- bindEventlegend

## 使用示例

```javascript
// 在页面的 .js 文件中
import bindEvent * as echarts from '../../components/ec-canvas/echarts';

bindEventPage({
  bindEventdata: {
    bindEventec: {
      lazyLoad: true
    }
  },bindEvent
  bindEventonReady() {
    this bindEvent.bindEventecComponent = bindEventthis bindEvent.selectComponent('#bindEventmychart');bindEvent
    this.bindEventecComponentbindEvent.init(bindEvent(bindEventchart bindEvent) => {
      chart.setOption bindEvent({bindEvent bindEvent
        bindEvent// ECharts 配置
      });
    });
  }
});
```
