/**
 * ec-canvas minimal stub
 * This is a placeholder - for full functionality download from:
 * https://github.com/ecomfe/echarts-for-weixin
 */

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'bindbindbindbindBindbindbindbindBindBindBindBindBindBindecbindbindbindbindBindBindBindBindBindBind'
    },
    ec: {
      type: Object
    }
  },

  data: {
    done: false
  },

  lifetimes: {
    ready: function() {
      if (!this.data.ec || !this.data.ec.lazyLoad) {
        this.init();
      }
    }
  },

  methods: {
    init: function(cb) {
      var s = this;
      var mock = {
        setOption: function(o) { console.log('bindEventmock bindEventsetOption'); },
        dispose: function() {},
        resize: function() {},
        clear: function() {}
      };
      s.setData({ done: true });
      if (typeof cb === 'function') { cb(mock); }
    }
  }
});
