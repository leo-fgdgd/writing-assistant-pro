import { getPool } from '../db/connection.js';

class StorageService {
  // ==========================================
  // Users
  // ==========================================

  async getUserByOpenId(openid) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE openid = ?',
      [openid],
    );
    return rows[0] || null;
  }

  async saveUser(user) {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO users (openid, nickName, avatarUrl, isPro, totalCreations, totalTokens, streakDays, lastActiveDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nickName = VALUES(nickName),
         avatarUrl = VALUES(avatarUrl),
         isPro = VALUES(isPro),
         totalCreations = VALUES(totalCreations),
         totalTokens = VALUES(totalTokens),
         streakDays = VALUES(streakDays),
         lastActiveDate = VALUES(lastActiveDate)`,
      [
        user.openid,
        user.nickName || '微信用户',
        user.avatarUrl || '',
        user.isPro ? 1 : 0,
        user.stats?.totalCreations || 0,
        user.stats?.totalTokens || 0,
        user.stats?.streakDays || 0,
        user.stats?.lastActiveDate || null,
      ],
    );
    return user;
  }

  // ==========================================
  // Conversations
  // ==========================================

  async getConversation(id) {
    const pool = getPool();
    // Get conversation + messages
    const [convRows] = await pool.execute(
      'SELECT * FROM conversations WHERE id = ?',
      [id],
    );
    if (!convRows[0]) return null;

    const [msgRows] = await pool.execute(
      'SELECT id, role, content, timestamp FROM messages WHERE conversationId = ? ORDER BY timestamp ASC',
      [id],
    );

    return {
      id: convRows[0].id,
      userId: convRows[0].userId,
      sceneId: convRows[0].sceneId,
      title: convRows[0].title,
      messages: msgRows,
      createdAt: convRows[0].createdAt,
      updatedAt: convRows[0].updatedAt,
    };
  }

  async saveConversation(id, data) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO conversations (id, userId, sceneId, title, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           userId = VALUES(userId),
           sceneId = VALUES(sceneId),
           title = VALUES(title),
           updatedAt = VALUES(updatedAt)`,
        [id, data.userId || null, data.sceneId || null, data.title || '', data.createdAt, data.updatedAt],
      );

      // Delete old messages and re-insert
      await conn.execute('DELETE FROM messages WHERE conversationId = ?', [id]);

      if (data.messages?.length) {
        const placeholders = data.messages.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const values = data.messages.flatMap(m => [
          m.id, id, m.role, m.content, m.timestamp || new Date().toISOString(),
        ]);
        await conn.execute(
          `INSERT INTO messages (id, conversationId, role, content, timestamp) VALUES ${placeholders}`,
          values,
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async listConversations(userId) {
    const pool = getPool();
    let sql = 'SELECT id, sceneId, title, createdAt, updatedAt FROM conversations';
    const params = [];

    if (userId) {
      sql += ' WHERE userId IS NULL OR userId = ?';
      params.push(userId);
    }

    sql += ' ORDER BY updatedAt DESC LIMIT 100';
    const [rows] = await pool.execute(sql, params);

    return rows.map(r => ({
      id: r.id,
      sceneId: r.sceneId,
      title: r.title,
      messageCount: 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async deleteConversation(id) {
    const pool = getPool();
    // messages cascade-deleted via FK or manual
    await pool.execute('DELETE FROM messages WHERE conversationId = ?', [id]);
    await pool.execute('DELETE FROM conversations WHERE id = ?', [id]);
  }

  // ==========================================
  // History
  // ==========================================

  async getHistory(userId) {
    const pool = getPool();
    let sql = 'SELECT * FROM history';
    const params = [];
    if (userId) {
      sql += ' WHERE userId IS NULL OR userId = ?';
      params.push(userId);
    }
    sql += ' ORDER BY createdAt DESC LIMIT 200';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async saveHistory(history) {
    // No-op: history entries are saved individually via addHistoryEntry
  }

  async addHistoryEntry(entry) {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO history (id, userId, type, title, preview, date, tokens, refId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         preview = VALUES(preview),
         date = VALUES(date),
         tokens = VALUES(tokens)`,
      [entry.id, entry.userId || null, entry.type, entry.title, entry.preview, entry.date, entry.tokens, entry.refId || null],
    );
    return entry;
  }

  async deleteHistoryEntry(id, userId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM history WHERE id = ? AND (userId IS NULL OR userId = ?)',
      [String(id), userId || ''],
    );
    return result.affectedRows > 0;
  }

  // ==========================================
  // Polish
  // ==========================================

  async getPolish(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM polishes WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async savePolish(id, data) {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO polishes (id, userId, originalText, polishedText, mode, tokens)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         originalText = VALUES(originalText),
         polishedText = VALUES(polishedText),
         mode = VALUES(mode),
         tokens = VALUES(tokens)`,
      [id, data.userId || null, data.originalText, data.polishedText, data.mode, data.tokens || 0],
    );
  }

  // ==========================================
  // Profile
  // ==========================================

  async getProfile(userId) {
    const pool = getPool();
    if (userId) {
      const [rows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [userId]);
      if (rows[0]) {
        return {
          name: rows[0].nickName,
          avatar: rows[0].avatarUrl,
          isPro: !!rows[0].isPro,
          stats: {
            totalCreations: rows[0].totalCreations,
            totalTokens: rows[0].totalTokens,
            streakDays: rows[0].streakDays,
            lastActiveDate: rows[0].lastActiveDate,
          },
        };
      }
    }
    return {
      name: '创作者',
      avatar: '/images/avatar.png',
      isPro: false,
      stats: { totalCreations: 0, totalTokens: 0, streakDays: 0 },
    };
  }

  async saveProfile(profile, userId) {
    if (!userId) return;
    const pool = getPool();
    await pool.execute(
      `UPDATE users SET nickName = ?, avatarUrl = ?, isPro = ?,
        totalCreations = ?, totalTokens = ?, streakDays = ?, lastActiveDate = ?
       WHERE openid = ?`,
      [
        profile.name || '创作者',
        profile.avatar || '',
        profile.isPro ? 1 : 0,
        profile.stats?.totalCreations || 0,
        profile.stats?.totalTokens || 0,
        profile.stats?.streakDays || 0,
        profile.stats?.lastActiveDate || null,
        userId,
      ],
    );
  }

  // ==========================================
  // Stats
  // ==========================================

  async updateStats(type, tokens, userId) {
    if (!userId) return;
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [userId]);
    if (!rows[0]) return;

    const user = rows[0];
    const newTotal = user.totalCreations + 1;
    const newTokens = user.totalTokens + (tokens || 0);

    let newStreak = user.streakDays || 1;
    const now = new Date();
    if (user.lastActiveDate) {
      const lastDate = new Date(user.lastActiveDate);
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) { /* same day, keep */ }
      else if (diffDays === 1) { newStreak += 1; }
      else { newStreak = 1; }
    }

    await pool.execute(
      `UPDATE users SET totalCreations = ?, totalTokens = ?, streakDays = ?, lastActiveDate = ?
       WHERE openid = ?`,
      [newTotal, newTokens, newStreak, now, userId],
    );
  }

  // ==========================================
  // Feedback
  // ==========================================

  async addFeedback(feedback) {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO feedback (id, userId, userNickName, type, content, contact, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [feedback.id, feedback.userId || null, feedback.userNickName || '', feedback.type, feedback.content, feedback.contact || '', feedback.images ? JSON.stringify(feedback.images) : null],
    );
    return feedback;
  }

  async listFeedback({ status, page = 1, limit = 20 } = {}) {
    const pool = getPool();
    let sql = 'SELECT * FROM feedback';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM (${sql}) t`,
      params,
    );
    const total = countRows[0].total;

    sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [rows] = await pool.execute(sql, params);

    return {
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateFeedback(id, updates) {
    const pool = getPool();
    const sets = [];
    const params = [];
    if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
    if (updates.adminNote !== undefined) { sets.push('adminNote = ?'); params.push(updates.adminNote); }
    if (!sets.length) return null;

    params.push(id);
    await pool.execute(`UPDATE feedback SET ${sets.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [id]);
    return rows[0] || null;
  }

  // ==========================================
  // Operation Logs
  // ==========================================

  async appendLogs(logEntries) {
    if (!logEntries.length) return;
    const pool = getPool();
    const placeholders = logEntries.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = logEntries.flatMap(l => [
      l.action, l.page || '', l.userId || null, l.userNickName || '', l.detail || null, l.ip || '',
    ]);
    await pool.execute(
      `INSERT INTO operation_logs (action, page, userId, userNickName, detail, ip) VALUES ${placeholders}`,
      values,
    );
  }

  async queryLogs({ action, page, userId, startDate, endDate, page: pageNum = 1, limit = 50 } = {}) {
    const pool = getPool();
    const conditions = [];
    const params = [];

    if (action) { conditions.push('action = ?'); params.push(action); }
    if (page) { conditions.push('page LIKE ?'); params.push(`%${page}%`); }
    if (userId) { conditions.push('userId = ?'); params.push(userId); }
    if (startDate) { conditions.push('timestamp >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('timestamp <= ?'); params.push(endDate + ' 23:59:59'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM operation_logs ${where}`,
      params,
    );

    params.push(limit, (pageNum - 1) * limit);
    const [rows] = await pool.execute(
      `SELECT * FROM operation_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      params,
    );

    return {
      items: rows,
      total: countRows[0].total,
      page: pageNum,
      limit,
      totalPages: Math.ceil(countRows[0].total / limit),
    };
  }

  async getLogStats() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count,
        action
      FROM operation_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp), action
      ORDER BY date DESC
    `);

    const stats = { totalLogs: 0, byAction: {}, byPage: {}, dailyCounts: {} };
    for (const row of rows) {
      stats.dailyCounts[row.date] = (stats.dailyCounts[row.date] || 0) + row.count;
      stats.byAction[row.action] = (stats.byAction[row.action] || 0) + row.count;
      stats.totalLogs += row.count;
    }
    return stats;
  }

  // ==========================================
  // System Settings
  // ==========================================

  async getSettings() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM system_settings WHERE id = ?', ['default']);
    if (!rows[0]) return null;

    const s = rows[0];
    return {
      ai: {
        maxTokens: s.ai_maxTokens,
        temperature: s.ai_temperature,
        modelVersion: s.ai_modelVersion,
        maxContextLength: s.ai_maxContextLength,
      },
      limits: {
        maxFreeMessagesPerDay: s.limits_maxFreeMessagesPerDay,
        maxTokensPerMessage: s.limits_maxTokensPerMessage,
        proMaxMessagesPerDay: s.limits_proMaxMessagesPerDay,
        proMaxTokensPerMessage: s.limits_proMaxTokensPerMessage,
      },
      features: {
        enablePolish: !!s.features_enablePolish,
        enableHistoryExport: !!s.features_enableHistoryExport,
        enableProSubscription: !!s.features_enableProSubscription,
        enableFeedback: !!s.features_enableFeedback,
        maintenanceMode: !!s.features_maintenanceMode,
      },
      announcement: {
        enabled: !!s.announcement_enabled,
        title: s.announcement_title,
        content: s.announcement_content,
        url: s.announcement_url,
      },
      appVersion: s.appVersion,
      contactEmail: s.contactEmail,
    };
  }

  async saveSettings(settings) {
    const pool = getPool();
    const s = settings;
    await pool.execute(
      `UPDATE system_settings SET
        ai_maxTokens = ?, ai_temperature = ?, ai_modelVersion = ?, ai_maxContextLength = ?,
        limits_maxFreeMessagesPerDay = ?, limits_maxTokensPerMessage = ?,
        limits_proMaxMessagesPerDay = ?, limits_proMaxTokensPerMessage = ?,
        features_enablePolish = ?, features_enableHistoryExport = ?,
        features_enableProSubscription = ?, features_enableFeedback = ?,
        features_maintenanceMode = ?,
        announcement_enabled = ?, announcement_title = ?, announcement_content = ?, announcement_url = ?,
        appVersion = ?, contactEmail = ?
       WHERE id = 'default'`,
      [
        s.ai?.maxTokens ?? 4096, s.ai?.temperature ?? 0.7, s.ai?.modelVersion ?? 'cloudbase', s.ai?.maxContextLength ?? 8192,
        s.limits?.maxFreeMessagesPerDay ?? 20, s.limits?.maxTokensPerMessage ?? 4096,
        s.limits?.proMaxMessagesPerDay ?? 100, s.limits?.proMaxTokensPerMessage ?? 8192,
        s.features?.enablePolish ? 1 : 0, s.features?.enableHistoryExport ? 1 : 0,
        s.features?.enableProSubscription ? 1 : 0, s.features?.enableFeedback ? 1 : 0,
        s.features?.maintenanceMode ? 1 : 0,
        s.announcement?.enabled ? 1 : 0, s.announcement?.title ?? '', s.announcement?.content ?? '', s.announcement?.url ?? '',
        s.appVersion ?? '1.0.0', s.contactEmail ?? '',
      ],
    );
  }

  // ==========================================
  // Directory helpers (no-op for MySQL — kept for API compat)
  // ==========================================

  async ensureDir() { /* no-op */ }
  async readJSON() { return null; }
  async writeJSON() { /* no-op */ }
  async deleteFile() { /* no-op */ }
  async listFiles() { return []; }
}

export default new StorageService();
