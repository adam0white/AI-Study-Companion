/**
 * ChatModal Component
 * Story 1.6: Connect UI to Companion Backend
 * Story 1.11: Integrate Real Clerk Authentication
 * Main modal container for chat interface with real backend connection
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatInterface } from './ChatInterface';
import { RPCClient, RPCError } from '@/lib/rpc/client';
import type { ChatMessage } from '@/types/chat';

export interface ChatModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChatModal({ open, onClose }: ChatModalProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Create RPC client with real Clerk token getter (Story 1.11)
  const rpcClient = useMemo(() => {
    return new RPCClient(async () => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('User not authenticated');
      }
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      return token;
    });
  }, [getToken, isLoaded, isSignedIn]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      // Allow Dialog to complete its animation first
      const timer = setTimeout(() => {
        const input = document.querySelector<HTMLTextAreaElement>(
          'textarea[aria-label="Message input"]'
        );
        input?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Show typing indicator while waiting for response
    setIsTyping(true);

    try {
      // Call RPC client to send message to companion
      const response = await rpcClient.sendMessage(content);
      
      // Create companion message from response
      const companionMessage: ChatMessage = {
        id: `msg-${Date.now()}-companion`,
        role: 'companion',
        content: response.message,
        timestamp: new Date(response.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      
      // Add companion response to messages
      setMessages((prev) => [...prev, companionMessage]);
    } catch (error) {
      // Handle errors gracefully with user-friendly messages
      console.error('Error sending message:', error);
      
      let errorMessage = 'Sorry, something went wrong. Please try again.';
      
      if (error instanceof RPCError) {
        // Use the user-friendly error message from RPCError
        errorMessage = `Error: ${error.message}`;
      }
      
      // Display error as a companion message
      const errorChatMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'companion',
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      // Always hide typing indicator
      setIsTyping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] h-[600px] sm:h-[600px] p-0 flex flex-col"
        aria-describedby="chat-description"
      >
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <DialogTitle>Chat with your AI Study Companion</DialogTitle>
          <p id="chat-description" className="sr-only">
            Chat interface to ask questions and get personalized help from your
            AI study companion
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

