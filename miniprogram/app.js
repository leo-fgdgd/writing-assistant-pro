const config = require('./utils/config');
const logger = require('./utils/logger');

// 云函数调用超时配置（毫秒）
const CLOUD_CALL_TIMEOUT = 10000;

App({
  globalData: {
    mode: config.mode,          // 'cloud' | 'http'
    token: null,                // 登录后存储的 openid（cloud 模式）或 JWT（http 模式）
    userInfo: null,             // 当前用户信息
    env: config.cloudEnvId,     // 云开发环境 ID
    cloudReady: false,          // wx.cloud.init 是否成功
    cloudAvailable: true,       // 云函数调用是否可用（首次超时后置 false）
  },

  onLaunch() {
    logger.track('lifecycle', { event: 'app_launch' });

    // 初始化云开发（基础库 3.x 必定支持 wx.cloud）
    if (!wx.cloud) {
      console.error('[语灵 AI] 当前基础库版本过低，不支持云开发能力');
    } else {
      try {
        wx.cloud.init({
          env: this.globalData.env,
          traceUser: true,
        });
        this.globalData.cloudReady = true;
        console.log('[语灵 AI] CloudBase 初始化成功，环境ID:', this.globalData.env);
      } catch (e) {
        console.error('[语灵 AI] CloudBase 初始化失败:', e);
        this.globalData.cloudReady = false;
        this.globalData.cloudAvailable = false;
      }
    }

    // 尝试恢复本地 token
    const savedToken = wx.getStorageSync('token');
    if (savedToken) {
      this.globalData.token = savedToken;
    }

    // 自动登录（延迟执行，避免阻塞启动）
    if (savedToken) {
      setTimeout(() => this._loadProfile(), 500);
    } else {
      setTimeout(() => this.wxLogin(), 500);
    }
  },

  onHide() {
    logger.flushOnHide();
  },

  /**
   * 微信登录 — 同时支持 cloud 和 http 模式
   */
  wxLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this._doLogin(res.code);
        }
      },
      fail: () => {
        console.log('[语灵 AI] wx.login 失败，跳过登录');
        this._setFallbackToken();
      },
    });
  },

  /**
   * 安全调用云函数 — 自动检查可用性，首次超时后标记不可用
   */
  _safeCloudCall(opts) {
    if (!this.globalData.cloudAvailable) {
      // 之前已超时，跳过避免反复等待
      if (opts.fail) opts.fail({ errMsg: 'cloud unavailable' });
      return;
    }
    wx.cloud.callFunction({
      ...opts,
      config: { timeout: opts.config?.timeout || CLOUD_CALL_TIMEOUT },
      fail: (err) => {
        const isTimeout = err && err.errMsg && String(err.errMsg).includes('timeout');
        if (isTimeout) {
          this.globalData.cloudAvailable = false;
          console.warn('[语灵 AI] ⚠️ 云函数超时，已切换为离线模式。请部署 cloudfunctions/api 后重启。');
        }
        if (opts.fail) opts.fail(err);
      },
    });
  },

  _doLogin(code) {
    if (config.mode === 'cloud') {
      this._safeCloudCall({
        name: config.cloudFunctionName,
        data: { action: 'auth/login', payload: {} },
        config: { timeout: CLOUD_CALL_TIMEOUT },
        success: (res) => {
          if (res.result && res.result.user) {
            const user = res.result.user;
            this.globalData.userInfo = user;
            this.globalData.token = user.openid || user._id || '';
            wx.setStorageSync('token', this.globalData.token);
            console.log('[语灵 AI] 云函数登录成功:', user.nickName);
          }
        },
        fail: (err) => {
          console.log('[语灵 AI] 云函数登录失败:', err.errMsg || err);
          this._setFallbackToken();
        },
      });
    } else {
      const httpBaseUrl = config.httpBaseUrl;
      wx.request({
        url: `${httpBaseUrl}${config.apiPrefix}/auth/login`,
        method: 'POST',
        timeout: 4000,
        data: { code },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.token) {
            this.globalData.token = res.data.token;
            this.globalData.userInfo = res.data.user;
            wx.setStorageSync('token', res.data.token);
            console.log('[语灵 AI] HTTP 登录成功:', res.data.user.nickName);
          }
        },
        fail: (err) => {
          console.log('[语灵 AI] 登录接口未响应:', err.errMsg);
        },
      });
    }
  },

  /** 设置降级 token，确保离线可用 */
  _setFallbackToken() {
    if (!this.globalData.token) {
      this.globalData.token = 'local:' + Date.now().toString(36);
      wx.setStorageSync('token', this.globalData.token);
    }
  },

  _loadProfile() {
    if (config.mode === 'cloud') {
      this._safeCloudCall({
        name: config.cloudFunctionName,
        data: { action: 'profile' },
        config: { timeout: CLOUD_CALL_TIMEOUT },
        success: (res) => {
          if (res.result && !res.result.error) {
            this.globalData.userInfo = res.result;
          }
        },
        fail: () => {
          console.log('[语灵 AI] 云函数未连接，使用离线模式');
        },
      });
    } else {
      const httpBaseUrl = config.httpBaseUrl;
      const token = this.globalData.token;
      const header = {};
      if (token) header['Authorization'] = `Bearer ${token}`;

      wx.request({
        url: `${httpBaseUrl}${config.apiPrefix}/profile`,
        method: 'GET',
        timeout: 3000,
        header,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            this.globalData.userInfo = res.data;
          }
        },
        fail: () => {
          console.log('[语灵 AI] 后端未连接，使用离线模式');
        },
      });
    }
  },
});
