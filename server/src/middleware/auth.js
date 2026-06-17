import jwt from 'jsonwebtoken';
import config from '../config.js';

// Verify JWT token middleware (optional — attaches user if token present, doesn't reject if absent)
export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
  } catch {
    req.user = null;
  }
  next();
}

// Require valid JWT token
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: '请先登录' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: true, message: '登录已过期，请重新登录' });
  }
}
