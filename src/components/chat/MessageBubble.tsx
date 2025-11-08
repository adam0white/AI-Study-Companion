/**
 * MessageBubble Component
 * Story 1.5: Chat Modal Interface
 * Displays individual chat messages with role-based styling
 */

import { cn } from '@/lib/utils';
import type { MessageRole } from '@/types/chat';

export interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
        {timestamp && (
          <p
            className={cn(
              'text-xs mt-1',
              isUser ? 'text-purple-200' : 'text-gray-500'
            )}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

