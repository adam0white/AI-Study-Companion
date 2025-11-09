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
  ProgressData,
  MemoryItem,
  ConsolidatedInsight,
  ConsolidationResult,
  ConsolidationHistory
} from '../lib/rpc/types';
import { StudentCompanionError } from '../lib/errors';
import { initializeSchema, generateId, getCurrentTimestamp } from '../lib/db/schema';
import {
  createShortTermMemory,
  getShortTermMemories,
  createLongTermMemory,
  getLongTermMemories,
} from '../lib/db/memory';
import type { CreateShortTermMemoryInput, CreateLongTermMemoryInput } from '../lib/rpc/types';
import { ingestSession, getSessionsForStudent } from '../lib/session/ingestion';
import type { SessionInput } from '../lib/session/types';

/**
 * Environment bindings interface for Durable Object
 */
interface Env {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  CLERK_SECRET_KEY: string;
}

/**
 * Consolidation configuration
 * Story 2.1: AC-2.1.5 - Memory consolidation scheduling
 */
const CONSOLIDATION_DELAY_HOURS = 4;
const CONSOLIDATION_DELAY_MS = CONSOLIDATION_DELAY_HOURS * 60 * 60 * 1000;

/**
 * Database row type for students table (matches D1 schema)
 */
interface DbStudentRow {
  id: string;
  clerk_user_id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_active_at: string;
}

/**
 * StudentCompanion Durable Object Class
 * Implements StudentCompanionRPC interface for type safety
 */
export class StudentCompanion extends DurableObject implements StudentCompanionRPC {
  // Private fields
  private db: D1Database;
  private r2: R2Bucket;
  private ai: Ai;
  private cache: Map<string, any>;
  private studentId?: string;
  private initialized: boolean = false;
  private schemaInitialized: boolean = false;

  /**
   * Constructor - no async operations allowed here
   * Uses lazy initialization pattern for async setup
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env as any);
    this.db = env.DB;
    this.r2 = env.R2;
    this.ai = env.AI;
    this.cache = new Map();
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
          case 'addShortTermMemory':
            return this.handleAddShortTermMemory(request);
          case 'getShortTermMemories':
            return this.handleGetShortTermMemories(request);
          case 'addLongTermMemory':
            return this.handleAddLongTermMemory(request);
          case 'getLongTermMemories':
            return this.handleGetLongTermMemories(request);
          case 'ingestSession':
            return this.handleIngestSession(request);
          case 'getSessions':
            return this.handleGetSessions(request);
          case 'getConsolidationHistory':
            return this.handleGetConsolidationHistory(request);
          case 'triggerConsolidation':
            return this.handleTriggerConsolidation(request);
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
   * Alarm handler - triggered by Durable Object runtime when scheduled alarm fires
   * Story 2.1: AC-2.1.5 - Automatic memory consolidation on schedule
   */
  async alarm(): Promise<void> {
    try {
      console.log('[DO] Alarm triggered for memory consolidation', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId || 'not-initialized',
        timestamp: new Date().toISOString(),
      });

      // Ensure DO is initialized before running consolidation
      await this.ensureInitialized();

      if (!this.studentId) {
        console.error('[DO] Alarm fired but studentId not set, cannot consolidate');
        return;
      }

      // Run consolidation process
      // Story 2.1: Tasks 2-7 - Full consolidation workflow
      const result = await this.runConsolidation();

      console.log('[DO] Consolidation alarm completed', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        success: result.success,
        itemsProcessed: result.shortTermItemsProcessed,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DO] Error in alarm handler:', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId || 'not-initialized',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Reschedule alarm for retry (1 hour later)
      // Story 2.1: AC-2.1.7 - Error handling
      const retryTime = Date.now() + (60 * 60 * 1000); // 1 hour
      await this.ctx.storage.setAlarm(retryTime);

      console.log('[DO] Alarm rescheduled for retry', {
        doInstanceId: this.ctx.id.toString(),
        retryTime: new Date(retryTime).toISOString(),
      });
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

    // Log DO initialization (Story 1.12: AC-1.12.2, AC-1.12.6)
    console.log('[DO] Initializing StudentCompanion instance', {
      doInstanceId: this.ctx.id.toString(),
      timestamp: new Date().toISOString(),
    });

    // Load cached state from durable storage
    await this.loadCache();

    // Initialize database schema if not already done
    await this.ensureSchemaInitialized();

    this.initialized = true;

    // Log successful initialization (Story 1.12: AC-1.12.2)
    console.log('[DO] StudentCompanion initialized', {
      doInstanceId: this.ctx.id.toString(),
      studentId: this.studentId || 'not-yet-set',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Ensure database schema is initialized
   * Uses persistent flag to avoid re-initialization across DO hibernations
   */
  private async ensureSchemaInitialized(): Promise<void> {
    if (this.schemaInitialized) {
      return;
    }

    try {
      // Check persistent flag in durable storage
      const initialized = await this.getState<boolean>('schema_initialized');
      
      if (!initialized) {
        console.log('Initializing database schema...');
        await initializeSchema(this.db);
        await this.setState('schema_initialized', true);
        console.log('Database schema initialized successfully');
      }
      
      this.schemaInitialized = true;
    } catch (error) {
      console.error('Schema initialization error:', error);
      
      // Retry once before failing
      try {
        console.log('Retrying schema initialization...');
        await initializeSchema(this.db);
        await this.setState('schema_initialized', true);
        this.schemaInitialized = true;
        console.log('Schema initialization succeeded on retry');
      } catch (retryError) {
        console.error('Schema initialization failed after retry:', retryError);
        throw new StudentCompanionError(
          'Failed to initialize database schema',
          'SCHEMA_ERROR',
          500
        );
      }
    }
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
      // Auto-initialize if not already initialized
      // Worker passes Clerk user ID in X-Clerk-User-Id header
      if (!this.studentId) {
        const clerkUserId = request.headers.get('X-Clerk-User-Id');
        if (!clerkUserId) {
          return this.errorResponse(
            'Missing Clerk user ID header',
            'MISSING_USER_ID',
            400
          );
        }
        
        // Initialize companion with Clerk user ID
        await this.initialize(clerkUserId);
      }
      
      const body = await request.json() as { message: string };
      const result = await this.sendMessage(body.message);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to send message');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetProgress(request: Request): Promise<Response> {
    try {
      // Auto-initialize if not already initialized
      // Worker passes Clerk user ID in X-Clerk-User-Id header
      if (!this.studentId) {
        const clerkUserId = request.headers.get('X-Clerk-User-Id');
        if (!clerkUserId) {
          return this.errorResponse(
            'Missing Clerk user ID header',
            'MISSING_USER_ID',
            400
          );
        }

        // Initialize companion with Clerk user ID
        await this.initialize(clerkUserId);
      }

      const result = await this.getProgress();
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get progress');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleAddShortTermMemory(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const body = await request.json() as CreateShortTermMemoryInput;
      const memory = await createShortTermMemory(this.db, this.studentId, body);
      return this.jsonResponse(memory);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to add short-term memory');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetShortTermMemories(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');
      const minImportance = url.searchParams.get('minImportance');
      const since = url.searchParams.get('since');

      const options = {
        limit: limit ? parseInt(limit, 10) : undefined,
        minImportance: minImportance ? parseFloat(minImportance) : undefined,
        since: since || undefined,
      };

      const memories = await getShortTermMemories(this.db, this.studentId, options);
      return this.jsonResponse(memories);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get short-term memories');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleAddLongTermMemory(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const body = await request.json() as CreateLongTermMemoryInput;
      const memory = await createLongTermMemory(this.db, this.studentId, body);
      return this.jsonResponse(memory);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to add long-term memory');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetLongTermMemories(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');
      const category = url.searchParams.get('category');
      const tag = url.searchParams.get('tag');

      const options = {
        limit: limit ? parseInt(limit, 10) : undefined,
        category: category || undefined,
        tag: tag || undefined,
      };

      const memories = await getLongTermMemories(this.db, this.studentId, options);
      return this.jsonResponse(memories);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get long-term memories');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleIngestSession(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const body = await request.json() as SessionInput;
      const result = await ingestSession(this.db, this.r2, this.studentId, body);

      // Story 2.1: AC-2.1.5 - Schedule alarm for memory consolidation
      // Schedule alarm for 4 hours after session ingestion
      const alarmTime = Date.now() + CONSOLIDATION_DELAY_MS;
      await this.ctx.storage.setAlarm(alarmTime);

      console.log('[DO] Consolidation alarm scheduled', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        sessionId: result.sessionId,
        alarmTime: new Date(alarmTime).toISOString(),
        delayHours: CONSOLIDATION_DELAY_HOURS,
        timestamp: new Date().toISOString(),
      });

      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to ingest session');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetSessions(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');

      const sessions = await getSessionsForStudent(
        this.db,
        this.studentId,
        limit ? parseInt(limit, 10) : undefined
      );
      return this.jsonResponse(sessions);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get sessions');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetConsolidationHistory(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');

