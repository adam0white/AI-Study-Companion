/**
 * MessageInput Component
 * Story 1.5: Chat Modal Interface
 * Input field and send button for chat messages
 */

import { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || !message.trim();

  return (
    <div className="flex items-end gap-2 p-4 border-t border-gray-200 bg-white">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        disabled={disabled}
        rows={1}
        aria-label="Message input"
        className={cn(
          'flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3',
          'text-sm leading-relaxed',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          'max-h-32 overflow-y-auto'
        )}
        style={{
          minHeight: '44px', // Minimum touch target size
        }}
      />
      <button
        onClick={handleSend}
        disabled={isDisabled}
        aria-label="Send message"
        className={cn(
          'flex items-center justify-center',
          'w-11 h-11 rounded-lg', // 44x44px touch target
          'bg-primary text-white',
          'transition-all duration-200',
          'hover:bg-primary/90 active:scale-95',
          'disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 disabled:active:scale-100',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}

