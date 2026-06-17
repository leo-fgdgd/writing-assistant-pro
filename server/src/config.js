import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '..', '.env') });

// JWT Secret: use env var, or auto-generate & persist (dev convenience)
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const secretFile = resolve(__dirname, '..', '.jwt-secret');
  try {
    const saved = fs.readFileSync(secretFile, 'utf-8').trim();
    if (saved) {
      console.warn('[Config] ⚠️  使用本地持久化 JWT 密钥（从 .jwt-secret 读取）。生产环境请设置 JWT_SECRET 环境变量');
      return saved;
    }
  } catch { /* file doesn't exist yet */ }

  const generated = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(secretFile, generated, 'utf-8');
  console.warn('[Config] ⚠️  已自动生成 JWT 密钥并保存到 .jwt-secret。生产环境请务必设置 JWT_SECRET 环境变量');
  return generated;
}

export default {
  port: parseInt(process.env.PORT, 10) || 3001,
  ai: {
    provider: process.env.AI_PROVIDER || 'cloudbase',
    apiKey: process.env.AI_API_KEY || process.env.KIMI_API_KEY || '',
    providers: {
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      },
      moonshot: {
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
      },
      cloudbase: {
        baseUrl: '',
        model: process.env.CLOUDBASE_AI_MODEL || 'deepseek-v4-flash',
      },
    },
  },
  jwtSecret: getJwtSecret(),
  wechat: {
    appId: process.env.WECHAT_APPID || '',
    appSecret: process.env.WECHAT_APPSECRET || '',
  },
  mysql: {
    host: process.env.MYSQL_HOST || '',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  },
  cloudbase: {
    envId: process.env.CLOUDBASE_ENV_ID || '',
    publishableKey: process.env.CLOUDBASE_PUBLISHABLE_KEY || '',
    region: process.env.CLOUDBASE_REGION || 'ap-shanghai',
  },
  dataDir: resolve(__dirname, 'data'),
};
