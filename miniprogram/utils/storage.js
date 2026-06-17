/**
 * 语灵 AI — 草稿箱 & 收藏夹 本地存储工具
 */

const DRAFTS_KEY = 'yuling_drafts';
const FAVORITES_KEY = 'yuling_favorites';

function genId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
}

function now() {
  return new Date().toISOString();
}

// ============================================
// 草稿箱
// ============================================

/** 获取所有草稿 */
function getDrafts() {
  try {
    const raw = wx.getStorageSync(DRAFTS_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

/** 保存草稿 */
function saveDraft({ type, title, content, sceneId }) {
  const drafts = getDrafts();
  const id = genId();
  const draft = {
    id,
    type: type || 'chat',
    title: title || content.slice(0, 30) + (content.length > 30 ? '...' : ''),
    content,
    sceneId: sceneId || null,
    createdAt: now(),
  };
  drafts.unshift(draft);
  wx.setStorageSync(DRAFTS_KEY, drafts);
  return draft;
}

/** 删除草稿 */
function deleteDraft(id) {
  const drafts = getDrafts().filter(d => d.id !== id);
  wx.setStorageSync(DRAFTS_KEY, drafts);
}

/** 获取单个草稿 */
function getDraft(id) {
  return getDrafts().find(d => d.id === id) || null;
}

// ============================================
// 收藏夹
// ============================================

/** 获取所有收藏 */
function getFavorites() {
  try {
    const raw = wx.getStorageSync(FAVORITES_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

/** 添加收藏 */
function addFavorite({ type, title, userMessage, aiResponse, sceneId }) {
  const favorites = getFavorites();

  // 去重：相同内容不重复收藏
  const dup = favorites.find(f => f.aiResponse === aiResponse);
  if (dup) return null;

  const item = {
    id: genId(),
    type: type || 'chat',
    title: title || userMessage.slice(0, 30),
    userMessage,
    aiResponse,
    sceneId: sceneId || null,
    createdAt: now(),
  };
  favorites.unshift(item);

  // 最多保存 200 条
  if (favorites.length > 200) favorites.length = 200;

  wx.setStorageSync(FAVORITES_KEY, favorites);
  return item;
}

/** 删除收藏 */
function deleteFavorite(id) {
  const favorites = getFavorites().filter(f => f.id !== id);
  wx.setStorageSync(FAVORITES_KEY, favorites);
}

/** 获取单个收藏 */
function getFavorite(id) {
  return getFavorites().find(f => f.id === id) || null;
}

module.exports = {
  getDrafts, saveDraft, deleteDraft, getDraft,
  getFavorites, addFavorite, deleteFavorite, getFavorite,
};
