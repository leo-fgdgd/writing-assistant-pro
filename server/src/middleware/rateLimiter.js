// Simple in-memory rate limiter
const windowMs = 60 * 1000; // 1 minute
const maxRequests = 60;      // 60 requests per minute

const store = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.resetTime > windowMs * 2) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export default function rateLimiter(req, res, next) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  // Set headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

  if (entry.count > maxRequests) {
    return res.status(429).json({
      error: true,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
  }

  next();
}
