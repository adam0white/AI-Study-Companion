/**
 * RPC Client
 * Story 1.6: Connect UI to Companion Backend
 * 
 * Implements:
 * - HTTP RPC client for Durable Object communication
 * - Request/response handling with type safety
 * - Error handling with user-friendly messages
 * - Clerk JWT authentication integration
 */

import type { AIResponse } from './types';

/**
 * Custom error for RPC failures with user-friendly messages
 */
export class RPCError extends Error {
  public code: string;
  public statusCode?: number;
  
  constructor(
    message: string,
    code: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * RPC Client for communicating with StudentCompanion Durable Object
 * Uses HTTP POST requests with Clerk JWT authentication
 */
export class RPCClient {
  private getTokenFn: () => Promise<string | null>;
  
  /**
   * @param getTokenFn - Function to retrieve Clerk JWT token
   */
  constructor(getTokenFn: () => Promise<string | null>) {
    this.getTokenFn = getTokenFn;
  }

  /**
   * Low-level RPC call method
   * Sends HTTP POST request to /api/companion/{method} with JWT auth
   * 
   * @param method - RPC method name (e.g., "sendMessage")
   * @param params - Method parameters as object
   * @returns Response data
   * @throws RPCError on network, auth, or server errors
   */
  async call(method: string, params: unknown): Promise<unknown> {
    try {
      // Get Clerk JWT token
      const token = await this.getTokenFn();
      if (!token) {
        throw new RPCError(
          'Authentication required. Please sign in.',
          'AUTH_REQUIRED',
          401
        );
      }

      // Construct request URL
      const url = `/api/companion/${method}`;
      
      // Send HTTP POST request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      // Handle HTTP error responses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse JSON response
      const data = await response.json();
      return data;
    } catch (error) {
      // Re-throw RPCError as-is
      if (error instanceof RPCError) {
        throw error;
      }

      // Handle network errors (fetch failures)
      if (error instanceof TypeError) {
        throw new RPCError(
          'Network error. Please check your connection and try again.',
          'NETWORK_ERROR'
        );
      }

      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        throw new RPCError(
          'Invalid response from server.',
          'PARSE_ERROR'
        );
      }

      // Unknown error
      console.error('Unexpected RPC error:', error);
      throw new RPCError(
        'An unexpected error occurred. Please try again.',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Handle HTTP error responses with appropriate error messages
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    
    // Try to parse error details from response body
    let errorMessage = 'An error occurred';
    let errorCode = 'SERVER_ERROR';
    
    try {
      const errorData = await response.json() as { error?: string; code?: string };
      if (errorData.error) {
        errorMessage = errorData.error;
      }
      if (errorData.code) {
        errorCode = errorData.code;
      }
    } catch {
      // If JSON parsing fails, use default error message based on status code
    }

    // Map HTTP status codes to user-friendly messages
    if (statusCode === 401) {
      throw new RPCError(
        'Authentication failed. Please sign in again.',
        'AUTH_FAILED',
        401
      );
    } else if (statusCode === 403) {
      throw new RPCError(
        'Access denied. You do not have permission to perform this action.',
        'FORBIDDEN',
        403
      );
    } else if (statusCode === 404) {
      throw new RPCError(
        'Resource not found.',
        'NOT_FOUND',
        404
      );
    } else if (statusCode === 429) {
      throw new RPCError(
        'Too many requests. Please wait a moment and try again.',
        'RATE_LIMIT',
        429
      );
    } else if (statusCode >= 500) {
      throw new RPCError(
        errorMessage || 'Server error. Please try again later.',
        errorCode,
        statusCode
      );
    } else {
      throw new RPCError(
        errorMessage || `Request failed with status ${statusCode}`,
        errorCode,
        statusCode
      );
    }
  }

  /**
   * Send a message to the companion and get AI response
   * 
   * @param message - User message text
   * @returns AI-generated response with message, timestamp, and conversationId
   * @throws RPCError on network, auth, or server errors
   */
  async sendMessage(message: string): Promise<AIResponse> {
    // Validate input
    if (!message || message.trim().length === 0) {
      throw new RPCError(
        'Message cannot be empty.',
        'INVALID_INPUT'
      );
    }

    // Call sendMessage RPC method
    const response = await this.call('sendMessage', { message });
    
    // Validate response structure
    if (!this.isAIResponse(response)) {
      throw new RPCError(
        'Invalid response format from server.',
        'INVALID_RESPONSE'
      );
    }

    return response;
  }

  /**
   * Type guard to validate AIResponse structure
   */
  private isAIResponse(data: unknown): data is AIResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as AIResponse).message === 'string' &&
      'timestamp' in data &&
      typeof (data as AIResponse).timestamp === 'string'
    );
  }
}

