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

// 使用环境 ID 直接初始化（比 DYNAMIC_CURRENT_ENV 更可靠）
const ENV_ID = 'cloud1-d3gviafeg6e004666';

let db;
let _;
let initError = null;

try {
  cloud.init({ env: ENV_ID });
  db = cloud.database();
  _ = db.command;
  console.log('[语灵 API] 云函数初始化成功, ENV:', ENV_ID);
} catch (e) {
  initError = e;
  console.error('[语灵 API] 初始化失败:', e);
}

// ============================================
// Token Budget — 个人免费额度控制（10k tokens/天）
// ============================================
const DAILY_TOKEN_LIMIT = 5000;

/**
 * 获取用户当日 token 用量（基于 users 集合的 dailyTokens 字段）
 * dailyTokens: { date: "2026-06-14", used: 3500 }
 */
async function _getDailyTokenUsage(openid) {
  try {
    const res = await coll('users').where({ openid }).field({ dailyTokens: true }).get();
    const user = res.data[0];
    if (!user || !user.dailyTokens) return 0;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (user.dailyTokens.date === todayStr) return user.dailyTokens.used || 0;
    return 0;
  } catch (e) {
    console.warn('[TokenBudget] 读取用量失败:', e.message || e);
    return 0;
  }
}

/**
 * 记录/累加用户当日 token 用量
 */
async function _addDailyTokenUsage(openid, tokens) {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // 先读取当前用量（用 get 获取 _id 以便 update）
    const res = await coll('users').where({ openid }).get();
    const user = res.data[0];
    if (!user) return; // 用户不存在则跳过
    const current = (user.dailyTokens && user.dailyTokens.date === todayStr)
      ? (user.dailyTokens.used || 0)
      : 0;
    const nowISO = new Date().toISOString();
    await coll('users').where({ openid }).update({
      data: {
        dailyTokens: { date: todayStr, used: current + tokens, lastUpdated: nowISO },
      },
    });
  } catch (e) {
    console.warn('[TokenBudget] 写入用量失败:', e.message || e);
  }
}

/**
 * 预检查：本次请求是否会超出每日限额
 * @returns {{ ok: true } | { ok: false, used: number, limit: number, remaining: number }}
 */
async function _checkTokenBudget(openid, estimatedTokens) {
  const used = await _getDailyTokenUsage(openid);
  const remaining = DAILY_TOKEN_LIMIT - used;
  if (remaining <= 0) {
    return { ok: false, used, limit: DAILY_TOKEN_LIMIT, remaining: 0 };
  }
  if (estimatedTokens > remaining) {
    return { ok: false, used, limit: DAILY_TOKEN_LIMIT, remaining };
  }
  return { ok: true, used, limit: DAILY_TOKEN_LIMIT, remaining: remaining - estimatedTokens };
}

// ============================================
// AI Service
// ============================================
const https = require('https');
const http = require('http');

// ============================================
// HTTP 连接池 — 复用连接，减少并发 TLS 握手开销
// ============================================
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,       // 空闲连接保留 30s
  maxSockets: 20,               // 最大并发连接数
  maxFreeSockets: 10,           // 空闲连接池上限
  timeout: 25000,               // socket 超时
});

const AI_CONFIG = {
  get apiKey() {
    return process.env.AI_API_KEY || '';
  },
  get provider() {
    return process.env.AI_PROVIDER || 'deepseek';
  },
  get providerConfig() {
    const providers = {
      deepseek: { host: 'api.deepseek.com', path: '/v1/chat/completions', model: 'deepseek-chat' },
      moonshot: { host: 'api.moonshot.cn', path: '/v1/chat/completions', model: 'moonshot-v1-8k' },
    };
    return providers[this.provider] || providers.deepseek;
  },
};

