import { Router } from 'express';
import storage from '../services/storageService.js';

const router = Router();

// GET /api/history - Get history with optional search and filter
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const { search, filter } = req.query;
    let history = await storage.getHistory(userId);

    if (search) {
      const q = search.toLowerCase();
      history = history.filter(
        item =>
          item.title?.toLowerCase().includes(q) ||
          item.preview?.toLowerCase().includes(q),
      );
    }

    if (filter && filter !== 'all') {
      history = history.filter(item => item.type === filter);
    }

    res.json(history);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/history/:id - Delete single history entry
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const { id } = req.params;
    const history = await storage.getHistory();
    const entry = history.find(h => String(h.id) === String(id));

    // Ownership check
    if (entry && entry.userId && userId && entry.userId !== userId) {
      return res.status(403).json({ error: true, message: '无权删除此记录' });
    }

    // Also delete the referenced conversation/polish
    if (entry) {
      if (entry.type === 'chat') {
        await storage.deleteConversation(entry.refId);
      } else if (entry.type === 'polish') {
        const safeId = storage._sanitize(entry.refId);
        if (safeId) {
          await storage.deleteFile(`polishes/${safeId}.json`);
        }
      }
    }

    const deleted = await storage.deleteHistoryEntry(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: true, message: '记录不存在' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
