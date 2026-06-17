/**
 * CloudBase AI TokenHub Service
 * Calls CloudBase AI models via HTTP API (OpenAI-compatible endpoint).
 * This is a provider alongside DeepSeek and Moonshot.
 */
import config from '../config.js';

class CloudbaseAiService {
  get isConfigured() {
    return !!(config.cloudbase.envId && config.cloudbase.publishableKey);
  }

  /** Get the OpenAI-compatible base URL for CloudBase AI */
  getBaseUrl() {
    // CloudBase AI HTTP endpoint: https://{envId}.ap-shanghai.tcb-api.tencentcloudapi.com/v1
    const region = process.env.CLOUDBASE_REGION || 'ap-shanghai';
    return `https://${config.cloudbase.envId}.${region}.tcb-api.tencentcloudapi.com/v1`;
  }

  /** Stream a chat completion through CloudBase TokenHub */
  async *streamChat(messages, model = 'deepseek-v4-flash') {
    if (!this.isConfigured) {
      throw new Error('CloudBase AI not configured. Set CLOUDBASE_ENV_ID and CLOUDBASE_PUBLISHABLE_KEY.');
    }

    const body = {
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    };

    // Use publishable key for auth
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.cloudbase.publishableKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`CloudBase AI error ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // skip unparseable chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /** Non-streaming chat (for backward compatibility) */
  async chat(messages, model = 'deepseek-v4-flash') {
    const chunks = [];
    for await (const chunk of this.streamChat(messages, model)) {
      chunks.push(chunk);
    }
    return {
      content: chunks.join(''),
      tokens: Math.ceil(chunks.join('').length / 2),
    };
  }
}

export default new CloudbaseAiService();
