import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import storage from '../services/storageService.js';
import ai from '../services/aiService.js';

const router = Router();

// POST /api/polish - Polish text
router.post('/', async (req, res, next) => {
  try {
    const { text, mode } = req.body;
    const userId = req.user?.openid || null;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: true, message: '文本不能为空' });
    }

    const validModes = ['refine', 'rewrite', 'formal', 'casual'];
    const polishMode = validModes.includes(mode) ? mode : 'refine';

    // Get AI polish result
    const result = await ai.polish(text.trim(), polishMode);

    // Save polish record
    const id = uuidv4();
    const polishRecord = {
      id,
      userId,
      mode: polishMode,
      input: text.trim(),
      output: result.content,
      createdAt: new Date().toISOString(),
    };
    await storage.savePolish(id, polishRecord);

    // Add history entry
    const historyEntry = {
      id,
      userId,
      type: 'polish',
      title: `润色：${text.trim().slice(0, 15)}...`,
      preview: text.trim().slice(0, 50) + (text.trim().length > 50 ? '...' : ''),
      date: '刚刚',
      tokens: String(result.tokens),
      refId: id,
    };
    await storage.addHistoryEntry(historyEntry);

    // Update stats
    await storage.updateStats('polish', result.tokens, userId);

    res.json({
      id,
      result: result.content,
      mode: polishMode,
      input: text.trim(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/polish/:id - Get polish result
router.get('/:id', async (req, res, next) => {
  try {
    const polish = await storage.getPolish(req.params.id);
    if (!polish) {
      return res.status(404).json({ error: true, message: '记录不存在' });
    }
    res.json(polish);
  } catch (err) {
    next(err);
  }
});

export default router;
