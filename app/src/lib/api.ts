import type {
  ChatResponse,
  Conversation,
  ConversationSummary,
  PolishResponse,
  HistoryItem,
  Profile,
} from '../types/api';

const BASE_URL = '/api';
const DEFAULT_TIMEOUT = 15000; // 15 seconds

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: customHeaders, ...restOptions } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---- Chat API (SSE streaming) ----

export interface StreamChatCallbacks {
  onMeta: (data: { conversationId: string }) => void;
  onToken: (content: string) => void;
  onDone: (data: { conversationId: string; tokens: number }) => void;
  onError: (message: string) => void;
}

/** Send a chat message and receive streaming response via SSE */
export async function streamChatMessage(
  params: { conversationId?: string; sceneId?: string; message: string },
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(err.message || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double-newline (SSE event boundary)
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = '';
        let dataStr = '';

        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
        }

        if (!dataStr) continue;

        try {
          const data = JSON.parse(dataStr);
          switch (eventType) {
            case 'meta':
              callbacks.onMeta(data);
              break;
            case 'token':
              callbacks.onToken(data.content);
              break;
            case 'done':
              callbacks.onDone(data);
              break;
            case 'error':
              callbacks.onError(data.message);
              break;
          }
        } catch {
          // skip unparseable
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function sendChatMessage(params: {
  conversationId?: string;
  sceneId?: string;
  message: string;
}): Promise<ChatResponse> {
  return request('/chat/send', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getConversation(id: string): Promise<Conversation> {
  return request(`/chat/${id}`);
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return request('/chat');
}

export async function deleteConversation(id: string): Promise<{ success: boolean }> {
  return request(`/chat/${id}`, { method: 'DELETE' });
}

// ---- Polish API ----

export async function polishText(params: {
  text: string;
  mode: 'refine' | 'rewrite' | 'formal' | 'casual';
}): Promise<PolishResponse> {
  return request('/polish', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ---- History API ----

export async function getHistory(params?: {
  search?: string;
  filter?: 'all' | 'chat' | 'polish';
}): Promise<HistoryItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.filter && params.filter !== 'all') searchParams.set('filter', params.filter);
  const query = searchParams.toString();
  return request(`/history${query ? `?${query}` : ''}`);
}

export async function deleteHistoryItem(id: string | number): Promise<{ success: boolean }> {
  return request(`/history/${id}`, { method: 'DELETE' });
}

// ---- Profile API ----

export async function getProfile(): Promise<Profile> {
  return request('/profile');
}

export async function updateProfile(data: Partial<Pick<Profile, 'name' | 'avatar'>>): Promise<Profile> {
  return request('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ---- Settings API ----

export interface SystemSettings {
  ai: {
    maxTokens: number
    temperature: number
    modelVersion: string
    maxContextLength: number
  }
  limits: {
    maxFreeMessagesPerDay: number
    maxTokensPerMessage: number
    proMaxMessagesPerDay: number
    proMaxTokensPerMessage: number
  }
  features: {
    enablePolish: boolean
    enableHistoryExport: boolean
    enableProSubscription: boolean
    enableFeedback: boolean
    maintenanceMode: boolean
  }
  announcement: {
    enabled: boolean
    title: string
    content: string
    url: string
  }
  appVersion: string
  contactEmail: string
}

export async function getSettings(): Promise<SystemSettings> {
  return request('/settings');
}

export async function updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ---- Health ----

export async function healthCheck(): Promise<{ status: string; message: string }> {
  return request('/health');
}
