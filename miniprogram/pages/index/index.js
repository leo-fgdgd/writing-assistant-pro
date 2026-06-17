const logger = require('../../utils/logger');
const api = require('../../utils/api');

/**
 * 格式化词元数量显示
 * @param {number} tokens - 词元总数
 * @returns {string} 格式化后的字符串
 */
function formatTokens(tokens) {
  const num = tokens || 0;
  if (num > 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return String(num);
}

Page({
  data: {
    greeting: '',
    stats: { totalCreations: 0, totalTokens: 0, streakDays: 0 },
    formattedTokens: '0',
    // 每日 token 预算
    dailyBudget: { used: 0, limit: 5000, remaining: 5000, percent: 0 },
    recentItems: [],
    quickActions: [
      { icon: '💬', title: 'AI 对话', desc: '智能写作助手', url: '/pages/chat/chat' },
      { icon: '✨', title: '文风润色', desc: '一键优化文字', url: '/pages/polish/polish' },
      { icon: '📋', title: '历史记录', desc: '查看创作历史', url: '/pages/history/history' },
      { icon: '💡', title: '帮助反馈', desc: '常见问题与建议', url: '/pages/feedback/feedback' },
    ],
    sceneCards: [
      { id: 'academic', icon: '🎓', title: '学术写作', desc: '论文摘要、文献综述' },
      { id: 'business', icon: '💼', title: '商务公文', desc: '邮件、报告、方案' },
      { id: 'creative', icon: '🎨', title: '创意故事', desc: '脚本、小说、文案' },
      { id: 'resume', icon: '📄', title: '求职简历', desc: '个人简介、经历优化' },
    ],
  },

  onLoad() {
    logger.trackPageView('index');
    this.setGreeting();
    this.loadStats();
    this.loadBudget();
    this.loadRecentHistory();
  },

  onShow() {
    if (this._loaded) {
      this.loadStats();
      this.loadBudget();
      this.loadRecentHistory();
    }
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';
    if (hour < 12) greeting = '早上好';
    else if (hour < 18) greeting = '下午好';
    this.setData({ greeting });
  },

  loadStats() {
    api.getProfile().then(profile => {
      if (profile && profile.stats) {
        const stats = profile.stats;
        this.setData({
          stats,
          formattedTokens: formatTokens(stats.totalTokens),
        });
      }
    }).catch(() => {
      // 静默失败，stats 保持默认值
    });
    this._loaded = true;
  },

  loadBudget() {
    api.getBudget().then(budget => {
      if (budget) {
        const percent = budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;
        this.setData({
          dailyBudget: {
            used: budget.used,
            limit: budget.limit,
            remaining: budget.remaining,
            percent,
          },
        });
      }
    }).catch(() => {
      // 静默失败
    });
  },

  loadRecentHistory() {
    api.getHistory({ filter: 'all' }).then(items => {
      this.setData({ recentItems: (items || []).slice(0, 5) });
    }).catch(() => {
      // 静默失败
    });
  },

  onTapAction(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.navigateTo({ url, fail: () => wx.switchTab({ url }) });
    }
  },

  onTapScene(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/chat/chat?sceneId=${id}`,
      fail: () => wx.switchTab({ url: '/pages/chat/chat' }),
    });
  },

  onTapHistoryItem(e) {
    const { item } = e.currentTarget.dataset;
    if (!item) return;
    if (item.type === 'polish') {
      wx.switchTab({ url: '/pages/polish/polish' });
    } else if (item.refId) {
      wx.navigateTo({ url: `/pages/chat/chat?conversationId=${item.refId}` });
    }
  },
});
