import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import storage from '../services/storageService.js';
import ai from '../services/aiService.js';

const router = Router();

// POST /api/chat/send - Send message and get AI reply
router.post('/send', async (req, res, next) => {
  try {
    const { conversationId, sceneId, message } = req.body;
    const userId = req.user?.openid || null;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: true, message: '消息不能为空' });
    }

    let conversation;
    if (conversationId) {
      conversation = await storage.getConversation(conversationId);
      // Ownership check: if conversation has a userId, only that user can access it
      if (conversation && conversation.userId && userId && conversation.userId !== userId) {
        return res.status(403).json({ error: true, message: '无权访问此会话' });
      }
    }

    if (!conversation) {
      // Create new conversation
      const id = uuidv4();
      conversation = {
        id,
        userId,
        sceneId: sceneId || null,
        title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Add user message
    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(userMsg);

    // Build messages for AI (only role + content)
    const aiMessages = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get AI response (with timeout — 30s)
    const aiResponse = await ai.chat(aiMessages, conversation.sceneId);

    // Add assistant message
    const assistantMsg = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(assistantMsg);
    conversation.updatedAt = new Date().toISOString();

    // Update title from first user message if not set
    if (conversation.messages.filter(m => m.role === 'user').length === 1) {
      conversation.title = message.trim().slice(0, 30) + (message.trim().length > 30 ? '...' : '');
    }

    // Save conversation
    await storage.saveConversation(conversation.id, conversation);

    // Add/update history entry
    const history = await storage.getHistory();
    const existingIdx = history.findIndex(h => h.refId === conversation.id);
    const historyEntry = {
      id: conversation.id,
      userId,
      type: 'chat',
      title: conversation.title,
      preview: message.trim().slice(0, 50) + (message.trim().length > 50 ? '...' : ''),
      date: '刚刚',
      tokens: String(aiResponse.tokens),
      refId: conversation.id,
    };

    if (existingIdx >= 0) {
      history[existingIdx] = historyEntry;
    } else {
      history.unshift(historyEntry);
    }
    await storage.saveHistory(history);

    // Update user stats
    await storage.updateStats('chat', aiResponse.tokens, userId);

    res.json({
      conversationId: conversation.id,
      reply: aiResponse.content,
      conversation,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat - List all conversations
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const conversations = await storage.listConversations(userId);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/:id - Get conversation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const conversation = await storage.getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: true, message: '会话不存在' });
    }
    // Ownership check
    if (conversation.userId && userId && conversation.userId !== userId) {
      return res.status(403).json({ error: true, message: '无权访问此会话' });
    }
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chat/:id - Delete conversation
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.openid || null;
    const conversation = await storage.getConversation(req.params.id);
    if (conversation && conversation.userId && userId && conversation.userId !== userId) {
      return res.status(403).json({ error: true, message: '无权删除此会话' });
    }
    await storage.deleteConversation(req.params.id);
    // Also remove from history
    const history = await storage.getHistory();
    const filtered = history.filter(h => h.refId !== req.params.id);
    await storage.saveHistory(filtered);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/stream — SSE streaming chat
router.post('/stream', async (req, res) => {
  try {
    const { conversationId, sceneId, message } = req.body;
    const userId = req.user?.openid || null;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: true, message: '消息不能为空' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const sendSSE = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Load or create conversation
      let conversation;
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (conversation?.userId && userId && conversation.userId !== userId) {
          sendSSE('error', { message: '无权访问此会话' });
          res.end();
          return;
        }
      }

      if (!conversation) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        conversation = {
          id,
          userId,
          sceneId: sceneId || null,
          title: message.slice(0, 30),
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Add user message
      const userMsg = {
        id: `${Date.now()}-usr`,
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(userMsg);

      // Build messages for AI
      const aiMessages = conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Send conversationId back first
      sendSSE('meta', { conversationId: conversation.id });

      // Stream AI response
      let fullContent = '';
      let totalTokens = 0;

      if (config.ai.provider === 'cloudbase' && config.cloudbase.envId) {
        // Use CloudBase AI streaming
        const cloudbaseAi = (await import('../services/cloudbaseAiService.js')).default;
        for await (const chunk of cloudbaseAi.streamChat(aiMessages, config.ai.providers.cloudbase.model)) {
          fullContent += chunk;
          sendSSE('token', { content: chunk });
        }
        totalTokens = Math.ceil(fullContent.length / 2);
      } else if (ai.isConfigured) {
        // Use existing AI service (non-streaming for now)
        const result = await ai.chat(aiMessages, conversation.sceneId);
        fullContent = result.content;
        totalTokens = result.tokens;
        // Simulate streaming by sending chunks
        const chunkSize = 3;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          sendSSE('token', { content: fullContent.slice(i, i + chunkSize) });
        }
      } else {
        // Mock fallback
        const result = ai.fallbackChat(aiMessages, conversation.sceneId);
        fullContent = result.content;
        totalTokens = result.tokens;
        const chunkSize = 5;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          sendSSE('token', { content: fullContent.slice(i, i + chunkSize) });
          await new Promise(r => setTimeout(r, 15)); // simulate latency
        }
      }

      // Add assistant message
      const assistantMsg = {
        id: `${Date.now()}-ast`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(assistantMsg);
      conversation.updatedAt = new Date().toISOString();

      // Save conversation
      await storage.saveConversation(conversation.id, conversation);

      // Update history
      const history = await storage.getHistory();
      const historyEntry = {
        id: conversation.id,
        userId,
        type: 'chat',
        title: conversation.title,
        preview: message.trim().slice(0, 50),
        date: '刚刚',
        tokens: String(totalTokens),
        refId: conversation.id,
      };
      const existingIdx = history.findIndex(h => h.refId === conversation.id);
      if (existingIdx >= 0) history[existingIdx] = historyEntry;
      else history.unshift(historyEntry);
      await storage.saveHistory(history);

      // Update stats
      await storage.updateStats('chat', totalTokens, userId);

      sendSSE('done', { conversationId: conversation.id, tokens: totalTokens });
    } catch (err) {
      sendSSE('error', { message: err.message || 'AI 调用失败' });
    }

    res.end();
  } catch (err) {
    // If headers not sent, fall back to JSON error
    if (!res.headersSent) {
      next(err);
    } else {
      res.end();
    }
  }
});

export default router;
