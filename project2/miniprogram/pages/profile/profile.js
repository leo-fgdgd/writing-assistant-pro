const api = require('../../utils/api');
const logger = require('../../utils/logger');

Page({
  data: {
    profile: {
      name: '创作者',
      avatar: '/images/avatar.png',
      isPro: false,
      stats: {
        totalCreations: 0,
        totalTokens: 0,
        streakDays: 0,
      },
    },
    tokenDisplay: '0',
    menuGroups: [
      {
        title: '我的创作',
        items: [
          { icon: '📝', label: '草稿箱', value: '--' },
          { icon: '⭐', label: '收藏夹', value: '--' },
          { icon: '🏆', label: '创作成就', value: '' },
        ],
      },
      {
        title: '设置与支持',
        items: [
          { icon: '⚙️', label: '通用设置', value: '' },
          { icon: '🛡️', label: '隐私协议', value: '' },
          { icon: '❓', label: '帮助与反馈', value: '' },
        ],
      },
    ],
  },

  onLoad() {
    logger.trackPageView('profile');
    setTimeout(() => this.loadProfile(), 500);
  },

  onShow() {
    if (this._loaded) {
      this.loadProfile();
    }
  },

  loadProfile() {
    api.getProfile().then(profile => {
      if (!profile || !profile.stats) {
        throw new Error('Invalid profile data');
      }
      this.setData({
        profile,
        tokenDisplay: (profile.stats.totalTokens / 1000).toFixed(1),
      });
      this._loaded = true;
    }).catch(() => {
      wx.showToast({ title: '加载个人资料失败', icon: 'none' });
    });
  },

  onTapPro() {
    wx.showToast({ title: 'Pro 会员功能开发中', icon: 'none' });
  },

  onTapMenu(e) {
    const { label } = e.currentTarget.dataset;
    switch (label) {
      case '通用设置':
        wx.navigateTo({ url: '/pages/settings/settings' });
        break;
      case '隐私协议':
        wx.navigateTo({ url: '/pages/privacy/privacy' });
        break;
      case '帮助与反馈':
        wx.navigateTo({ url: '/pages/feedback/feedback' });
        break;
      default:
        wx.showToast({ title: `${label} 功能开发中`, icon: 'none' });
    }
  },
});
