import { Router } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import storage from '../services/storageService.js';

const router = Router();

// POST /api/auth/login — WeChat login
router.post('/login', async (req, res, next) => {
  try {
    const { code, nickName, avatarUrl } = req.body;

    if (!code) {
      return res.status(400).json({ error: true, message: '缺少登录凭证 code' });
    }

    // Call WeChat API to exchange code for openid
    // NOTE: jscode2session only supports GET — secret must appear in query string.
    // This is server-to-server over HTTPS; the secret is never exposed to the client.
    // Ensure production access logs do NOT record query strings.
    const wxUrl = new URL('https://api.weixin.qq.com/sns/jscode2session');
    wxUrl.searchParams.set('appid', config.wechat.appId);
    wxUrl.searchParams.set('secret', config.wechat.appSecret);
    wxUrl.searchParams.set('js_code', code);
    wxUrl.searchParams.set('grant_type', 'authorization_code');

    let wxData;
    try {
      // 5秒超时，防止微信接口卡死导致小程序端 timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const wxRes = await fetch(wxUrl.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);
      wxData = await wxRes.json();
    } catch (err) {
      console.error('[Auth] WeChat API call failed:', err.message);
      return res.status(502).json({ error: true, message: '微信服务暂不可用' });
    }

    if (wxData.errcode) {
      console.error(`[Auth] WeChat login error: ${wxData.errcode} — ${wxData.errmsg}`);
      return res.status(400).json({ error: true, message: `微信登录失败: ${wxData.errmsg}` });
    }

    const { openid, session_key } = wxData;

    // Find or create user by openid
    let user = await storage.getUserByOpenId(openid);
    if (!user) {
      user = {
        id: openid,
        openid,
        nickName: nickName || '微信用户',
        avatarUrl: avatarUrl || '',
        isPro: false,
        stats: {
          totalCreations: 0,
          totalTokens: 0,
          streakDays: 0,
          lastActiveDate: null,
        },
        createdAt: new Date().toISOString(),
      };
      await storage.saveUser(user);
    } else if (nickName || avatarUrl) {
      // Update profile if new info provided
      if (nickName) user.nickName = nickName;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      await storage.saveUser(user);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
      },
      config.jwtSecret,
      { expiresIn: '30d' },
    );

    res.json({
      token,
      user: {
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        isPro: user.isPro,
        stats: user.stats,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
