/**
 * 操作日志追踪模块
 * 自动收集小程序内页面访问、按钮点击等操作事件，
 * 批量上报到后端 /api/logs 接口。
 */

const config = require('./config');

function getBaseUrl() {
  const app = getApp();
  if (app && app.globalData && app.globalData.apiBaseUrl) {
    return `${app.globalData.apiBaseUrl}${config.apiPrefix}`;
  }
  return `${config.apiBaseUrl}${config.apiPrefix}`;
}

const MAX_BATCH = config.logBatchSize;
const FLUSH_INTERVAL = config.logFlushInterval;

// 本地缓冲队列，攒够一批再上报以减少请求次数
let logQueue = [];
let flushTimer = null;
let disabled = false;

function getUserId() {
  try {
    const app = getApp();
    const token = app?.globalData?.token;
    if (token) {
      // 简单解析 JWT payload 取 openid
      const payload = token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(
          // 兼容小程序不支持 atob 的情况
          (typeof atob === 'function' ? atob(payload) : wx.base64ToArrayBuffer ? '' : '')
        );
        // Fallback: 直接用 base64 解码
      }
      // 用 token 的前 8 位作为匿名标识
      return token.substring(0, 8);
    }
  } catch { /* ignore */ }
  return 'anonymous';
}

function getDeviceInfo() {
  try {
    const sys = wx.getSystemInfoSync();
    return {
      platform: sys.platform,
      version: sys.version,
      model: sys.model,
      brand: sys.brand,
    };
  } catch {
    return {};
  }
}

function getCurrentPage() {
  const pages = getCurrentPages();
  if (pages.length > 0) {
    return pages[pages.length - 1].route || 'unknown';
  }
  return 'unknown';
}

/**
 * 收集一条操作日志
 * @param {'page_view'|'button_click'|'api_call'|'error'|'lifecycle'} action
 * @param {object}  extra - 补充字段，如 { label, detail, ... }
 */
function track(action, extra = {}) {
  if (disabled) return;

  const entry = {
    action,
    page: getCurrentPage(),
    userId: getUserId(),
    timestamp: new Date().toISOString(),
    device: getDeviceInfo(),
    extra,
  };

  logQueue.push(entry);

  // 达到批量阈值立即上报
  if (logQueue.length >= MAX_BATCH) {
    flush();
    return;
  }

  // 设置定时上报
  if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL);
  }
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (logQueue.length === 0) return;

  const batch = logQueue.splice(0);

  if (config.mode === 'cloud') {
    // Cloud mode: submit via cloud function
    wx.cloud.callFunction({
      name: config.cloudFunctionName,
      data: { action: 'logs', payload: { logs: batch } },
      success: () => {},
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('timeout')) {
          disabled = true;
        }
      },
    });
  } else {
    // HTTP mode: submit via wx.request
    const app = getApp();
    const baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || config.httpBaseUrl;
    const token = app?.globalData?.token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    wx.request({
      url: `${baseUrl}${config.apiPrefix}/logs`,
      method: 'POST',
      timeout: 3000,
      header: headers,
      data: { logs: batch },
      success: () => {},
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('timeout')) {
          disabled = true;
        }
      },
    });
  }
}

/**
 * 页面浏览追踪 — 在页面 onShow 中调用
 */
function trackPageView(pageName) {
  track('page_view', { pageName: pageName || getCurrentPage() });
}

/**
 * 按钮点击追踪 — 在按钮 bindtap 中调用
 */
function trackClick(label, detail) {
  track('button_click', { label, ...(detail ? { detail } : {}) });
}

/**
 * API 调用追踪
 */
function trackApiCall(endpoint, duration, success) {
  track('api_call', { endpoint, duration, success });
}

/**
 * 错误追踪
 */
function trackError(source, message) {
  track('error', { source, message });
}

/**
 * 页面离开前强制 flush 剩余日志
 */
function flushOnHide() {
  if (logQueue.length > 0) {
    flush();
  }
}

module.exports = {
  track,
  trackPageView,
  trackClick,
  trackApiCall,
  trackError,
  flushOnHide,
  flush,
};
