/**
 * 语灵 AI — 统一 API 云函数
 *
 * 调用方式（小程序端）：
 *   wx.cloud.callFunction({ name: 'api', data: { action: 'chat/send', payload: {...} } })
 *
 * 支持的 action：
 *   auth/login    — 微信登录
 *   chat/send     — 发送消息
 *   chat/list     — 对话列表
 *   chat/get      — 获取对话
 *   chat/delete   — 删除对话
 *   polish        — 文风润色
 *   polish/get    — 获取润色记录
 *   history       — 历史列表
 *   history/delete— 删除历史
 *   profile       — 获取资料
 *   profile/update— 更新资料
 *   feedback      — 提交反馈
 *   feedback/list — 反馈列表
 *   feedback/update— 更新反馈状态
 *   logs          — 提交日志
 *   logs/query    — 查询日志
 *   logs/stats    — 日志统计
 *   settings      — 获取设置
 *   settings/update— 更新设置
 *   health        — 健康检查
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ============================================
// AI Service
// ============================================
const AI_CONFIG = {
  get apiKey() {
    return process.env.AI_API_KEY || '';
  },
  get provider() {
    return process.env.AI_PROVIDER || 'deepseek';
  },
  get providerConfig() {
    const providers = {
      deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
    };
    return providers[this.provider] || providers.deepseek;
  },
};

async function callAI(messages, options = {}) {
  const { temperature = 0.7, maxTokens = 4096 } = options;
  const cfg = AI_CONFIG.providerConfig;

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    console.error(`[AI] ${AI_CONFIG.provider} API error ${response.status}: ${errText}`);
    throw new Error(`AI 服务暂不可用 (${response.status})`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
  };
}

// Fallback when no API key configured
function mockAI(messages, type, sceneId) {
  const lastMsg = messages[messages.length - 1]?.content || '';
  const mockChats = {
    academic: `好的，以下是为您梳理的学术写作框架：\n\n**一、研究背景**\n随着相关领域的快速发展，该课题在理论与实践中都展现出重要意义...\n\n**二、研究方法**\n采用文献综述与案例分析相结合的方法...\n\n需要我针对某个部分展开详细写作吗？`,
    business: `主题：关于合作方案的初步沟通\n\n尊敬的合作伙伴您好，\n\n感谢贵公司对我们业务发展的关注。我们很高兴向您介绍最新合作方案...\n\n期待您的回复！\n\n此致\n敬礼`,
    creative: `**创意脚本：《灵感瞬间》**\n\n【开场】晨光透过窗户洒在桌面上，一杯咖啡，一本翻开的笔记本。\n字幕：「每一个灵感，都值得被记录」\n\n【主线】三个创作瞬间...\n\n需要我调整风格或补充细节吗？`,
    resume: `**个人简介**\n\n拥有丰富行业经验，擅长数据驱动决策、以用户为中心设计解决方案。\n\n核心优势：专业能力 / 实战经验 / 团队协作\n\n需要我根据具体岗位调整侧重点吗？`,
  };
  return {
    content: mockChats[sceneId] || `收到！我来帮您创作。\n\n能否补充：目标受众、语气风格、大致字数？`,
    tokens: Math.floor(Math.random() * 800) + 400,
  };
}

function mockPolish(text, mode) {
  const results = {
    refine: text + '\n\n（文字已优化，表达更流畅自然）',
    rewrite: text.split(/[，。]/).filter(s => s.trim()).reverse().join('，') + '。',
    formal: `兹就相关事项报告如下：\n\n${text}\n\n以上内容，敬请审阅。`,
    casual: `嘿，简单说就是：${text} — 感觉挺不错的！`,
  };
  return { content: results[mode] || results.refine, tokens: Math.floor(Math.random() * 200) + 100 };
}

const SYSTEM_PROMPTS = {
  academic: '你是一位学术写作专家。使用正式严谨的语言，提供结构化输出。用中文回复。',
  business: '你是一位商务写作专家。语言专业且友好，注重逻辑清晰。用中文回复。',
  creative: '你是一位创意写作专家。富有想象力和感染力，注重画面感和情感表达。用中文回复。',
  resume: '你是一位职业发展顾问。突出个人优势，语言简洁有力。用中文回复。',
};

function genId() {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

// ============================================
// Helpers
// ============================================
function ok(data) {
  return { success: true, ...data };
}

function err(message, code = 400) {
  return { success: false, error: true, message, code };
}

function getOpenId(context) {
  return cloud.getWXContext().OPENID;
}

// ============================================
// Route Handlers
// ============================================

const handlers = {
  // ---- Health ----
  health: async () => ({
    status: 'ok',
    message: '语灵 AI 云函数已启动',
    mode: AI_CONFIG.apiKey ? 'live' : 'mock',
    timestamp: new Date().toISOString(),
  }),

  // ---- Auth ----
  'auth/login': async (ctx) => {
    const openid = getOpenId();
    const { nickName, avatarUrl } = ctx.payload || {};

    // Check existing user
    const userRes = await db.collection('users').where({ openid }).get();
    let user = userRes.data[0];

    if (!user) {
      user = {
        openid,
        nickName: nickName || '微信用户',
        avatarUrl: avatarUrl || '',
        isPro: false,
        stats: { totalCreations: 0, totalTokens: 0, streakDays: 0, lastActiveDate: null },
        createdAt: new Date().toISOString(),
      };
      await db.collection('users').add({ data: user });
    } else if (nickName || avatarUrl) {
      const update = {};
      if (nickName) update.nickName = nickName;
      if (avatarUrl) update.avatarUrl = avatarUrl;
      await db.collection('users').where({ openid }).update({ data: update });
      user = { ...user, ...update };
    }

    return ok({ token: openid, user });
  },

  // ---- Chat ----
  'chat/send': async (ctx) => {
    const openid = getOpenId();
    const { conversationId, sceneId, message } = ctx.payload || {};

    if (!message || !message.trim()) return err('消息不能为空');

    let conv;
    const now = new Date().toISOString();

    if (conversationId) {
      const res = await db.collection('conversations').where({ id: conversationId }).get();
      conv = res.data[0];
      if (conv && conv.userId && conv.userId !== openid) return err('无权访问此会话', 403);
    }

    if (!conv) {
      conv = {
        id: genId(),
        userId: openid,
        sceneId: sceneId || null,
        title: message.trim().slice(0, 30) + (message.length > 30 ? '...' : ''),
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Add user message
    const userMsg = { id: genId(), role: 'user', content: message.trim(), timestamp: now };
    conv.messages.push(userMsg);

    // AI
    const aiMessages = conv.messages.map(m => ({ role: m.role, content: m.content }));
    const systemPrompt = SYSTEM_PROMPTS[conv.sceneId] || '你是一位写作助手，叫"语灵 AI"。用中文回复，友好温暖。';
    let aiRes;
    try {
      aiRes = AI_CONFIG.apiKey
        ? await callAI([{ role: 'system', content: systemPrompt }, ...aiMessages])
        : mockAI(aiMessages, 'chat', conv.sceneId);
    } catch {
      aiRes = mockAI(aiMessages, 'chat', conv.sceneId);
    }

    const assistantMsg = { id: genId(), role: 'assistant', content: aiRes.content, timestamp: now };
    conv.messages.push(assistantMsg);
    conv.updatedAt = now;

    // Update title from first user message
    if (conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = message.trim().slice(0, 30) + (message.trim().length > 30 ? '...' : '');
    }

    // Upsert conversation
    const existing = await db.collection('conversations').where({ id: conv.id }).get();
    if (existing.data.length > 0) {
      await db.collection('conversations').where({ id: conv.id }).update({ data: conv });
    } else {
      await db.collection('conversations').add({ data: conv });
    }

    // Sync history
    const historyEntry = {
      id: conv.id,
      userId: openid,
      type: 'chat',
      title: conv.title,
      preview: message.trim().slice(0, 50) + (message.length > 50 ? '...' : ''),
      date: '刚刚',
      tokens: String(aiRes.tokens),
      refId: conv.id,
      createdAt: now,
    };
    const histRes = await db.collection('history').where({ refId: conv.id }).get();
    if (histRes.data.length > 0) {
      await db.collection('history').where({ refId: conv.id }).update({ data: historyEntry });
    } else {
      await db.collection('history').add({ data: historyEntry });
    }

    // Update stats
    await _updateStats(openid, 'chat', aiRes.tokens);

    return ok({ conversationId: conv.id, reply: aiRes.content, conversation: conv });
  },

  'chat/list': async (ctx) => {
    const openid = getOpenId();
    const res = await db.collection('conversations')
      .where({ userId: openid })
      .field({ id: true, sceneId: true, title: true, createdAt: true, updatedAt: true, 'messages.length': true })
      .orderBy('updatedAt', 'desc')
      .get();
    const list = res.data.map(c => ({
      id: c.id, sceneId: c.sceneId, title: c.title,
      messageCount: c.messages ? c.messages.length : 0,
      createdAt: c.createdAt, updatedAt: c.updatedAt,
    }));
    return ok(list);
  },

  'chat/get': async (ctx) => {
    const openid = getOpenId();
    const { id } = ctx.payload || {};
    const res = await db.collection('conversations').where({ id }).get();
    const conv = res.data[0];
    if (!conv) return err('会话不存在', 404);
    if (conv.userId && conv.userId !== openid) return err('无权访问', 403);
    return ok(conv);
  },

  'chat/delete': async (ctx) => {
    const openid = getOpenId();
    const { id } = ctx.payload || {};
    const convRes = await db.collection('conversations').where({ id }).get();
    const conv = convRes.data[0];
    if (conv && conv.userId && conv.userId !== openid) return err('无权删除', 403);
    await db.collection('conversations').where({ id }).remove();
    await db.collection('history').where({ refId: id }).remove();
    return ok({ deleted: true });
  },

  // ---- Polish ----
  polish: async (ctx) => {
    const openid = getOpenId();
    const { text, mode } = ctx.payload || {};

    if (!text || !text.trim()) return err('文本不能为空');
    const validModes = ['refine', 'rewrite', 'formal', 'casual'];
    const polishMode = validModes.includes(mode) ? mode : 'refine';

    let result;
    try {
      const systemPrompt = {
        refine: '你是一位文字润色专家。优化以下文本，保持原意。只输出润色后文本。',
        rewrite: '你是一位句式改写专家。用不同句式重写。只输出改写后文本。',
        formal: '你是一位正式文体专家。将文本转为正式风格。只输出转换后文本。',
        casual: '你是一位口语化专家。将文本转为轻松风格。只输出转换后文本。',
      };
      result = AI_CONFIG.apiKey
        ? await callAI([{ role: 'system', content: systemPrompt[polishMode] }, { role: 'user', content: text.trim() }], { temperature: 0.3 })
        : mockPolish(text.trim(), polishMode);
    } catch {
      result = mockPolish(text.trim(), polishMode);
    }

    const id = genId();
    const now = new Date().toISOString();
    await db.collection('polishes').add({
      data: { id, userId: openid, mode: polishMode, input: text.trim(), output: result.content, createdAt: now },
    });

    await db.collection('history').add({
      data: {
        id, userId: openid, type: 'polish',
        title: `润色：${text.trim().slice(0, 15)}...`,
        preview: text.trim().slice(0, 50) + (text.length > 50 ? '...' : ''),
        date: '刚刚', tokens: String(result.tokens), refId: id, createdAt: now,
      },
    });

    await _updateStats(openid, 'polish', result.tokens);

    return ok({ id, result: result.content, mode: polishMode, input: text.trim() });
  },

  'polish/get': async (ctx) => {
    const { id } = ctx.payload || {};
    const res = await db.collection('polishes').where({ id }).get();
    if (res.data.length === 0) return err('记录不存在', 404);
    return ok(res.data[0]);
  },

  // ---- History ----
  history: async (ctx) => {
    const openid = getOpenId();
    const { search, filter } = ctx.payload || {};

    let query = db.collection('history').where({ userId: openid });
    if (filter && filter !== 'all') {
      query = query.where({ type: filter });
    }
    const res = await query.orderBy('createdAt', 'desc').limit(100).get();
    let list = res.data;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(h => h.title?.toLowerCase().includes(q) || h.preview?.toLowerCase().includes(q));
    }

    return ok(list);
  },

  'history/delete': async (ctx) => {
    const openid = getOpenId();
    const { id } = ctx.payload || {};

    const histRes = await db.collection('history').where({ id: String(id) }).get();
    const entry = histRes.data[0];
    if (entry && entry.userId && entry.userId !== openid) return err('无权删除', 403);

    if (entry) {
      if (entry.type === 'chat') {
        await db.collection('conversations').where({ id: entry.refId }).remove();
      } else if (entry.type === 'polish') {
        await db.collection('polishes').where({ id: entry.refId }).remove();
      }
    }

    await db.collection('history').where({ id: String(id) }).remove();
    return ok({ deleted: true });
  },

  // ---- Profile ----
  profile: async (ctx) => {
    const openid = getOpenId();
    const res = await db.collection('users').where({ openid }).get();
    const user = res.data[0];
    if (user) {
      const profile = {
        name: user.nickName,
        avatar: user.avatarUrl,
        isPro: user.isPro,
        stats: user.stats || { totalCreations: 0, totalTokens: 0, streakDays: 0 },
      };
      return ok(profile);
    }
    return ok({ name: '创作者', avatar: '/images/avatar.png', isPro: false, stats: { totalCreations: 0, totalTokens: 0, streakDays: 0 } });
  },

  'profile/update': async (ctx) => {
    const openid = getOpenId();
    const { name, avatar } = ctx.payload || {};
    const update = {};
    if (name !== undefined) update.nickName = name;
    if (avatar !== undefined) update.avatarUrl = avatar;

    await db.collection('users').where({ openid }).update({ data: update });
    const res = await db.collection('users').where({ openid }).get();
    const user = res.data[0];
    return ok({ name: user.nickName, avatar: user.avatarUrl, isPro: user.isPro, stats: user.stats });
  },

  // ---- Feedback ----
  feedback: async (ctx) => {
    const openid = getOpenId();
    const { content, contact } = ctx.payload || {};

    if (!content || typeof content !== 'string' || content.trim().length < 4) {
      return err('反馈内容至少需要 4 个字符');
    }
    if (content.length > 2000) return err('反馈内容不能超过 2000 字符');

    const fb = {
      id: genId(),
      userId: openid,
      nickName: null,
      content: content.trim(),
      contact: contact?.trim() || null,
      status: 'pending',
      adminNote: '',
      createdAt: new Date().toISOString(),
    };
    await db.collection('feedback').add({ data: fb });
    return ok({ message: '感谢您的反馈！', id: fb.id });
  },

  'feedback/list': async (ctx) => {
    const { status, page = 1, limit = 20 } = ctx.payload || {};
    let query = db.collection('feedback');
    if (status) query = query.where({ status });

    const totalRes = await query.count();
    const total = totalRes.total;
    const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * limit).limit(limit).get();
    return ok({ items: res.data, total, page, limit, totalPages: Math.ceil(total / limit) });
  },

  'feedback/update': async (ctx) => {
    const { id, status, adminNote } = ctx.payload || {};
    const update = {};
    if (status !== undefined) update.status = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    await db.collection('feedback').where({ id }).update({ data: update });
    const res = await db.collection('feedback').where({ id }).get();
    if (res.data.length === 0) return err('反馈记录不存在', 404);
    return ok(res.data[0]);
  },

  // ---- Logs ----
  logs: async (ctx) => {
    const { logs } = ctx.payload || {};
    if (!Array.isArray(logs) || logs.length === 0) return err('日志数据格式错误');

    const valid = ['page_view', 'button_click', 'api_call', 'error', 'lifecycle'];
    const entries = logs.filter(l => valid.includes(l.action)).map(l => ({
      ...l,
      serverReceivedAt: new Date().toISOString(),
    }));

    for (const entry of entries) {
      await db.collection('logs').add({ data: entry });
    }
    return ok({ received: entries.length });
  },

  'logs/query': async (ctx) => {
    const { action, page, userId, page: pageNum = 1, limit = 50 } = ctx.payload || {};

    let query = db.collection('logs');
    if (action) query = query.where({ action });
    if (userId) query = query.where({ userId });

    const totalRes = await query.count();
    const total = totalRes.total;
    const res = await query.orderBy('timestamp', 'desc').skip((pageNum - 1) * limit).limit(limit).get();
    return ok({ items: res.data, total, page: pageNum, limit, totalPages: Math.ceil(total / limit) });
  },

  'logs/stats': async () => {
    // Last 7 days
    const stats = { totalLogs: 0, byAction: {}, byPage: {} };
    const res = await db.collection('logs').limit(1000).get();
    for (const log of res.data) {
      stats.totalLogs++;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byPage[log.page] = (stats.byPage[log.page] || 0) + 1;
    }
    return ok(stats);
  },

  // ---- Settings ----
  settings: async () => {
    const res = await db.collection('settings').where({ key: 'main' }).get();
    const defaultSettings = {
      ai: { maxTokens: 4096, temperature: 0.7, modelVersion: 'default', maxContextLength: 10 },
      limits: { maxFreeMessagesPerDay: 50, maxTokensPerMessage: 2048, proMaxMessagesPerDay: 500, proMaxTokensPerMessage: 8192 },
      features: { enablePolish: true, enableHistoryExport: false, enableProSubscription: false, enableFeedback: true, maintenanceMode: false },
      announcement: { enabled: false, title: '', content: '', url: '' },
      appVersion: '2.1.0',
      contactEmail: 'feedback@yuling-ai.com',
    };

    if (res.data.length > 0) {
      return ok({ ...defaultSettings, ...res.data[0].data });
    }
    return ok(defaultSettings);
  },

  'settings/update': async (ctx) => {
    const data = ctx.payload || {};
    const existing = await db.collection('settings').where({ key: 'main' }).get();
    if (existing.data.length > 0) {
      await db.collection('settings').where({ key: 'main' }).update({ data: { data, updatedAt: new Date().toISOString() } });
    } else {
      await db.collection('settings').add({ data: { key: 'main', data, updatedAt: new Date().toISOString() } });
    }
    const res = await db.collection('settings').where({ key: 'main' }).get();
    return ok(res.data[0].data);
  },
};

// ============================================
// Stats helper
// ============================================
async function _updateStats(openid, type, tokens) {
  try {
    const res = await db.collection('users').where({ openid }).get();
    const user = res.data[0];
    if (!user) return;

    const stats = user.stats || { totalCreations: 0, totalTokens: 0, streakDays: 0 };
    stats.totalCreations += 1;
    stats.totalTokens += tokens || 0;

    const now = new Date();
    const lastDate = stats.lastActiveDate ? new Date(stats.lastActiveDate) : null;
    if (lastDate) {
      const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        - new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime()) / 86400000);
      if (diff === 0) { /* same day */ }
      else if (diff === 1) stats.streakDays = (stats.streakDays || 0) + 1;
      else stats.streakDays = 1;
    } else {
      stats.streakDays = 1;
    }
    stats.lastActiveDate = now.toISOString();

    await db.collection('users').where({ openid }).update({ data: { stats } });
  } catch (e) {
    console.error('[Stats] update error:', e);
  }
}

// ============================================
// Main Entry
// ============================================
exports.main = async (event, context) => {
  const { action, payload } = event;
  console.log(`[API] → ${action || 'unknown'}`);

  try {
    if (!action) {
      return { success: true, actions: Object.keys(handlers), message: '请指定 action 参数' };
    }

    const handler = handlers[action];
    if (!handler) {
      return { success: false, error: true, message: `未知 action: ${action}` };
    }

    const result = await handler({ payload, context });
    return result;
  } catch (e) {
    console.error(`[API] Error in ${action}:`, e);
    return { success: false, error: true, message: e.message || '服务器内部错误', code: 500 };
  }
};
