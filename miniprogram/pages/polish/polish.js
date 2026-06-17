const api = require('../../utils/api');
const logger = require('../../utils/logger');
const storage = require('../../utils/storage');
const { cleanMarkdown } = require('../../utils/markdown');

Page({
  data: {
    modes: [
      { id: 'refine', title: '文字润色', desc: '优化表达，让文字更流畅', icon: '✨', bgColor: '#FEF3C7' },
      { id: 'rewrite', title: '句式改写', desc: '换个说法，保持原意', icon: '✍️', bgColor: '#D1FAE5' },
      { id: 'formal', title: '正式化', desc: '转为商务/学术用语', icon: '📄', bgColor: '#EDE9FE' },
      { id: 'casual', title: '口语化', desc: '转为轻松日常表达', icon: '💬', bgColor: '#FCE7F3' },
    ],
    selectedMode: 'refine',
    inputText: '',
    result: '',
    isProcessing: false,
    examples: [
      '本季度销售额同比增长25%...',
      '随着人工智能技术的快速发展...',
      '感谢各位同事在本次项目中的辛勤付出...',
    ],
  },

  onLoad(options) {
    logger.trackPageView('polish');

    // 加载草稿
    if (options.draftId) {
      setTimeout(() => this._loadDraft(options.draftId), 400);
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
    if (this.data.result) {
      this.setData({ result: '' });
    }
  },

  onSelectMode(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ selectedMode: mode, result: '' });
  },

  onUseExample(e) {
    const { text } = e.currentTarget.dataset;
    this.setData({ inputText: text, result: '' });
  },

  onPolish() {
    const { inputText, selectedMode } = this.data;
    if (!inputText.trim()) {
      wx.showToast({ title: '请先输入文字', icon: 'none' });
      return;
    }

    this.setData({ isProcessing: true, result: '' });

    api.polishText({ text: inputText.trim(), mode: selectedMode }).then(res => {
      this.setData({ result: cleanMarkdown(res.result), isProcessing: false });
      // 预算警告
      if (res.budget) {
        const percent = res.budget.limit > 0 ? Math.round((res.budget.used / res.budget.limit) * 100) : 0;
        if (percent > 80) {
          wx.showToast({ title: `今日额度已用 ${percent}%`, icon: 'none', duration: 2000 });
        }
      }
    }).catch(err => {
      const msg = (err && err.message) || '润色失败';
      if (msg.includes('额度') || msg.includes('用完') || msg.includes('免费')) {
        wx.showModal({
          title: '今日额度已用完',
          content: '今日 5,000 tokens 免费额度已用完。明天凌晨自动重置。',
          showCancel: false,
          confirmText: '知道了',
        });
      } else {
        wx.showToast({ title: msg, icon: 'none' });
      }
      this.setData({ isProcessing: false });
    });
  },

  onCopy() {
    wx.setClipboardData({ data: this.data.result, success: () => {
      wx.showToast({ title: '已复制', icon: 'none' });
    }});
  },

  /** 保存当前输入为草稿 */
  onSaveDraft() {
    const content = this.data.inputText.trim();
    if (!content) {
      wx.showToast({ title: '请先输入内容', icon: 'none' });
      return;
    }
    storage.saveDraft({
      type: 'polish',
      title: content.slice(0, 30),
      content,
    });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  /** 收藏润色结果 */
  onFavoriteResult() {
    const { inputText, result, selectedMode } = this.data;
    if (!result) {
      wx.showToast({ title: '没有可收藏的内容', icon: 'none' });
      return;
    }
    const modeName = this.data.modes.find(m => m.id === selectedMode)?.title || '润色';
    const fav = storage.addFavorite({
      type: 'polish',
      title: modeName + '：' + inputText.slice(0, 20),
      userMessage: inputText,
      aiResponse: result,
    });
    if (fav === null) {
      wx.showToast({ title: '已收藏过这条内容', icon: 'none' });
    } else {
      wx.showToast({ title: '已收藏 ⭐', icon: 'success' });
    }
  },

  /** 加载草稿 */
  _loadDraft(draftId) {
    const draft = storage.getDraft(draftId);
    if (draft) {
      this.setData({ inputText: draft.content });
      wx.showToast({ title: '草稿已加载', icon: 'success' });
    }
  },
});
