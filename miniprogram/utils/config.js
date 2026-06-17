/**
 * 语灵 AI 小程序 — 全局配置
 *
 * mode: 'cloud' → 使用云函数（无需自建服务器，推荐）
 * mode: 'http'  → 使用自建 HTTP 后端
 */

// ============================================
// ★ 部署模式（二选一）
// ============================================
const mode = 'cloud'; // 'cloud' | 'http'

// CloudBase 环境 ID（mode='cloud' 时有效）
const cloudEnvId = 'cloud1-d3gviafeg6e004666';

// HTTP 模式下的后端地址（mode='http' 时有效）
const httpBaseUrl = 'http://127.0.0.1:3001';

module.exports = {
  /** 部署模式：cloud | http */
  mode,

  /** CloudBase 环境 ID */
  cloudEnvId,

  /** HTTP 模式下的 API 基础地址 */
  httpBaseUrl,

  /** API 前缀 */
  apiPrefix: '/api',

  /** 云函数名称 */
  cloudFunctionName: 'api',

  /** 请求超时（毫秒）— 普通查询 */
  requestTimeout: 10000,

  /** AI 操作超时（毫秒）— 对话/润色需等待模型响应 */
  aiRequestTimeout: 30000,

  /** 日志上报批量大小 */
  logBatchSize: 20,

  /** 日志上报间隔（毫秒） */
  logFlushInterval: 8000,
};
