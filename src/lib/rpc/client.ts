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

import type { AIResponse, PracticeOptions, PracticeSession, AnswerFeedback, PracticeResult, MultiDimensionalProgressData } from './types';

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
        errorMessage || 'Authentication failed. Please sign in again.',
        errorCode,
        401
      );
    } else if (statusCode === 403) {
      throw new RPCError(
        errorMessage || 'Access denied. You do not have permission to perform this action.',
        errorCode,
        403
      );
    } else if (statusCode === 404) {
      throw new RPCError(
        errorMessage || 'Resource not found.',
        errorCode,
        404
      );
    } else if (statusCode === 429) {
      throw new RPCError(
        errorMessage || 'Too many requests. Please wait a moment and try again.',
        errorCode,
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

  /**
   * Start a practice session with questions generated from session content
   * Story 3.1: AC-3.1.6 - Practice question generation
   *
   * @param options - Practice configuration (subject, difficulty, questionCount, focusAreas)
   * @returns Practice session with generated questions
   * @throws RPCError on network, auth, or server errors
   */
  async startPractice(options: PracticeOptions): Promise<PracticeSession> {
    const response = await this.call('startPractice', options);

    // Validate response structure
    if (!this.isPracticeSession(response)) {
      throw new RPCError(
        'Invalid response format from server.',
        'INVALID_RESPONSE'
      );
    }

    return response;
  }

  /**
   * Submit an answer to a practice question
   * Story 3.1: AC-3.1.7 - Answer submission and tracking
   *
   * @param questionId - ID of the question being answered
   * @param answer - Student's selected answer
   * @returns Answer feedback with correctness and explanation
   * @throws RPCError on network, auth, or server errors
   */
  async submitAnswer(questionId: string, answer: string): Promise<AnswerFeedback> {
    const response = await this.call('submitAnswer', { questionId, answer });

    // Validate response structure
    if (!this.isAnswerFeedback(response)) {
      throw new RPCError(
        'Invalid response format from server.',
        'INVALID_RESPONSE'
      );
    }

    return response;
  }

  /**
   * Complete a practice session
   * Story 3.1: AC-3.1.7 - Session completion
   *
   * @param sessionId - ID of the practice session
   * @returns Practice result summary with score and stats
   * @throws RPCError on network, auth, or server errors
   */
  async completePractice(sessionId: string): Promise<PracticeResult> {
    const response = await this.call('completePractice', { sessionId });

    // Validate response structure
    if (!this.isPracticeResult(response)) {
      throw new RPCError(
        'Invalid response format from server.',
        'INVALID_RESPONSE'
      );
    }

    return response;
  }

  /**
   * Get multi-dimensional progress data
   * Story 3.5: AC-3.5.1-3.5.8
   * @returns Comprehensive progress data across subjects, time, and goals
   */
  async getMultiDimensionalProgress(): Promise<MultiDimensionalProgressData> {
    const response = await this.call('getMultiDimensionalProgress', {});

    // Validate response structure
    if (!this.isMultiDimensionalProgressData(response)) {
      throw new RPCError(
        'Invalid response format from server.',
        'INVALID_RESPONSE'
      );
    }

    return response;
  }

  /**
   * Ingest mock tutoring session for testing
   * Creates a fake session with sample Q&A about quadratic equations
   * @returns Session metadata
   */
  async ingestMockSession(): Promise<any> {
    const response = await this.call('ingestMockSession', {});
    return response;
  }

  /**
   * Type guard to validate PracticeSession structure
   */
  private isPracticeSession(data: unknown): data is PracticeSession {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'subject' in data &&
      'questions' in data &&
      Array.isArray((data as PracticeSession).questions) &&
      'startedAt' in data
    );
  }

  /**
   * Type guard to validate AnswerFeedback structure
   */
  private isAnswerFeedback(data: unknown): data is AnswerFeedback {
    return (
      typeof data === 'object' &&
      data !== null &&
      'isCorrect' in data &&
      typeof (data as AnswerFeedback).isCorrect === 'boolean' &&
      'correctAnswer' in data &&
      'explanation' in data
    );
  }

  /**
   * Type guard to validate PracticeResult structure
   * Story 3.3: Updated to include new completion metrics
   */
  private isPracticeResult(data: unknown): data is PracticeResult {
    return (
      typeof data === 'object' &&
      data !== null &&
      'sessionId' in data &&
      'subject' in data &&
      'questionsTotal' in data &&
      'questionsCorrect' in data &&
      'accuracy' in data &&
      'durationSeconds' in data &&
      'completedAt' in data &&
      'subjectMasteryDelta' in data &&
      'newMasteryLevel' in data &&
      'averageTimePerQuestion' in data
    );
  }

  /**
   * Type guard to validate MultiDimensionalProgressData structure
   * Story 3.5: AC-3.5.1-3.5.8
   */
  private isMultiDimensionalProgressData(data: unknown): data is MultiDimensionalProgressData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'overall' in data &&
      'bySubject' in data &&
      'byTime' in data &&
      typeof (data as any).overall === 'object' &&
      Array.isArray((data as any).bySubject) &&
      Array.isArray((data as any).byTime)
    );
  }
}

