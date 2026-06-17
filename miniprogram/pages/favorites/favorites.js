const storage = require('../../utils/storage');

Page({
  data: {
    favorites: [],
    isEmpty: true,
    // 详情弹窗
    showDetail: false,
    detailItem: null,
  },

  onLoad() {
    this._refresh();
  },

  onShow() {
    this._refresh();
  },

  _refresh() {
    const favorites = storage.getFavorites();
    const formatted = favorites.map(f => ({
      ...f,
      displayTime: this._fmtTime(f.createdAt),
      preview: f.aiResponse ? f.aiResponse.slice(0, 80) + (f.aiResponse.length > 80 ? '...' : '') : '',
    }));
    this.setData({
      favorites: formatted,
      isEmpty: formatted.length === 0,
    });
  },

  /** 点击收藏 → 查看详情 */
  onTapFavorite(e) {
    const { id } = e.currentTarget.dataset;
    const fav = storage.getFavorite(id);
    if (!fav) {
      wx.showToast({ title: '收藏已删除', icon: 'none' });
      return;
    }
    this.setData({ showDetail: true, detailItem: fav });
  },

  /** 关闭详情 */
  onCloseDetail() {
    this.setData({ showDetail: false, detailItem: null });
  },

  /** 取消收藏 */
  onUnfavorite(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '取消收藏',
      content: '确定要移除这条收藏吗？',
      confirmColor: '#C45A4A',
      success: (res) => {
        if (res.confirm) {
          storage.deleteFavorite(id);
          this._refresh();
          if (this.data.detailItem && this.data.detailItem.id === id) {
            this.setData({ showDetail: false, detailItem: null });
          }
          wx.showToast({ title: '已移除', icon: 'success' });
        }
      },
    });
  },

  /** 复制内容 */
  onCopyContent(e) {
    const { content } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: content,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
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