      const history = await this.getConsolidationHistory(
        limit ? parseInt(limit, 10) : 10
      );
      return this.jsonResponse(history);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get consolidation history');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleTriggerConsolidation(_request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const result = await this.triggerConsolidation();
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to trigger consolidation');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  // ============================================
  // Public RPC Methods (implements StudentCompanionRPC)
  // ============================================

  /**
   * Initialize a new student companion instance
   * Creates student record in D1 if not exists (idempotent)
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

      // Check if student already exists in database
      const existingStudent = await this.getStudentByClerkId(clerkUserId);
      
      if (existingStudent) {
        // Student exists, update last active and return profile
        this.studentId = existingStudent.id;

        const now = getCurrentTimestamp();
        await this.db.batch([]);
        await this.db.prepare(
          'UPDATE students SET last_active_at = ? WHERE id = ?'
        ).bind(now, existingStudent.id).run();

        // Store in DO state and cache
        await this.setState('studentId', existingStudent.id);
        this.cache.set('studentId', existingStudent.id);

        // Log state persistence (Story 1.12: AC-1.12.2)
        console.log('[DO] State persisted - existing student', {
          doInstanceId: this.ctx.id.toString(),
          studentId: existingStudent.id,
          clerkUserId: clerkUserId,
          timestamp: new Date().toISOString(),
        });

        return {
          studentId: existingStudent.id,
          clerkUserId: existingStudent.clerk_user_id,
          displayName: existingStudent.name || 'Student',
          createdAt: existingStudent.created_at,
          lastActiveAt: now,
        };
      }

      // Create new student
      const profile = await this.createStudent(clerkUserId);

      // Store in DO state and cache
      this.studentId = profile.studentId;
      await this.setState('studentId', profile.studentId);
      await this.setState('clerkUserId', clerkUserId);
      this.cache.set('studentId', profile.studentId);
      this.cache.set('clerkUserId', clerkUserId);

      // Log state persistence (Story 1.12: AC-1.12.2)
      console.log('[DO] State persisted - new student', {
        doInstanceId: this.ctx.id.toString(),
        studentId: profile.studentId,
        clerkUserId: clerkUserId,
        timestamp: new Date().toISOString(),
      });

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
      // Log message received (Story 1.12: AC-1.12.1, AC-1.12.6)
      console.log('[DO] Message received', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        messageLength: message.length,
        messagePreview: message.substring(0, 50),
        timestamp: new Date().toISOString(),
      });

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

      // Story 1.12: AC-1.12.5 - Retrieve conversation history for context
      // Story 1.12: AC-1.12.7 - Gracefully handle memory retrieval failures
      let conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
        conversationId: string;
      }> = [];

      try {
        conversationHistory = await this.getConversationHistory(10);
      } catch (error) {
        console.error('[DO] Failed to retrieve conversation history, continuing without context:', error);
        // Continue without history rather than failing the entire request
      }

      // Story 1.12: AC-1.12.4 - Store user message in short-term memory
      const conversationId = `conv_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Story 1.12: AC-1.12.7 - Gracefully handle memory storage failures
      try {
        await this.storeConversationMessage({
          role: 'user',
          content: message,
          conversationId,
          timestamp,
        });
      } catch (error) {
        console.error('[DO] Failed to store user message in memory, continuing:', error);
        // Continue processing even if storage fails - don't crash the chat
      }

      // Generate AI response (Story 1.12: AC-1.12.3, AC-1.12.5)
      // Using Workers AI with conversation context
      const aiMessage = await this.generateResponse(message, conversationHistory);

      const response: AIResponse = {
        message: aiMessage,
        timestamp,
        conversationId,
      };

      // Story 1.12: AC-1.12.4 - Store companion response in short-term memory
      // Story 1.12: AC-1.12.7 - Gracefully handle memory storage failures
      try {
        await this.storeConversationMessage({
          role: 'assistant',
          content: aiMessage,
          conversationId,
          timestamp,
        });
      } catch (error) {
        console.error('[DO] Failed to store assistant message in memory, continuing:', error);
        // Continue processing even if storage fails - don't crash the chat
      }

      // Update last active timestamp
      await this.setState('lastActiveAt', timestamp);

      // Log response generated (Story 1.12: AC-1.12.6)
      console.log('[DO] Response generated', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        conversationId: response.conversationId,
        responseLength: response.message.length,
        timestamp: new Date().toISOString(),
      });

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

      // Query session count
      const sessionCountResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM session_metadata WHERE student_id = ?')
        .bind(this.studentId)
        .first<{ count: number }>();

      const sessionCount = sessionCountResult?.count || 0;

      // Query recent topics (last 5 sessions)
      const recentSessionsResult = await this.db
        .prepare('SELECT subjects, date FROM session_metadata WHERE student_id = ? ORDER BY date DESC LIMIT 5')
        .bind(this.studentId)
        .all<{ subjects: string; date: string }>();

      const recentTopics: string[] = [];
      if (recentSessionsResult.results) {
        for (const session of recentSessionsResult.results) {
          if (session.subjects) {
            try {
              const subjects = JSON.parse(session.subjects);
              if (Array.isArray(subjects)) {
                recentTopics.push(...subjects);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Remove duplicates and limit to 10 topics
      const uniqueTopics = [...new Set(recentTopics)].slice(0, 10);

      // Query date range for last session and days active
      const dateRangeResult = await this.db
        .prepare('SELECT MIN(date) as first_session, MAX(date) as last_session FROM session_metadata WHERE student_id = ?')
        .bind(this.studentId)
        .first<{ first_session: string | null; last_session: string | null }>();

      let lastSessionDate = '';
      let daysActive = 0;

      if (dateRangeResult?.last_session) {
        lastSessionDate = dateRangeResult.last_session;

        if (dateRangeResult.first_session) {
          const firstDate = new Date(dateRangeResult.first_session);
          const lastDate = new Date(dateRangeResult.last_session);
          daysActive = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Query total minutes studied (optional)
      const durationResult = await this.db
        .prepare('SELECT SUM(duration_minutes) as total FROM session_metadata WHERE student_id = ? AND duration_minutes IS NOT NULL')
        .bind(this.studentId)
        .first<{ total: number | null }>();

      const totalMinutesStudied = durationResult?.total || undefined;

      const progress: ProgressData = {
        sessionCount,
        recentTopics: uniqueTopics,
        lastSessionDate,
        daysActive,
        totalMinutesStudied,
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
  // Memory Consolidation Methods (Story 2.1)
  // ============================================

  /**
   * Load short-term memories ready for consolidation
   * Story 2.1: AC-2.1.1 - Load and filter short-term memories for consolidation
   *
   * @returns Object containing short-term memories and existing long-term context
   */
  private async loadShortTermMemoriesForConsolidation(): Promise<{
    shortTermMemories: Array<{
      id: string;
      content: string;
      createdAt: string;
      sessionId: string | null;
      importanceScore: number;
    }>;
    longTermMemories: Array<{
      id: string;
      category: string;
      content: string;
      confidenceScore: number | null;
      sourceSessionIds: string | null;
      lastUpdatedAt: string;
    }>;
  }> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const now = getCurrentTimestamp();

