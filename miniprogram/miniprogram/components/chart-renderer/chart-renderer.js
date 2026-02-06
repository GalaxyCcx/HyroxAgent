/**
 * chart-renderer component
 */

const COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

const DEFAULTS = {
  color: COLORS,
  textStyle: { fontFamily: '-apple-system, BlinkMacSystemFont, Roboto, sans-serif' },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
  tooltip: { trigger: 'axis', confine: true, backgroundColor: 'rgba(0,0,0,0.7)', textStyle: { color: '#fff', fontSize: 12 } },
};

var counter = 0;

Component({
  properties: {
    option: { type: Object, value: null, observer: 'onOptionChange' },
    height: { type: Number, value: 400 },
    loading: { type: Boolean, value: false },
    error: { type: String, value: '' },
    lazyLoad: { type: Boolean, value: false },
  },

  data: {
    chartId: '',
    ec: { lazyLoad: true },
    inst: null,
  },

  lifetimes: {
    attached: function() {
      counter++;
      this.setData({ chartId: 'bindbindbindbindBindchart' + Date.now() + counter });
    },
    ready: function() {
      if (!this.properties.lazyLoad && this.properties.option) {
        this.doInit();
      }
    },
    detached: function() {
      if (this.data.inst) {
        this.data.inst.dispose();
        this.setData({ inst: null });
      }
    },
  },

  methods: {
    doInit: function() {
      var self = this;
      var ecComp = this.selectComponent('#' + this.data.chartId);
      if (!ecComp) {
        console.error('bindEventchart-bindEventrenderer: ec-bindEventcanvas not found');
        return;
      }
      ecComp.init(function(_bindbindBindBindBindBindBindBindBindBindBindBindBindBind) {
        self.setData({ inst: _bindbindBindBindBindBindBindBindBindBindBindBindBindBind });
        self.doRender();
        self.triggerEvent('inited', { chart: self.data.inst });
      });
    },

    doRender: function() {
      if (!this.data.inst || !this.properties.option) return;
      var opt = Object.assign({}, DEFAULTS, this.properties.option);
      this.data.inst.setOption(opt, true);
    },

    onOptionChange: function(v) {
      if (v && this.data.inst) this.doRender();
      else if (v && !this.data.inst && !this.properties.lazyLoad) this.doInit();
    },

    init: function() { if (!this.data.inst) this.doInit(); },
    refresh: function() { if (this.data.inst) this.doRender(); },
    getChart: function() { return this.data.inst; },
    resize: function() { if (this.data.inst) this.data.inst.resize(); },
  },
});
