import { Router } from 'express';
import storage from '../services/storageService.js';

const router = Router();

// POST /api/logs - Receive batch operation logs from mini program
router.post('/', async (req, res, next) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: true, message: '日志数据格式错误' });
    }

    // Validate each log entry
    const validActions = ['page_view', 'button_click', 'api_call', 'error', 'lifecycle'];
    const sanitized = logs
      .filter(log => log && validActions.includes(log.action))
      .map(log => ({
        action: log.action,
        page: log.page || 'unknown',
        userId: log.userId || 'anonymous',
        timestamp: log.timestamp || new Date().toISOString(),
        device: log.device || {},
        extra: log.extra || {},
        serverReceivedAt: new Date().toISOString(),
      }));

    if (sanitized.length > 0) {
      await storage.appendLogs(sanitized);
      console.log(`[Logs] 收到 ${sanitized.length} 条操作日志`);
    }

    res.json({ success: true, received: sanitized.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/logs - Query logs (admin use)
router.get('/', async (req, res, next) => {
  try {
    const {
      action,
      page,
      userId,
      startDate,
      endDate,
      page: pageNum = 1,
      limit = 50,
    } = req.query;

    const pageNumVal = Math.max(1, parseInt(pageNum, 10) || 1);
    const limitVal = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const result = await storage.queryLogs({
      action,
      page,
      userId,
      startDate,
      endDate,
      page: pageNumVal,
      limit: limitVal,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/logs/stats - Get log statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await storage.getLogStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
