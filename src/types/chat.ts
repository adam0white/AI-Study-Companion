/**
 * Chat Types
 * Story 1.5: Chat Modal Interface
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'companion';
  content: string;
  timestamp: string;
}

export type MessageRole = 'user' | 'companion';

