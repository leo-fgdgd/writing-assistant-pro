import { Router } from 'express';
import storage from '../services/storageService.js';

const router = Router();

// GET /api/profile - Get user profile
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const profile = await storage.getProfile(userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile - Update user profile
router.put('/', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const current = await storage.getProfile(userId);
    const { name, avatar } = req.body;
    const updated = {
      ...current,
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatar }),
    };
    await storage.saveProfile(updated, userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
