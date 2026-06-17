/**
 * 语灵 AI — 统一 API 层
 * 根据 config.mode 自动切换：
 *   'cloud' → wx.cloud.callFunction('api', { action, payload })
 *   'http'  → wx.request(url, ...)
 */

const config = require('./config');

// ============================================
// Cloud 模式
// ============================================
function callCloud(action, payload = {}, timeoutOverride) {
  const timeout = timeoutOverride || config.requestTimeout;
  const app = getApp();
  if (app && app.globalData && app.globalData.cloudAvailable === false) {
    return Promise.reject(new Error('云函数不可用，请先部署 cloudfunctions/api'));
  }
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: config.cloudFunctionName,
      data: { action, payload },
      config: { timeout },
      success: (res) => {
        const data = res.result;
        if (data && data.success !== false) {
          resolve(data);
        } else {
          reject(new Error((data && data.message) || '云函数调用失败'));
        }
      },
      fail: (err) => {
        // 超时标记全局不可用
        if (err.errMsg && String(err.errMsg).includes('timeout')) {
          if (app && app.globalData) app.globalData.cloudAvailable = false;
        }
        reject(new Error(err.errMsg || '云函数调用失败'));
      },
    });
  });
}

// ============================================
// HTTP 模式
// ============================================
function callHttp(path, options = {}) {
  const token = getApp().globalData.token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const baseUrl = getApp().globalData.apiBaseUrl || config.httpBaseUrl;
  const url = `${baseUrl}${config.apiPrefix}${path}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      timeout: config.requestTimeout,
      header: { ...headers, ...options.header },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.message) ? res.data.message : `请求失败 (${res.statusCode})`;
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg?.includes('timeout') ? '请求超时' : '网络错误'));
      },
    });
  });
}

// ============================================
// 统一入口
// ============================================
function call(action, payloadOrOptions, method, timeoutOverride) {
  if (config.mode === 'cloud') {
    return callCloud(action, payloadOrOptions, timeoutOverride);
  }
  // HTTP mode — map action to path
  const httpOpts = {
    method: method || (payloadOrOptions ? 'POST' : 'GET'),
    data: payloadOrOptions,
  };
  return callHttp(_actionToPath(action), httpOpts);
}

// Cloud action → HTTP path mapping (for HTTP fallback)
function _actionToPath(action) {
  const map = {
    'auth/login': '/auth/login',
    'chat/send': '/chat/send',
    'chat/list': '/chat',
    'chat/get': '/chat',  // + /:id handled separately
    'chat/delete': '/chat', // + /:id
    polish: '/polish',
    'polish/get': '/polish',
    history: '/history',
    'history/delete': '/history',
    profile: '/profile',
    'profile/update': '/profile',
    feedback: '/feedback',
    'feedback/list': '/feedback',
    'feedback/update': '/feedback',
    logs: '/logs',
    'logs/query': '/logs',
    'logs/stats': '/logs/stats',
    settings: '/settings',
    'settings/update': '/settings',
    health: '/health',
  };
  return map[action] || `/${action.replace(/\//g, '/')}`;
}

// Special HTTP handlers for GET with params and DELETE with :id
function requestHttp(path, options = {}) {
  return callHttp(path, options);
}

// ============================================
// Public API
// ============================================
module.exports = {
  /** 原始 cloud call（供特殊需求） */
  callCloud,

  /** 原始 HTTP call */
  callHttp,

  // ---- Auth ----
  login: (data) => call('auth/login', data),

  // ---- Chat ----
  sendChatMessage: (data) => call('chat/send', data, undefined, config.aiRequestTimeout),
  getConversation: (id) => config.mode === 'cloud'
    ? call('chat/get', { id })
    : callHttp(`/chat/${id}`),
  listConversations: () => config.mode === 'cloud'
    ? call('chat/list').then(r => r.items || [])
    : callHttp('/chat'),
  deleteConversation: (id) => config.mode === 'cloud'
    ? call('chat/delete', { id })
    : callHttp(`/chat/${id}`, { method: 'DELETE' }),

  // ---- Polish ----
  polishText: (data) => call('polish', data, undefined, config.aiRequestTimeout),
  getPolish: (id) => config.mode === 'cloud'
    ? call('polish/get', { id })
    : callHttp(`/polish/${id}`),

  // ---- History ----
  getHistory: (params) => {
    if (config.mode === 'cloud') return call('history', params || {}).then(r => r.items || []);
    const query = params
      ? Object.entries(params).filter(([, v]) => v && v !== 'all')
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
      : '';
    return callHttp(`/history${query ? '?' + query : ''}`);
  },
  deleteHistoryItem: (id) => config.mode === 'cloud'
    ? call('history/delete', { id })
    : callHttp(`/history/${id}`, { method: 'DELETE' }),

  // ---- Profile ----
  getProfile: () => call('profile'),
  updateProfile: (data) => call('profile/update', data),

  // ---- Feedback ----
  submitFeedback: (data) => call('feedback', data),
  listFeedback: (params) => call('feedback/list', params || {}),
  updateFeedback: (id, data) => call('feedback/update', { id, ...data }),

  // ---- Settings ----
  getSettings: () => call('settings'),
  updateSettings: (data) => call('settings/update', data),

  // ---- Health ----
  healthCheck: () => call('health'),

  // ---- Token Budget ----
  getBudget: () => call('budget'),

  // ---- Logs (internal use) ----
  submitLogs: (logs) => call('logs', { logs }),
};
