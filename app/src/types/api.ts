export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  sceneId?: string | null;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  sceneId?: string | null;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  conversation: Conversation;
}

export interface PolishResponse {
  id: string;
  result: string;
  mode: string;
  input: string;
}

export interface HistoryItem {
  id: string | number;
  type: 'chat' | 'polish';
  title: string;
  preview: string;
  date: string;
  tokens: string;
  refId?: string;
}

export interface Profile {
  name: string;
  avatar: string;
  isPro: boolean;
  stats: {
    totalCreations: number;
    totalTokens: number;
    streakDays: number;
    lastActiveDate?: string | null;
  };
}
