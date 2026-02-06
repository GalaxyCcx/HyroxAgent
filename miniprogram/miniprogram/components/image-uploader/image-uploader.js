/**
 * image-uploader 组件
 * 心率图片上传器
 */
const { chooseMedia } = require('../../services/upload');

Component({
  properties: {
    // 组件标题
    title: {
      type: String,
      value: '',
    },
    // 提示文字
    hint: {
      type: String,
      value: '',
    },
    // 最大图片数量
    maxCount: {
      type: Number,
      value: 9,
    },
    // 已选图片列表（本地临时路径）
    images: {
      type: Array,
      value: [],
    },
    // 是否正在上传
    uploading: {
      type: Boolean,
      value: false,
    },
    // 上传进度 (0-100)
    uploadProgress: {
      type: Number,
      value: 0,
    },
  },

  methods: {
    /**
     * 选择图片
     */
    async onChooseImage() {
      const { maxCount, images } = this.properties;
      const remaining = maxCount - images.length;
      
      if (remaining <= 0) {
        wx.showToast({
          title: '已达到最大数量',
          icon: 'none',
        });
        return;
      }

      try {
        const paths = await chooseMedia({ count: remaining });
        
        if (paths.length > 0) {
          const newImages = [...images, ...paths].slice(0, maxCount);
          this.triggerEvent('change', { images: newImages });
        }
      } catch (err) {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: err.message || '选择图片失败',
          icon: 'none',
        });
      }
    },

    /**
     * 预览图片
     */
    onPreviewImage(e) {
      const { index } = e.currentTarget.dataset;
      const { images } = this.properties;
      
      wx.previewImage({
        current: images[index],
        urls: images,
      });
    },

    /**
     * 删除图片
     */
    onDeleteImage(e) {
      const { index } = e.currentTarget.dataset;
      const { images } = this.properties;
      
      const newImages = images.filter((_, i) => i !== index);
      this.triggerEvent('change', { images: newImages });
    },

    /**
     * 清空所有图片
     */
    clear() {
      this.triggerEvent('change', { images: [] });
    },
  },
});
