/**
 * TypingIndicator Component
 * Story 1.5: Chat Modal Interface
 * Shows animated dots when companion is typing
 */

import { cn } from '@/lib/utils';

export interface TypingIndicatorProps {
  isTyping: boolean;
}

export function TypingIndicator({ isTyping }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm" role="status" aria-label="Companion is typing">
        <div className="flex space-x-1.5">
          <span
            className={cn(
              'w-2 h-2 bg-gray-400 rounded-full',
              'animate-bounce'
            )}
            style={{ animationDelay: '0ms' }}
          />
          <span
            className={cn(
              'w-2 h-2 bg-gray-400 rounded-full',
              'animate-bounce'
            )}
            style={{ animationDelay: '150ms' }}
          />
          <span
            className={cn(
              'w-2 h-2 bg-gray-400 rounded-full',
              'animate-bounce'
            )}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

