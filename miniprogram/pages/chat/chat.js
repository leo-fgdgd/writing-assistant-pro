const api = require('../../utils/api');
const logger = require('../../utils/logger');
const storage = require('../../utils/storage');
const { cleanMarkdown } = require('../../utils/markdown');

Page({
  data: {
    messages: [],
    inputValue: '',
    isTyping: false,
    scrollToId: '',
    conversationId: null,
    // Caveman 压缩模式: '' = 关, 'lite' | 'full' | 'ultra'
    caveman: '',
    keyboardHeight: 0,
    quickPrompts: [
      { icon: '⚡', text: '写工作总结' },
      { icon: '✨', text: '朋友圈文案' },
      { icon: '📝', text: '演讲稿' },
      { icon: '🎬', text: '短视频脚本' },
    ],
  },

  onLoad(options) {
    logger.trackPageView('chat');

    // 监听键盘高度变化，动态调整输入区底部间距防止遮挡
    this._onKbHeightChange = (res) => {
      this.setData({ keyboardHeight: res.height });
      // 键盘弹起时滚动到底部
      if (res.height > 0 && this.data.messages.length > 0) {
        this.setData({ scrollToId: 'msg-end' });
      }
    };
    wx.onKeyboardHeightChange(this._onKbHeightChange);

    // Caveman 默认模式：
    // - 有本地偏好（含 'standard'）→ 沿用用户选择
    // - 从专业场景标签进入 → 标准模式（保持专业输出质量）
    // - 自由对话 → 极限模式（省 token）
    const saved = wx.getStorageSync('caveman_mode');
    if (saved === 'standard') {
      this.setData({ caveman: '' });         // 用户之前选了标准
    } else if (saved) {
      this.setData({ caveman: saved });      // 用户之前选了 lite/full/ultra
    } else if (options.sceneId) {
      this.setData({ caveman: '' });         // 专业场景：标准模式
    } else {
      this.setData({ caveman: 'ultra' });    // 自由对话：极限省 token
    }

    // 场景标签 → 填入格式模板（不自动发送，等用户补充后手动发送）
    if (options.sceneId) {
      const templates = {
        academic: '【学术写作】\n主题：\n类型（论文/综述/报告）：\n字数要求：\n其他要求：',
        business: '【商务公文】\n收件人/对象：\n事项：\n语气（正式/友好/紧急）：\n其他要求：',
        creative: '【创意故事】\n类型（脚本/小说/文案）：\n风格（治愈/热血/悬疑）：\n字数/时长：\n其他要求：',
        resume: '【求职简历】\n目标岗位：\n个人背景（经验/技能）：\n目标公司/行业：\n其他要求：',
      };
      const template = templates[options.sceneId];
      if (template) {
        this.setData({ inputValue: template });
      }
    }
    // 加载草稿
    if (options.draftId) {
      setTimeout(() => this._loadDraft(options.draftId), 400);
    }
    // Handle loading conversation from history
    if (options.conversationId) {
      this.setData({ conversationId: options.conversationId });
      api.getConversation(options.conversationId).then(conv => {
        const messages = conv.messages.map(m => {
          if (m.role === 'assistant') return { ...m, content: cleanMarkdown(m.content) };
          return m;
        });
        this.setData({ messages });
      }).catch(() => {
        wx.showToast({ title: '加载对话失败', icon: 'none' });
      });
    }
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onInputFocus() {
    // 键盘弹起时滚动到底部
    if (this.data.messages.length > 0) {
      this.setData({ scrollToId: 'msg-end' });
    }
  },

  onInputBlur() {
    // 键盘收起后重置底部间距
    this.setData({ keyboardHeight: 0 });
  },

  onUnload() {
    if (this._onKbHeightChange) {
      wx.offKeyboardHeightChange(this._onKbHeightChange);
    }
  },

  onTapQuickPrompt(e) {
    const { text } = e.currentTarget.dataset;
    this.setData({ inputValue: `帮我${text}` });
  },

  onSend() {
    const { inputValue, isTyping } = this.data;
    if (!inputValue.trim() || isTyping) return;
    this.sendMessage(inputValue.trim());
  },

  sendMessage(message, sceneId) {
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    this.setData({
      messages: [...this.data.messages, userMsg],
      inputValue: '',
      isTyping: true,
      scrollToId: 'msg-end',
    });

    api.sendChatMessage({
      conversationId: this.data.conversationId,
      sceneId,
      message,
      caveman: this.data.caveman || undefined,
    }).then(result => {
      // 清理 AI 回复中的 Markdown 格式符号
      const messages = result.conversation.messages.map(m => {
        if (m.role === 'assistant') {
          return { ...m, content: cleanMarkdown(m.content) };
        }
        return m;
      });
      this.setData({
        conversationId: result.conversationId,
        messages,
        isTyping: false,
        scrollToId: 'msg-end',
      });
      // 更新预算显示
      if (result.budget) {
        this._onBudgetUpdate(result.budget);
      }
    }).catch(err => {
      const msg = err.message || '发送失败';
      // 429 额度用完 — 特殊提示
      if (msg.includes('额度') || msg.includes('用完') || msg.includes('免费')) {
        wx.showModal({
          title: '今日额度已用完',
          content: '今日 10,000 tokens 免费额度已用完。明天凌晨自动重置，届时可继续使用。',
          showCancel: false,
          confirmText: '知道了',
        });
      } else {
        wx.showToast({ title: msg, icon: 'none' });
      }
      this.setData({ isTyping: false });
    });
  },

  onCopy(e) {
    const { content } = e.currentTarget.dataset;
    wx.setClipboardData({ data: content, success: () => {
      wx.showToast({ title: '已复制', icon: 'none' });
    }});
  },

  onRegenerate() {
    if (!this.data.conversationId || this.data.isTyping) return;

    const { messages } = this.data;
    // Find last user message from current local state
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) {
      wx.showToast({ title: '没有可重新生成的消息', icon: 'none' });
      return;
    }

    wx.showToast({ title: '重新生成中...', icon: 'loading' });

    // Remove last assistant message locally
    const lastIdx = messages.length - 1;
    const trimmedMessages = lastIdx >= 0 && messages[lastIdx].role === 'assistant'
      ? messages.slice(0, lastIdx)
      : messages;

    this.setData({ messages: trimmedMessages });
    this.sendMessage(lastUserMsg.content);
  },

  /** 保存当前输入为草稿 */
  onSaveDraft() {
    const content = this.data.inputValue.trim();
    if (!content) {
      wx.showToast({ title: '请先输入内容', icon: 'none' });
      return;
    }
    storage.saveDraft({
      type: 'chat',
      title: content.slice(0, 30),
      content,
      sceneId: null,
    });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  /** 收藏 AI 回复 */
  onFavorite(e) {
    const { index } = e.currentTarget.dataset;
    const messages = this.data.messages;
    const aiMsg = messages[index];
    if (!aiMsg || aiMsg.role !== 'assistant') return;

    // 找对应的用户消息
    let userMsg = null;
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { userMsg = messages[i]; break; }
    }

    const result = storage.addFavorite({
      type: 'chat',
      title: userMsg ? userMsg.content.slice(0, 30) : aiMsg.content.slice(0, 30),
      userMessage: userMsg ? userMsg.content : '',
      aiResponse: aiMsg.content,
    });

    if (result === null) {
      wx.showToast({ title: '已收藏过这条内容', icon: 'none' });
    } else {
      wx.showToast({ title: '已收藏 ⭐', icon: 'success' });
    }
  },

  /** 加载草稿 */
  _loadDraft(draftId) {
    const draft = storage.getDraft(draftId);
    if (draft) {
      this.setData({ inputValue: draft.content });
      wx.showToast({ title: '草稿已加载', icon: 'success' });
    }
  },

  /** 预算更新 — AI 调用后同步 */
  _onBudgetUpdate(budget) {
    const percent = budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;
    // 超过 80% 时提醒
    if (percent > 80 && percent < 100) {
      wx.showToast({
        title: `今日额度已用 ${percent}%`,
        icon: 'none',
        duration: 2000,
      });
    }
  },

  /** Caveman 压缩模式切换 — 循环: 标准 → lite → full → ultra → 标准 */
  onToggleCaveman() {
    const levels = ['', 'lite', 'full', 'ultra'];
    const current = this.data.caveman || '';
    const nextIdx = (levels.indexOf(current) + 1) % levels.length;
    const next = levels[nextIdx];

    this.setData({ caveman: next });
    // storage 用 'standard' 代替 '' 避免 falsy 导致默认值覆盖
    wx.setStorageSync('caveman_mode', next || 'standard');

    const labels = { '': '标准输出', lite: '精简模式 · 省 ~40%', full: '压缩模式 · 省 ~70%', ultra: '极限压缩 · 省 ~85%' };
    wx.showToast({ title: labels[next], icon: 'none', duration: 1000 });
  },
});