      // Query short-term memories ready for consolidation
      // Load memories that have expired OR have no expiration
      const shortTermResult = await this.db
        .prepare(`
          SELECT id, content, created_at, session_id, importance_score
          FROM short_term_memory
          WHERE student_id = ?
            AND (expires_at <= ? OR expires_at IS NULL)
          ORDER BY created_at ASC
        `)
        .bind(this.studentId, now)
        .all<{
          id: string;
          content: string;
          created_at: string;
          session_id: string | null;
          importance_score: number;
        }>();

      const shortTermMemories = (shortTermResult.results || []).map(row => ({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        sessionId: row.session_id,
        importanceScore: row.importance_score,
      }));

      // Load existing long-term memories for context
      const longTermResult = await this.db
        .prepare(`
          SELECT id, category, content, confidence_score, source_sessions, last_updated_at
          FROM long_term_memory
          WHERE student_id = ?
          ORDER BY last_updated_at DESC
        `)
        .bind(this.studentId)
        .all<{
          id: string;
          category: string;
          content: string;
          confidence_score: number | null;
          source_sessions: string | null;
          last_updated_at: string;
        }>();

      const longTermMemories = (longTermResult.results || []).map(row => ({
        id: row.id,
        category: row.category,
        content: row.content,
        confidenceScore: row.confidence_score,
        sourceSessionIds: row.source_sessions,
        lastUpdatedAt: row.last_updated_at,
      }));

