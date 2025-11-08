/**
 * Tests for RPC Client
 * Story 1.6: Connect UI to Companion Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RPCClient, RPCError } from './client';
import type { AIResponse } from './types';

describe('RPCClient', () => {
  let mockGetToken: ReturnType<typeof vi.fn>;
  let client: RPCClient;

  beforeEach(() => {
    mockGetToken = vi.fn().mockResolvedValue('test-token');
    client = new RPCClient(mockGetToken);
    
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('constructor', () => {
    it('should create client with token getter function', () => {
      expect(client).toBeInstanceOf(RPCClient);
    });
  });

  describe('call method', () => {
    it('should send HTTP POST request with correct URL and headers', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ result: 'success' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await client.call('testMethod', { param: 'value' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/companion/testMethod',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({ param: 'value' }),
        })
      );
    });

    it('should parse and return JSON response', async () => {
      const mockData = { result: 'test-data' };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.call('testMethod', {});

      expect(result).toEqual(mockData);
    });

    it('should throw RPCError when token is not available', async () => {
      mockGetToken.mockResolvedValue(null);

      await expect(client.call('testMethod', {})).rejects.toThrow(RPCError);
      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
        message: 'Authentication required. Please sign in.',
      });
    });

    it('should throw RPCError on network failure', async () => {
      (global.fetch as any).mockRejectedValue(new TypeError('Network error'));

      await expect(client.call('testMethod', {})).rejects.toThrow(RPCError);
      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('Network error'),
      });
    });

    it('should throw RPCError on JSON parse error', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toThrow(RPCError);
      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'PARSE_ERROR',
      });
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'AUTH_FAILED',
        statusCode: 401,
      });
    });

    it('should handle 403 forbidden errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ error: 'Forbidden' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should handle 404 not found errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should handle 429 rate limit errors', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({ error: 'Rate limit exceeded' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        statusCode: 429,
      });
    });

    it('should handle 500 server errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('server error'),
      });
    });

    it('should use default error message when response body is not JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Not JSON')),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.call('testMethod', {})).rejects.toThrow(RPCError);
    });
  });

  describe('sendMessage method', () => {
    it('should send message and return AIResponse', async () => {
      const mockResponse: AIResponse = {
        message: 'Hello, how can I help?',
        timestamp: '2025-11-08T12:00:00Z',
        conversationId: 'conv_123',
      };
      
      const mockFetchResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      };
      (global.fetch as any).mockResolvedValue(mockFetchResponse);

      const result = await client.sendMessage('Hello');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/companion/sendMessage',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Hello' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should validate message is not empty', async () => {
      await expect(client.sendMessage('')).rejects.toThrow(RPCError);
      await expect(client.sendMessage('')).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        message: 'Message cannot be empty.',
      });
    });

    it('should validate message is not whitespace only', async () => {
      await expect(client.sendMessage('   ')).rejects.toThrow(RPCError);
      await expect(client.sendMessage('   ')).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
    });

    it('should validate AIResponse structure', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ invalid: 'response' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.sendMessage('Hello')).rejects.toThrow(RPCError);
      await expect(client.sendMessage('Hello')).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
        message: 'Invalid response format from server.',
      });
    });

    it('should accept AIResponse without conversationId', async () => {
      const mockResponse: AIResponse = {
        message: 'Response',
        timestamp: '2025-11-08T12:00:00Z',
      };
      
      const mockFetchResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      };
      (global.fetch as any).mockResolvedValue(mockFetchResponse);

      const result = await client.sendMessage('Hello');
      expect(result).toEqual(mockResponse);
    });

    it('should handle error responses from server', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: 'Invalid message format',
          code: 'INVALID_MESSAGE',
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.sendMessage('Hello')).rejects.toThrow(RPCError);
    });
  });

  describe('RPCError', () => {
    it('should create error with message, code, and statusCode', () => {
      const error = new RPCError('Test error', 'TEST_CODE', 400);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('RPCError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
    });

    it('should create error without statusCode', () => {
      const error = new RPCError('Test error', 'TEST_CODE');
      
      expect(error.statusCode).toBeUndefined();
    });
  });
});