/** 使用 Node.js 原生 https 发请求（连接池复用） */
function httpsRequest(options) {
  return new Promise((resolve, reject) => {
    const { host, path, method, headers, body, timeout = 20000 } = options;
    const req = https.request(
      { host, path, method, headers, timeout, agent: httpsAgent },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      },
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('AI_API_TIMEOUT')); });
    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

/**
 * 调用 AI API（带重试 + 连接池复用）
 * - Keep-Alive 连接池消除重复 TLS 握手（省 ~200ms/请求）
 * - 超时自动重试 1 次
 * - 默认 maxTokens=1024，控制在个人免费额度 10k/天内
 */
async function callAI(messages, options = {}) {
  const { temperature = 0.7, maxTokens = 1024 } = options;
  const cfg = AI_CONFIG.providerConfig;

  if (!AI_CONFIG.apiKey) {
    throw new Error('AI_API_KEY not configured — 请在云函数环境变量中设置 AI_API_KEY');
  }

  console.log(`[AI] → ${cfg.host}, model=${cfg.model}, msgs=${messages.length}, maxTokens=${maxTokens}`);

  const makeRequest = () => httpsRequest({
    host: cfg.host,
    path: cfg.path,
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
    timeout: 20000,
  });

  // 第一次尝试
  let result;
  try {
    result = await makeRequest();
  } catch (firstErr) {
    const isTimeout = firstErr.message === 'AI_API_TIMEOUT';
    console.warn(`[AI] 首次请求失败 (${isTimeout ? '超时' : firstErr.message})，重试中...`);
    try {
      result = await makeRequest();
    } catch (secondErr) {
      console.error(`[AI] 重试也失败: ${secondErr.message}`);
      throw new Error(isTimeout ? 'AI 服务响应超时，请稍后重试' : `AI 服务暂不可用: ${secondErr.message}`);
    }
  }

  if (result.status !== 200) {
    console.error(`[AI] API error ${result.status}:`, JSON.stringify(result.data).slice(0, 200));
    throw new Error(`AI 服务暂不可用 (${result.status})`);
  }

  return {
    content: result.data.choices[0].message.content,
    tokens: result.data.usage?.total_tokens || 0,
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
  academic: '学术写作助手。正式严谨，结构化输出。中文回复。',
  business: '商务写作助手。专业友好，逻辑清晰。中文回复。',
  creative: '创意写作助手。有想象力，画面感强。中文回复。',
  resume: '职业顾问。突出优势，简洁有力。中文回复。',
};

/**
 * Caveman 压缩模式 — 追加到系统提示词末尾
 * 输出 token 节省约 75%，信息密度最大化
 * 强度级别: lite | full | ultra
 */
const CAVEMAN_PROMPTS = {
  lite: '【精简模式】去掉冗余修饰，直接说重点，不寒暄不客套。',
  full: '【压缩模式】规则：1) 去虚词"的/了/是/很" 2) 短句优先 3) 不废话不客套 4) 术语代码原样 5) 信息密度最大化。',
  ultra: '【极限压缩】词语缩写，省略主语连词，→表因果。一词能说清不用两词。代码术语不缩写。',
};

function genId() {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

// ============================================
// Helpers
// ============================================
function ok(data) {
  if (Array.isArray(data)) {
    return { success: true, items: data };
  }
  return { success: true, ...data };
}

function err(message, code = 400) {
  return { success: false, error: true, message, code };
}

function getOpenId(context) {
  return cloud.getWXContext().OPENID;
}

/**
 * 安全集合代理 — 包装 db.collection，集合不存在时自动降级
 * 用法: coll('history').where({...}).get()  → 集合缺失时返回 {data:[]}
 *       coll('history').add({data:{...}})   → 集合缺失时返回 null
 */
const _missingCollections = new Set();

/** 创建安全代理 — 拦截 terminal 方法（get/count/add/update/remove），捕获集合不存在错误 */
function _safeProxy(obj, collectionName) {
  return new Proxy(obj, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;

      const isTerminal = ['get', 'count', 'add', 'update', 'remove'].includes(prop);

      return function (...args) {
        if (_missingCollections.has(collectionName)) {
          if (prop === 'get' || prop === 'count') return Promise.resolve(prop === 'count' ? { total: 0 } : { data: [] });
          return Promise.resolve(null);
        }

        const result = original.apply(target, args);

        if (isTerminal && result && typeof result.then === 'function') {
          return result.catch(e => {
            const msg = (e.message || String(e)).toLowerCase();
            if (msg.includes('-502005') || msg.includes('not exist') || msg.includes('collection')) {
              console.warn(`[DB] 集合 ${collectionName} 不存在，已标记降级。请创建集合后重启。`);
              _missingCollections.add(collectionName);
              if (prop === 'get' || prop === 'count') return prop === 'count' ? { total: 0 } : { data: [] };
              return null;
            }
            throw e;
          });
        }

        // 链式方法 .where() .orderBy() .limit() .field() .skip() → 返回安全代理链
        if (!isTerminal && result && typeof result === 'object') {
          return _safeProxy(result, collectionName);
        }

        return result;
      };
    }
  });
}

