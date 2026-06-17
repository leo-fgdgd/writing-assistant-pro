const api = require('../../utils/api');
const logger = require('../../utils/logger');

Page({
  data: {
    history: [],
    searchQuery: '',
    filter: 'all',
  },

  onLoad() {
    logger.trackPageView('history');
    setTimeout(() => this.loadHistory(), 500);
  },

  onShow() {
    if (this._loaded) {
      this.loadHistory();
    }
  },

  loadHistory() {
    const { searchQuery, filter } = this.data;
    api.getHistory({ search: searchQuery, filter }).then(data => {
      this.setData({ history: data });
      this._loaded = true;
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value });
  },

  onSearch() {
    this.loadHistory();
  },

  onFilter(e) {
    const { filter } = e.currentTarget.dataset;
    this.setData({ filter }, () => {
      this.loadHistory();
    });
  },

  onTapItem(e) {
    const { item } = e.currentTarget.dataset;
    if (item.type === 'polish') {
      wx.switchTab({ url: '/pages/polish/polish' });
    } else if (item.refId) {
      wx.navigateTo({ url: `/pages/chat/chat?conversationId=${item.refId}` });
    } else {
      wx.navigateTo({ url: '/pages/chat/chat' });
    }
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          api.deleteHistoryItem(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'none' });
            this.loadHistory();
          }).catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      },
    });
  },
});
