import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import storage from '../services/storageService.js';

const router = Router();

// POST /api/feedback - Submit user feedback
router.post('/', async (req, res, next) => {
  try {
    const { content, contact } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length < 4) {
      return res.status(400).json({
        error: true,
        message: '反馈内容至少需要 4 个字符',
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        error: true,
        message: '反馈内容不能超过 2000 个字符',
      });
    }

    const feedback = {
      id: uuidv4(),
      userId: req.user?.openid || 'anonymous',
      nickName: req.user?.nickName || null,
      content: content.trim(),
      contact: contact?.trim() || null,
      status: 'pending', // pending | resolved | closed
      adminNote: '',
      createdAt: new Date().toISOString(),
    };

    await storage.addFeedback(feedback);

    res.json({
      success: true,
      message: '感谢您的反馈！我们会认真处理。',
      id: feedback.id,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback - List feedbacks (admin use)
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const feedbacks = await storage.listFeedback({
      status: status || undefined,
      page: pageNum,
      limit: limitNum,
    });

    res.json(feedbacks);
  } catch (err) {
    next(err);
  }
});

// PUT /api/feedback/:id - Update feedback status (admin use)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const updated = await storage.updateFeedback(id, { status, adminNote });
    if (!updated) {
      return res.status(404).json({ error: true, message: '反馈记录不存在' });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
