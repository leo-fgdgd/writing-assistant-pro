const api = require('../../utils/api');
const logger = require('../../utils/logger');

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

  onLoad() {
    logger.trackPageView('polish');
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
      this.setData({ result: res.result, isProcessing: false });
    }).catch(() => {
      wx.showToast({ title: '润色失败', icon: 'none' });
      this.setData({ isProcessing: false });
    });
  },

  onCopy() {
    wx.setClipboardData({ data: this.data.result, success: () => {
      wx.showToast({ title: '已复制', icon: 'none' });
    }});
  },
});
