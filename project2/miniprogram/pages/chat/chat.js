const api = require('../../utils/api');
const logger = require('../../utils/logger');

Page({
  data: {
    messages: [],
    inputValue: '',
    isTyping: false,
    scrollToId: '',
    conversationId: null,
    quickPrompts: [
      { icon: '⚡', text: '写工作总结' },
      { icon: '✨', text: '朋友圈文案' },
      { icon: '📝', text: '演讲稿' },
      { icon: '🎬', text: '短视频脚本' },
    ],
  },

  onLoad(options) {
    // Handle scene prompt
    if (options.sceneId) {
      const prompts = {
        academic: '我需要写一篇学术论文的摘要部分，主题是人工智能在医疗诊断中的应用，请帮我梳理一个结构清晰的摘要框架。',
        business: '请帮我写一封商务邮件，向客户介绍我们公司新推出的企业服务方案，语气要专业且友好。',
        creative: '我想写一个短视频脚本，主题是"城市里的治愈瞬间"，时长约1分钟，需要有画面感和情感共鸣。',
        resume: '请帮我写一段简洁有力的个人简介，我是一名有5年经验的产品经理，想突出数据驱动和用户体验设计能力。',
      };
      const msg = prompts[options.sceneId];
      if (msg) {
        this.sendMessage(msg, options.sceneId);
        return;
      }
    }
    // Handle loading conversation from history
    if (options.conversationId) {
      this.setData({ conversationId: options.conversationId });
      api.getConversation(options.conversationId).then(conv => {
        this.setData({ messages: conv.messages });
      }).catch(() => {
        wx.showToast({ title: '加载对话失败', icon: 'none' });
      });
    }
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
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
    }).then(result => {
      this.setData({
        conversationId: result.conversationId,
        messages: result.conversation.messages,
        isTyping: false,
        scrollToId: 'msg-end',
      });
    }).catch(err => {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
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
});
