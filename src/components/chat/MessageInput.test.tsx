/**
 * MessageInput Component Tests
 * Story 1.5: Chat Modal Interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  it('renders input field and send button', () => {
    render(<MessageInput onSend={vi.fn()} />);

    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeInTheDocument();

    const sendButton = screen.getByLabelText('Send message');
    expect(sendButton).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<MessageInput onSend={vi.fn()} />);

    const sendButton = screen.getByLabelText('Send message');
    expect(sendButton).toBeDisabled();
  });

  it('send button is enabled when input has text', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSend={vi.fn()} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');

    await user.type(input, 'Hello');
    expect(sendButton).not.toBeDisabled();
  });

  it('calls onSend with message when send button is clicked', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');

    await user.type(input, 'Test message');
    await user.click(sendButton);

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(
      'Type your message...'
    ) as HTMLTextAreaElement;
    const sendButton = screen.getByLabelText('Send message');

    await user.type(input, 'Test message');
    await user.click(sendButton);

    expect(input.value).toBe('');
  });

  it('sends message when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type your message...');

    await user.type(input, 'Test message{Enter}');

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send message when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type your message...');

    await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('trims whitespace from messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');

    await user.type(input, '  Test message  ');
    await user.click(sendButton);

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send message if only whitespace', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');

    await user.type(input, '   ');
    
    // Button should still be disabled
    expect(sendButton).toBeDisabled();
  });

  it('disables input and button when disabled prop is true', () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('has minimum touch target size for mobile (44x44px)', () => {
    render(<MessageInput onSend={vi.fn()} />);

    const sendButton = screen.getByLabelText('Send message');

    // Button should have w-11 h-11 classes (44px x 44px)
    expect(sendButton).toHaveClass('w-11', 'h-11');
  });
});

