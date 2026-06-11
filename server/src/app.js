import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.js';
import polishRoutes from './routes/polish.js';
import historyRoutes from './routes/history.js';
import profileRoutes from './routes/profile.js';
import authRoutes from './routes/auth.js';
import feedbackRoutes from './routes/feedback.js';
import logsRoutes from './routes/logs.js';
import settingsRoutes from './routes/settings.js';
import { optionalAuth } from './middleware/auth.js';
import rateLimiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// CORS — restrict in production
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for all API routes
app.use('/api', rateLimiter);

// Attach user context to all API routes (optional — doesn't block unauthenticated)
app.use('/api', optionalAuth);

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: '写作助手 Pro 后端已启动',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/polish', polishRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: true, message: '接口不存在' });
});

// Error handler
app.use(errorHandler);

export default app;
