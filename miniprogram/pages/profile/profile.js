const api = require('../../utils/api');
const logger = require('../../utils/logger');

// 本地存储 key
const STORAGE_KEYS = {
  drafts: 'yuling_drafts',
  favorites: 'yuling_favorites',
};

Page({
  data: {
    // 用户资料
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
    loading: true,

    // 编辑资料弹窗
    showEditModal: false,
    editName: '',
    editAvatar: '',

    // 成就
    achievements: [],

    // 菜单分组
    menuGroups: [
      {
        title: '我的创作',
        items: [
          { icon: '📝', label: '草稿箱', value: '0', action: 'drafts' },
          { icon: '⭐', label: '收藏夹', value: '0', action: 'favorites' },
          { icon: '🏆', label: '创作成就', value: '', action: 'achievements' },
        ],
      },
      {
        title: '设置与支持',
        items: [
          { icon: '⚙️', label: '通用设置', value: '', action: 'settings' },
          { icon: '🛡️', label: '隐私协议', value: '', action: 'privacy' },
          { icon: '❓', label: '帮助与反馈', value: '', action: 'feedback' },
        ],
      },
    ],
  },

  // ========== 生命周期 ==========

  onLoad() {
    logger.trackPageView('profile');
    this._initLocalCounts();
    setTimeout(() => this.loadProfile(), 300);
  },

  onShow() {
    // 每次显示刷新计数和成就
    this._initLocalCounts();
    this._calcAchievements();
    if (this._loaded) {
      this.loadProfile();
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadProfile()
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh());
  },

  /**
   * 分享小程序
   */
  onShareAppMessage() {
    return {
      title: '语灵 AI · 智能写作助手 — 让创作更有灵感',
      path: '/pages/index/index',
    };
  },

  // ========== 数据加载 ==========

  loadProfile() {
    this.setData({ loading: true });

    return api.getProfile()
      .then(profile => {
        if (!profile || !profile.stats) {
          throw new Error('Invalid profile data');
        }

        const tokens = profile.stats.totalTokens || 0;
        const tokenDisplay = tokens >= 1000
          ? (tokens / 1000).toFixed(1) + 'k'
          : String(tokens);

        this.setData({
          profile,
          tokenDisplay,
          loading: false,
        });
        this._loaded = true;
        this._calcAchievements();
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '加载个人资料失败', icon: 'none' });
      });
  },

  // ========== 本地计数 ==========

  /** 从本地存储读取草稿和收藏数量 */
  _initLocalCounts() {
    try {
      const drafts = wx.getStorageSync(STORAGE_KEYS.drafts) || [];
      const favorites = wx.getStorageSync(STORAGE_KEYS.favorites) || [];
      this._updateMenuCounts(
        Array.isArray(drafts) ? drafts.length : 0,
        Array.isArray(favorites) ? favorites.length : 0,
      );
    } catch {
      // 忽略读取错误
    }
  },

  /** 更新菜单中的计数 */
  _updateMenuCounts(draftCount, favCount) {
    const menuGroups = this.data.menuGroups.map(group => {
      if (group.title === '我的创作') {
        const items = group.items.map(item => {
          if (item.action === 'drafts') return { ...item, value: String(draftCount) };
          if (item.action === 'favorites') return { ...item, value: String(favCount) };
          return item;
        });
        return { ...group, items };
      }
      return group;
    });
    this.setData({ menuGroups });
  },

  // ========== 成就系统 ==========

  /** 根据用户统计计算成就 */
  _calcAchievements() {
    const stats = this.data.profile.stats || {};
    const total = stats.totalCreations || 0;
    const streak = stats.streakDays || 0;
    const tokens = stats.totalTokens || 0;

    const list = [];

    if (total >= 1) {
      list.push({ icon: '✍️', title: '初次创作', desc: '完成第 1 次 AI 创作' });
    }
    if (total >= 10) {
      list.push({ icon: '🔥', title: '笔耕不辍', desc: '累计创作 10 次' });
    }
    if (total >= 50) {
      list.push({ icon: '📚', title: '著作等身', desc: '累计创作 50 次' });
    }
    if (total >= 100) {
      list.push({ icon: '👑', title: '创作大师', desc: '累计创作 100 次' });
    }
    if (streak >= 3) {
      list.push({ icon: '📅', title: '连续 3 天', desc: '连续创作 3 天' });
    }
    if (streak >= 7) {
      list.push({ icon: '🗓️', title: '周常创作', desc: '连续创作 7 天' });
    }
    if (streak >= 30) {
      list.push({ icon: '🏅', title: '月度之星', desc: '连续创作 30 天' });
    }
    if (tokens >= 10000) {
      list.push({ icon: '⚡', title: '万字产出', desc: '累计消耗 1 万 tokens' });
    }
    if (tokens >= 100000) {
      list.push({ icon: '💎', title: '高产作者', desc: '累计消耗 10 万 tokens' });
    }

    this.setData({ achievements: list });
  },

  // ========== 编辑资料 ==========

  /** 点击用户卡片打开编辑 */
  onTapEditProfile() {
    this.setData({
      showEditModal: true,
      editName: this.data.profile.name || '',
      editAvatar: this.data.profile.avatar || '',
    });
  },

  /** 关闭编辑弹窗 */
  onCloseEditModal() {
    this.setData({ showEditModal: false });
  },

  /** 阻止事件冒泡 */
  noop() {},

  /** 名称输入 */
  onNameInput(e) {
    this.setData({ editName: e.detail.value });
  },

  /** 更换头像 */
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('[Profile] 选择头像临时路径:', tempFilePath);
        this.setData({ editAvatar: tempFilePath });
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      },
    });
  },

  /** 保存编辑 */
  onSaveProfile() {
    const name = (this.data.editName || '').trim();
    const tempAvatar = this.data.editAvatar || '';
    const oldAvatar = this.data.profile.avatar || '';

    if (!name) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    if (name.length > 20) {
      wx.showToast({ title: '昵称不超过20个字', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中…', mask: true });

    // 判断头像是否是新的临时文件（需要上传到云存储）
    const isNewTempFile = tempAvatar
      && tempAvatar !== oldAvatar
      && (tempAvatar.startsWith('http://tmp/') || tempAvatar.startsWith('wxfile://'));

    // 统一保存逻辑：先上传头像（如有需要），再调 API
    const saveToServer = (finalAvatarUrl) => {
      console.log('[Profile] 保存资料:', { name, avatar: finalAvatarUrl });
      api.updateProfile({ name, avatar: finalAvatarUrl })
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: '保存成功', icon: 'success' });
          this.setData({
            showEditModal: false,
            'profile.name': name,
            'profile.avatar': finalAvatarUrl,
          });
        })
        .catch((err) => {
          wx.hideLoading();
          console.error('[Profile] 保存失败:', err);
          wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        });
    };

    if (isNewTempFile) {
      // 确保云开发已初始化
      const app = getApp();
      if (!app.globalData.cloudReady) {
        wx.hideLoading();
        wx.showToast({ title: '云开发未就绪，请重启小程序', icon: 'none' });
        return;
      }

      // 构造安全的云存储路径（仅保留字母数字下划线）
      const uid = (app.globalData.token || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const cloudPath = `avatars/${uid}_${timestamp}.jpg`;

      console.log('[Profile] 上传头像到云存储:', cloudPath);
      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempAvatar,
        success: (res) => {
          console.log('[Profile] 头像上传成功 fileID:', res.fileID);
          saveToServer(res.fileID);
        },
        fail: (uploadErr) => {
          console.error('[Profile] 头像上传失败:', uploadErr);
          // 上传失败，仍然用原头像保存昵称
          saveToServer(oldAvatar);
        },
      });
    } else {
      // 没有新头像，直接保存
      saveToServer(tempAvatar || oldAvatar);
    }
  },

  // ========== 事件处理 ==========

  /** 点击升级 Pro */
  onTapPro() {
    wx.showModal({
      title: 'Pro 高级灵感引擎',
      content: '解锁无限创作次数、优先响应通道、高级 AI 模型。\n\nPro 会员功能正在开发中，敬请期待！',
      showCancel: true,
      confirmText: '知道了',
      confirmColor: '#E0A146',
    });
  },

  /** 点击菜单项 */
  onTapMenu(e) {
    const { label } = e.currentTarget.dataset;
    const item = this._findMenuItem(label);
    const action = item ? item.action : null;

    switch (action) {
      case 'settings':
        wx.navigateTo({ url: '/pages/settings/settings' });
        break;
      case 'privacy':
        wx.navigateTo({ url: '/pages/privacy/privacy' });
        break;
      case 'feedback':
        wx.navigateTo({ url: '/pages/feedback/feedback' });
        break;
      case 'drafts':
        wx.navigateTo({ url: '/pages/drafts/drafts' });
        break;
      case 'favorites':
        wx.navigateTo({ url: '/pages/favorites/favorites' });
        break;
      case 'achievements':
        this._showAchievements();
        break;
      default:
        this._showComingSoon(`${label} 功能开发中`);
    }
  },

  /** 在菜单列表中查找项 */
  _findMenuItem(label) {
    for (const group of this.data.menuGroups) {
      const found = group.items.find(item => item.label === label);
      if (found) return found;
    }
    return null;
  },

  /** 显示成就弹窗 */
  _showAchievements() {
    const { achievements } = this.data;
    if (achievements.length === 0) {
      wx.showModal({
        title: '🏆 创作成就',
        content: '还没有解锁任何成就，快去创作你的第一篇作品吧！',
        showCancel: false,
        confirmText: '开始创作',
        confirmColor: '#E0A146',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/index/index' });
          }
        },
      });
      return;
    }

    const lines = achievements.map(a => `${a.icon} ${a.title}\n   ${a.desc}`);
    const content = lines.join('\n\n') + `\n\n已解锁 ${achievements.length} 个成就`;
    wx.showModal({
      title: '🏆 创作成就',
      content,
      showCancel: false,
      confirmText: '太棒了',
      confirmColor: '#E0A146',
    });
  },

  /** 功能开发中提示 */
  _showComingSoon(msg) {
    wx.showToast({ title: msg, icon: 'none' });
  },
});
