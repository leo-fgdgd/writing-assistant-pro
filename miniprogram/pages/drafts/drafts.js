const storage = require('../../utils/storage');

Page({
  data: {
    drafts: [],
    isEmpty: true,
  },

  onLoad() {
    this._refresh();
  },

  onShow() {
    this._refresh();
  },

  _refresh() {
    const drafts = storage.getDrafts();
    // 格式化时间
    const formatted = drafts.map(d => ({
      ...d,
      displayTime: this._fmtTime(d.createdAt),
      preview: d.content ? d.content.slice(0, 80) + (d.content.length > 80 ? '...' : '') : '',
    }));
    this.setData({
      drafts: formatted,
      isEmpty: formatted.length === 0,
    });
  },

  /** 点击草稿 → 跳转到对应编辑页 */
  onTapDraft(e) {
    const { id } = e.currentTarget.dataset;
    const draft = storage.getDraft(id);
    if (!draft) {
      wx.showToast({ title: '草稿已删除', icon: 'none' });
      return;
    }

    if (draft.type === 'polish') {
      wx.navigateTo({
        url: `/pages/polish/polish?draftId=${id}`,
        fail: () => wx.switchTab({ url: '/pages/polish/polish' }),
      });
    } else {
      wx.navigateTo({
        url: `/pages/chat/chat?draftId=${id}`,
        fail: () => wx.switchTab({ url: '/pages/chat/chat' }),
      });
    }
  },

  /** 删除草稿 */
  onDeleteDraft(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除草稿',
      content: '确定要删除这个草稿吗？删除后无法恢复。',
      confirmColor: '#C45A4A',
      success: (res) => {
        if (res.confirm) {
          storage.deleteDraft(id);
          this._refresh();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  _fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}月${day}日`;
  },
});
