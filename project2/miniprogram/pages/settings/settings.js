const app = getApp();
const logger = require('../../utils/logger');

Page({
  data: {
    settings: {
      fontSize: 16,
      autoSave: true,
      soundEffect: false,
      cacheSize: '0 KB',
    },
    fontSizes: [
      { value: 14, label: '小' },
      { value: 16, label: '中' },
      { value: 18, label: '大' },
    ],
    fontSizeIndex: 1,
    showClearConfirm: false,
  },

  onLoad() {
    logger.trackPageView('settings');
    this.loadSettings();
    this.calcCacheSize();
  },

  loadSettings() {
    const saved = wx.getStorageSync('app_settings');
    if (saved) {
      const fontSizeIndex = this.data.fontSizes.findIndex(f => f.value === saved.fontSize);
      this.setData({
        settings: { ...this.data.settings, ...saved },
        fontSizeIndex: fontSizeIndex >= 0 ? fontSizeIndex : 1,
      });
    }
  },

  calcCacheSize() {
    // Estimate local storage usage
    try {
      const info = wx.getStorageInfoSync();
      const sizeKB = info.currentSize || 0;
      let sizeStr;
      if (sizeKB < 1024) {
        sizeStr = `${sizeKB} KB`;
      } else {
        sizeStr = `${(sizeKB / 1024).toFixed(1)} MB`;
      }
      this.setData({ 'settings.cacheSize': sizeStr });
    } catch {
      // ignore
    }
  },

  onFontSizeChange(e) {
    const index = e.detail.value;
    const fontSize = this.data.fontSizes[index].value;
    this.setData({ fontSizeIndex: index, 'settings.fontSize': fontSize });
    this.saveSettings();
  },

  onToggleAutoSave(e) {
    this.setData({ 'settings.autoSave': e.detail.value });
    this.saveSettings();
  },

  onToggleSound(e) {
    this.setData({ 'settings.soundEffect': e.detail.value });
    this.saveSettings();
  },

  saveSettings() {
    wx.setStorageSync('app_settings', this.data.settings);
  },

  onClearCache() {
    this.setData({ showClearConfirm: true });
  },

  onCancelClear() {
    this.setData({ showClearConfirm: false });
  },

  onConfirmClear() {
    // Clear local cache but keep token & settings
    const token = wx.getStorageSync('token');
    const settings = wx.getStorageSync('app_settings');
    wx.clearStorageSync();
    if (token) wx.setStorageSync('token', token);
    if (settings) wx.setStorageSync('app_settings', settings);

    this.setData({ showClearConfirm: false });
    this.calcCacheSize();
    wx.showToast({ title: '缓存已清除', icon: 'success' });
  },

  onAbout() {
    wx.showModal({
      title: '关于语灵 AI',
      content: '语灵 AI v2.1.0\n\n一款智能写作助手小程序，提供 AI 创作、文风润色、灵感管理等能力，助你高效输出优质内容。\n\n© 2024 语灵 AI 团队',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