function coll(name) {
  return _safeProxy(db.collection(name), name);
}

// 管理员 OPENID 列表（部署后请在云开发控制台 → 云函数 → 环境变量中配置 ADMIN_OPENIDS，用逗号分隔）
const ADMIN_OPENIDS = (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean);

/**
 * 检查当前调用者是否为管理员
 * - 方式一：通过 ADMIN_OPENIDS 环境变量匹配
 * - 方式二（推荐）：通过 users 集合中的 role 字段判断
 */
async function isAdmin() {
  const openid = getOpenId();

  // 检查环境变量白名单
  if (ADMIN_OPENIDS.includes(openid)) return true;

  // 检查数据库中的 role 字段
  try {
    const res = await coll('users').where({ openid }).get();
    if (res.data.length > 0 && res.data[0].role === 'admin') return true;
  } catch (e) {
    console.error('[Admin] 查询用户角色失败:', e);
  }

  return false;
}

function requireAdmin(handler) {
  return async (ctx) => {
    if (!(await isAdmin())) {
      return err('无权限访问', 403);
    }
    return handler(ctx);
  };
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
    const userRes = await coll('users').where({ openid }).get();
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
      await coll('users').add({ data: user });
    } else if (nickName || avatarUrl) {
      const update = {};
      if (nickName) update.nickName = nickName;
      if (avatarUrl) update.avatarUrl = avatarUrl;
      await coll('users').where({ openid }).update({ data: update });
      user = { ...user, ...update };
    }

    return ok({ token: openid, user });
  },

  // ---- Chat ----
  'chat/send': async (ctx) => {
    const openid = getOpenId();
    const { conversationId, sceneId, message, caveman } = ctx.payload || {};

    if (!message || !message.trim()) return err('消息不能为空');

    // ---- Token 预算检查 ----
    const budgetCheck = await _checkTokenBudget(openid, 1024);
    if (!budgetCheck.ok) {
      return err(`今日免费额度已用完（${budgetCheck.used}/${budgetCheck.limit} tokens）。明天凌晨自动重置。`, 429);
    }

    let conv;
    const now = new Date().toISOString();

    if (conversationId) {
      const res = await coll('conversations').where({ id: conversationId }).get();
      conv = res.data[0];
      if (conv && conv.userId !== openid) return err('无权访问此会话', 403);
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
    let systemPrompt = SYSTEM_PROMPTS[conv.sceneId] || '你是一位写作助手，叫"语灵 AI"。用中文回复，友好温暖。';

    // Caveman 压缩模式 — 追加压缩指令到系统提示词
    if (caveman && CAVEMAN_PROMPTS[caveman]) {
      systemPrompt += '\n\n' + CAVEMAN_PROMPTS[caveman];
    }
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
    const existing = await coll('conversations').where({ id: conv.id }).get();
    if (existing.data.length > 0) {
      await coll('conversations').where({ id: conv.id }).update({ data: conv });
    } else {
      await coll('conversations').add({ data: conv });
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
    const histRes = await coll('history').where({ refId: conv.id }).get();
    if (histRes.data.length > 0) {
      await coll('history').where({ refId: conv.id }).update({ data: historyEntry });
    } else {
      await coll('history').add({ data: historyEntry });
    }

    // Update stats + daily token budget
    await _updateStats(openid, 'chat', aiRes.tokens);
    await _addDailyTokenUsage(openid, aiRes.tokens);

    // Build budget info for client display
    const budgetInfo = {
      used: budgetCheck.used + aiRes.tokens,
      limit: DAILY_TOKEN_LIMIT,
      remaining: Math.max(0, DAILY_TOKEN_LIMIT - budgetCheck.used - aiRes.tokens),
    };

    return ok({ conversationId: conv.id, reply: aiRes.content, conversation: conv, budget: budgetInfo });
  },

  'chat/list': async (ctx) => {
    const openid = getOpenId();
    const res = await coll('conversations')
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
    const res = await coll('conversations').where({ id }).get();
    const conv = res.data[0];
    if (!conv) return err('会话不存在', 404);
    if (conv.userId !== openid) return err('无权访问', 403);
    return ok(conv);
  },

  'chat/delete': async (ctx) => {
    const openid = getOpenId();
    const { id } = ctx.payload || {};
    const convRes = await coll('conversations').where({ id }).get();
    const conv = convRes.data[0];
    if (conv && conv.userId !== openid) return err('无权删除', 403);
    await coll('conversations').where({ id }).remove();
    await coll('history').where({ refId: id }).remove();
    return ok({ deleted: true });
  },

  // ---- Polish ----
  polish: async (ctx) => {
    const openid = getOpenId();
    const { text, mode } = ctx.payload || {};

    if (!text || !text.trim()) return err('文本不能为空');
    const validModes = ['refine', 'rewrite', 'formal', 'casual'];
    const polishMode = validModes.includes(mode) ? mode : 'refine';

    // ---- Token 预算检查 ----
    const budgetCheck = await _checkTokenBudget(openid, 512);
    if (!budgetCheck.ok) {
      return err(`今日免费额度已用完（${budgetCheck.used}/${budgetCheck.limit} tokens）。明天凌晨自动重置。`, 429);
    }

    let result;
    try {
      const systemPrompt = {
        refine: '润色以下文字，保持原意。仅输出结果。',
        rewrite: '改写以下文字句式，保持原意。仅输出结果。',
        formal: '将以下文字转为正式书面语。仅输出结果。',
        casual: '将以下文字转为口语化表达。仅输出结果。',
      };
      result = AI_CONFIG.apiKey
        ? await callAI([{ role: 'system', content: systemPrompt[polishMode] }, { role: 'user', content: text.trim() }], { temperature: 0.3, maxTokens: 512 })
        : mockPolish(text.trim(), polishMode);
    } catch {
      result = mockPolish(text.trim(), polishMode);
    }

    const id = genId();
    const now = new Date().toISOString();
    await coll('polishes').add({
      data: { id, userId: openid, mode: polishMode, input: text.trim(), output: result.content, createdAt: now },
    });

    await coll('history').add({
      data: {
        id, userId: openid, type: 'polish',
        title: `润色：${text.trim().slice(0, 15)}...`,
        preview: text.trim().slice(0, 50) + (text.length > 50 ? '...' : ''),
        date: '刚刚', tokens: String(result.tokens), refId: id, createdAt: now,
      },
    });

    await _updateStats(openid, 'polish', result.tokens);
    await _addDailyTokenUsage(openid, result.tokens);

    const budgetInfo = {
      used: budgetCheck.used + result.tokens,
      limit: DAILY_TOKEN_LIMIT,
      remaining: Math.max(0, DAILY_TOKEN_LIMIT - budgetCheck.used - result.tokens),
    };

    return ok({ id, result: result.content, mode: polishMode, input: text.trim(), budget: budgetInfo });
  },

  'polish/get': async (ctx) => {
    const openid = getOpenId();
    const { id } = ctx.payload || {};
    const res = await coll('polishes').where({ id }).get();
    if (res.data.length === 0) return err('记录不存在', 404);
    const record = res.data[0];
    // 数据隔离：校验所有权
    if (record.userId !== openid) return err('无权访问', 403);
    return ok(record);
  },

  // ---- History ----
  history: async (ctx) => {
    const openid = getOpenId();
    const { search, filter } = ctx.payload || {};

    let query = coll('history').where({ userId: openid });
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

    if (!id) return err('缺少 id 参数');
    const histRes = await coll('history').where({ id }).get();
    const entry = histRes.data[0];
    if (entry && entry.userId !== openid) return err('无权删除', 403);

    if (entry) {
      if (entry.type === 'chat') {
        await coll('conversations').where({ id: entry.refId }).remove();
      } else if (entry.type === 'polish') {
        await coll('polishes').where({ id: entry.refId }).remove();
      }
    }

    await coll('history').where({ id }).remove();
    return ok({ deleted: true });
  },

  // ---- Profile ----
  profile: async (ctx) => {
    const openid = getOpenId();
    const res = await coll('users').where({ openid }).get();
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
    const updateData = {};
    if (name !== undefined) updateData.nickName = name;
    if (avatar !== undefined) updateData.avatarUrl = avatar;

    // 尝试更新已有用户
    const updateResult = await coll('users').where({ openid }).update({ data: updateData });

    // 如果集合不存在（updateResult 为 null），兜底返回传入的值
    if (updateResult === null) {
      console.warn('[Profile] users 集合不存在，返回客户端提交的数据');
      return ok({
        name: name || '创作者',
        avatar: avatar || '/images/avatar.png',
        isPro: false,
        stats: { totalCreations: 0, totalTokens: 0, streakDays: 0 },
      });
    }

    // 读取更新后的用户
    const res = await coll('users').where({ openid }).get();
    const user = res.data[0];

    // 用户记录不存在（可能被删除），兜底返回
    if (!user) {
      console.warn('[Profile] 用户记录不存在，返回客户端提交的数据');
      return ok({
        name: name || '创作者',
        avatar: avatar || '/images/avatar.png',
        isPro: false,
        stats: { totalCreations: 0, totalTokens: 0, streakDays: 0 },
      });
    }

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
    await coll('feedback').add({ data: fb });
    return ok({ message: '感谢您的反馈！', id: fb.id });
  },

  'feedback/list': requireAdmin(async (ctx) => {
    const { status, page = 1, limit = 20 } = ctx.payload || {};
    let query = coll('feedback');
    if (status) query = query.where({ status });

    const totalRes = await query.count();
    const total = totalRes.total;
    const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * limit).limit(limit).get();
    return ok({ items: res.data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }),

  'feedback/update': requireAdmin(async (ctx) => {
    const { id, status, adminNote } = ctx.payload || {};
    const update = {};
    if (status !== undefined) update.status = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    await coll('feedback').where({ id }).update({ data: update });
    const res = await coll('feedback').where({ id }).get();
    if (res.data.length === 0) return err('反馈记录不存在', 404);
    return ok(res.data[0]);
  }),

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
      await coll('logs').add({ data: entry });
    }
    return ok({ received: entries.length });
  },

  'logs/query': requireAdmin(async (ctx) => {
    const { action, page, userId, page: pageNum = 1, limit = 50 } = ctx.payload || {};

    let query = coll('logs');
    if (action) query = query.where({ action });
    if (userId) query = query.where({ userId });

    const totalRes = await query.count();
    const total = totalRes.total;
    const res = await query.orderBy('timestamp', 'desc').skip((pageNum - 1) * limit).limit(limit).get();
    return ok({ items: res.data, total, page: pageNum, limit, totalPages: Math.ceil(total / limit) });
  }),

  'logs/stats': requireAdmin(async () => {
    // Last 7 days
    const stats = { totalLogs: 0, byAction: {}, byPage: {} };
    const res = await coll('logs').limit(1000).get();
    for (const log of res.data) {
      stats.totalLogs++;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byPage[log.page] = (stats.byPage[log.page] || 0) + 1;
    }
    return ok(stats);
  }),

  // ---- Settings ----
  settings: async () => {
    const res = await coll('settings').where({ key: 'main' }).get();
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

  'settings/update': requireAdmin(async (ctx) => {
    const data = ctx.payload || {};
    const existing = await coll('settings').where({ key: 'main' }).get();
    if (existing.data.length > 0) {
      await coll('settings').where({ key: 'main' }).update({ data: { data, updatedAt: new Date().toISOString() } });
    } else {
      await coll('settings').add({ data: { key: 'main', data, updatedAt: new Date().toISOString() } });
    }
    const res = await coll('settings').where({ key: 'main' }).get();
    return ok(res.data[0].data);
  }),
};

// ============================================
// Stats helper
// ============================================
async function _updateStats(openid, type, tokens) {
  try {
    const res = await coll('users').where({ openid }).get();
    let user = res.data[0];

    // 用户记录不存在时自动创建（首次使用或集合刚创建）
    if (!user) {
      console.log('[Stats] 用户记录不存在，自动创建:', openid);
      user = {
        openid,
        nickName: '创作者',
        avatarUrl: '/images/avatar.png',
        isPro: false,
        stats: { totalCreations: 0, totalTokens: 0, streakDays: 0, lastActiveDate: null },
        createdAt: new Date().toISOString(),
      };
      const addResult = await coll('users').add({ data: user });
      if (addResult === null) {
        // 集合不存在，放弃本次统计更新（下次部署后可恢复）
        console.warn('[Stats] users 集合不存在，跳过统计更新');
        return;
      }
    }

    const stats = user.stats || { totalCreations: 0, totalTokens: 0, streakDays: 0 };
    stats.totalCreations = (stats.totalCreations || 0) + 1;
    stats.totalTokens = (stats.totalTokens || 0) + (tokens || 0);

    // Calculate streak days
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDate = stats.lastActiveDate
      ? new Date(stats.lastActiveDate)
      : null;

    if (lastDate) {
      const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / 86400000);

      if (diffDays === 0) {
        // Same day — keep current streak
      } else if (diffDays === 1) {
        // Consecutive day — increment streak
        stats.streakDays = (stats.streakDays || 0) + 1;
      } else {
        // Streak broken — reset
        stats.streakDays = 1;
      }
    } else {
      stats.streakDays = 1;
    }
    stats.lastActiveDate = now.toISOString();

    await coll('users').where({ openid }).update({ data: { stats } });
  } catch (e) {
    // Don't fail the main request if stats update fails
    console.error('[Stats] update error:', e.message || e);
  }
}

// ============================================
// Main Entry
// ============================================
exports.main = async (event, context) => {
  const { action, payload } = event;
  console.log(`[API] → ${action || 'unknown'}, OPENID:`, cloud.getWXContext().OPENID);

  // 初始化失败直接返回错误
  if (initError) {
    console.error('[API] 跳过执行 — 初始化失败:', initError.message || initError);
    return { success: false, error: true, message: '云函数初始化失败: ' + (initError.message || 'unknown'), code: 500 };
  }

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
    console.error(`[API] Error in ${action}:`, e.message || e, e.stack);
    return { success: false, error: true, message: e.message || '服务器内部错误', code: 500 };
  }
};
