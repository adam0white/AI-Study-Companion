/**
 * MessageBubble Component Tests
 * Story 1.5: Chat Modal Interface
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  it('renders user message with correct styling', () => {
    render(
      <MessageBubble role="user" content="Hello, how are you?" />
    );

    const message = screen.getByText('Hello, how are you?');
    expect(message).toBeInTheDocument();

    // User messages should be in a container with right alignment
    const container = message.closest('div');
    expect(container?.parentElement).toHaveClass('justify-end');
  });

  it('renders companion message with correct styling', () => {
    render(
      <MessageBubble role="companion" content="I'm doing great, thanks!" />
    );

    const message = screen.getByText("I'm doing great, thanks!");
    expect(message).toBeInTheDocument();

    // Companion messages should be in a container with left alignment
    const container = message.closest('div');
    expect(container?.parentElement).toHaveClass('justify-start');
  });

  it('renders timestamp when provided', () => {
    render(
      <MessageBubble
        role="user"
        content="Test message"
        timestamp="10:30 AM"
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
  });

  it('does not render timestamp when not provided', () => {
    const { container } = render(
      <MessageBubble role="user" content="Test message" />
    );

    // Should only have the message text, no timestamp
    const texts = container.querySelectorAll('p');
    expect(texts).toHaveLength(1);
  });

  it('handles long messages with proper wrapping', () => {
    const longMessage =
      'This is a very long message that should wrap properly and not overflow the container boundaries even on smaller screens.';

    render(<MessageBubble role="user" content={longMessage} />);

    const message = screen.getByText(longMessage);
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass('whitespace-pre-wrap', 'break-words');
  });

  it('preserves newlines in messages', () => {
    const multilineMessage = 'Line 1\nLine 2\nLine 3';

    const { container } = render(<MessageBubble role="companion" content={multilineMessage} />);

    // Find the paragraph element that contains the message
    const message = container.querySelector('p.whitespace-pre-wrap');
    expect(message).toBeInTheDocument();
    expect(message?.textContent).toBe(multilineMessage);
  });
});

