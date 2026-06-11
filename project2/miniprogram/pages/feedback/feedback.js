const api = require('../../utils/api');
const logger = require('../../utils/logger');

Page({
  data: {
    activeTab: 'faq', // 'faq' | 'feedback'
    faqs: [
      {
        id: 1,
        q: '语灵 AI 可以做什么？',
        a: '语灵 AI 是一款智能写作助手，支持多种场景创作：学术论文、商务公文、创意故事、求职简历等。您只需输入需求，AI 即可帮您生成高质量文本，并支持文风润色。',
        open: false,
      },
      {
        id: 2,
        q: '如何获得更好的 AI 写作效果？',
        a: '建议您在输入时尽量具体描述您的需求，包括：文体类型（论文/邮件/故事等）、目标读者、字数范围、风格偏好（正式/轻松/文艺等）。描述越详细，生成效果越好。',
        open: false,
      },
      {
        id: 3,
        q: '生成的创作内容存储在哪里？',
        a: '创作内容会加密存储在云端服务器，并在您的本地缓存中保留副本。您可以在「历史记录」中查看过往创作，也可以随时删除不需要的内容。',
        open: false,
      },
      {
        id: 4,
        q: '对话记录会被用于训练 AI 吗？',
        a: '不会。我们严格遵守隐私保护原则，您的创作内容仅用于为您提供写作服务，不会用于任何 AI 模型训练。',
        open: false,
      },
      {
        id: 5,
        q: '如何删除我的创作记录？',
        a: '您可以在「工具箱 > 历史记录」中左滑单条删除，也可以一键清空全部历史。删除操作不可撤销，请谨慎操作。',
        open: false,
      },
      {
        id: 6,
        q: '支持哪些写作场景？',
        a: '当前支持学术写作、商务公文、创意故事、求职简历四大场景，以及自由对话模式。我们会持续增加更多写作模板。',
        open: false,
      },
      {
        id: 7,
        q: '小程序需要联网使用吗？',
        a: '是的，AI 创作功能需要连接后端服务器才能工作。请确保网络连接正常。如果在弱网环境下使用，可能会有响应延迟。',
        open: false,
      },
      {
        id: 8,
        q: 'Pro 会员有什么权益？',
        a: 'Pro 会员可享受：无限创作次数、优先响应通道、高级 AI 模型、更长上下文支持。Pro 功能正在开发中，敬请期待。',
        open: false,
      },
    ],
    feedbackContent: '',
    feedbackContact: '',
    submitting: false,
  },

  onLoad() {
    logger.trackPageView('feedback');
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
  },

  toggleFaq(e) {
    const { id } = e.currentTarget.dataset;
    const faqs = this.data.faqs.map(f => {
      if (f.id === id) {
        return { ...f, open: !f.open };
      }
      return f;
    });
    this.setData({ faqs });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ feedbackContact: e.detail.value });
  },

  onSubmitFeedback() {
    const { feedbackContent, feedbackContact, submitting } = this.data;

    if (submitting) return;

    if (!feedbackContent.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }

    if (feedbackContent.trim().length < 4) {
      wx.showToast({ title: '反馈内容至少4个字', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    api.submitFeedback({
      content: feedbackContent.trim(),
      contact: feedbackContact.trim(),
    }).then(() => {
      wx.showToast({ title: '感谢反馈！', icon: 'success' });
      this.setData({
        feedbackContent: '',
        feedbackContact: '',
        submitting: false,
      });
    }).catch(() => {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ submitting: false });
    });
  },
});
