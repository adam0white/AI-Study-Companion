/**
 * ChatInterface Component Tests
 * Story 1.5: Chat Modal Interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from './ChatInterface';
import type { ChatMessage } from '@/types/chat';

describe('ChatInterface', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello!',
      timestamp: '10:00 AM',
    },
    {
      id: '2',
      role: 'companion',
      content: 'Hi there! How can I help?',
      timestamp: '10:01 AM',
    },
  ];

  it('renders empty state when no messages', () => {
    render(
      <ChatInterface
        messages={[]}
        isTyping={false}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(
      screen.getByText('Ask me anything about your studies!')
    ).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    render(
      <ChatInterface
        messages={mockMessages}
        isTyping={false}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help?')).toBeInTheDocument();
  });

  it('shows typing indicator when isTyping is true', () => {
    const { container } = render(
      <ChatInterface
        messages={mockMessages}
        isTyping={true}
        onSendMessage={vi.fn()}
      />
    );

    // Typing indicator should be present (3 animated dots)
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('hides typing indicator when isTyping is false', () => {
    const { container } = render(
      <ChatInterface
        messages={mockMessages}
        isTyping={false}
        onSendMessage={vi.fn()}
      />
    );

    // Typing indicator should not be present
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(0);
  });

  it('calls onSendMessage when message is sent', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(
      <ChatInterface
        messages={[]}
        isTyping={false}
        onSendMessage={onSendMessage}
      />
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');

    await user.type(input, 'New message');
    await user.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('New message');
  });

  it('disables input when typing', () => {
    render(
      <ChatInterface
        messages={mockMessages}
        isTyping={true}
        onSendMessage={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeDisabled();
  });

  it('has scrollable message area', () => {
    const { container } = render(
      <ChatInterface
        messages={mockMessages}
        isTyping={false}
        onSendMessage={vi.fn()}
      />
    );

    const messageArea = container.querySelector('.overflow-y-auto');
    expect(messageArea).toBeInTheDocument();
    expect(messageArea).toHaveClass('flex-1');
  });

  it('renders message input at bottom', () => {
    const { container } = render(
      <ChatInterface
        messages={mockMessages}
        isTyping={false}
        onSendMessage={vi.fn()}
      />
    );

    // The main container should be a flex column
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('flex', 'flex-col', 'h-full');

    // Input should be at the bottom (after messages area)
    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeInTheDocument();
  });
});

