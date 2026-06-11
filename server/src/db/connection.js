import mysql from 'mysql2/promise';
import config from '../config.js';

let pool = null;

export function getPool() {
  if (!pool) {
    if (!config.mysql.host) {
      throw new Error(
        'MySQL not configured. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE in .env.\n' +
        'Get these from CloudBase Console → MySQL Database → Connection Info.'
      );
    }

    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });

    console.log('[DB] MySQL connection pool created');
  }
  return pool;
}

/** Initialize schema from schema.sql */
export async function initializeSchema() {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    console.log('[DB] Initializing database schema...');

    // Each statement is executed individually (semicolon-separated)
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        userId VARCHAR(64) NULL,
        sceneId VARCHAR(32) NULL,
        title VARCHAR(128) NOT NULL DEFAULT '',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        _openid VARCHAR(64) DEFAULT '' NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_updatedAt (updatedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        conversationId VARCHAR(64) NOT NULL,
        role VARCHAR(16) NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        _openid VARCHAR(64) DEFAULT '' NOT NULL,
        INDEX idx_conversationId (conversationId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS polishes (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS history (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS feedback (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS operation_logs (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS system_settings (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    ];

    for (const sql of statements) {
      await connection.execute(sql);
    }

    // Seed default settings if not exists
    await connection.execute(`
      INSERT IGNORE INTO system_settings (id) VALUES ('default')
    `);

    console.log('[DB] Schema initialized successfully');
  } catch (err) {
    console.error('[DB] Schema initialization failed:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}
