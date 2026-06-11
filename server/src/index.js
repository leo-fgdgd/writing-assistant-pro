import app from './app.js';
import config from './config.js';
import { initializeSchema } from './db/connection.js';

// Startup validation
if (!config.ai.apiKey) {
  console.warn('[Init] ⚠️  未配置 AI_API_KEY，将使用 Mock 模式运行');
  console.warn('[Init] 💡 在 server/.env 中设置 AI_API_KEY 以启用 AI 功能');
}

if (config.wechat.appId && !config.wechat.appSecret) {
  console.warn('[Init] ⚠️  WECHAT_APPID 已配置但 WECHAT_APPSECRET 为空，微信登录将不可用');
}

// Initialize CloudBase MySQL schema (if configured)
if (config.mysql.host) {
  try {
    await initializeSchema();
  } catch (err) {
    console.warn('[Init] ⚠️  MySQL schema init failed:', err.message);
  }
} else {
  console.warn('[Init] ⚠️  未配置 MySQL (MYSQL_HOST 为空)');
  console.warn('[Init] 💡 在 server/.env 中设置 MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
}

const server = app.listen(config.port, () => {
  const storageType = config.mysql.host ? 'MySQL' : 'JSON 文件';
  console.log(`\n🚀 写作助手 Pro 后端已启动`);
  console.log(`   📡 地址: http://localhost:${config.port}`);
  console.log(`   ❤️  健康检查: http://localhost:${config.port}/api/health`);
  console.log(`   💾 存储: ${storageType}`);
  console.log(`   🤖 AI: ${config.ai.apiKey ? `✅ ${config.ai.provider}` : '⚠️  Mock 模式'}`);
  console.log(`   🔐 鉴权: ${config.wechat.appSecret ? '✅ JWT + 微信登录' : '⚠️  开发模式'}\n`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[Shutdown] 收到 ${signal} 信号，正在优雅关闭...`);
  server.close(() => {
    console.log('[Shutdown] HTTP 服务已关闭');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Shutdown] 强制退出（超时）');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