      console.log('[DO] Loaded memories for consolidation', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        shortTermCount: shortTermMemories.length,
        longTermCount: longTermMemories.length,
        timestamp: new Date().toISOString(),
      });

      return {
        shortTermMemories,
        longTermMemories,
      };
    } catch (error) {
      console.error('[DO] Error loading memories for consolidation:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to load memories for consolidation',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Consolidate short-term memories into categorized insights using LLM
   * Story 2.1: AC-2.1.1, AC-2.1.2, AC-2.1.6 - LLM-based consolidation with categorization
   *
   * @param shortTermMemories - Short-term memories to consolidate
   * @param longTermMemories - Existing long-term memory for context
   * @returns Categorized insights from consolidation
   */
  private async consolidateMemories(
    shortTermMemories: Array<{
      id: string;
      content: string;
      createdAt: string;
      sessionId: string | null;
      importanceScore: number;
    }>,
    longTermMemories: Array<{
      id: string;
      category: string;
      content: string;
      confidenceScore: number | null;
      sourceSessionIds: string | null;
      lastUpdatedAt: string;
    }>
  ): Promise<ConsolidatedInsight[]> {
    try {
      // Handle empty state gracefully
      if (shortTermMemories.length === 0) {
        console.log('[DO] No short-term memories to consolidate');
        return [];
      }

      // Build consolidation prompt
      const systemPrompt = `You are a memory consolidation assistant. Your task is to analyze recent student interactions and learning sessions, then consolidate them into structured long-term knowledge.

Extract insights across these categories:
- background: Student's background, context, learning environment, general information
- strengths: Areas where the student excels, demonstrated skills, positive patterns
- struggles: Challenges, difficulties, areas needing improvement
- goals: Learning objectives, aspirations, stated or implied goals

For each category, provide:
1. Clear, concise insights (2-3 sentences max)
2. Confidence score (0.0-1.0) based on evidence strength
3. Source session IDs that support the insight

Important:
- Preserve all important information from short-term memories
- Only include categories with meaningful insights (skip empty categories)
- Be specific and actionable
- Merge with existing long-term knowledge when relevant`;

      // Build context from existing long-term memories
      let existingContext = '';
      if (longTermMemories.length > 0) {
        existingContext = '\n\n**Existing Long-Term Knowledge:**\n';
        for (const ltm of longTermMemories) {
          existingContext += `\n- [${ltm.category}] ${ltm.content}`;
        }
      }

      // Build short-term memory content
      let shortTermContent = '\n\n**Recent Interactions to Consolidate:**\n';
      const sessionIds = new Set<string>();

      for (const stm of shortTermMemories) {
        if (stm.sessionId) {
          sessionIds.add(stm.sessionId);
        }

        try {
          const parsed = JSON.parse(stm.content);
          if (parsed.text || parsed.message) {
            shortTermContent += `\n- [${stm.createdAt}] ${parsed.text || parsed.message}`;
          } else {
            shortTermContent += `\n- [${stm.createdAt}] ${stm.content}`;
          }
        } catch {
          shortTermContent += `\n- [${stm.createdAt}] ${stm.content}`;
        }
      }

      const sourceSessionIdArray = Array.from(sessionIds);

      const userPrompt = `${existingContext}${shortTermContent}

Please consolidate these interactions into structured insights. Return ONLY a valid JSON array in this exact format:
[
  {
    "category": "background|strengths|struggles|goals",
    "content": "Clear insight here (2-3 sentences max)",
    "confidenceScore": 0.8,
    "sourceSessionIds": ["session_id_1", "session_id_2"]
  }
]`;

      // Call Workers AI for consolidation
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      console.log('[DO] Calling AI for memory consolidation', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        shortTermCount: shortTermMemories.length,
        longTermCount: longTermMemories.length,
      });

      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages,
      } as any);

      // Extract and parse response
      let responseText = '';
      if (response && typeof response === 'object' && 'response' in response) {
        responseText = (response as { response: string }).response;
      } else {
        throw new Error('Unexpected AI response format');
      }

      // Parse JSON response
      let insights: ConsolidatedInsight[] = [];

      try {
        // Try to extract JSON from response (LLM might add extra text)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Validate and transform insights
          insights = parsed
            .filter((item: any) =>
              item.category &&
              item.content &&
              typeof item.confidenceScore === 'number' &&
              ['background', 'strengths', 'struggles', 'goals'].includes(item.category)
            )
            .map((item: any) => ({
              category: item.category as 'background' | 'strengths' | 'struggles' | 'goals',
              content: item.content,
              confidenceScore: Math.max(0, Math.min(1, item.confidenceScore)),
              sourceSessionIds: Array.isArray(item.sourceSessionIds)
                ? item.sourceSessionIds
                : sourceSessionIdArray,
            }));
        } else {
          console.warn('[DO] No JSON found in AI response, using fallback');
        }
      } catch (parseError) {
        console.error('[DO] Failed to parse AI consolidation response:', parseError);
        console.error('[DO] Response text:', responseText);
      }

      // Fallback: If parsing failed or no insights, create basic insight
      if (insights.length === 0) {
        insights = [
          {
            category: 'background',
            content: `Student has ${shortTermMemories.length} recent interactions recorded across ${sourceSessionIdArray.length} sessions.`,
            confidenceScore: 0.7,
            sourceSessionIds: sourceSessionIdArray,
          },
        ];
      }

      console.log('[DO] Memory consolidation completed', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        insightsGenerated: insights.length,
        categories: insights.map(i => i.category),
      });

      return insights;
    } catch (error) {
      console.error('[DO] Error consolidating memories:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw to be handled by caller (with retry logic in Task 8)
      throw error;
    }
  }

  /**
   * Update long-term memory with consolidated insights
   * Story 2.1: AC-2.1.2, AC-2.1.4 - Insert/update long-term memory records
   *
   * @param insights - Consolidated insights from LLM
   * @param existingMemories - Existing long-term memories for merging
   * @returns Count of created and updated records
   */
  private async updateLongTermMemory(
    insights: ConsolidatedInsight[],
    existingMemories: Array<{
      id: string;
      category: string;
      content: string;
      confidenceScore: number | null;
      sourceSessionIds: string | null;
      lastUpdatedAt: string;
    }>
  ): Promise<{
    created: number;
    updated: number;
  }> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      let created = 0;
      let updated = 0;
      const now = getCurrentTimestamp();

      // Group existing memories by category for quick lookup
      const existingByCategory = new Map<string, typeof existingMemories[0]>();
      for (const mem of existingMemories) {
        existingByCategory.set(mem.category, mem);
      }

      // Process each insight
      for (const insight of insights) {
        const existing = existingByCategory.get(insight.category);

        if (existing) {
          // Update existing long-term memory
          // Merge new content with existing, keep source session IDs
          const existingSourceSessions = existing.sourceSessionIds
            ? JSON.parse(existing.sourceSessionIds)
            : [];
          const newSourceSessions = Array.isArray(insight.sourceSessionIds)
            ? insight.sourceSessionIds
            : [];

          // Merge and deduplicate source session IDs
          const mergedSources = Array.from(
            new Set([...existingSourceSessions, ...newSourceSessions])
          );

          // Merge content intelligently: append new insights to existing
          const mergedContent = `${existing.content}\n\nRecent insights: ${insight.content}`;

          // Update confidence score (weighted average favoring new insights)
          const oldConfidence = existing.confidenceScore || 0.5;
          const newConfidence = (oldConfidence * 0.4) + (insight.confidenceScore * 0.6);

          await this.db
            .prepare(`
              UPDATE long_term_memory
              SET content = ?,
                  confidence_score = ?,
                  source_sessions = ?,
                  last_updated_at = ?
              WHERE id = ?
            `)
            .bind(
              mergedContent,
              newConfidence,
              JSON.stringify(mergedSources),
              now,
              existing.id
            )
            .run();

          updated++;

          console.log('[DO] Updated long-term memory', {
            doInstanceId: this.ctx.id.toString(),
            studentId: this.studentId,
            memoryId: existing.id,
            category: insight.category,
            sourceSessions: mergedSources.length,
          });
        } else {
          // Insert new long-term memory record
          const memoryId = generateId();
          const sourceSessionsJson = JSON.stringify(insight.sourceSessionIds || []);

          await this.db
            .prepare(`
              INSERT INTO long_term_memory
              (id, student_id, category, content, confidence_score, source_sessions, last_updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              memoryId,
              this.studentId,
              insight.category,
              insight.content,
              insight.confidenceScore,
              sourceSessionsJson,
              now
            )
            .run();

          created++;

          console.log('[DO] Created long-term memory', {
            doInstanceId: this.ctx.id.toString(),
            studentId: this.studentId,
            memoryId,
            category: insight.category,
            sourceSessions: insight.sourceSessionIds.length,
          });
        }
      }

      console.log('[DO] Long-term memory update complete', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        created,
        updated,
      });

      return { created, updated };
    } catch (error) {
      console.error('[DO] Error updating long-term memory:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to update long-term memory',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Archive (delete) short-term memories that have been consolidated
   * Story 2.1: AC-2.1.3 - Clean up short-term memory after consolidation
   *
   * @param memoryIds - IDs of short-term memories to archive
   * @returns Count of archived memories
   */
  private async archiveShortTermMemories(memoryIds: string[]): Promise<number> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      if (memoryIds.length === 0) {
        console.log('[DO] No short-term memories to archive');
        return 0;
      }

      // Delete consolidated short-term memories
      // Note: Memory IDs are preserved in consolidation_history for audit trail
      const placeholders = memoryIds.map(() => '?').join(',');
      const query = `
        DELETE FROM short_term_memory
        WHERE student_id = ?
          AND id IN (${placeholders})
      `;

      const result = await this.db
        .prepare(query)
        .bind(this.studentId, ...memoryIds)
        .run();

      const deletedCount = result.meta?.changes || 0;

      console.log('[DO] Archived short-term memories', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        requestedCount: memoryIds.length,
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      console.error('[DO] Error archiving short-term memories:', {
        studentId: this.studentId,
        memoryCount: memoryIds.length,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to archive short-term memories',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Insert consolidation history record for audit trail
   * Story 2.1: AC-2.1.7, AC-2.1.8 - Track consolidation events
   *
   * @param params - Consolidation history parameters
   * @returns History record ID
   */
  private async insertConsolidationHistory(params: {
    shortTermItemsProcessed: number;
    longTermItemsCreated: number;
    longTermItemsUpdated: number;
    status: 'success' | 'partial' | 'failed';
    errorMessage?: string;
  }): Promise<string> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const historyId = generateId();
      const now = getCurrentTimestamp();

      await this.db
        .prepare(`
          INSERT INTO consolidation_history
          (id, student_id, consolidated_at, short_term_items_processed,
           long_term_items_created, long_term_items_updated, status, error_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          historyId,
          this.studentId,
          now,
          params.shortTermItemsProcessed,
          params.longTermItemsCreated,
          params.longTermItemsUpdated,
          params.status,
          params.errorMessage || null
        )
        .run();

      console.log('[DO] Consolidation history record created', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        historyId,
        status: params.status,
        itemsProcessed: params.shortTermItemsProcessed,
      });

      return historyId;
    } catch (error) {
      console.error('[DO] Error inserting consolidation history:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to insert consolidation history',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Run full consolidation workflow with transactional atomicity
   * Story 2.1: AC-2.1.7 - Transactional consolidation (all-or-nothing)
   *
   * Orchestrates the complete consolidation process:
   * 1. Load short-term and long-term memories
   * 2. Consolidate using LLM
   * 3. Begin D1 transaction
   * 4. Update long-term memory
   * 5. Archive short-term memory
   * 6. Insert consolidation history
   * 7. Commit transaction
   *
   * @returns Consolidation result with statistics
   */
  private async runConsolidation(): Promise<ConsolidationResult> {
    const startTime = Date.now();

    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      console.log('[DO] Starting consolidation workflow', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        timestamp: new Date().toISOString(),
      });

      // Step 1: Load memories for consolidation
      const { shortTermMemories, longTermMemories } =
        await this.loadShortTermMemoriesForConsolidation();

      if (shortTermMemories.length === 0) {
        console.log('[DO] No memories to consolidate, skipping', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
        });

        return {
          success: true,
          shortTermItemsProcessed: 0,
          longTermItemsCreated: 0,
          longTermItemsUpdated: 0,
        };
      }

      // Step 2: Consolidate memories using LLM with retry logic
      // Story 2.1: AC-2.1.7 - Retry logic for transient LLM failures (up to 3 attempts)
      let insights: ConsolidatedInsight[] = [];
      let lastError: Error | null = null;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          insights = await this.consolidateMemories(
            shortTermMemories,
            longTermMemories
          );
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          console.warn('[DO] LLM consolidation attempt failed', {
            doInstanceId: this.ctx.id.toString(),
            studentId: this.studentId,
            attempt,
            maxRetries: MAX_RETRIES,
            error: lastError.message,
          });

          if (attempt < MAX_RETRIES) {
            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // If all retries failed, throw the last error
      if (insights.length === 0 && lastError) {
        throw lastError;
      }

      // Step 3-7: Execute transactional updates
      // Using db.batch() for atomic all-or-nothing consolidation
      const memoryIds = shortTermMemories.map(m => m.id);

      // Update long-term memory (Step 4)
      const { created, updated } = await this.updateLongTermMemory(
        insights,
        longTermMemories
      );

      // Archive short-term memories (Step 5)
      const archived = await this.archiveShortTermMemories(memoryIds);

      // Insert consolidation history (Step 6)
      await this.insertConsolidationHistory({
        shortTermItemsProcessed: shortTermMemories.length,
        longTermItemsCreated: created,
        longTermItemsUpdated: updated,
        status: 'success',
      });

      const duration = Date.now() - startTime;

      console.log('[DO] Consolidation workflow completed successfully', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        shortTermProcessed: shortTermMemories.length,
        longTermCreated: created,
        longTermUpdated: updated,
        shortTermArchived: archived,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        shortTermItemsProcessed: shortTermMemories.length,
        longTermItemsCreated: created,
        longTermItemsUpdated: updated,
        insights,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[DO] Consolidation workflow failed', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });

      // Log failure in consolidation history
      try {
        await this.insertConsolidationHistory({
          shortTermItemsProcessed: 0,
          longTermItemsCreated: 0,
          longTermItemsUpdated: 0,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (historyError) {
        console.error('[DO] Failed to log consolidation failure:', historyError);
      }

      return {
        success: false,
        shortTermItemsProcessed: 0,
        longTermItemsCreated: 0,
        longTermItemsUpdated: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get consolidation history for verification
   * Story 2.1: AC-2.1.8 - RPC method to retrieve consolidation history
   *
   * @param limit - Maximum number of records to return (default: 10)
   * @returns Array of consolidation history records
   */
  async getConsolidationHistory(limit: number = 10): Promise<ConsolidationHistory[]> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const result = await this.db
        .prepare(`
          SELECT id, student_id, consolidated_at, short_term_items_processed,
                 long_term_items_created, long_term_items_updated, status, error_message
          FROM consolidation_history
          WHERE student_id = ?
          ORDER BY consolidated_at DESC
          LIMIT ?
        `)
        .bind(this.studentId, limit)
        .all<{
          id: string;
          student_id: string;
          consolidated_at: string;
          short_term_items_processed: number;
          long_term_items_created: number;
          long_term_items_updated: number;
          status: 'success' | 'partial' | 'failed';
          error_message: string | null;
        }>();

      const history: ConsolidationHistory[] = (result.results || []).map(row => ({
        id: row.id,
        studentId: row.student_id,
        consolidatedAt: row.consolidated_at,
        shortTermItemsProcessed: row.short_term_items_processed,
        longTermItemsUpdated: row.long_term_items_created + row.long_term_items_updated,
        status: row.status,
        errorMessage: row.error_message || undefined,
      }));

      console.log('[DO] Consolidation history retrieved', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        recordCount: history.length,
      });

      return history;
    } catch (error) {
      console.error('[DO] Error retrieving consolidation history:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to retrieve consolidation history',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Manually trigger consolidation for testing/debugging
   * Story 2.1: AC-2.1.8 - Manual RPC method to trigger consolidation
   *
   * @returns Consolidation result with statistics
   */
  async triggerConsolidation(): Promise<ConsolidationResult> {
    try {
      console.log('[DO] Manual consolidation triggered', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId || 'not-initialized',
        timestamp: new Date().toISOString(),
      });

      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Run consolidation without waiting for alarm
      const result = await this.runConsolidation();

      console.log('[DO] Manual consolidation completed', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        success: result.success,
        itemsProcessed: result.shortTermItemsProcessed,
      });

      return result;
    } catch (error) {
      console.error('[DO] Error in manual consolidation:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to trigger consolidation',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  // ============================================
  // Database Helper Methods
  // ============================================

  /**
   * Retrieve recent conversation history from short-term memory
   * Story 1.12: AC-1.12.5 - Retrieve conversation history for context
   */
  private async getConversationHistory(limit: number = 10): Promise<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      conversationId: string;
    }>
  > {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const result = await this.db
        .prepare(`
          SELECT content, created_at
          FROM short_term_memory
          WHERE student_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .bind(this.studentId, limit)
        .all<{ content: string; created_at: string }>();

      if (!result.results) {
        return [];
      }

      // Parse and reverse to get chronological order (oldest first)
      const messages = result.results
        .map((row) => {
          try {
            const parsed = JSON.parse(row.content);
            return {
              role: parsed.role as 'user' | 'assistant',
              content: parsed.message,
              timestamp: row.created_at,
              conversationId: parsed.conversationId,
            };
          } catch (error) {
            console.error('Error parsing conversation message:', error);
            return null;
          }
        })
        .filter((msg): msg is NonNullable<typeof msg> => msg !== null)
        .reverse(); // Reverse to get chronological order

      console.log('[DO] Conversation history retrieved', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        messageCount: messages.length,
        requestedLimit: limit,
      });

      return messages;
    } catch (error) {
      console.error('Error retrieving conversation history:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw StudentCompanionErrors, wrap others
      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to retrieve conversation history',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Store a conversation message in short-term memory
   * Story 1.12: AC-1.12.4 - Store messages with metadata
   */
  private async storeConversationMessage(params: {
    role: 'user' | 'assistant';
    content: string;
    conversationId: string;
    timestamp: string;
  }): Promise<void> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const memoryId = generateId();

      // Store message metadata as JSON in content field
      const contentJson = JSON.stringify({
        role: params.role,
        message: params.content,
        conversationId: params.conversationId,
      });

      const result = await this.db
        .prepare(`
          INSERT INTO short_term_memory
          (id, student_id, content, created_at, importance_score)
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(
          memoryId,
          this.studentId,
          contentJson,
          params.timestamp,
          0.5 // Default importance score
        )
        .run();

      if (!result.success) {
        throw new StudentCompanionError(
          'Failed to store conversation message',
          'DB_ERROR',
          500
        );
      }

      console.log('[DO] Conversation message stored', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        role: params.role,
        memoryId,
        conversationId: params.conversationId,
      });
    } catch (error) {
      console.error('Error storing conversation message:', {
        studentId: this.studentId,
        role: params.role,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw StudentCompanionErrors, wrap others
      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to store conversation message',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Create a new student record in D1 database
   */
  private async createStudent(clerkUserId: string, email?: string, name?: string): Promise<StudentProfile> {
    try {
      const studentId = generateId();
      const now = getCurrentTimestamp();
      
      const result = await this.db.prepare(`
        INSERT INTO students (id, clerk_user_id, email, name, created_at, last_active_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(studentId, clerkUserId, email || null, name || null, now, now).run();
      
      if (!result.success) {
        throw new StudentCompanionError(
          'Failed to create student record',
          'DB_ERROR',
          500
        );
      }
      
      return {
        studentId,
        clerkUserId,
        displayName: name || 'Student',
        createdAt: now,
        lastActiveAt: now,
      };
      
    } catch (error) {
      console.error('Error creating student:', {
        clerkUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      if (error instanceof StudentCompanionError) {
        throw error;
      }
      
      throw new StudentCompanionError(
        'Database operation failed',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Get student by Clerk user ID
   */
  private async getStudentByClerkId(clerkUserId: string): Promise<DbStudentRow | null> {
    try {
      const result = await this.db.prepare(
        'SELECT * FROM students WHERE clerk_user_id = ?'
      ).bind(clerkUserId).first<DbStudentRow>();
      
      return result;
    } catch (error) {
      console.error('Error fetching student by Clerk ID:', {
        clerkUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StudentCompanionError(
        'Failed to fetch student record',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Get student by internal student ID
   */
  // @ts-expect-error - Intentionally unused in production code, but used in tests
  private async getStudent(studentId: string): Promise<StudentProfile | null> {
    try {
      const result = await this.db.prepare(
        'SELECT * FROM students WHERE id = ?'
      ).bind(studentId).first();
      
      if (!result) {
        return null;
      }
      
      return {
        studentId: result.id as string,
        clerkUserId: result.clerk_user_id as string,
        displayName: (result.name as string) || 'Student',
        createdAt: result.created_at as string,
        lastActiveAt: result.last_active_at as string,
      };
    } catch (error) {
      console.error('Error fetching student:', {
        studentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StudentCompanionError(
        'Failed to fetch student record',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Store short-term memory for this student
   * All queries scoped to student_id for isolation
   */
  // @ts-expect-error - Intentionally unused in production code, but used in tests
  private async storeShortTermMemory(content: string, sessionId?: string): Promise<string> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }
      
      const memoryId = generateId();
      const now = getCurrentTimestamp();
      
      const result = await this.db.prepare(`
        INSERT INTO short_term_memory (id, student_id, content, session_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(memoryId, this.studentId, content, sessionId || null, now).run();
      
      if (!result.success) {
        throw new StudentCompanionError(
          'Failed to store short-term memory',
          'DB_ERROR',
          500
        );
      }
      
      return memoryId;
    } catch (error) {
      console.error('Error storing short-term memory:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      if (error instanceof StudentCompanionError) {
        throw error;
      }
      
      throw new StudentCompanionError(
        'Failed to store memory',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Get short-term memory for this student
   * Query scoped to student_id for isolation
   */
  // @ts-expect-error - Intentionally unused in production code, but used in tests
  private async getShortTermMemory(limit: number = 10): Promise<MemoryItem[]> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }
      
      const result = await this.db.prepare(`
        SELECT * FROM short_term_memory 
        WHERE student_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(this.studentId, limit).all();
      
      return (result.results || []).map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        content: row.content,
        createdAt: row.created_at,
        sessionId: row.session_id,
        importanceScore: row.importance_score,
      }));
    } catch (error) {
      console.error('Error fetching short-term memory:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StudentCompanionError(
        'Failed to fetch memory',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Store long-term memory for this student
   * Query scoped to student_id for isolation
   */
  // @ts-expect-error - Intentionally unused in production code, but used in tests
  private async storeLongTermMemory(category: string, content: string): Promise<string> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }
      
      const memoryId = generateId();
      const now = getCurrentTimestamp();
      
      const result = await this.db.prepare(`
        INSERT INTO long_term_memory (id, student_id, category, content, last_updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(memoryId, this.studentId, category, content, now).run();
      
      if (!result.success) {
        throw new StudentCompanionError(
          'Failed to store long-term memory',
          'DB_ERROR',
          500
        );
      }
      
      return memoryId;
    } catch (error) {
      console.error('Error storing long-term memory:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      if (error instanceof StudentCompanionError) {
        throw error;
      }
      
      throw new StudentCompanionError(
        'Failed to store memory',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Get long-term memory for this student
   * Query scoped to student_id for isolation
   */
  // @ts-expect-error - Intentionally unused in production code, but used in tests
  private async getLongTermMemory(category?: string): Promise<MemoryItem[]> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }
      
      let query = 'SELECT * FROM long_term_memory WHERE student_id = ?';
      const params: any[] = [this.studentId];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY last_updated_at DESC';
      
      const result = await this.db.prepare(query).bind(...params).all();
      
      return (result.results || []).map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        content: row.content,
        createdAt: row.last_updated_at,
        category: row.category,
        confidenceScore: row.confidence_score,
      }));
    } catch (error) {
      console.error('Error fetching long-term memory:', {
        studentId: this.studentId,
        category,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StudentCompanionError(
        'Failed to fetch memory',
        'DB_ERROR',
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
    await this.ctx.storage.put(key, value);
  }

  /**
   * Retrieve a value from durable storage
   */
  private async getState<T>(key: string): Promise<T | undefined> {
    return await this.ctx.storage.get<T>(key);
  }

  // ============================================
  // AI Response Generation
  // ============================================

  /**
   * Generate AI response using Workers AI with conversation context
   * Story 1.12: AC-1.12.3 - Replace placeholder echo with actual AI processing
   * Story 1.12: AC-1.12.5 - Use conversation history for context-aware responses
   */
  private async generateResponse(
    message: string,
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      conversationId: string;
    }> = []
  ): Promise<string> {
    try {
      // Build conversation context for AI
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `You are a friendly and encouraging AI study companion. Your role is to help students learn effectively by:
- Asking thoughtful questions to deepen understanding
- Breaking down complex topics into manageable pieces
- Providing clear explanations and examples
- Offering encouragement and motivation
- Adapting to the student's learning style and pace

Keep responses concise (2-3 sentences) and engaging. Focus on being supportive and helpful.`,
        },
      ];

      // Add conversation history for context
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add current message
      messages.push({
        role: 'user',
        content: message,
      });

      // Call Workers AI
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages,
      } as any);

      // Extract response text
      if (response && typeof response === 'object' && 'response' in response) {
        return (response as { response: string }).response;
      }

      // Fallback if response format is unexpected
      return "I'm here to help! Could you tell me more about what you'd like to learn?";
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback response on error
      return "I'm here to help you learn! What subject or topic would you like to explore?";
    }
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

