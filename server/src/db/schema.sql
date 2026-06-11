-- ============================================
-- 写作助手 Pro — CloudBase MySQL Schema
-- 通过 MCP manageSqlDatabase(action="initializeSchema") 执行
-- 或通过 mysql2 直接执行
-- ============================================

-- 用户表 (WeChat 登录)
CREATE TABLE IF NOT EXISTS users (
  openid VARCHAR(64) PRIMARY KEY,
  nickName VARCHAR(128) NOT NULL DEFAULT '微信用户',
  avatarUrl VARCHAR(512) NOT NULL DEFAULT '',
  isPro TINYINT(1) NOT NULL DEFAULT 0,
  totalCreations INT NOT NULL DEFAULT 0,
  totalTokens INT NOT NULL DEFAULT 0,
  streakDays INT NOT NULL DEFAULT 0,
  lastActiveDate DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NULL,
  sceneId VARCHAR(32) NULL,
  title VARCHAR(128) NOT NULL DEFAULT '',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_updatedAt (updatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversationId VARCHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_conversationId (conversationId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 润色记录表
CREATE TABLE IF NOT EXISTS polishes (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NULL,
  originalText TEXT NOT NULL,
  polishedText TEXT NOT NULL,
  mode VARCHAR(32) NOT NULL DEFAULT 'refine',
  tokens INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 历史记录表 (统一活动记录)
CREATE TABLE IF NOT EXISTS history (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'chat',
  title VARCHAR(128) NOT NULL DEFAULT '',
  preview VARCHAR(256) NOT NULL DEFAULT '',
  date VARCHAR(32) NOT NULL DEFAULT '',
  tokens VARCHAR(32) NOT NULL DEFAULT '0',
  refId VARCHAR(64) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_type (type),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 反馈表
CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NULL,
  userNickName VARCHAR(128) NOT NULL DEFAULT '',
  type VARCHAR(32) NOT NULL DEFAULT 'bug',
  content TEXT NOT NULL,
  contact VARCHAR(256) NOT NULL DEFAULT '',
  images TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  adminNote TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(64) NOT NULL,
  page VARCHAR(128) NOT NULL DEFAULT '',
  userId VARCHAR(64) NULL,
  userNickName VARCHAR(128) NOT NULL DEFAULT '',
  detail TEXT NULL,
  ip VARCHAR(64) NOT NULL DEFAULT '',
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp),
  INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统设置表 (单行配置，id 固定为 'default')
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  ai_maxTokens INT NOT NULL DEFAULT 4096,
  ai_temperature DOUBLE NOT NULL DEFAULT 0.7,
  ai_modelVersion VARCHAR(64) NOT NULL DEFAULT 'cloudbase',
  ai_maxContextLength INT NOT NULL DEFAULT 8192,
  limits_maxFreeMessagesPerDay INT NOT NULL DEFAULT 20,
  limits_maxTokensPerMessage INT NOT NULL DEFAULT 4096,
  limits_proMaxMessagesPerDay INT NOT NULL DEFAULT 100,
  limits_proMaxTokensPerMessage INT NOT NULL DEFAULT 8192,
  features_enablePolish TINYINT(1) NOT NULL DEFAULT 1,
  features_enableHistoryExport TINYINT(1) NOT NULL DEFAULT 0,
  features_enableProSubscription TINYINT(1) NOT NULL DEFAULT 0,
  features_enableFeedback TINYINT(1) NOT NULL DEFAULT 1,
  features_maintenanceMode TINYINT(1) NOT NULL DEFAULT 0,
  announcement_enabled TINYINT(1) NOT NULL DEFAULT 0,
  announcement_title VARCHAR(256) NOT NULL DEFAULT '',
  announcement_content TEXT NULL,
  announcement_url VARCHAR(512) NOT NULL DEFAULT '',
  appVersion VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  contactEmail VARCHAR(128) NOT NULL DEFAULT '',
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
