import config from '../config.js';

class AIService {
  constructor() {
    const provider = config.ai.providers[config.ai.provider] || config.ai.providers.moonshot;
    this.apiKey = config.ai.apiKey;
    this.baseUrl = provider.baseUrl;
    this.model = provider.model;
  }

  get isConfigured() {
    return !!this.apiKey;
  }

  async _callAPI(messages, temperature, maxTokens, timeoutMs = 30000) {
    const body = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    console.log(`[AI Service] Calling ${this.baseUrl}/chat/completions with model ${this.model}`);

    // Timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = '(could not read error body)';
        }

        // Parse and log a user-friendly message with dynamic provider reference
        const providerName = config.ai.provider === 'deepseek' ? 'DeepSeek' : 'Moonshot(Kimi)';
        const consoleUrl = config.ai.provider === 'deepseek'
          ? 'https://platform.deepseek.com/console/billing'
          : 'https://platform.moonshot.cn/console/billing';
        const apiKeyUrl = config.ai.provider === 'deepseek'
          ? 'https://platform.deepseek.com/api_keys'
          : 'https://platform.moonshot.cn/console/api-keys';

        try {
          const errJson = JSON.parse(errorBody);
          const msg = errJson?.error?.message || errorBody;
          if (response.status === 429) {
            console.error(`[AI Service] ⚠️  ${providerName} 账户余额不足或超限: ${msg}`);
            console.error(`[AI Service] 💡 请前往 ${consoleUrl} 充值`);
          } else if (response.status === 401) {
            console.error(`[AI Service] ❌ ${providerName} API Key 无效: ${msg}`);
            console.error(`[AI Service] 💡 请前往 ${apiKeyUrl} 检查`);
          } else {
            console.error(`[AI Service] ${providerName} API returned ${response.status}: ${msg}`);
          }
        } catch {
          console.error(`[AI Service] ${providerName} API returned ${response.status}: ${errorBody}`);
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        tokens: data.usage?.total_tokens || 0,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async chat(messages, sceneId) {
    if (!this.isConfigured) {
      return this.fallbackChat(messages, sceneId);
    }

    try {
      const systemPrompt = this.getSystemPrompt(sceneId);
      return await this._callAPI(
        [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        0.7,
        4096,
      );
    } catch (err) {
      console.error('[AI Service] Chat error, falling back to mock:', err.message);
      return this.fallbackChat(messages, sceneId);
    }
  }

  async polish(text, mode) {
    if (!this.isConfigured) {
      return this.fallbackPolish(text, mode);
    }

    try {
      const systemPrompt = this.getPolishPrompt(mode);
      return await this._callAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        0.3,
        4096,
      );
    } catch (err) {
      console.error('[AI Service] Polish error, falling back to mock:', err.message);
      return this.fallbackPolish(text, mode);
    }
  }

  getSystemPrompt(sceneId) {
    const prompts = {
      academic: '你是一位学术写作专家。帮助用户撰写学术论文、摘要、研究报告。使用正式、严谨的语言，提供结构化输出。用中文回复。',
      business: '你是一位商务写作专家。帮助用户撰写商务邮件、报告、策划方案。语言专业且友好，注重逻辑清晰。用中文回复。',
      creative: '你是一位创意写作专家。帮助用户撰写故事、脚本、文案。富有想象力和感染力，注重画面感和情感表达。用中文回复。',
      resume: '你是一位职业发展顾问。帮助用户撰写简历、求职信、个人简介。突出个人优势，语言简洁有力。用中文回复。',
    };
    return prompts[sceneId] || '你是一位写作助手，叫"语灵 AI"。根据用户需求提供写作帮助。回答要结构化、实用、直接可用。用中文回复，语气友好温暖。';
  }

  getPolishPrompt(mode) {
    const prompts = {
      refine: '你是一位文字润色专家。优化以下文本：改善表达流畅度，修正语法问题，保持原意不变。只输出润色后的文本，不要解释。',
      rewrite: '你是一位句式改写专家。用不同的句式重新表达以下文本，保持原意。只输出改写后的文本，不要解释。',
      formal: '你是一位正式文体专家。将以下文本转换为正式、专业的商务或学术风格。只输出转换后的文本，不要解释。',
      casual: '你是一位口语化专家。将以下文本转换为轻松、日常的对话风格。只输出转换后的文本，不要解释。',
    };
    return prompts[mode] || prompts.refine;
  }

  // ---- Mock fallbacks ----

  fallbackChat(messages, sceneId) {
    console.log('[AI Service] Using mock chat fallback (no API key configured)');
    const lastMessage = messages[messages.length - 1]?.content || '';

    const mockResponses = {
      academic: `好的，以下是为您梳理的学术写作框架：

**一、研究背景**
随着相关领域的快速发展，该课题在理论与实践中都展现出重要意义。现有研究主要集中在以下几个方面...

**二、研究目的**
本研究旨在系统分析该领域的核心问题，探索可行的解决方案，为后续研究提供参考...

**三、研究方法**
采用文献综述与案例分析相结合的方法，收集并整理近年来该领域的代表性研究成果...

**四、核心发现**
初步分析表明，该领域存在以下关键问题需要进一步深入探讨...

需要我针对某个部分展开详细写作吗？`,

      business: `主题：【商务合作】关于合作方案的初步沟通

尊敬的合作伙伴您好，

感谢贵公司对我们业务发展的关注与支持。我是语灵 AI 团队的项目负责人。

我们很高兴向您介绍我们最新的合作方案，该方案涵盖了以下核心内容：

**方案亮点：**
• 全面覆盖业务核心需求
• 快速部署，高效执行
• 专业团队全程支持

不知您本周下半周是否有空？我们可以安排一次详细沟通。

期待您的回复！

此致
敬礼

语灵 AI 团队`,

      creative: `**创意脚本：《灵感瞬间》**
**风格：** 温暖/治愈/生活美学

---

**【开场】**
画面：晨光透过窗户洒在木质桌面上。一杯冒着热气的咖啡，旁边是一本翻开的笔记本。
字幕："每一个灵感，都值得被记录"

**【主线 - 三个创作瞬间】**

片段1：深夜书房，台灯下手指在键盘上飞舞
字幕："深夜的思绪，是最真实的声音"

片段2：街角咖啡馆，窗边的人对着手机微笑
字幕："一句话，可以温暖一整天"

片段3：公园长椅上，老人在笔记本上写着什么
字幕："写作，是最长情的陪伴"

**【结尾】**
画面：不同的人在各自的空间里写作，镜头拉远
字幕："语灵 AI，让每一个灵感发光"

---

需要我调整风格或补充细节吗？`,

      resume: `以下是一份专业的个人简介：

---

**个人简介**

拥有丰富的行业经验，擅长以数据驱动决策、以用户为中心设计解决方案。曾主导多个重要项目的从0到1建设，积累了扎实的实战经验。

**核心优势：**
• **专业能力：** 精通行业核心技能，具备系统化的知识体系
• **实战经验：** 主导多个高价值项目，成果显著
• **团队协作：** 高效协调多方资源，推动项目顺利交付

**职业愿景：** 致力于在专业领域持续深耕，创造更大的价值。

---

需要我根据具体岗位要求调整侧重点吗？`,
    };

    const defaultResponse = `收到！我来帮您创作。

为了给您提供最精准的内容，能否补充几个细节：

1. **目标受众**是谁？（如：同事、客户、社交媒体粉丝）
2. **语气风格**偏好？（正式/轻松/文艺/专业）
3. **大致字数**要求？

或者，您可以直接告诉我具体需求，我会为您生成一版初稿！`;

    return {
      content: mockResponses[sceneId] || defaultResponse,
      tokens: Math.floor(Math.random() * 800) + 400,
    };
  }

  fallbackPolish(text, mode) {
    console.log('[AI Service] Using mock polish fallback (no API key configured)');

    // Actually apply transformations for each mode
    const refine = (t) => {
      // Basic refinement: normalize punctuation, add polishing note
      let refined = t.replace(/，，/g, '，').replace(/。。/g, '。');
      refined = refined.replace(/[，,](\S)/g, '，$1');
      refined = refined.replace(/[。.](\S)/g, '。$1');
      return refined + '\n\n（文字已优化，表达更流畅自然）';
    };

    const rewrite = (t) => {
      const sentences = t.split(/[，。！？；、]/).filter(s => s.trim());
      if (sentences.length <= 1) return '从新的角度来表达：' + t;
      // Reverse sentence order for a simple "rewrite" effect
      return sentences.reverse().join('，') + '。';
    };

    const formal = (t) => `兹就相关事项报告如下：\n\n${t}\n\n以上内容，敬请审阅。`;

    const casual = (t) => `嘿，简单说就是：${t} — 感觉挺不错的！`;

    const mockResults = {
      refine: refine(text),
      rewrite: rewrite(text),
      formal: formal(text),
      casual: casual(text),
    };

    return {
      content: mockResults[mode] || mockResults.refine,
      tokens: Math.floor(Math.random() * 200) + 100,
    };
  }
}

export default new AIService();
