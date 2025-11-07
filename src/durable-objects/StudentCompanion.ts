/**
 * StudentCompanion Durable Object
 * Manages stateful companion instances for individual students
 * 
 * Each student gets a unique isolated instance via idFromName(studentId)
 * Implements Pattern 1: Stateful Serverless Personalization
 */

import { DurableObject } from 'cloudflare:workers';
import type { 
  StudentCompanionRPC,
  StudentProfile, 
  AIResponse, 
  ProgressData 
} from '../lib/rpc/types';
import { StudentCompanionError } from '../lib/errors';

/**
 * Environment bindings interface for Durable Object
 */
interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CLERK_SECRET_KEY: string;
}

/**
 * StudentCompanion Durable Object Class
 * Implements StudentCompanionRPC interface for type safety
 */
export class StudentCompanion extends DurableObject implements StudentCompanionRPC {
  // Private fields
  private db: D1Database;
  private cache: Map<string, any>;
  private websockets: Set<WebSocket>;
  private studentId?: string;
  private initialized: boolean = false;

  /**
   * Constructor - no async operations allowed here
   * Uses lazy initialization pattern for async setup
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.db = env.DB;
    this.cache = new Map();
    this.websockets = new Set();
  }

  /**
   * Fetch handler - entry point for all HTTP requests to this DO
   * Routes requests to appropriate handlers
   */
  async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureInitialized();

      const url = new URL(request.url);
      const pathname = url.pathname;

      // Health check endpoint
      if (pathname === '/health' || pathname.endsWith('/health')) {
        return this.handleHealthCheck();
      }

      // RPC method endpoints
      if (request.method === 'POST') {
        // Extract method from pathname (e.g., /initialize, /sendMessage, /getProgress)
        const method = pathname.split('/').pop() || '';
        
        switch (method) {
          case 'initialize':
            return this.handleInitialize(request);
          case 'sendMessage':
            return this.handleSendMessage(request);
          case 'getProgress':
            return this.handleGetProgress(request);
          default:
            return this.errorResponse('Unknown method', 'UNKNOWN_METHOD', 404);
        }
      }

      return this.errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
    } catch (error) {
      console.error('Error in StudentCompanion.fetch:', error);
      
      if (error instanceof StudentCompanionError) {
        return this.errorResponse(error.message, error.code, error.statusCode);
      }
      
      return this.errorResponse(
        'Internal server error',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Lazy initialization for async operations
   * Called on first request to this DO instance
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load cached state from durable storage
    await this.loadCache();
    
    this.initialized = true;
  }

  /**
   * Load frequently accessed data from durable storage into memory cache
   */
  private async loadCache(): Promise<void> {
    try {
      // Load student ID if previously set
      const storedStudentId = await this.getState<string>('studentId');
      if (storedStudentId) {
        this.studentId = storedStudentId;
        this.cache.set('studentId', storedStudentId);
      }
    } catch (error) {
      console.error('Error loading cache:', error);
      // Non-fatal - cache load failure shouldn't prevent DO from working
    }
  }

  // ============================================
  // HTTP Request Handlers
  // ============================================

  private handleHealthCheck(): Response {
    return new Response(
      JSON.stringify({
        status: 'ok',
        studentId: this.studentId || 'not-initialized',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleInitialize(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { clerkUserId: string };
      const result = await this.initialize(body.clerkUserId);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to initialize companion');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleSendMessage(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { message: string };
      const result = await this.sendMessage(body.message);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to send message');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetProgress(_request: Request): Promise<Response> {
    try {
      const result = await this.getProgress();
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get progress');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  // ============================================
  // Public RPC Methods (implements StudentCompanionRPC)
  // ============================================

  /**
   * Initialize a new student companion instance
   */
  async initialize(clerkUserId: string): Promise<StudentProfile> {
    try {
      // Validate input
      if (!clerkUserId || typeof clerkUserId !== 'string') {
        throw new StudentCompanionError(
          'clerkUserId is required',
          'INVALID_INPUT',
          400
        );
      }

      // Generate student ID from Clerk user ID (for now, use Clerk ID directly)
      const studentId = `student_${clerkUserId}`;
      this.studentId = studentId;

      // Store student ID in durable storage for persistence
      await this.setState('studentId', studentId);
      await this.setState('clerkUserId', clerkUserId);
      await this.setState('createdAt', new Date().toISOString());
      
      // Cache it
      this.cache.set('studentId', studentId);
      this.cache.set('clerkUserId', clerkUserId);

      const profile: StudentProfile = {
        studentId,
        clerkUserId,
        displayName: 'Student', // Placeholder - will be enhanced in future stories
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      return profile;
    } catch (error) {
      console.error('Error in initialize:', {
        clerkUserId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to initialize companion',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Send a message to the companion and get AI response
   */
  async sendMessage(message: string): Promise<AIResponse> {
    try {
      // Validate input
      if (!message || message.trim().length === 0) {
        throw new StudentCompanionError(
          'Message cannot be empty',
          'INVALID_INPUT',
          400
        );
      }

      // Ensure companion is initialized
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized. Call initialize() first.',
          'NOT_INITIALIZED',
          400
        );
      }

      // Placeholder AI response - actual AI integration in future stories
      const response: AIResponse = {
        message: `Echo: ${message} (AI integration coming in future stories)`,
        timestamp: new Date().toISOString(),
        conversationId: `conv_${Date.now()}`,
      };

      // Update last active timestamp
      await this.setState('lastActiveAt', new Date().toISOString());

      return response;
    } catch (error) {
      console.error('Error in sendMessage:', {
        studentId: this.studentId,
        message: message.substring(0, 50),
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to process message',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Get current progress data for the student
   */
  async getProgress(): Promise<ProgressData> {
    try {
      // Ensure companion is initialized
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized. Call initialize() first.',
          'NOT_INITIALIZED',
          400
        );
      }

      // Placeholder progress data - actual implementation in future stories
      const progress: ProgressData = {
        totalSessions: 0,
        practiceQuestionsCompleted: 0,
        topicsStudied: [],
        currentStreak: 0,
        lastUpdated: new Date().toISOString(),
      };

      return progress;
    } catch (error) {
      console.error('Error in getProgress:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to get progress',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  // ============================================
  // State Persistence Helpers
  // ============================================

  /**
   * Store a value in durable storage
   */
  private async setState<T>(key: string, value: T): Promise<void> {
    await this.state.storage.put(key, value);
  }

  /**
   * Retrieve a value from durable storage
   */
  private async getState<T>(key: string): Promise<T | undefined> {
    return await this.state.storage.get<T>(key);
  }

  // ============================================
  // Response Helpers
  // ============================================

  private jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private errorResponse(message: string, code: string, status: number): Response {
    return new Response(
      JSON.stringify({ error: message, code }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private wrapError(error: unknown, defaultMessage: string): StudentCompanionError {
    if (error instanceof StudentCompanionError) {
      return error;
    }
    
    return new StudentCompanionError(
      defaultMessage,
      'INTERNAL_ERROR',
      500
    );
  }
}

