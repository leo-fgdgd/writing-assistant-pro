import { Router } from 'express';
import storage from '../services/storageService.js';

const router = Router();

// Default settings
const DEFAULT_SETTINGS = {
  // AI 模型配置
  ai: {
    maxTokens: 4096,
    temperature: 0.7,
    modelVersion: 'default',
    maxContextLength: 10,
  },
  // 创作限制
  limits: {
    maxFreeMessagesPerDay: 50,
    maxTokensPerMessage: 2048,
    proMaxMessagesPerDay: 500,
    proMaxTokensPerMessage: 8192,
  },
  // 功能开关
  features: {
    enablePolish: true,
    enableHistoryExport: false,
    enableProSubscription: false,
    enableFeedback: true,
    maintenanceMode: false,
  },
  // 公告
  announcement: {
    enabled: false,
    title: '',
    content: '',
    url: '',
  },
  // 其他
  appVersion: '2.1.0',
  contactEmail: 'feedback@yuling-ai.com',
};

// GET /api/settings - Get system settings (public, no auth required)
router.get('/', async (_req, res, next) => {
  try {
    const settings = await storage.getSettings();
    // Merge with defaults so new keys always exist
    const merged = deepMerge(DEFAULT_SETTINGS, settings || {});
    res.json(merged);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings - Update system settings (admin only in production)
router.put('/', async (req, res, next) => {
  try {
    const current = await storage.getSettings();
    const updated = deepMerge(current || DEFAULT_SETTINGS, req.body);
    await storage.saveSettings(updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/settings - Partial update a single setting path
router.patch('/', async (req, res, next) => {
  try {
    const { path, value } = req.body;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: true, message: '请提供设置路径 path' });
    }

    const current = await storage.getSettings();
    const base = deepMerge(DEFAULT_SETTINGS, current || {});

    // Set nested value by dot-path, e.g. "ai.temperature"
    const keys = path.split('.');
    let target = base;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    await storage.saveSettings(base);
    res.json(base);
  } catch (err) {
    next(err);
  }
});

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export default router;
