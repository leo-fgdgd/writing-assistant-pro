const config = require('./utils/config');
const logger = require('./utils/logger');

App({
  globalData: {
    mode: config.mode,          // 'cloud' | 'http'
    token: null,                // 登录后存储的 openid（cloud 模式）或 JWT（http 模式）
    userInfo: null,             // 当前用户信息
    env: '',                    // 云开发环境 ID
  },

  onLaunch() {
    logger.track('lifecycle', { event: 'app_launch' });

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }

    // 尝试恢复本地 token
    const savedToken = wx.getStorageSync('token');
    if (savedToken) {
      this.globalData.token = savedToken;
    }

    // 自动登录
    if (savedToken) {
      this._loadProfile();
    } else {
      this.wxLogin();
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
      },
    });
  },

  _doLogin(code) {
    if (config.mode === 'cloud') {
      // Cloud mode: openid is auto-obtained in cloud function
      // Store token as cloud env name for client-side reference
      this.globalData.token = 'cloud:' + (this.globalData.env || 'default');
      wx.setStorageSync('token', this.globalData.token);

      // Call cloud login to create/update user
      wx.cloud.callFunction({
        name: config.cloudFunctionName,
        data: { action: 'auth/login', payload: {} },
        success: (res) => {
          if (res.result && res.result.user) {
            this.globalData.userInfo = res.result.user;
            console.log('[语灵 AI] 云函数登录成功:', res.result.user.nickName);
          }
        },
        fail: (err) => {
          console.log('[语灵 AI] 云函数登录失败:', err.errMsg);
        },
      });
    } else {
      // HTTP mode: send code to backend
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

  _loadProfile() {
    if (config.mode === 'cloud') {
      wx.cloud.callFunction({
        name: config.cloudFunctionName,
        data: { action: 'profile' },
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
