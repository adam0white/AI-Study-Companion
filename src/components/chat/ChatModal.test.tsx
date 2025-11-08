/**
 * Tests for ChatModal Component
 * Story 1.6: Connect UI to Companion Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatModal } from './ChatModal';
import { RPCError } from '@/lib/rpc/client';

// Mock the RPC client module
vi.mock('@/lib/rpc/client', () => {
  const RPCErrorImpl = class extends Error {
    public code: string;
    public statusCode?: number;
    
    constructor(message: string, code: string, statusCode?: number) {
      super(message);
      this.name = 'RPCError';
      this.code = code;
      this.statusCode = statusCode;
    }
  };

  return {
    RPCError: RPCErrorImpl,
    RPCClient: vi.fn().mockImplementation(() => ({
      sendMessage: vi.fn(),
    })),
  };
});

// Import RPCClient after mock is set up
import { RPCClient } from '@/lib/rpc/client';

describe('ChatModal', () => {
  const mockOnClose = vi.fn();
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose.mockClear();
    mockSendMessage = vi.fn();
    
    // Set up the mock implementation
    (RPCClient as any).mockImplementation(() => ({
      sendMessage: mockSendMessage,
    }));
  });

  describe('rendering', () => {
    it('should render when open is true', () => {
      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Chat with your AI Study Companion')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(<ChatModal open={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText('Chat with your AI Study Companion')).not.toBeInTheDocument();
    });
  });

  describe('RPC integration', () => {
    it('should create RPC client on mount', () => {
      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      expect(RPCClient).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should send message via RPC client', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        message: 'Hello! How can I help you?',
        timestamp: '2025-11-08T12:00:00Z',
        conversationId: 'conv_123',
      };
      mockSendMessage.mockResolvedValue(mockResponse);

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      // Find input and send button
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Type message and send
      await user.type(input, 'Hello companion');
      await user.click(sendButton);

      // Verify RPC call
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Hello companion');
      });
    });

    it('should display user message immediately', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockResolvedValue({
        message: 'Response',
        timestamp: '2025-11-08T12:00:00Z',
      });

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      // User message should appear immediately
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should show typing indicator during RPC call', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolveMessage: (value: any) => void;
      const messagePromise = new Promise((resolve) => {
        resolveMessage = resolve;
      });
      mockSendMessage.mockReturnValue(messagePromise);

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
      await user.click(sendButton);

      // Typing indicator should appear
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveMessage!({
        message: 'Response',
        timestamp: '2025-11-08T12:00:00Z',
      });

      // Typing indicator should disappear
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should display companion response', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        message: 'I can help with that!',
        timestamp: '2025-11-08T12:00:00Z',
        conversationId: 'conv_123',
      };
      mockSendMessage.mockResolvedValue(mockResponse);

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Can you help?');
      await user.click(sendButton);

      // Companion response should appear
      await waitFor(() => {
        expect(screen.getByText('I can help with that!')).toBeInTheDocument();
      });
    });

    it('should maintain conversation order (user message → companion response)', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockResolvedValue({
        message: 'Response to first',
        timestamp: '2025-11-08T12:00:00Z',
      });

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send first message
      await user.type(input, 'First message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response to first')).toBeInTheDocument();
      });

      // Verify both messages are present
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Response to first')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should display error message when RPC call fails', async () => {
      const user = userEvent.setup();
      const error = new RPCError('Network error occurred', 'NETWORK_ERROR');
      mockSendMessage.mockRejectedValue(error);

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      // Error message should appear in chat
      await waitFor(() => {
        expect(screen.getByText(/Error: Network error occurred/)).toBeInTheDocument();
      });
    });

    it('should display generic error for non-RPC errors', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockRejectedValue(new Error('Unknown error'));

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Sorry, something went wrong/)).toBeInTheDocument();
      });
    });

    it('should hide typing indicator on error', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockRejectedValue(new RPCError('Error', 'ERROR'));

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
      await user.click(sendButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      // Typing indicator should not be present
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should allow sending another message after error', async () => {
      const user = userEvent.setup();
      
      // First call fails
      mockSendMessage.mockRejectedValueOnce(new RPCError('Error', 'ERROR'));
      
      // Second call succeeds
      mockSendMessage.mockResolvedValueOnce({
        message: 'Success',
        timestamp: '2025-11-08T12:00:00Z',
      });

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // First message fails
      await user.type(input, 'First');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      // Clear input and try again
      await user.clear(input);
      await user.type(input, 'Second');
      await user.click(sendButton);

      // Second message succeeds
      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });

    it('should log errors to console', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new RPCError('Test error', 'TEST_ERROR');
      mockSendMessage.mockRejectedValue(error);

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error sending message:',
          error
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('authentication error handling', () => {
    it('should display authentication error message', async () => {
      const user = userEvent.setup();
      const authError = new RPCError(
        'Authentication required. Please sign in.',
        'AUTH_REQUIRED',
        401
      );
      mockSendMessage.mockRejectedValue(authError);

      render(<ChatModal open={true} onClose={mockOnClose} />);
      
      const input = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Authentication required/)).toBeInTheDocument();
      });
    });
  });
});
