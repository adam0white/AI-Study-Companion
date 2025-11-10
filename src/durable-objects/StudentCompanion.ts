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
  ConsolidatedInsight,
  ConsolidationResult,
  ConsolidationHistory,
  LongTermMemoryItem,
  ShortTermMemoryItem,
  AssembledContext,
  MemoryStatus,
  PracticeOptions,
  PracticeSession,
  PracticeQuestion,
  AnswerFeedback,
  PracticeResult,
  SendMessageOptions,
  HintResponse,
  MultiDimensionalProgressData,
  SubjectProgress,
  SessionMetadata,
  ProgressByTime,
  SubjectMastery,
  SubjectPracticeStats,
  HeroCardState,
  RecentSessionData,
  CardOrder,
  GoalProgressSnapshot,
  GoalCelebrationData,
  RetentionNudgeData,
  StudentNudgeState,
  NudgeEvent
} from '../lib/rpc/types';
import type { CelebrationState, SessionMetrics } from '../lib/types/celebration';
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
import {
  buildPracticePrompt,
  buildSocraticSystemPrompt,
  detectQuestionIntent,
  buildHintGenerationPrompt
} from '../lib/ai/prompts';
import { calculateNewDifficulty, mapMasteryToDifficulty, calculateNewMastery } from '../lib/practice/difficultyAdjustment';
import { SUBJECTS } from '../lib/constants';

/**
 * Environment bindings interface for Durable Object
 */
interface Env {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  CLERK_SECRET_KEY: string;
}

/**
 * Consolidation configuration
 * Story 2.1: AC-2.1.1, AC-2.1.4 - Memory consolidation scheduling
 * Story 2.2: AC-2.2.7 - LLM usage optimization
 */
const CONSOLIDATION_DELAY_HOURS = 4;
const CONSOLIDATION_DELAY_MS = CONSOLIDATION_DELAY_HOURS * 60 * 60 * 1000;
const RECURRING_CONSOLIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRY_ATTEMPTS = 3;
const MAX_MEMORIES_PER_BATCH = 20; // Story 2.2: AC-2.2.7 - Limit batch size for cost optimization
const MIN_CONFIDENCE_SCORE = 0.3;
const CONFIDENCE_INCREMENT_PER_SESSION = 0.1;
const LLM_TEMPERATURE = 0.3; // Low for consistent categorization
const LLM_MAX_TOKENS = 1000;

/**
 * Response generation configuration
 * Story 2.4: AC-2.4.6, AC-2.4.7 - Personalized response generation
 */
const MAX_SYSTEM_PROMPT_TOKENS = 500;
const MAX_CONTEXT_ITEMS_PER_CATEGORY = 3;
const CONTEXT_USAGE_TRACKING_WINDOW = 5; // messages
const RESPONSE_TEMPERATURE = 0.7;
const RESPONSE_MAX_TOKENS = 500;

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
  // private vectorize: VectorizeIndex; // Reserved for future use
  private cache: Map<string, any>;
  private studentId?: string;
  private initialized: boolean = false;
  private schemaInitialized: boolean = false;

  // Story 2.3: AC-2.3.5 - In-memory cache for long-term memory
  private longTermMemoryCache: LongTermMemoryItem[] | null = null;
  private longTermMemoryCacheExpiry: number = 0;
  private static readonly LONG_TERM_MEMORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly DEFAULT_SHORT_TERM_LIMIT = 10;
  private static readonly MAX_CONTEXT_LENGTH_CHARS = 4000; // ~1000 tokens

  // Story 2.4: AC-2.4.7 - Context usage tracking to prevent repetition
  private recentContextUsage: Set<string> = new Set();
  private contextUsageMessageCount: number = 0;

  // Story 3.4: Socratic Q&A state tracking
  private socraticDepthMap: Map<string, number> = new Map(); // conversationId -> depth
  private hintCache: Map<string, string[]> = new Map(); // messageId -> hints array
  // Note: MAX_SOCRATIC_DEPTH and HINT_CACHE_TTL_MS reserved for future use (automatic cleanup)
  // private static readonly MAX_SOCRATIC_DEPTH = 5;
  // private static readonly HINT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  // Story 3.5: Multi-dimensional progress cache
  private multiDimensionalProgressCache: MultiDimensionalProgressData | null = null;
  private multiDimensionalProgressCacheExpiry: number = 0;
  private static readonly MULTI_DIMENSIONAL_PROGRESS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

  /**
   * Constructor - no async operations allowed here
   * Uses lazy initialization pattern for async setup
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env as any);
    this.db = env.DB;
    this.r2 = env.R2;
    this.ai = env.AI;
    // this.vectorize = env.VECTORIZE; // Reserved for future use
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
          case 'getLongTermMemory':
            return this.handleGetLongTermMemory(request);
          case 'getShortTermMemory':
            return this.handleGetShortTermMemory(request);
          case 'getMemoryStatus':
            return this.handleGetMemoryStatus(request);
          case 'startPractice':
            return this.handleStartPractice(request);
          case 'submitAnswer':
            return this.handleSubmitAnswer(request);
          case 'completePractice':
            return this.handleCompletePractice(request);
          case 'requestHint':
            return this.handleRequestHint(request);
          case 'getMultiDimensionalProgress':
            return this.handleGetMultiDimensionalProgress(request);
          case 'getSubjectMastery':
            return this.handleGetSubjectMastery(request);
          case 'getSubjectPracticeStats':
            return this.handleGetSubjectPracticeStats(request);
          case 'ingestMockSession':
            return this.handleIngestMockSession(request);
          case 'getHeroCardState':
            return this.handleGetHeroCardState(request);
          case 'getCardOrder':
            return this.handleGetCardOrder(request);
          case 'getSessionCelebration':
            return this.handleGetSessionCelebration(request);
          case 'getGoalProgress':
            return this.handleGetGoalProgress(request);
          case 'getGoalCelebration':
            return this.handleGetGoalCelebration(request);
          case 'getNudgeIfPending':
            return this.handleGetNudgeIfPending(request);
          case 'dismissNudge':
            return this.handleDismissNudge(request);
          case 'snoozeNudge':
            return this.handleSnoozeNudge(request);
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
   * Story 2.1: AC-2.1.2, AC-2.1.7 - Automatic memory consolidation with retry logic
   *
   * @param alarmInfo - Retry information from Cloudflare (automatic retry mechanism)
   */
  async alarm(alarmInfo?: { retryCount: number; isRetry: boolean }): Promise<void> {
    const retryCount = alarmInfo?.retryCount || 0;
    const isRetry = alarmInfo?.isRetry || false;

    try {
      console.log('[DO] Alarm triggered for memory consolidation', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId || 'not-initialized',
        retryCount,
        isRetry,
        timestamp: new Date().toISOString(),
      });

      // Ensure DO is initialized before running consolidation
      await this.ensureInitialized();

      if (!this.studentId) {
        console.error('[DO] Alarm fired but studentId not set, cannot consolidate');
        return;
      }

      // Story 2.1: AC-2.1.7 - Check max retry attempts before proceeding
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.error('[DO] Max retry attempts exceeded, stopping consolidation', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          retryCount,
          maxRetries: MAX_RETRY_ATTEMPTS,
        });

        // Record failure in consolidation history
        await this.insertConsolidationHistory({
          shortTermItemsProcessed: 0,
          longTermItemsCreated: 0,
          longTermItemsUpdated: 0,
          status: 'failed',
          errorMessage: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Manual intervention required.`,
        });

        // Do not reschedule - requires manual intervention
        return;
      }

      // Run consolidation process
      // Story 2.1: AC-2.1.2 - Full consolidation workflow
      const result = await this.runConsolidation();

      console.log('[DO] Consolidation alarm completed', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        success: result.success,
        itemsProcessed: result.shortTermItemsProcessed,
        retryCount,
        timestamp: new Date().toISOString(),
      });

      // Story 2.1: AC-2.1.7 - If consolidation failed, throw error to trigger automatic retry
      if (!result.success && result.error) {
        throw new Error(`Consolidation failed: ${result.error}`);
      }

      // Story 2.1: AC-2.1.4 - Reschedule alarm for periodic consolidation
      if (result.success) {
        await this.scheduleNextConsolidation();
      }
    } catch (error) {
      console.error('[DO] Error in alarm handler:', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId || 'not-initialized',
        error: error instanceof Error ? error.message : String(error),
        retryCount,
        timestamp: new Date().toISOString(),
      });

      // Story 2.1: AC-2.1.7 - Let Cloudflare's automatic retry handle it (up to 6 retries total)
      // Re-throw error to trigger automatic retry with exponential backoff
      throw error;
    }
  }

  /**
   * Schedule next consolidation alarm if new memories exist
   * Story 2.1: AC-2.1.4 - Periodic consolidation with smart rescheduling
   *
   * Checks if there are new short-term memories since last consolidation.
   * If yes, schedules alarm for next consolidation (24 hours).
   * If no, does not reschedule (alarm stops until new session ingested).
   */
  private async scheduleNextConsolidation(): Promise<void> {
    try {
      if (!this.studentId) {
        console.warn('[DO] Cannot schedule consolidation - student not initialized');
        return;
      }

      // Story 2.1: AC-2.1.4 - Check for new short-term memories before rescheduling
      const hasNewMemories = await this.hasNewShortTermMemories();

      if (hasNewMemories) {
        // Schedule alarm for next recurring consolidation (24 hours)
        const nextAlarmTime = Date.now() + RECURRING_CONSOLIDATION_INTERVAL_MS;
        await this.ctx.storage.setAlarm(nextAlarmTime);

        console.log('[DO] Next consolidation alarm scheduled', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          nextAlarmTime: new Date(nextAlarmTime).toISOString(),
          intervalHours: RECURRING_CONSOLIDATION_INTERVAL_MS / (60 * 60 * 1000),
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log('[DO] No new memories, skipping alarm rescheduling', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[DO] Error scheduling next consolidation:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Non-fatal - log error but don't throw
    }
  }

  /**
   * Check if there are new short-term memories ready for consolidation
   * Story 2.1: AC-2.1.4 - Helper method for rescheduling logic
   *
   * @returns True if new short-term memories exist, false otherwise
   */
  private async hasNewShortTermMemories(): Promise<boolean> {
    try {
      if (!this.studentId) {
        return false;
      }

      const now = getCurrentTimestamp();

      // Check for short-term memories that need consolidation
      // Either expired OR created recently without expiration
      const result = await this.db
        .prepare(`
          SELECT COUNT(*) as count
          FROM short_term_memory
          WHERE student_id = ?
            AND (expires_at <= ? OR expires_at IS NULL)
        `)
        .bind(this.studentId, now)
        .first<{ count: number }>();

      const count = result?.count || 0;

      console.log('[DO] Checked for new short-term memories', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        count,
        hasNewMemories: count > 0,
      });

      return count > 0;
    } catch (error) {
      console.error('[DO] Error checking for new memories:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });
      // On error, assume no new memories (fail safe)
      return false;
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
      
      const body = await request.json() as { message: string; options?: SendMessageOptions };
      const result = await this.sendMessage(body.message, body.options);
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

      // Story 2.1: AC-2.1.1 - Schedule alarm for memory consolidation
      // Only schedule if no existing alarm (avoid overwriting recurring consolidation)
      const existingAlarm = await this.ctx.storage.getAlarm();

      if (existingAlarm == null) {
        // No alarm exists, schedule new consolidation alarm
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
      } else {
        console.log('[DO] Consolidation alarm already scheduled, skipping', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          sessionId: result.sessionId,
          existingAlarmTime: new Date(existingAlarm).toISOString(),
          timestamp: new Date().toISOString(),
        });
      }

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

  private async handleGetLongTermMemory(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const url = new URL(request.url);
      const category = url.searchParams.get('category') || undefined;

      const memories = await this.getLongTermMemory(category);
      return this.jsonResponse(memories);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get long-term memory');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  private async handleGetShortTermMemory(request: Request): Promise<Response> {
    try {
      if (!this.studentId) {
        return this.errorResponse('Companion not initialized', 'NOT_INITIALIZED', 400);
      }

      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');

      const memories = await this.getShortTermMemory(
        limit ? parseInt(limit, 10) : undefined
      );
      return this.jsonResponse(memories);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get short-term memory');
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
  async sendMessage(message: string, options?: SendMessageOptions): Promise<AIResponse> {
    try {
      // Log message received (Story 1.12: AC-1.12.1, AC-1.12.6)
      console.log('[DO] Message received', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        messageLength: message.length,
        messagePreview: message.substring(0, 50),
        mode: options?.mode || 'auto',
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

      // Story 3.4: AC-3.4.2 - Determine if Socratic mode should be used
      const isQuestion = detectQuestionIntent(message);
      const useSocraticMode = options?.mode === 'socratic' || (options?.mode !== 'direct' && isQuestion);

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

      // Story 2.3: AC-2.3.3, AC-2.3.4 - Assemble memory context
      // Story 2.4: AC-2.4.1-2.4.6 - Pass assembled context to generateResponse
      let assembledContext: AssembledContext | undefined;

      try {
        assembledContext = await this.assembleContext(message);

        console.log('[DO] Memory context assembled for personalization', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          hasBackground: assembledContext.background.length > 0,
          hasStrengths: assembledContext.strengths.length > 0,
          hasStruggles: assembledContext.struggles.length > 0,
          hasGoals: assembledContext.goals.length > 0,
          hasRecentSessions: assembledContext.recentSessions.length > 0,
        });
      } catch (error) {
        console.error('[DO] Failed to assemble memory context, continuing without it:', error);
        // Continue without memory context rather than failing the entire request
      }

      // Story 3.4: Generate conversation ID and timestamp
      const conversationId = `conv_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Story 3.4: Store user message in chat_history
      const userMessageId = generateId();
      try {
        await this.storeChatMessage({
          id: userMessageId,
          role: 'user',
          content: message,
          messageType: 'user',
          conversationId,
          timestamp,
        });
      } catch (error) {
        console.error('[DO] Failed to store user message in chat_history, continuing:', error);
      }

      // Story 3.4: Get mastery level for Socratic adaptation
      const masteryLevel = await this.getMasteryLevel();

      // Story 3.4: Generate AI response with Socratic mode if enabled
      // Story 2.4: AC-2.4.1-2.4.6 - Using Workers AI with personalized context
      const aiMessage = await this.generateResponse(
        message,
        conversationHistory,
        assembledContext,
        useSocraticMode ? 'socratic' : 'direct',
        masteryLevel
      );

      // Story 3.4: Determine message type and track Socratic depth
      const messageType: 'assistant' | 'socratic_question' = useSocraticMode ? 'socratic_question' : 'assistant';
      const assistantMessageId = generateId();

      // Story 3.4: AC-3.4.8 - Track Socratic conversation depth
      let socraticDepth = 0;
      if (useSocraticMode) {
        socraticDepth = (this.socraticDepthMap.get(conversationId) || 0) + 1;
        this.socraticDepthMap.set(conversationId, socraticDepth);
      }

      const response: AIResponse = {
        message: aiMessage,
        timestamp,
        conversationId,
        type: useSocraticMode ? 'socratic' : 'chat',
        messageId: assistantMessageId,
        metadata: {
          socraticDepth: useSocraticMode ? socraticDepth : undefined,
        },
      };

      // Story 3.4: Store assistant response in chat_history with metadata
      try {
        await this.storeChatMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: aiMessage,
          messageType,
          conversationId,
          timestamp,
          metadata: useSocraticMode ? {
            socraticDepth,
            studentDiscovered: false,
          } : undefined,
        });
      } catch (error) {
        console.error('[DO] Failed to store assistant message in chat_history, continuing:', error);
      }

      // Update last active timestamp
      await this.setState('lastActiveAt', timestamp);

      // Log response generated (Story 1.12: AC-1.12.6, Story 3.4: Socratic logging)
      console.log('[DO] Response generated', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        conversationId: response.conversationId,
        responseLength: response.message.length,
        responseType: response.type,
        socraticMode: useSocraticMode,
        socraticDepth: socraticDepth > 0 ? socraticDepth : undefined,
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
      // Story 2.2: AC-2.2.7 - Limit to MAX_MEMORIES_PER_BATCH for cost optimization
      const shortTermResult = await this.db
        .prepare(`
          SELECT id, content, created_at, session_id, importance_score
          FROM short_term_memory
          WHERE student_id = ?
            AND (expires_at <= ? OR expires_at IS NULL)
          ORDER BY created_at ASC
          LIMIT ?
        `)
        .bind(this.studentId, now, MAX_MEMORIES_PER_BATCH)
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
      // Story 2.2: AC-2.2.2 - Enhanced prompt template for better LLM categorization
      const systemPrompt = `You are an AI learning assistant specializing in memory consolidation. Your task is to analyze a student's recent learning interactions and extract key insights that will help personalize their future learning experience.

TASK:
Analyze the provided interactions and categorize insights into exactly these 4 categories:
1. background - Student's educational context, subject areas of interest, learning goals, grade level
2. strengths - Topics/skills the student demonstrates understanding or mastery of
3. struggles - Concepts the student finds challenging or confusing
4. goals - Explicit or implicit learning objectives the student has mentioned

REQUIREMENTS:
- Extract specific, actionable insights (not vague statements like "student is learning")
- Base confidence scores on evidence strength: multiple mentions = higher confidence
- Only include categories where you found meaningful insights (skip empty categories)
- When merging with existing knowledge, update or refine rather than duplicate

OUTPUT FORMAT:
Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "category": "background|strengths|struggles|goals",
    "content": "Specific insight here (2-3 sentences max, focus on concrete details)",
    "confidenceScore": 0.75,
    "sourceSessionIds": ["session_123", "session_456"]
  }
]

CONFIDENCE SCORING GUIDE:
- 0.9-1.0: Strong evidence from multiple sessions with consistent patterns
- 0.7-0.89: Clear evidence from 2-3 sessions or very explicit single mention
- 0.5-0.69: Single session evidence or implied information
- 0.3-0.49: Weak inference or limited evidence
- Below 0.3: Do not include (insufficient evidence)`;

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

INSTRUCTIONS:
1. Review the existing long-term knowledge above (if any)
2. Analyze the recent interactions to consolidate
3. Extract NEW insights or UPDATE existing knowledge
4. Return a JSON array following the exact format specified

Remember:
- Include session IDs: ${JSON.stringify(sourceSessionIdArray)}
- Skip categories with no meaningful insights
- Be specific and actionable
- Return ONLY the JSON array, no other text`;

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
        temperature: LLM_TEMPERATURE,
        max_tokens: LLM_MAX_TOKENS,
      } as any);

      // Extract and parse response
      let responseText = '';
      if (response && typeof response === 'object' && 'response' in response) {
        responseText = (response as { response: string }).response;
      } else {
        throw new Error('Unexpected AI response format');
      }

      // Parse JSON response
      // Story 2.2: AC-2.2.5 - Robust JSON parsing with fallback handling
      let insights: ConsolidatedInsight[] = [];

      try {
        // Try to extract JSON from response (LLM might add extra text)
        // Story 2.2: AC-2.2.5 - Use regex to extract JSON array from wrapped response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Validate and transform insights
          // Story 2.2: AC-2.2.5 - Strict validation of category, content, and confidence score
          insights = parsed
            .filter((item: any) => {
              const isValid =
                item.category &&
                item.content &&
                typeof item.confidenceScore === 'number' &&
                ['background', 'strengths', 'struggles', 'goals'].includes(item.category);

              if (!isValid) {
                console.warn('[DO] Invalid insight filtered out:', item);
              }

              return isValid;
            })
            .map((item: any) => ({
              category: item.category as 'background' | 'strengths' | 'struggles' | 'goals',
              content: item.content,
              // Story 2.2: AC-2.2.5 - Clamp confidence scores to [0, 1] range
              confidenceScore: Math.max(MIN_CONFIDENCE_SCORE, Math.min(1, item.confidenceScore)),
              sourceSessionIds: Array.isArray(item.sourceSessionIds)
                ? item.sourceSessionIds
                : sourceSessionIdArray,
            }));

          console.log('[DO] Successfully parsed LLM response', {
            doInstanceId: this.ctx.id.toString(),
            studentId: this.studentId,
            insightsParsed: insights.length,
            categories: insights.map(i => i.category),
          });
        } else {
          console.warn('[DO] No JSON array found in AI response, using fallback', {
            responsePreview: responseText.substring(0, 200),
          });
        }
      } catch (parseError) {
        console.error('[DO] Failed to parse AI consolidation response:', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responsePreview: responseText.substring(0, 200),
        });
      }

      // Fallback: If parsing failed or no insights, create basic insight
      // Story 2.2: AC-2.2.5 - Fallback ensures data is never lost completely
      if (insights.length === 0) {
        console.warn('[DO] Using fallback insight due to parsing failure or empty response');

        insights = [
          {
            category: 'background',
            content: `Student has ${shortTermMemories.length} recent interactions recorded across ${sourceSessionIdArray.length} session${sourceSessionIdArray.length === 1 ? '' : 's'}. Additional context consolidation pending.`,
            confidenceScore: MIN_CONFIDENCE_SCORE,
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
   * Invalidate long-term memory cache
   * Story 2.3: AC-2.3.5 - Cache invalidation after consolidation
   */
  private invalidateLongTermMemoryCache(): void {
    this.longTermMemoryCache = null;
    this.longTermMemoryCacheExpiry = 0;

    console.log('[DO] Long-term memory cache invalidated', {
      doInstanceId: this.ctx.id.toString(),
      studentId: this.studentId || 'not-initialized',
    });
  }

  /**
   * Update long-term memory with consolidated insights
   * Story 2.1: AC-2.1.2, AC-2.1.4 - Insert/update long-term memory records
   * Story 2.3: AC-2.3.5 - Invalidate cache after updates
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
          const newConfidence = Math.min(
            1,
            Math.max(
              MIN_CONFIDENCE_SCORE,
              (oldConfidence * 0.4) + (insight.confidenceScore * 0.6) + CONFIDENCE_INCREMENT_PER_SESSION
            )
          );

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

      // Story 2.3: AC-2.3.5 - Invalidate cache after updating long-term memory
      this.invalidateLongTermMemoryCache();

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
   * NOTE: Deprecated in favor of storeChatMessage (Story 3.4)
   * Kept for backwards compatibility
   */
  // @ts-ignore - Keeping for backwards compatibility but not currently used
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
   * Store a chat message in chat_history table
   * Story 3.4: AC-3.4.1, AC-3.4.8 - Store messages with Socratic metadata
   */
  private async storeChatMessage(params: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    messageType: 'user' | 'assistant' | 'socratic_question';
    conversationId: string;
    timestamp: string;
    metadata?: {
      hints?: string[];
      socraticDepth?: number;
      studentDiscovered?: boolean;
    };
  }): Promise<void> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

      const result = await this.db
        .prepare(`
          INSERT INTO chat_history
          (id, student_id, role, content, message_type, metadata, conversation_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          params.id,
          this.studentId,
          params.role,
          params.content,
          params.messageType,
          metadataJson,
          params.conversationId,
          params.timestamp
        )
        .run();

      if (!result.success) {
        throw new StudentCompanionError(
          'Failed to store chat message',
          'DB_ERROR',
          500
        );
      }

      console.log('[DO] Chat message stored', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        role: params.role,
        messageType: params.messageType,
        messageId: params.id,
        conversationId: params.conversationId,
      });
    } catch (error) {
      console.error('Error storing chat message:', {
        studentId: this.studentId,
        role: params.role,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to store chat message',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Get student's overall mastery level
   * Story 3.4: AC-3.4.6 - Adaptive Socratic questioning based on mastery
   */
  private async getMasteryLevel(): Promise<number> {
    try {
      if (!this.studentId) {
        return 0.5; // Default middle mastery
      }

      // Calculate average mastery level across all subjects
      const result = await this.db
        .prepare(`
          SELECT AVG(mastery_level) as avg_mastery
          FROM subject_knowledge
          WHERE student_id = ?
        `)
        .bind(this.studentId)
        .first<{ avg_mastery: number | null }>();

      return result?.avg_mastery || 0.5; // Default to middle mastery if no data
    } catch (error) {
      console.error('Error getting mastery level:', error);
      return 0.5; // Default to middle mastery on error
    }
  }

  /**
   * Generate three-tier progressive hints for a Socratic question
   * Story 3.4: AC-3.4.8 - Hint generation with increasing specificity
   */
  private async generateHints(
    question: string,
    studentAnswer: string,
    context: AssembledContext
  ): Promise<string[]> {
    try {
      const prompt = buildHintGenerationPrompt(question, studentAnswer, context);

      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI that generates progressive hints for students.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      } as any);

      // Extract and parse JSON response
      if (response && typeof response === 'object' && 'response' in response) {
        const responseText = (response as { response: string }).response;

        // Try to extract JSON from the response (LLM might wrap it in markdown)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return [
            parsed.level1 || 'Think about the fundamental concepts involved.',
            parsed.level2 || 'Consider the specific method or approach you could use.',
            parsed.level3 || 'Review the key formula or principle that applies here.',
          ];
        }
      }

      // Fallback hints if AI generation fails
      return [
        'Think about what you already know related to this topic.',
        'Consider breaking the problem down into smaller steps.',
        'Review the key concept or formula that might help here.',
      ];
    } catch (error) {
      console.error('Error generating hints:', error);
      // Return fallback hints
      return [
        'Think about the fundamental concepts involved.',
        'Consider the specific method or approach you could use.',
        'Review the key formula or principle that applies here.',
      ];
    }
  }

  /**
   * Request hints for a Socratic question
   * Story 3.4: AC-3.4.8 - RPC method for hint retrieval
   */
  async requestHint(messageId: string): Promise<HintResponse> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Check hint cache first
      const cachedHints = this.hintCache.get(messageId);
      if (cachedHints) {
        return {
          hints: cachedHints,
          currentLevel: 1,
          maxLevel: 3,
        };
      }

      // Retrieve the Socratic question message from chat_history
      const message = await this.db
        .prepare(`
          SELECT id, content, metadata, conversation_id
          FROM chat_history
          WHERE id = ? AND student_id = ? AND message_type = 'socratic_question'
          LIMIT 1
        `)
        .bind(messageId, this.studentId)
        .first<{
          id: string;
          content: string;
          metadata: string | null;
          conversation_id: string;
        }>();

      if (!message) {
        throw new StudentCompanionError(
          'Socratic question not found',
          'MESSAGE_NOT_FOUND',
          404
        );
      }

      // Check if hints already exist in metadata
      let hints: string[];
      if (message.metadata) {
        const metadata = JSON.parse(message.metadata);
        if (metadata.hints && Array.isArray(metadata.hints)) {
          hints = metadata.hints;
        } else {
          // Generate hints if not already in metadata
          const context = await this.assembleContext(''); // Empty prompt for hint generation
          const studentLastAnswer = ''; // TODO: Get student's last answer from conversation history
          hints = await this.generateHints(message.content, studentLastAnswer, context);

          // Store hints in metadata
          metadata.hints = hints;
          await this.db
            .prepare(`
              UPDATE chat_history
              SET metadata = ?
              WHERE id = ? AND student_id = ?
            `)
            .bind(JSON.stringify(metadata), messageId, this.studentId)
            .run();
        }
      } else {
        // Generate hints if no metadata exists
        const context = await this.assembleContext('');
        const studentLastAnswer = '';
        hints = await this.generateHints(message.content, studentLastAnswer, context);

        // Store hints in metadata
        await this.db
          .prepare(`
            UPDATE chat_history
            SET metadata = ?
            WHERE id = ? AND student_id = ?
          `)
          .bind(JSON.stringify({ hints }), messageId, this.studentId)
          .run();
      }

      // Cache hints in memory
      this.hintCache.set(messageId, hints);

      return {
        hints,
        currentLevel: 1,
        maxLevel: 3,
      };
    } catch (error) {
      console.error('Error requesting hint:', {
        studentId: this.studentId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to generate hints',
        'HINT_GENERATION_ERROR',
        500
      );
    }
  }

  /**
   * Create a new student record in D1 database
   * Story 4.3: AC-4.3.2 - Initialize all 8 subjects with 0.0 mastery
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

      // Story 4.3: AC-4.3.2 - Initialize all 8 subjects with 0.0 mastery
      // Use batch() for better performance (single round-trip instead of 8)
      const subjectInserts = SUBJECTS.map(subject => {
        const subjectId = generateId();
        return this.db.prepare(`
          INSERT INTO subject_knowledge
            (id, student_id, subject, mastery_level, practice_count, struggles, strengths, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          subjectId,
          studentId,
          subject,
          0.0, // Initial mastery
          0, // No practice sessions yet
          '[]', // Empty struggles array
          '[]', // Empty strengths array
          now,
          now
        );
      });
      await this.db.batch(subjectInserts);

      console.log('[DO] Student created with 8 subjects initialized', {
        studentId,
        subjects: SUBJECTS.length,
      });

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
   * Get active short-term memory for this student
   * Story 2.3: AC-2.3.2, AC-2.3.7 - Public method with active memory filtering
   *
   * @param limit - Maximum number of memories to return (default: 10)
   * @returns Array of active short-term memory items (excludes consolidated/expired memories)
   */
  async getShortTermMemory(limit: number = StudentCompanion.DEFAULT_SHORT_TERM_LIMIT): Promise<ShortTermMemoryItem[]> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      const now = getCurrentTimestamp();

      // Story 2.3: AC-2.3.2 - Filter active memories only (expires_at IS NULL OR expires_at > NOW)
      // Archived/consolidated memories have expires_at <= NOW
      const result = await this.db.prepare(`
        SELECT id, content, session_id, importance_score, created_at
        FROM short_term_memory
        WHERE student_id = ?
          AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(this.studentId, now, limit).all<{
        id: string;
        content: string;
        session_id: string | null;
        importance_score: number;
        created_at: string;
      }>();

      const memories: ShortTermMemoryItem[] = (result.results || []).map(row => ({
        id: row.id,
        content: row.content,
        sessionId: row.session_id || undefined,
        importanceScore: row.importance_score,
        createdAt: row.created_at,
      }));

      console.log('[DO] Short-term memory retrieved', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        memoriesReturned: memories.length,
        limit,
      });

      return memories;
    } catch (error) {
      console.error('[DO] Error fetching short-term memory:', {
        studentId: this.studentId,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to fetch short-term memory',
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
   * Get long-term memory for this student with caching
   * Story 2.3: AC-2.3.1, AC-2.3.5, AC-2.3.7 - Public method with in-memory caching
   *
   * @param category - Optional category filter ('background', 'strengths', 'struggles', 'goals')
   * @returns Array of long-term memory items formatted for UI display
   */
  async getLongTermMemory(category?: string): Promise<LongTermMemoryItem[]> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Story 2.3: AC-2.3.5 - Check cache validity before database query
      if (this.longTermMemoryCache && Date.now() < this.longTermMemoryCacheExpiry) {
        console.log('[DO] Long-term memory cache hit', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          cacheSize: this.longTermMemoryCache.length,
          category: category || 'all',
        });

        // Filter by category if specified
        return category
          ? this.longTermMemoryCache.filter(m => m.category === category)
          : this.longTermMemoryCache;
      }

      // Cache miss - load from database
      console.log('[DO] Long-term memory cache miss, loading from database', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        category: category || 'all',
      });

      // Query database with optional category filter
      let query = `
        SELECT id, category, content, confidence_score, source_sessions, last_updated_at
        FROM long_term_memory
        WHERE student_id = ?
      `;
      const params: any[] = [this.studentId];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY confidence_score DESC, last_updated_at DESC';

      const result = await this.db.prepare(query).bind(...params).all<{
        id: string;
        category: string;
        content: string;
        confidence_score: number | null;
        source_sessions: string | null;
        last_updated_at: string;
      }>();

      const memories: LongTermMemoryItem[] = (result.results || []).map(row => {
        const sourceSessionIds = row.source_sessions
          ? JSON.parse(row.source_sessions)
          : [];

        return {
          id: row.id,
          category: row.category as 'background' | 'strengths' | 'struggles' | 'goals',
          content: row.content,
          confidenceScore: row.confidence_score || 0.5,
          lastUpdated: row.last_updated_at,
          sourceSessionsCount: Array.isArray(sourceSessionIds) ? sourceSessionIds.length : 0,
        };
      });

      // Story 2.3: AC-2.3.5 - Update cache only when retrieving all categories
      if (!category) {
        this.longTermMemoryCache = memories;
        this.longTermMemoryCacheExpiry = Date.now() + StudentCompanion.LONG_TERM_MEMORY_CACHE_TTL_MS;

        console.log('[DO] Long-term memory cache updated', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          memoriesCount: memories.length,
          expiresAt: new Date(this.longTermMemoryCacheExpiry).toISOString(),
        });
      }

      return memories;
    } catch (error) {
      console.error('[DO] Error fetching long-term memory:', {
        studentId: this.studentId,
        category,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to fetch long-term memory',
        'DB_ERROR',
        500
      );
    }
  }

  /**
   * Get memory system consolidation status
   * Story 2.5: AC-2.5.4, AC-2.5.5 - Memory status visibility
   *
   * @returns Memory status including last consolidation and pending memories
   */
  async getMemoryStatus(): Promise<MemoryStatus> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Query for last consolidation from consolidation_history
      const lastConsolidationResult = await this.db.prepare(`
        SELECT consolidated_at
        FROM consolidation_history
        WHERE student_id = ?
        ORDER BY consolidated_at DESC
        LIMIT 1
      `).bind(this.studentId).first<{ consolidated_at: string }>();

      const lastConsolidation = lastConsolidationResult?.consolidated_at || null;

      // Count pending short-term memories (those with expires_at set)
      const pendingResult = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM short_term_memory
        WHERE student_id = ? AND expires_at IS NOT NULL
      `).bind(this.studentId).first<{ count: number }>();

      const pendingMemories = pendingResult?.count || 0;

      // Get next scheduled consolidation from durable object alarm
      const nextAlarm = await this.ctx.storage.getAlarm();
      const nextConsolidation = nextAlarm ? new Date(nextAlarm).toISOString() : null;

      console.log('[DO] Memory status retrieved', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        lastConsolidation,
        pendingMemories,
        nextConsolidation,
      });

      return {
        lastConsolidation,
        pendingMemories,
        nextConsolidation,
      };
    } catch (error) {
      console.error('[DO] Error fetching memory status:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to fetch memory status',
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
  // Story 2.3: Memory Context Assembly
  // ============================================

  /**
   * Assemble context from both short-term and long-term memories
   * Story 2.3: AC-2.3.3, AC-2.3.6 - Combine memory types for LLM context
   *
   * @param userPrompt - The user's current message
   * @returns Assembled context with categorized memories
   */
  private async assembleContext(userPrompt: string): Promise<AssembledContext> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Student not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Story 2.3: AC-2.3.3 - Retrieve both memory types
      // Story 2.3: AC-2.3.6 - Handle missing memory gracefully
      let longTermMemories: LongTermMemoryItem[] = [];
      let shortTermMemories: ShortTermMemoryItem[] = [];

      try {
        longTermMemories = await this.getLongTermMemory();
      } catch (error) {
        console.warn('[DO] Failed to load long-term memory for context, continuing without it:', error);
        // Continue without long-term memory rather than failing
      }

      try {
        shortTermMemories = await this.getShortTermMemory(StudentCompanion.DEFAULT_SHORT_TERM_LIMIT);
      } catch (error) {
        console.warn('[DO] Failed to load short-term memory for context, continuing without it:', error);
        // Continue without short-term memory rather than failing
      }

      // Fetch practice progress data
      let practiceProgress;
      try {
        const progressData = await this.getMultiDimensionalProgress();
        if (progressData.overall.practiceSessionsCompleted > 0) {
          // Get recent subjects (up to 3)
          const recentSubjects = progressData.bySubject
            .sort((a: SubjectProgress, b: SubjectProgress) => b.practiceCount - a.practiceCount)
            .slice(0, 3)
            .map((s: SubjectProgress) => s.subject);

          practiceProgress = {
            totalSessions: progressData.overall.practiceSessionsStarted,
            completedSessions: progressData.overall.practiceSessionsCompleted,
            averageAccuracy: progressData.overall.averageAccuracy,
            recentSubjects,
          };
        }
      } catch (error) {
        console.warn('[DO] Failed to load practice progress for context, continuing without it:', error);
        // Continue without practice progress rather than failing
      }

      // Story 2.3: AC-2.3.3 - Organize memories by category
      const context: AssembledContext = {
        background: longTermMemories.filter(m => m.category === 'background'),
        strengths: longTermMemories.filter(m => m.category === 'strengths'),
        struggles: longTermMemories.filter(m => m.category === 'struggles'),
        goals: longTermMemories.filter(m => m.category === 'goals'),
        recentSessions: shortTermMemories,
        practiceProgress,
        userPrompt,
      };

      console.log('[DO] Context assembled', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        backgroundItems: context.background.length,
        strengthsItems: context.strengths.length,
        strugglesItems: context.struggles.length,
        goalsItems: context.goals.length,
        recentSessionsItems: context.recentSessions.length,
        hasPracticeProgress: !!practiceProgress,
      });

      return context;
    } catch (error) {
      console.error('[DO] Error assembling context:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Story 2.3: AC-2.3.6 - Return minimal context on error (never fail)
      return {
        background: [],
        strengths: [],
        struggles: [],
        goals: [],
        recentSessions: [],
        userPrompt,
      };
    }
  }

  /**
   * Format assembled context for LLM prompts
   * Story 2.3: AC-2.3.4 - Format context optimally for AI understanding
   *
   * @param context - Assembled context from memory retrieval
   * @returns Formatted string for LLM system prompt (< 1000 tokens)
   */
  private formatContextForLLM(context: AssembledContext): string {
    const parts: string[] = [];

    // Story 2.3: AC-2.3.4, AC-2.3.6 - Handle empty memory gracefully
    if (context.background.length === 0 &&
        context.strengths.length === 0 &&
        context.struggles.length === 0 &&
        context.goals.length === 0 &&
        context.recentSessions.length === 0) {
      return 'New student, no learning history available yet.';
    }

    // Format long-term memory by category
    if (context.background.length > 0) {
      const backgroundText = context.background
        .map(m => m.content)
        .join(' ');
      parts.push(`Student Background: ${backgroundText}`);
    }

    if (context.goals.length > 0) {
      const goalsText = context.goals
        .map(m => m.content)
        .join('; ');
      parts.push(`Learning Goals: ${goalsText}`);
    }

    if (context.strengths.length > 0) {
      const strengthsText = context.strengths
        .map(m => m.content)
        .join('; ');
      parts.push(`Strengths: ${strengthsText}`);
    }

    if (context.struggles.length > 0) {
      const strugglesText = context.struggles
        .map(m => m.content)
        .join('; ');
      parts.push(`Struggles: ${strugglesText}`);
    }

    // Format short-term memory (extract topics from recent sessions)
    if (context.recentSessions.length > 0) {
      const topics: string[] = [];
      for (const session of context.recentSessions) {
        try {
          const parsed = JSON.parse(session.content);
          if (parsed.topics && Array.isArray(parsed.topics)) {
            topics.push(...parsed.topics);
          } else if (parsed.message) {
            // Extract key phrases from messages (simple approach)
            const message = parsed.message as string;
            if (message.length > 0) {
              topics.push(message.substring(0, 50));
            }
          }
        } catch {
          // Skip unparseable content
        }
      }

      if (topics.length > 0) {
        const uniqueTopics = [...new Set(topics)].slice(0, 10);
        parts.push(`Recent Topics: ${uniqueTopics.join(', ')}`);
      }
    }

    // Format practice progress data
    if (context.practiceProgress) {
      const { totalSessions, completedSessions, averageAccuracy, recentSubjects } = context.practiceProgress;
      const progressParts: string[] = [
        `Completed ${completedSessions} of ${totalSessions} practice sessions`,
        `${averageAccuracy.toFixed(1)}% average accuracy`,
      ];
      if (recentSubjects.length > 0) {
        progressParts.push(`Practiced: ${recentSubjects.join(', ')}`);
      }
      parts.push(`Practice Progress: ${progressParts.join(', ')}`);
    }

    const formattedContext = parts.join('\n\n');

    // Story 2.3: AC-2.3.4 - Ensure context is under 1000 tokens (~4000 chars)
    if (formattedContext.length > StudentCompanion.MAX_CONTEXT_LENGTH_CHARS) {
      console.warn('[DO] Context exceeds max length, truncating', {
        originalLength: formattedContext.length,
        maxLength: StudentCompanion.MAX_CONTEXT_LENGTH_CHARS,
      });

      return formattedContext.substring(0, StudentCompanion.MAX_CONTEXT_LENGTH_CHARS) + '...';
    }

    return formattedContext;
  }

  // ============================================
  // AI Response Generation
  // ============================================

  /**
   * Build personalized system prompt using assembled context
   * Story 2.4: AC-2.4.6 - Format memory context into system prompt
   *
   * @param context - Assembled context from memory retrieval
   * @returns Personalized system prompt string
   */
  private buildPersonalizedSystemPrompt(context: AssembledContext): string {
    const contextSummary = this.formatContextForLLM(context);
    const parts: string[] = [];

    // Story 2.4: AC-2.4.7 - Check if we should reset tracking BEFORE incrementing
    if (this.contextUsageMessageCount >= CONTEXT_USAGE_TRACKING_WINDOW) {
      this.recentContextUsage.clear();
      this.contextUsageMessageCount = 0;
      console.log('[DO] Cleared context usage tracking', {
        doInstanceId: this.ctx.id.toString(),
      });
    }

    // Increment message counter after checking for reset
    this.contextUsageMessageCount++;

    // Story 2.4: AC-2.4.6 - Base instruction for AI behavior
    parts.push('You are a personalized AI study companion. You have access to this student\'s learning profile.');

    // Story 2.4: AC-2.4.1, AC-2.4.6 - Student background
    if (context.background.length > 0) {
      const backgrounds = context.background
        .slice(0, MAX_CONTEXT_ITEMS_PER_CATEGORY)
        .map(b => b.content)
        .filter(content => !this.wasRecentlyUsed(`background:${content}`));

      if (backgrounds.length > 0) {
        parts.push(`Background: ${backgrounds.join('; ')}`);
        // Track usage
        backgrounds.forEach(bg => this.trackContextUsage(`background:${bg}`));
      }
    }

    // Story 2.4: AC-2.4.4, AC-2.4.6 - Learning goals
    if (context.goals.length > 0) {
      const goals = context.goals
        .slice(0, MAX_CONTEXT_ITEMS_PER_CATEGORY)
        .map(g => g.content)
        .filter(content => !this.wasRecentlyUsed(`goal:${content}`));

      if (goals.length > 0) {
        parts.push(`Learning Goals: ${goals.join('; ')}`);
        // Track usage
        goals.forEach(goal => this.trackContextUsage(`goal:${goal}`));
      }
    }

    // Story 2.4: AC-2.4.2, AC-2.4.6 - Student strengths
    if (context.strengths.length > 0) {
      const strengths = context.strengths
        .slice(0, MAX_CONTEXT_ITEMS_PER_CATEGORY)
        .map(s => s.content)
        .filter(content => !this.wasRecentlyUsed(`strength:${content}`));

      if (strengths.length > 0) {
        parts.push(`Strengths: ${strengths.join('; ')}`);
        // Track usage
        strengths.forEach(strength => this.trackContextUsage(`strength:${strength}`));
      }
    }

    // Story 2.4: AC-2.4.3, AC-2.4.6 - Areas needing support
    if (context.struggles.length > 0) {
      const struggles = context.struggles
        .slice(0, MAX_CONTEXT_ITEMS_PER_CATEGORY)
        .map(s => s.content)
        .filter(content => !this.wasRecentlyUsed(`struggle:${content}`));

      if (struggles.length > 0) {
        parts.push(`Areas Needing Support: ${struggles.join('; ')}`);
        // Track usage
        struggles.forEach(struggle => this.trackContextUsage(`struggle:${struggle}`));
      }
    }

    // Story 2.4: AC-2.4.5, AC-2.4.6 - Recent session topics
    if (context.recentSessions.length > 0) {
      const topics: string[] = [];
      for (const session of context.recentSessions.slice(0, 3)) {
        try {
          const sessionData = JSON.parse(session.content);
          if (sessionData.topics && Array.isArray(sessionData.topics)) {
            topics.push(...sessionData.topics);
          }
        } catch (error) {
          // Skip invalid session data
          console.warn('[DO] Failed to parse session content for topics', { sessionId: session.id });
        }
      }

      const uniqueTopics = [...new Set(topics)].slice(0, 5);
      if (uniqueTopics.length > 0) {
        parts.push(`Recent Topics: ${uniqueTopics.join(', ')}`);
      }
    }

    // Story 2.4: AC-2.4.6 - Behavioral instructions
    parts.push(`
BEHAVIOR:
- Be supportive and encouraging
- Reference the student's history naturally when relevant
- Acknowledge their strengths and progress
- Provide targeted help for known struggles
- Guide them toward their learning goals
- Use Socratic questioning when appropriate
- Keep responses concise (2-3 sentences) and engaging`);

    let systemPrompt = parts.join('\n\n');

    const approxCharLimit = MAX_SYSTEM_PROMPT_TOKENS * 4;
    if (systemPrompt.length > approxCharLimit) {
      console.warn('[DO] System prompt exceeded token budget, truncating', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        actualLength: systemPrompt.length,
        approxTokenBudget: MAX_SYSTEM_PROMPT_TOKENS,
      });
      systemPrompt = systemPrompt.slice(0, approxCharLimit) + '...';
    }

    // Story 2.4: AC-2.4.7 - Log prompt construction for observability
    console.log('[DO] Built personalized system prompt', {
      doInstanceId: this.ctx.id.toString(),
      studentId: this.studentId,
      promptLength: systemPrompt.length,
      approximateTokens: Math.ceil(systemPrompt.length / 4),
      hasBackground: context.background.length > 0,
      hasGoals: context.goals.length > 0,
      hasStrengths: context.strengths.length > 0,
      hasStruggles: context.struggles.length > 0,
      hasRecentSessions: context.recentSessions.length > 0,
      contextSummaryPreview: contextSummary.slice(0, 200),
    });

    return systemPrompt;
  }

  /**
   * Track context element usage to prevent repetition
   * Story 2.4: AC-2.4.7 - Avoid repeating same context in consecutive messages
   *
   * @param contextKey - Unique identifier for context element
   */
  private trackContextUsage(contextKey: string): void {
    this.recentContextUsage.add(contextKey);
    // Note: Message counter is incremented in buildPersonalizedSystemPrompt()
    // This just tracks which specific context items were used
  }

  /**
   * Check if context element was recently used
   * Story 2.4: AC-2.4.7 - Prevent repetitive personalization
   *
   * @param contextKey - Unique identifier for context element
   * @returns true if element was used in recent messages
   */
  private wasRecentlyUsed(contextKey: string): boolean {
    return this.recentContextUsage.has(contextKey);
  }

  /**
   * Generate AI response using Workers AI with conversation context
   * Story 1.12: AC-1.12.3 - Replace placeholder echo with actual AI processing
   * Story 1.12: AC-1.12.5 - Use conversation history for context-aware responses
   * Story 2.3: AC-2.3.4 - Accept optional memory context parameter
   * Story 2.4: AC-2.4.1-2.4.7 - Use personalized system prompt with assembled context
   * Story 3.4: AC-3.4.1-3.4.6 - Socratic mode support with adaptive difficulty
   */
  private async generateResponse(
    message: string,
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      conversationId: string;
    }> = [],
    context?: AssembledContext,
    mode: 'socratic' | 'direct' = 'direct',
    masteryLevel: number = 0.5
  ): Promise<string> {
    try {
      // Story 3.4: AC-3.4.1, AC-3.4.6 - Build Socratic or personalized system prompt
      let systemPromptContent: string;

      if (mode === 'socratic' && context) {
        // Story 3.4: Use Socratic system prompt with context
        systemPromptContent = buildSocraticSystemPrompt(context, masteryLevel);

        console.log('[DO] Using Socratic system prompt', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
          masteryLevel,
        });
      } else if (context && this.hasContext(context)) {
        // Story 2.4: AC-2.4.1-2.4.6 - Use personalized prompt with memory context
        systemPromptContent = this.buildPersonalizedSystemPrompt(context);
      } else {
        // Story 2.4: AC-2.4.7 - Gracefully handle minimal context (new students)
        systemPromptContent = `You are a friendly and encouraging AI study companion. Your role is to help students learn effectively by:
- Asking thoughtful questions to deepen understanding
- Breaking down complex topics into manageable pieces
- Providing clear explanations and examples
- Offering encouragement and motivation
- Adapting to the student's learning style and pace

Keep responses concise (2-3 sentences) and engaging. Focus on being supportive and helpful.`;

        console.log('[DO] Using generic system prompt (minimal context)', {
          doInstanceId: this.ctx.id.toString(),
          studentId: this.studentId,
        });
      }

      // Build conversation context for AI
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemPromptContent,
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

      // Story 2.4: AC-2.4.6 - Call Workers AI with temperature and max_tokens
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages,
        temperature: RESPONSE_TEMPERATURE,
        max_tokens: RESPONSE_MAX_TOKENS,
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

  /**
   * Check if assembled context contains any meaningful data
   * Story 2.4: AC-2.4.7 - Determine if context is sufficient for personalization
   *
   * @param context - Assembled context to check
   * @returns true if context has any memory data
   */
  private hasContext(context: AssembledContext): boolean {
    return (
      context.background.length > 0 ||
      context.strengths.length > 0 ||
      context.struggles.length > 0 ||
      context.goals.length > 0 ||
      context.recentSessions.length > 0
    );
  }

  // ============================================
  // Story 3.1: Practice Question Generation
  // ============================================

  /**
   * Start a practice session with questions generated from session content
   * Story 3.1: AC-3.1.6, AC-3.1.1, AC-3.1.2, AC-3.1.5
   * Story 3.2: AC-3.2.3, AC-3.2.7 - Query struggle areas and set starting difficulty
   *
   * Flow:
   * 1. Query subject_knowledge for mastery level and struggle areas
   * 2. Determine starting difficulty based on mastery
   * 3. Query Vectorize for relevant sessions
   * 4. Fetch session transcripts from R2
   * 5. Generate questions using Workers AI with difficulty and focus areas
   * 6. Store practice session and questions in D1
   * 7. Return practice session with questions
   */
  async startPractice(options: PracticeOptions): Promise<PracticeSession> {
    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    const subject = options.subject || 'General';
    const questionCount = options.questionCount || 5;

    // Query subject_knowledge for mastery level and struggle areas
    const subjectKnowledgeStmt = this.db
      .prepare(
        `SELECT mastery_level, struggles
         FROM subject_knowledge
         WHERE student_id = ? AND subject = ?`
      )
      .bind(this.studentId, subject);

    const subjectKnowledge = await subjectKnowledgeStmt.first();

    // Determine starting difficulty based on mastery (or use provided difficulty)
    let difficulty: number;
    if (options.difficulty !== undefined) {
      difficulty = options.difficulty;
    } else if (subjectKnowledge && subjectKnowledge.mastery_level !== null) {
      difficulty = mapMasteryToDifficulty(subjectKnowledge.mastery_level as number);
    } else {
      difficulty = 2; // Default difficulty for new subjects
    }

    // Extract focus areas (struggle topics) if mastery is low
    let focusAreas: string[] = [];
    if (subjectKnowledge && (subjectKnowledge.mastery_level as number) < 0.5) {
      const strugglesJson = subjectKnowledge.struggles as string | null;
      if (strugglesJson) {
        try {
          focusAreas = JSON.parse(strugglesJson);
        } catch (error) {
          console.warn('[DO] Failed to parse struggles JSON:', error);
        }
      }
    }

    console.log('[DO] Starting practice session', {
      studentId: this.studentId,
      subject,
      difficulty,
      questionCount,
    });

    // Check cache first
    const cacheKey = `practice:${subject}:${difficulty}:${this.studentId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('[DO] Returning cached practice session');
      return cached.session;
    }

    // Step 1: Retrieve session content from Vectorize
    const sessionIds = await this.retrieveRelevantSessions(subject);

    if (sessionIds.length === 0) {
      throw new StudentCompanionError(
        `No sessions found for subject: ${subject}. Please complete some tutoring sessions first.`,
        'NO_SESSIONS',
        404
      );
    }

    // Step 2: Fetch session transcripts from R2
    const sessionExcerpts = await this.fetchSessionTranscripts(sessionIds);

    // Step 3: Generate questions using Workers AI with focus areas
    const questions = await this.generatePracticeQuestions(
      subject,
      sessionExcerpts,
      difficulty,
      questionCount,
      focusAreas
    );

    // Step 4: Store practice session in D1
    const practiceSession = await this.storePracticeSession(
      subject,
      difficulty,
      questions
    );

    // Cache the result for 5 minutes
    this.cache.set(cacheKey, {
      session: practiceSession,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log('[DO] Practice session created', {
      sessionId: practiceSession.id,
      questionsGenerated: questions.length,
    });

    return practiceSession;
  }

  /**
   * Retrieve relevant sessions from Vectorize
   * Story 3.1: AC-3.1.1, AC-3.1.2 - Session content retrieval
   */
  private async retrieveRelevantSessions(subject: string): Promise<string[]> {
    if (!this.studentId) {
      return [];
    }

    try {
      // Query Vectorize for sessions related to subject
      // Note: In a full implementation, we would first generate an embedding for the subject
      // For now, we'll query D1 directly since Vectorize embeddings require session ingestion
      const stmt = this.db
        .prepare(
          `SELECT id FROM session_metadata
           WHERE student_id = ?
           AND (subjects LIKE ? OR subjects IS NULL)
           AND status = 'completed'
           ORDER BY date DESC
           LIMIT 5`
        )
        .bind(this.studentId, `%${subject}%`);

      const result = await stmt.all();

      return result.results.map((row: any) => row.id);
    } catch (error) {
      console.error('[DO] Failed to retrieve sessions from D1:', error);
      return [];
    }
  }

  /**
   * Fetch session transcripts from R2
   * Story 3.1: AC-3.1.1, AC-3.1.5 - Transcript retrieval and parsing
   */
  private async fetchSessionTranscripts(sessionIds: string[]): Promise<string[]> {
    const excerpts: string[] = [];

    for (const sessionId of sessionIds.slice(0, 3)) {
      // Limit to 3 sessions
      try {
        // Fetch session metadata to get R2 key
        const stmt = this.db
          .prepare('SELECT r2_key FROM session_metadata WHERE id = ?')
          .bind(sessionId);
        const result = await stmt.first();

        if (!result || !result.r2_key) {
          continue;
        }

        // Fetch transcript from R2
        const r2Key = result.r2_key as string;
        const object = await this.r2.get(r2Key);

        if (!object) {
          console.warn(`[DO] R2 object not found: ${r2Key}`);
          continue;
        }

        const transcript = await object.json() as any;

        // Extract relevant content from transcript
        if (transcript.transcript && Array.isArray(transcript.transcript)) {
          // Take first 2000 characters of tutor explanations
          const tutorMessages = transcript.transcript
            .filter((msg: any) => msg.speaker === 'tutor')
            .map((msg: any) => msg.text)
            .join(' ')
            .substring(0, 2000);

          if (tutorMessages) {
            excerpts.push(tutorMessages);
          }
        }
      } catch (error) {
        console.error(`[DO] Failed to fetch transcript for session ${sessionId}:`, error);
      }
    }

    // If no transcripts found, use a default excerpt
    if (excerpts.length === 0) {
      excerpts.push(
        `This is a practice session for the student. The student has been learning various topics and needs reinforcement through practice questions.`
      );
    }

    return excerpts;
  }

  /**
   * Generate practice questions using Workers AI
   * Story 3.1: AC-3.1.1, AC-3.1.2, AC-3.1.5 - AI question generation
   * Story 3.2: AC-3.2.3, AC-3.2.4 - Focus on struggle areas with adaptive difficulty
   */
  private async generatePracticeQuestions(
    subject: string,
    sessionExcerpts: string[],
    difficulty: number,
    count: number,
    focusAreas?: string[]
  ): Promise<PracticeQuestion[]> {
    try {
      // Build the prompt with difficulty guidance and focus areas
      const prompt = buildPracticePrompt(subject, sessionExcerpts, difficulty, count, focusAreas);

      console.log('[DO] Generating questions with Workers AI', {
        subject,
        difficulty,
        count,
        excerptCount: sessionExcerpts.length,
      });

      // Call Workers AI
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        prompt,
        max_tokens: 1500,
      });

      // Parse the response
      let questionsData: any[] = [];

      if (response && typeof response === 'object' && 'response' in response) {
        const responseText = (response as { response: string }).response;

        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            questionsData = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error('[DO] Failed to parse LLM JSON response:', parseError);
          }
        }
      }

      // Validate and format questions
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        // Fallback to mock questions if generation fails
        console.warn('[DO] LLM did not return valid questions, using fallback');
        return this.generateFallbackQuestions(subject, count, difficulty);
      }

      // Convert to PracticeQuestion format
      const questions: PracticeQuestion[] = questionsData.slice(0, count).map((q, index) => ({
        id: generateId(),
        text: q.text || `Question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
        correctAnswer: q.correctAnswer || 'A',
        explanation: q.explanation || 'See your session notes for details.',
        metadata: {
          difficulty,
          topic: q.topic || subject,
          sessionReference: `Based on your ${subject} sessions`,
        },
      }));

      return questions;
    } catch (error) {
      console.error('[DO] Failed to generate questions with Workers AI:', error);
      // Fallback to mock questions
      return this.generateFallbackQuestions(subject, count, difficulty);
    }
  }

  /**
   * Generate fallback questions when AI generation fails
   */
  private generateFallbackQuestions(
    subject: string,
    count: number,
    difficulty: number
  ): PracticeQuestion[] {
    const fallbackQuestions: PracticeQuestion[] = [];

    for (let i = 0; i < count; i++) {
      fallbackQuestions.push({
        id: generateId(),
        text: `Practice question ${i + 1} for ${subject}`,
        options: [
          'Option A',
          'Option B',
          'Option C',
          'Option D',
        ],
        correctAnswer: 'A',
        explanation: `This is a practice question based on your ${subject} sessions.`,
        metadata: {
          difficulty,
          topic: subject,
          sessionReference: `Based on your ${subject} sessions`,
        },
      });
    }

    return fallbackQuestions;
  }

  /**
   * Store practice session and questions in D1
   * Story 3.1: AC-3.1.7 - Session and question storage
   */
  private async storePracticeSession(
    subject: string,
    difficulty: number,
    questions: PracticeQuestion[]
  ): Promise<PracticeSession> {
    if (!this.studentId) {
      throw new StudentCompanionError('Student ID not set', 'NOT_INITIALIZED', 400);
    }

    const sessionId = generateId();
    const startedAt = getCurrentTimestamp();

    console.log('[DO] Creating practice session in DB', {
      sessionId,
      studentId: this.studentId,
      subject,
      difficulty,
      questionsCount: questions.length,
    });

    // Insert practice session record
    const sessionStmt = this.db
      .prepare(
        `INSERT INTO practice_sessions
         (id, student_id, subject, difficulty_level, questions_total, started_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(sessionId, this.studentId, subject, difficulty, questions.length, startedAt);

    await sessionStmt.run();
    console.log('[DO] Practice session created successfully');

    // Insert practice questions
    const questionStmts = questions.map((q) =>
      this.db
        .prepare(
          `INSERT INTO practice_questions
           (id, session_id, question_text, answer_options, correct_answer, explanation, topic, session_reference, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          q.id,
          sessionId,
          q.text,
          JSON.stringify(q.options),
          q.correctAnswer,
          q.explanation,
          q.metadata.topic,
          q.metadata.sessionReference,
          startedAt
        )
    );

    await this.db.batch(questionStmts);

    return {
      id: sessionId,
      subject,
      questions,
      startedAt,
      difficulty,
    };
  }

  /**
   * Submit an answer to a practice question
   * Story 3.2: AC-3.2.1 - Track practice performance
   * Story 3.2: AC-3.2.2 - Difficulty adjusts based on answers
   */
  async submitAnswer(questionId: string, answer: string): Promise<AnswerFeedback> {
    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    // Fetch the question with session_id and created_at for time calculation
    const stmt = this.db
      .prepare(
        `SELECT q.correct_answer, q.explanation, q.created_at, q.session_id,
                s.difficulty_level
         FROM practice_questions q
         JOIN practice_sessions s ON q.session_id = s.id
         WHERE q.id = ?`
      )
      .bind(questionId);

    const result = await stmt.first();

    if (!result) {
      throw new StudentCompanionError('Question not found', 'NOT_FOUND', 404);
    }

    const correctAnswer = result.correct_answer as string;
    const explanation = result.explanation as string;
    const sessionId = result.session_id as string;
    const questionCreatedAt = new Date(result.created_at as string);
    const currentDifficulty = result.difficulty_level as number;
    const isCorrect = answer === correctAnswer;

    // Calculate time to answer (in seconds)
    const now = new Date();
    const timeToAnswerSeconds = Math.floor((now.getTime() - questionCreatedAt.getTime()) / 1000);

    // Update the question with student's answer, correctness, and time
    const updateQuestionStmt = this.db
      .prepare(
        `UPDATE practice_questions
         SET student_answer = ?, is_correct = ?, time_to_answer_seconds = ?
         WHERE id = ?`
      )
      .bind(answer, isCorrect ? 1 : 0, timeToAnswerSeconds, questionId);

    await updateQuestionStmt.run();

    // Update questions_correct counter in practice_sessions if answer is correct
    if (isCorrect) {
      const updateSessionStmt = this.db
        .prepare(
          `UPDATE practice_sessions
           SET questions_correct = questions_correct + 1
           WHERE id = ?`
        )
        .bind(sessionId);

      await updateSessionStmt.run();
    }

    // Fetch last 2 answers from this session for difficulty adjustment
    const recentAnswersStmt = this.db
      .prepare(
        `SELECT is_correct
         FROM practice_questions
         WHERE session_id = ?
         ORDER BY created_at DESC
         LIMIT 2`
      )
      .bind(sessionId);

    const recentAnswersResult = await recentAnswersStmt.all();
    const answerHistory = recentAnswersResult.results.map(row => Boolean(row.is_correct));

    // Calculate new difficulty
    const newDifficulty = calculateNewDifficulty(currentDifficulty, answerHistory);
    const difficultyChanged = newDifficulty !== currentDifficulty;

    // Update difficulty level in practice_sessions if it changed
    if (difficultyChanged) {
      const updateDifficultyStmt = this.db
        .prepare(
          `UPDATE practice_sessions
           SET difficulty_level = ?
           WHERE id = ?`
        )
        .bind(newDifficulty, sessionId);

      await updateDifficultyStmt.run();
    }

    return {
      isCorrect,
      correctAnswer,
      explanation,
      metadata: difficultyChanged ? {
        difficultyChanged: true,
        newDifficulty,
        previousDifficulty: currentDifficulty,
      } : undefined,
    };
  }

  /**
   * Complete a practice session
   * Story 3.1: AC-3.1.7 - Session completion
   * Story 3.2: AC-3.2.7 - Update subject_knowledge with performance
   * Story 3.3: AC-3.3.1-3.3.6 - Complete implementation with engagement events
   */
  async completePractice(sessionId: string): Promise<PracticeResult> {
    console.log('[DO] completePractice called', { sessionId, studentId: this.studentId });

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    // Validate session exists and belongs to current student
    const sessionStmt = this.db
      .prepare('SELECT questions_total, started_at, subject, completed, student_id FROM practice_sessions WHERE id = ?')
      .bind(sessionId);

    const session = await sessionStmt.first();
    console.log('[DO] Practice session lookup result:', session);

    if (!session) {
      throw new StudentCompanionError('Practice session not found', 'SESSION_NOT_FOUND', 404);
    }

    if (session.student_id !== this.studentId) {
      throw new StudentCompanionError('Unauthorized access to session', 'UNAUTHORIZED', 403);
    }

    if (session.completed) {
      throw new StudentCompanionError('Session already completed', 'ALREADY_COMPLETED', 400);
    }

    const questionsTotal = session.questions_total as number;
    const subject = session.subject as string;

    // Verify all questions have been answered
    const unansweredStmt = this.db
      .prepare('SELECT COUNT(*) as count FROM practice_questions WHERE session_id = ? AND student_answer IS NULL')
      .bind(sessionId);

    const unansweredResult = await unansweredStmt.first();
    const unansweredCount = (unansweredResult?.count as number) || 0;

    if (unansweredCount > 0) {
      throw new StudentCompanionError(
        `Cannot complete session: ${unansweredCount} questions remain unanswered`,
        'INCOMPLETE_SESSION',
        400
      );
    }

    // Count correct answers
    const correctStmt = this.db
      .prepare('SELECT COUNT(*) as count FROM practice_questions WHERE session_id = ? AND is_correct = 1')
      .bind(sessionId);

    const correctResult = await correctStmt.first();
    const questionsCorrect = (correctResult?.count as number) || 0;

    // Calculate session accuracy
    const sessionAccuracy = questionsTotal > 0 ? questionsCorrect / questionsTotal : 0;
    const accuracyPercentage = Math.round(sessionAccuracy * 100);

    // Calculate duration
    const startedAt = new Date(session.started_at as string);
    const completedAt = new Date();
    const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

    // Calculate average time per question
    const avgTimeStmt = this.db
      .prepare('SELECT AVG(time_to_answer_seconds) as avg_time FROM practice_questions WHERE session_id = ? AND time_to_answer_seconds IS NOT NULL')
      .bind(sessionId);

    const avgTimeResult = await avgTimeStmt.first();
    const averageTimePerQuestion = Math.round((avgTimeResult?.avg_time as number) || 0);

    // Update practice session
    const updateSessionStmt = this.db
      .prepare(
        `UPDATE practice_sessions
         SET questions_correct = ?, duration_seconds = ?, completed = 1, completed_at = ?
         WHERE id = ?`
      )
      .bind(questionsCorrect, durationSeconds, completedAt.toISOString(), sessionId);

    await updateSessionStmt.run();

    // Get or create subject_knowledge record
    const subjectKnowledgeStmt = this.db
      .prepare(
        `SELECT id, mastery_level, struggles, strengths
         FROM subject_knowledge
         WHERE student_id = ? AND subject = ?`
      )
      .bind(this.studentId, subject);

    const subjectKnowledge = await subjectKnowledgeStmt.first();

    let oldMastery = 0;
    let newMasteryLevel = 0;
    let subjectMasteryDelta = 0;

    if (subjectKnowledge) {
      // Update existing subject_knowledge
      oldMastery = (subjectKnowledge.mastery_level as number) || 0;
      newMasteryLevel = calculateNewMastery(oldMastery, sessionAccuracy);
      subjectMasteryDelta = newMasteryLevel - oldMastery;

      // Get incorrect questions to update struggles
      const incorrectQuestionsStmt = this.db
        .prepare(
          `SELECT topic FROM practice_questions
           WHERE session_id = ? AND is_correct = 0`
        )
        .bind(sessionId);

      const incorrectQuestions = await incorrectQuestionsStmt.all();
      const incorrectTopics = incorrectQuestions.results
        .map(row => row.topic as string)
        .filter(topic => topic && topic.trim());

      // Parse existing struggles and strengths
      let struggles: string[] = [];
      let strengths: string[] = [];

      try {
        struggles = subjectKnowledge.struggles ? JSON.parse(subjectKnowledge.struggles as string) : [];
        strengths = subjectKnowledge.strengths ? JSON.parse(subjectKnowledge.strengths as string) : [];
      } catch (error) {
        console.warn('[DO] Failed to parse struggles/strengths:', error);
      }

      // Add new struggle topics (avoid duplicates)
      incorrectTopics.forEach(topic => {
        if (!struggles.includes(topic)) {
          struggles.push(topic);
        }
      });

      // If mastery improved significantly, move struggles to strengths
      if (subjectMasteryDelta > 0.1) {
        const correctQuestionsStmt = this.db
          .prepare(
            `SELECT topic FROM practice_questions
             WHERE session_id = ? AND is_correct = 1`
          )
          .bind(sessionId);

        const correctQuestions = await correctQuestionsStmt.all();
        const correctTopics = correctQuestions.results
          .map(row => row.topic as string)
          .filter(topic => topic && topic.trim());

        correctTopics.forEach(topic => {
          // Remove from struggles if present
          struggles = struggles.filter(s => s !== topic);
          // Add to strengths if not already there
          if (!strengths.includes(topic)) {
            strengths.push(topic);
          }
        });
      }

      // Update subject_knowledge
      const updateKnowledgeStmt = this.db
        .prepare(
          `UPDATE subject_knowledge
           SET mastery_level = ?, practice_count = practice_count + 1,
               last_practiced_at = ?, struggles = ?, strengths = ?, updated_at = ?
           WHERE id = ?`
        )
        .bind(
          newMasteryLevel,
          completedAt.toISOString(),
          JSON.stringify(struggles),
          JSON.stringify(strengths),
          completedAt.toISOString(),
          subjectKnowledge.id
        );

      await updateKnowledgeStmt.run();
      console.log('[DO] Updated existing subject_knowledge', { subject, oldMastery, newMasteryLevel });
    } else {
      // Create new subject_knowledge record
      newMasteryLevel = sessionAccuracy * 0.3; // First session: 30% weight
      subjectMasteryDelta = newMasteryLevel;

      // Get incorrect topics for initial struggles
      const incorrectQuestionsStmt = this.db
        .prepare(
          `SELECT topic FROM practice_questions
           WHERE session_id = ? AND is_correct = 0`
        )
        .bind(sessionId);

      const incorrectQuestions = await incorrectQuestionsStmt.all();
      const struggles = incorrectQuestions.results
        .map(row => row.topic as string)
        .filter(topic => topic && topic.trim());

      const createKnowledgeStmt = this.db
        .prepare(
          `INSERT INTO subject_knowledge (id, student_id, subject, mastery_level, practice_count, last_practiced_at, struggles, strengths, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
        )
        .bind(
          generateId(),
          this.studentId,
          subject,
          newMasteryLevel,
          completedAt.toISOString(),
          JSON.stringify(struggles),
          JSON.stringify([]),
          completedAt.toISOString(),
          completedAt.toISOString()
        );

      await createKnowledgeStmt.run();
      console.log('[DO] Created new subject_knowledge', { subject, newMasteryLevel, struggles });
    }

    // Log engagement event (Story 3.3: AC-3.3.6)
    const eventData = {
      sessionId,
      subject,
      questionsCorrect,
      questionsTotal,
      accuracy: accuracyPercentage,
      duration: durationSeconds,
      masteryDelta: subjectMasteryDelta,
    };

    const engagementEventStmt = this.db
      .prepare(
        `INSERT INTO engagement_events (id, student_id, event_type, event_data, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        this.studentId,
        'practice_complete',
        JSON.stringify(eventData),
        completedAt.toISOString()
      );

    await engagementEventStmt.run();

    // Story 3.5: Update progress tracking for historical data
    await this.updateProgressTracking('subject', subject, 'mastery', newMasteryLevel);
    await this.updateProgressTracking('subject', subject, 'practice_count', (subjectKnowledge?.practice_count as number || 0) + 1);
    // Store session accuracy for overall tracking
    await this.updateProgressTracking('overall', 'all', 'avg_accuracy', sessionAccuracy);

    // Invalidate progress cache
    this.invalidateMultiDimensionalProgressCache();

    return {
      sessionId,
      subject,
      questionsTotal,
      questionsCorrect,
      accuracy: accuracyPercentage,
      durationSeconds,
      completedAt: completedAt.toISOString(),
      subjectMasteryDelta,
      newMasteryLevel,
      averageTimePerQuestion,
    };
  }

  // ============================================
  // Story 3.5: Multi-Dimensional Progress Tracking
  // ============================================

  /**
   * Get multi-dimensional progress data
   * Story 3.5: AC-3.5.1-3.5.8
   * @returns Comprehensive progress data across subjects, time, and goals
   */
  async getMultiDimensionalProgress(): Promise<MultiDimensionalProgressData> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Check cache
      const now = Date.now();
      if (this.multiDimensionalProgressCache && now < this.multiDimensionalProgressCacheExpiry) {
        console.log('[DO] Returning cached multi-dimensional progress', {
          studentId: this.studentId,
          cacheAge: now - (this.multiDimensionalProgressCacheExpiry - StudentCompanion.MULTI_DIMENSIONAL_PROGRESS_CACHE_TTL_MS),
        });
        return this.multiDimensionalProgressCache;
      }

      console.log('[DO] Aggregating multi-dimensional progress', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
      });

      const progressData = await this.aggregateMultiDimensionalProgress();

      // Update cache
      this.multiDimensionalProgressCache = progressData;
      this.multiDimensionalProgressCacheExpiry = now + StudentCompanion.MULTI_DIMENSIONAL_PROGRESS_CACHE_TTL_MS;

      return progressData;
    } catch (error) {
      console.error('[DO] Error getting multi-dimensional progress:', {
        studentId: this.studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to get multi-dimensional progress',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Aggregate multi-dimensional progress data
   * Story 3.5: AC-3.5.1, 3.5.2, 3.5.3, 3.5.4
   * @private
   */
  private async aggregateMultiDimensionalProgress(): Promise<MultiDimensionalProgressData> {
    if (!this.studentId) {
      throw new StudentCompanionError(
        'Student not initialized',
        'NOT_INITIALIZED',
        400
      );
    }

    // Query subject knowledge
    const subjectKnowledgeResult = await this.db
      .prepare(`
        SELECT subject, mastery_level, practice_count, last_practiced_at,
               struggles, strengths
        FROM subject_knowledge
        WHERE student_id = ?
        ORDER BY subject ASC
      `)
      .bind(this.studentId)
      .all<{
        subject: string;
        mastery_level: number;
        practice_count: number;
        last_practiced_at: string | null;
        struggles: string | null;
        strengths: string | null;
      }>();

    // Query practice sessions for overall metrics
    const practiceSessionsResult = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total_sessions,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions,
          AVG(CASE WHEN completed = 1 THEN CAST(questions_correct AS REAL) / NULLIF(questions_total, 0) ELSE NULL END) as avg_accuracy
        FROM practice_sessions
        WHERE student_id = ?
      `)
      .bind(this.studentId)
      .first<{
        total_sessions: number;
        completed_sessions: number;
        avg_accuracy: number | null;
      }>();

    // Query practice sessions by subject
    const practiceBySubjectResult = await this.db
      .prepare(`
        SELECT
          subject,
          COUNT(*) as total_sessions,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_sessions,
          AVG(CASE WHEN completed = 1 THEN CAST(questions_correct AS REAL) / NULLIF(questions_total, 0) ELSE NULL END) as avg_accuracy
        FROM practice_sessions
        WHERE student_id = ?
        GROUP BY subject
      `)
      .bind(this.studentId)
      .all<{
        subject: string;
        total_sessions: number;
        completed_sessions: number;
        avg_accuracy: number | null;
      }>();

    // Query progress_tracking for time-series data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const progressTrackingResult = await this.db
      .prepare(`
        SELECT
          dimension,
          dimension_value,
          metric_type,
          metric_value,
          DATE(last_updated_at) as date
        FROM progress_tracking
        WHERE student_id = ?
          AND dimension = 'subject'
          AND metric_type = 'mastery'
          AND last_updated_at >= ?
        ORDER BY last_updated_at ASC
      `)
      .bind(this.studentId, thirtyDaysAgo.toISOString())
      .all<{
        dimension: string;
        dimension_value: string;
        metric_type: string;
        metric_value: number;
        date: string;
      }>();

    // Query practice count by date
    const practiceByDateResult = await this.db
      .prepare(`
        SELECT
          DATE(completed_at) as date,
          COUNT(*) as practice_count
        FROM practice_sessions
        WHERE student_id = ?
          AND completed = 1
          AND completed_at >= ?
        GROUP BY DATE(completed_at)
        ORDER BY date ASC
      `)
      .bind(this.studentId, thirtyDaysAgo.toISOString())
      .all<{
        date: string;
        practice_count: number;
      }>();

    // Calculate overall metrics
    const totalSessions = practiceSessionsResult?.total_sessions || 0;
    const completedSessions = practiceSessionsResult?.completed_sessions || 0;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    const averageAccuracy = (practiceSessionsResult?.avg_accuracy || 0) * 100;

    // Build practice stats map by subject
    const practiceBySubject = new Map<string, { total: number; completed: number; accuracy: number }>();
    (practiceBySubjectResult.results || []).forEach(row => {
      practiceBySubject.set(row.subject, {
        total: row.total_sessions,
        completed: row.completed_sessions,
        accuracy: (row.avg_accuracy || 0) * 100,
      });
    });

    // Calculate mastery deltas
    const masteryDeltas = await this.calculateMasteryDeltas();

    // Build bySubject array
    const bySubject: SubjectProgress[] = (subjectKnowledgeResult.results || []).map(row => {
      const practiceStats = practiceBySubject.get(row.subject) || { total: 0, completed: 0, accuracy: 0 };
      const subjectCompletionRate = practiceStats.total > 0
        ? (practiceStats.completed / practiceStats.total) * 100
        : 0;

      return {
        subject: row.subject,
        mastery: row.mastery_level,
        practiceCount: row.practice_count,
        completionRate: subjectCompletionRate,
        avgAccuracy: practiceStats.accuracy,
        lastPracticed: row.last_practiced_at || new Date().toISOString(),
        masteryDelta: masteryDeltas.get(row.subject) || 0,
        struggles: row.struggles ? JSON.parse(row.struggles) : [],
        strengths: row.strengths ? JSON.parse(row.strengths) : [],
      };
    });

    // Build byTime array from progress_tracking data
    const timeSeriesMap = new Map<string, Map<string, number>>();
    (progressTrackingResult.results || []).forEach(row => {
      if (!timeSeriesMap.has(row.date)) {
        timeSeriesMap.set(row.date, new Map());
      }
      timeSeriesMap.get(row.date)!.set(row.dimension_value, row.metric_value);
    });

    // Add practice counts to time series
    const practiceCountMap = new Map<string, number>();
    (practiceByDateResult.results || []).forEach(row => {
      practiceCountMap.set(row.date, row.practice_count);
    });

    const byTime: ProgressByTime[] = Array.from(timeSeriesMap.entries())
      .map(([date, subjectsMap]) => ({
        date,
        subjects: Array.from(subjectsMap.entries()).map(([subject, mastery]) => ({
          subject,
          mastery,
        })),
        practiceCount: practiceCountMap.get(date) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate average mastery
    const totalMastery = bySubject.reduce((sum, s) => sum + s.mastery, 0);
    const averageMastery = bySubject.length > 0 ? totalMastery / bySubject.length : 0;

    return {
      overall: {
        practiceSessionsCompleted: completedSessions,
        practiceSessionsStarted: totalSessions,
        completionRate,
        averageAccuracy,
        totalSubjects: bySubject.length,
        averageMastery,
      },
      bySubject,
      byTime,
      byGoal: [], // Future enhancement
    };
  }

  /**
   * Calculate mastery delta for each subject
   * Story 3.5: AC-3.5.4 - Knowledge gains tracking
   * @private
   */
  private async calculateMasteryDeltas(): Promise<Map<string, number>> {
    if (!this.studentId) {
      return new Map();
    }

    const deltas = new Map<string, number>();

    // Get all subjects
    const subjectsResult = await this.db
      .prepare(`
        SELECT DISTINCT subject
        FROM subject_knowledge
        WHERE student_id = ?
      `)
      .bind(this.studentId)
      .all<{ subject: string }>();

    // For each subject, get the last 2 mastery values
    for (const { subject } of (subjectsResult.results || [])) {
      const masteryHistory = await this.db
        .prepare(`
          SELECT metric_value
          FROM progress_tracking
          WHERE student_id = ?
            AND dimension = 'subject'
            AND dimension_value = ?
            AND metric_type = 'mastery'
          ORDER BY last_updated_at DESC
          LIMIT 2
        `)
        .bind(this.studentId, subject)
        .all<{ metric_value: number }>();

      if (masteryHistory.results && masteryHistory.results.length >= 2) {
        const latest = masteryHistory.results[0].metric_value;
        const previous = masteryHistory.results[1].metric_value;
        deltas.set(subject, latest - previous);
      } else {
        // First measurement or only one measurement
        deltas.set(subject, 0);
      }
    }

    return deltas;
  }

  /**
   * Update progress tracking table with historical metrics
   * Story 3.5: AC-3.5.2, 3.5.6 - Historical progress tracking
   * @private
   */
  private async updateProgressTracking(
    dimension: string,
    dimensionValue: string,
    metricType: string,
    metricValue: number
  ): Promise<void> {
    if (!this.studentId) {
      return;
    }

    const id = generateId();
    const timestamp = getCurrentTimestamp();

    // UPSERT: insert or update existing record
    await this.db
      .prepare(`
        INSERT INTO progress_tracking
          (id, student_id, dimension, dimension_value, metric_type, metric_value, last_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, dimension, dimension_value, metric_type)
        DO UPDATE SET
          metric_value = excluded.metric_value,
          last_updated_at = excluded.last_updated_at
      `)
      .bind(id, this.studentId, dimension, dimensionValue, metricType, metricValue, timestamp)
      .run();
  }

  /**
   * Invalidate multi-dimensional progress cache
   * Story 3.5: AC-3.5.6 - Cache invalidation on updates
   * @private
   */
  private invalidateMultiDimensionalProgressCache(): void {
    this.multiDimensionalProgressCache = null;
    this.multiDimensionalProgressCacheExpiry = 0;
    console.log('[DO] Multi-dimensional progress cache invalidated', {
      studentId: this.studentId,
    });
  }

  // ============================================
  // Story 4.3: Subject Knowledge Tracking
  // ============================================

  /**
   * Get subject mastery data
   * Story 4.3: AC-4.3.5 - RPC method to retrieve subject mastery
   * @param subject - Optional subject filter; if not provided, returns all subjects
   * @returns Array of subject mastery data with mastery level, practice count, and last practiced date
   */
  async getSubjectMastery(subject?: string): Promise<SubjectMastery[]> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      let query = `
        SELECT
          subject,
          mastery_level,
          practice_count,
          last_practiced_at,
          created_at,
          updated_at
        FROM subject_knowledge
        WHERE student_id = ?
      `;
      const params: any[] = [this.studentId];

      if (subject) {
        query += ` AND subject = ?`;
        params.push(subject);
      }

      query += ` ORDER BY subject ASC`;

      const result = await this.db
        .prepare(query)
        .bind(...params)
        .all<{
          subject: string;
          mastery_level: number;
          practice_count: number;
          last_practiced_at: string | null;
          created_at: string;
          updated_at: string;
        }>();

      const subjectMastery: SubjectMastery[] = (result.results || []).map(row => ({
        subject: row.subject,
        mastery_score: row.mastery_level,
        practice_count: row.practice_count,
        last_updated: row.updated_at,
      }));

      console.log('[DO] Retrieved subject mastery', {
        studentId: this.studentId,
        subject: subject || 'all',
        count: subjectMastery.length,
      });

      return subjectMastery;
    } catch (error) {
      console.error('[DO] Error getting subject mastery:', {
        studentId: this.studentId,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to get subject mastery',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Get practice statistics for a subject
   * Story 4.4: AC-4.4.5 - RPC method to retrieve subject practice stats
   *
   * @param subject - Subject name to get statistics for
   * @returns Practice statistics including session count, average score, and streaks
   */
  async getSubjectPracticeStats(subject: string): Promise<SubjectPracticeStats> {
    try {
      if (!this.studentId) {
        throw new StudentCompanionError(
          'Companion not initialized',
          'NOT_INITIALIZED',
          400
        );
      }

      // Query practice sessions for the subject
      const sessions = await this.db
        .prepare(`
          SELECT
            id,
            completed_at,
            questions_correct,
            questions_total
          FROM practice_sessions
          WHERE student_id = ?
            AND subject = ?
            AND status = 'completed'
          ORDER BY completed_at ASC
        `)
        .bind(this.studentId, subject)
        .all();

      const practiceRecords = sessions.results as any[];

      // Initialize stats
      const stats: SubjectPracticeStats = {
        totalSessions: practiceRecords.length,
        averageScore: 0,
        longestStreak: 0,
        currentStreak: 0,
        lastPracticeDate: undefined,
        lastPracticeScore: undefined,
      };

      if (practiceRecords.length === 0) {
        return stats;
      }

      // Calculate average score
      let totalCorrect = 0;
      let totalQuestions = 0;
      for (const record of practiceRecords) {
        totalCorrect += record.questions_correct || 0;
        totalQuestions += record.questions_total || 0;
      }
      stats.averageScore = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

      // Get last practice info
      const lastRecord = practiceRecords[practiceRecords.length - 1];
      stats.lastPracticeDate = lastRecord.completed_at;
      stats.lastPracticeScore = lastRecord.questions_total > 0
        ? lastRecord.questions_correct / lastRecord.questions_total
        : 0;

      // Calculate streaks (consecutive days with practice)
      const practiceDates = practiceRecords
        .map(r => new Date(r.completed_at).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i); // unique dates

      let longestStreak = 0;
      let streakCount = 0;

      for (let i = 0; i < practiceDates.length; i++) {
        const currentDate = new Date(practiceDates[i]);

        if (i === 0) {
          streakCount = 1;
        } else {
          const prevDate = new Date(practiceDates[i - 1]);
          const daysDiff = Math.floor(
            (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff === 1) {
            streakCount++;
          } else {
            longestStreak = Math.max(longestStreak, streakCount);
            streakCount = 1;
          }
        }
      }

      longestStreak = Math.max(longestStreak, streakCount);

      // Check if current streak is still active
      const lastPracticeDate = new Date(practiceDates[practiceDates.length - 1]);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);

      const lastPracticeDateStr = lastPracticeDate.toDateString();
      const todayStr = today.toDateString();
      const yesterdayStr = yesterday.toDateString();

      const isStreakActive = lastPracticeDateStr === todayStr || lastPracticeDateStr === yesterdayStr;

      stats.longestStreak = longestStreak;
      stats.currentStreak = isStreakActive ? streakCount : 0;

      console.log('[DO] Retrieved subject practice stats', {
        doInstanceId: this.ctx.id.toString(),
        studentId: this.studentId,
        subject,
        totalSessions: stats.totalSessions,
        averageScore: stats.averageScore,
        longestStreak: stats.longestStreak,
        currentStreak: stats.currentStreak,
      });

      return stats;
    } catch (error) {
      console.error('[DO] Error getting subject practice stats:', {
        studentId: this.studentId,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof StudentCompanionError) {
        throw error;
      }

      throw new StudentCompanionError(
        'Failed to get subject practice stats',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * HTTP handler for getSubjectMastery RPC
   * Story 4.3: AC-4.3.5 - Retrieve subject mastery data
   */
  private async handleGetSubjectMastery(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { subject?: string };
      const result = await this.getSubjectMastery(body.subject);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get subject mastery');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for getSubjectPracticeStats RPC
   * Story 4.4: AC-4.4.5 - Retrieve subject practice statistics
   */
  private async handleGetSubjectPracticeStats(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { subject: string };
      if (!body.subject) {
        throw new StudentCompanionError(
          'Subject parameter is required',
          'INVALID_INPUT',
          400
        );
      }
      const result = await this.getSubjectPracticeStats(body.subject);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get subject practice stats');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for startPractice RPC
   */
  private async handleStartPractice(request: Request): Promise<Response> {
    try {
      const body = await request.json() as PracticeOptions;
      const result = await this.startPractice(body);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to start practice session');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for submitAnswer RPC
   */
  private async handleSubmitAnswer(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { questionId: string; answer: string };
      const result = await this.submitAnswer(body.questionId, body.answer);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to submit answer');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for completePractice RPC
   */
  private async handleCompletePractice(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { sessionId: string };
      const result = await this.completePractice(body.sessionId);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to complete practice session');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for getMemoryStatus RPC
   * Story 2.5: AC-2.5.4
   */
  private async handleGetMemoryStatus(_request: Request): Promise<Response> {
    try {
      const result = await this.getMemoryStatus();
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get memory status');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for requestHint RPC
   * Story 3.4: AC-3.4.8
   */
  private async handleRequestHint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { messageId: string };
      const result = await this.requestHint(body.messageId);
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to request hint');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for getMultiDimensionalProgress RPC
   * Story 3.5: AC-3.5.1-3.5.8
   */
  private async handleGetMultiDimensionalProgress(_request: Request): Promise<Response> {
    try {
      const result = await this.getMultiDimensionalProgress();
      return this.jsonResponse(result);
    } catch (error) {
      const wrappedError = this.wrapError(error, 'Failed to get multi-dimensional progress');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * HTTP handler for ingestMockSession RPC
   * Testing helper: Creates mock session data
   */
  private async handleIngestMockSession(_request: Request): Promise<Response> {
    try {
      const result = await this.ingestMockSession();
      return this.jsonResponse(result);
    } catch (error) {
      console.error('[DO] Error in ingestMockSession:', error);
      console.error('[DO] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        studentId: this.studentId,
      });
      const wrappedError = this.wrapError(error, 'Failed to ingest mock session');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * Ingest mock tutoring session for testing
   * Creates a fake session with sample Q&A about quadratic equations
   */
  async ingestMockSession(): Promise<SessionMetadata> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    const sessionId = `mock-${Date.now()}`;
    const now = new Date().toISOString();

    // Store mock session in D1
    const stmt = this.db.prepare(`
      INSERT INTO session_metadata (id, student_id, r2_key, date, duration_minutes, subjects, tutor_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      sessionId,
      this.studentId,
      'mock-transcript', // No R2 storage for mock
      now,
      30, // 30 minute session
      JSON.stringify(['Math', 'Algebra']),
      'Mock Tutor',
      'completed',
      now
    ).run();

    // Store mock short-term memory entries
    const memoryInserts = [
      'Student learning about quadratic equations and the quadratic formula',
      'Discussed discriminant and its role in determining number of solutions',
      'Practiced solving x² - 5x + 6 = 0 by factoring',
      'Student understood why coefficient a cannot be zero in quadratic equations'
    ];

    for (const content of memoryInserts) {
      const memId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.db.prepare(`
        INSERT INTO short_term_memory (id, student_id, content, session_id, importance_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        memId,
        this.studentId,
        content,
        sessionId,
        0.7,
        now
      ).run();
    }

    // Create subject knowledge entries for Math
    await this.db.prepare(`
      INSERT OR REPLACE INTO subject_knowledge
      (id, student_id, subject, mastery_level, strengths, struggles, practice_count, last_practiced_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `subj-math-${this.studentId}`,
      this.studentId,
      'Math',
      0.4, // Intermediate mastery level
      JSON.stringify(['Factoring', 'Basic equations']),
      JSON.stringify(['Discriminant', 'Complex quadratics']),
      0,
      null,
      now,
      now
    ).run();

    console.log(`[DO] Mock session ${sessionId} ingested for student ${this.studentId}`);

    return {
      id: sessionId,
      studentId: this.studentId!,
      r2Key: 'mock-transcript',
      date: now,
      durationMinutes: 30,
      subjects: 'Math, Algebra',
      tutorName: 'Mock Tutor',
      status: 'completed',
      createdAt: now,
    };
  }

  /**
   * HTTP handler for getHeroCardState RPC
   * Story 5.0: AC-5.0.7 - Backend RPC method returns hero card state
   */
  private async handleGetHeroCardState(_request: Request): Promise<Response> {
    try {
      const result = await this.getHeroCardState();
      return this.jsonResponse(result);
    } catch (error) {
      console.error('[DO] Error in getHeroCardState:', error);
      const wrappedError = this.wrapError(error, 'Failed to get hero card state');
      return this.errorResponse(wrappedError.message, wrappedError.code, wrappedError.statusCode);
    }
  }

  /**
   * Get hero card state with dynamic greeting and personalized content
   * Story 5.0: AC-5.0.7 - Backend RPC method returns hero card state
   * Story 5.0: AC-5.0.1 - Dynamic greeting based on recent session data
   * Story 5.0: AC-5.0.2 - Hero card state variants based on student activity
   *
   * @returns Hero card state with greeting, state type, CTAs, and styling
   */
  async getHeroCardState(): Promise<HeroCardState> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    const startTime = Date.now();

    try {
      // Import helper functions
      const { detectStudentState, getCTAConfig, getGradientColors, getEmoticon } = await import('../lib/companion/state-detection');
      const { generateGreeting } = await import('../lib/companion/greeting-templates');

      // Fetch recent session data
      const recentSessions = await this.getRecentSessionData();

      // Get last app access (from students table last_active_at)
      const studentRow = await this.db
        .prepare('SELECT last_active_at FROM students WHERE id = ?')
        .bind(this.studentId)
        .first<{ last_active_at: string }>();

      const lastAppAccess = studentRow?.last_active_at;

      // Get last session time from session_metadata
      const lastSessionRow = await this.db
        .prepare(`
          SELECT date FROM session_metadata
          WHERE student_id = ? AND status = 'completed'
          ORDER BY date DESC
          LIMIT 1
        `)
        .bind(this.studentId)
        .first<{ date: string }>();

      const lastSessionTime = lastSessionRow?.date;

      // Check if student has completed any sessions
      const sessionCountRow = await this.db
        .prepare('SELECT COUNT(*) as count FROM session_metadata WHERE student_id = ? AND status = \'completed\'')
        .bind(this.studentId)
        .first<{ count: number }>();

      const hasCompletedAnySession = (sessionCountRow?.count ?? 0) > 0;

      // Check for achievements today (placeholder - can be enhanced)
      const achievementToday = false; // TODO: Implement achievement detection

      // Detect student state
      const state = detectStudentState({
        lastAppAccess,
        lastSessionTime,
        recentSessions,
        hasCompletedAnySession,
        achievementToday,
      });

      // Generate personalized greeting
      const greeting = generateGreeting({
        state,
        recentSessions,
        lastTopic: recentSessions[0]?.topics[0],
        lastScore: recentSessions[0]?.score,
        lastSubject: recentSessions[0]?.subject,
      });

      // Get CTA configuration for this state
      const { primaryCTA, secondaryCTA } = getCTAConfig(state);

      // Get gradient colors for this state
      const gradientColors = getGradientColors(state);

      // Get emoticon for this state
      const emoticon = getEmoticon(state);

      const duration = Date.now() - startTime;

      console.log('[DO] Hero card state generated', {
        studentId: this.studentId,
        state,
        durationMs: duration,
      });

      return {
        greeting,
        state,
        primaryCTA,
        secondaryCTA,
        gradientColors,
        emoticon,
      };
    } catch (error) {
      console.error('[DO] Error generating hero card state:', error);

      // Fallback to default state on error
      return {
        greeting: 'Welcome back! Ready to continue learning?',
        state: 'default',
        primaryCTA: { label: 'Start Practice', action: 'practice' },
        secondaryCTA: { label: 'Ask Question', action: 'chat' },
        emoticon: '👋',
      };
    }
  }

  /**
   * Get card ordering based on student state and context
   * Story 5.0b: AC-5.0b.7, AC-5.0b.8 - Backend RPC method returns card order
   *
   * @returns Card order with priorities and context
   */
  async getCardOrder(): Promise<CardOrder> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    const startTime = Date.now();

    try {
      // Check cached card order first (10-minute cache)
      const cachedOrder = await this.ctx.storage.get<CardOrder>('cardOrder');
      if (cachedOrder && new Date(cachedOrder.expiresAt) > new Date()) {
        console.log('[DO] Returning cached card order', {
          studentId: this.studentId,
          order: cachedOrder.order,
          expiresAt: cachedOrder.expiresAt,
        });
        return cachedOrder;
      }

      // Import card ordering algorithm
      const { computeCardOrder } = await import('../lib/companion/card-ordering');

      // Fetch recent session data
      const recentSessions = await this.getRecentSessionData();

      // Get last app access
      const studentRow = await this.db
        .prepare('SELECT last_active_at FROM students WHERE id = ?')
        .bind(this.studentId)
        .first<{ last_active_at: string }>();

      const lastAppAccess = studentRow?.last_active_at;

      // Get last session time
      const lastSessionRow = await this.db
        .prepare(`
          SELECT date FROM session_metadata
          WHERE student_id = ? AND status = 'completed'
          ORDER BY date DESC
          LIMIT 1
        `)
        .bind(this.studentId)
        .first<{ date: string }>();

      const lastSessionTime = lastSessionRow?.date;

      // Check if student has completed any sessions
      const sessionCountRow = await this.db
        .prepare('SELECT COUNT(*) as count FROM session_metadata WHERE student_id = ? AND status = \'completed\'')
        .bind(this.studentId)
        .first<{ count: number }>();

      const hasCompletedAnySession = (sessionCountRow?.count ?? 0) > 0;

      // Get practice stats for struggle detection
      const practiceStatsRows = await this.db
        .prepare(`
          SELECT
            subject,
            COUNT(*) as total_sessions,
            AVG(questions_correct * 100.0 / questions_total) as average_score,
            MAX(completed_at) as last_practice_date,
            (SELECT (questions_correct * 100.0 / questions_total) FROM practice_sessions ps2
             WHERE ps2.student_id = ps1.student_id
             AND ps2.subject = ps1.subject
             AND ps2.completed_at IS NOT NULL
             ORDER BY ps2.completed_at DESC LIMIT 1) as last_practice_score
          FROM practice_sessions ps1
          WHERE student_id = ? AND completed_at IS NOT NULL
          GROUP BY subject
        `)
        .bind(this.studentId)
        .all<{
          subject: string;
          total_sessions: number;
          average_score: number;
          last_practice_date: string | null;
          last_practice_score: number | null;
        }>();

      const practiceStats: Record<string, import('../lib/rpc/types').SubjectPracticeStats> = {};
      for (const row of practiceStatsRows.results) {
        practiceStats[row.subject] = {
          totalSessions: row.total_sessions,
          averageScore: row.average_score,
          longestStreak: 0, // Not critical for card ordering
          currentStreak: 0, // Not critical for card ordering
          lastPracticeDate: row.last_practice_date ?? undefined,
          lastPracticeScore: row.last_practice_score ?? undefined,
        };
      }

      // Get current streak
      const streakRow = await this.db
        .prepare(`
          SELECT COUNT(DISTINCT DATE(completed_at)) as streak_days
          FROM practice_sessions
          WHERE student_id = ? AND completed_at IS NOT NULL
          AND DATE(completed_at) >= DATE('now', '-30 days')
          ORDER BY completed_at DESC
        `)
        .bind(this.studentId)
        .first<{ streak_days: number }>();

      const currentStreak = streakRow?.streak_days ?? 0;

      // Get recent achievements (placeholder - will be enhanced later)
      const recentAchievements: import('../lib/rpc/types').StudentAchievement[] = [];

      // Check for achievements today
      const achievementToday = recentAchievements.some((a) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return new Date(a.timestamp).getTime() > oneDayAgo;
      });

      // Compute card order using the algorithm
      const cardOrder = computeCardOrder({
        lastAppAccess,
        lastSessionTime,
        recentSessions,
        hasCompletedAnySession,
        achievementToday,
        recentAchievements,
        practiceStats,
        currentStreak,
      });

      // Cache the card order (10-minute cache)
      await this.ctx.storage.put('cardOrder', cardOrder);

      const duration = Date.now() - startTime;

      console.log('[DO] Card order computed', {
        studentId: this.studentId,
        order: cardOrder.order,
        state: cardOrder.context.studentState,
        reason: cardOrder.context.reason,
        durationMs: duration,
      });

      return cardOrder;
    } catch (error) {
      console.error('[DO] Error computing card order:', error);

      // Fallback to default order on error
      return {
        order: ['practice', 'chat', 'progress'],
        context: {
          studentState: 'default',
          reason: 'Error occurred - using default ordering',
          priorities: [
            { card: 'practice', score: 30, factors: { baseScore: 30 } },
            { card: 'chat', score: 20, factors: { baseScore: 20 } },
            { card: 'progress', score: 10, factors: { baseScore: 10 } },
          ],
          computedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }
  }

  /**
   * Get recent session data for hero card greeting generation
   * Story 5.0: AC-5.0.1, AC-5.0.5 - Session data for personalized greetings
   */
  private async getRecentSessionData(): Promise<RecentSessionData[]> {
    if (!this.studentId) {
      return [];
    }

    try {
      // Get recent 3 sessions with their data
      const sessions = await this.db
        .prepare(`
          SELECT id, date, subjects, duration_minutes
          FROM session_metadata
          WHERE student_id = ? AND status = 'completed'
          ORDER BY date DESC
          LIMIT 3
        `)
        .bind(this.studentId)
        .all<{
          id: string;
          date: string;
          subjects: string | null;
          duration_minutes: number | null;
        }>();

      const recentSessions: RecentSessionData[] = [];

      for (const session of sessions.results) {
        // Parse subjects
        let subjects: string[] = [];
        if (session.subjects) {
          try {
            subjects = JSON.parse(session.subjects);
          } catch {
            subjects = session.subjects.split(',').map(s => s.trim());
          }
        }

        // Get topics from short-term memory for this session
        const memories = await this.db
          .prepare(`
            SELECT content FROM short_term_memory
            WHERE student_id = ? AND session_id = ?
            LIMIT 5
          `)
          .bind(this.studentId, session.id)
          .all<{ content: string }>();

        const topics = memories.results
          .map(m => this.extractTopicFromMemory(m.content))
          .filter(t => t !== null) as string[];

        // Get practice scores for this subject (if available)
        let score: number | undefined;
        if (subjects.length > 0) {
          const practiceRow = await this.db
            .prepare(`
              SELECT (questions_correct * 100.0 / questions_total) as accuracy
              FROM practice_sessions
              WHERE student_id = ? AND subject = ? AND completed_at IS NOT NULL
              ORDER BY completed_at DESC
              LIMIT 1
            `)
            .bind(this.studentId, subjects[0])
            .first<{ accuracy: number }>();

          score = practiceRow?.accuracy;
        }

        recentSessions.push({
          topics: topics.slice(0, 3),
          score,
          timestamp: session.date,
          achievements: [], // Placeholder
          subject: subjects[0],
        });
      }

      return recentSessions;
    } catch (error) {
      console.error('[DO] Error fetching recent session data:', error);
      return [];
    }
  }

  /**
   * Extract topic from memory content
   * Simple heuristic: looks for topic keywords
   */
  private extractTopicFromMemory(content: string): string | null {
    // Look for common topic patterns
    const topicPatterns = [
      /learning about ([^.]+)/i,
      /discussed ([^.]+)/i,
      /practiced ([^.]+)/i,
      /understood ([^.]+)/i,
      /studied ([^.]+)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: return first few words
    const words = content.split(' ').slice(0, 4).join(' ');
    return words.length > 0 ? words : null;
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

  /**
   * Get session celebration state for display
   * Story 5.1: AC-5.1.10 - RPC method returns celebration data
   *
   * @returns Celebration state with session data, metrics, and badges
   */
  async getSessionCelebration(): Promise<CelebrationState> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    const startTime = Date.now();

    try {
      // Check if we have a cached celebration that hasn't been viewed yet
      const lastCelebratedSessionId = await this.ctx.storage.get<string>('lastCelebratedSessionId');

      // Import celebration logic
      const { detectSessionCompletion, extractSessionMetrics, calculateStreak, calculateImprovement } =
        await import('../lib/companion/session-completion');
      const { generateCelebrationData, calculateKnowledgeGain } =
        await import('../lib/companion/celebration-generator');
      const { detectUnlockedBadges } =
        await import('../lib/companion/achievement-badges');

      // Get all sessions for student
      const sessionsRaw = await getSessionsForStudent(this.db, this.studentId);

      // Map to SessionMetadata format
      const sessions: SessionMetadata[] = sessionsRaw.map(s => ({
        ...s,
        studentId: this.studentId!,
        durationMinutes: s.durationMinutes || undefined,
        subjects: s.subjects || undefined,
        tutorName: s.tutorName || undefined,
      }));

      // Detect if there's a new session to celebrate
      const completionEvent = detectSessionCompletion(sessions, lastCelebratedSessionId);

      if (!completionEvent) {
        // No new session to celebrate
        console.log('[DO] No new session to celebrate', {
          studentId: this.studentId,
          lastCelebratedSessionId,
          duration: Date.now() - startTime,
        });

        return {
          hasCelebration: false,
        };
      }

      console.log('[DO] Detected new session for celebration', {
        studentId: this.studentId,
        sessionId: completionEvent.newSessionId,
        topics: completionEvent.topics,
      });

      // Get session content from R2 to extract metrics
      const sessionKey = `sessions/${this.studentId}/${completionEvent.newSessionId}.json`;
      let sessionContent: any = null;

      try {
        const sessionObject = await this.r2.get(sessionKey);
        if (sessionObject) {
          sessionContent = await sessionObject.json();
        }
      } catch (error) {
        console.warn('[DO] Failed to load session content from R2', { error });
      }

      // Extract or calculate session metrics
      const extractedMetrics = extractSessionMetrics(sessionContent);
      const streak = calculateStreak(sessions);
      const improvement = calculateImprovement(extractedMetrics.accuracy, sessions);

      const sessionMetrics: SessionMetrics = {
        accuracy: extractedMetrics.accuracy,
        questionsAnswered: extractedMetrics.questionsAnswered,
        correctAnswers: extractedMetrics.correctAnswers,
        topicsLearned: completionEvent.topics,
        estimatedKnowledgeGain: calculateKnowledgeGain(
          extractedMetrics.accuracy,
          improvement?.accuracyChange ? extractedMetrics.accuracy - improvement.accuracyChange : undefined
        ),
        streak: streak > 1 ? streak : undefined,
        comparisonToPrevious: improvement || undefined,
      };

      // Get subject mastery for badge detection
      const subjectMastery = await this.getSubjectMastery();

      // Detect unlocked badges
      const badges = detectUnlockedBadges({
        sessionMetrics,
        subjectMastery,
        consecutiveDays: streak,
        totalSessions: sessions.length,
      });

      // Generate celebration data
      const celebrationData = generateCelebrationData(sessionMetrics, badges);

      // Cache the celebrated session ID so we don't show it again
      await this.ctx.storage.put('lastCelebratedSessionId', completionEvent.newSessionId);

      const duration = Date.now() - startTime;
      console.log('[DO] Generated celebration data', {
        studentId: this.studentId,
        sessionId: completionEvent.newSessionId,
        badgeCount: badges.length,
        duration,
      });

      return {
        hasCelebration: true,
        celebration: celebrationData,
        sessionId: completionEvent.newSessionId,
      };

    } catch (error) {
      console.error('[DO] Error generating celebration', { error, studentId: this.studentId });

      // Return no celebration on error rather than failing
      return {
        hasCelebration: false,
      };
    }
  }

  /**
   * RPC Handler: Get card ordering
   * Story 5.0b: AC-5.0b.7 - RPC method handler
   */
  private async handleGetCardOrder(_request: Request): Promise<Response> {
    try {
      const cardOrder = await this.getCardOrder();
      return new Response(JSON.stringify(cardOrder), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleGetCardOrder:', error);
      return this.errorResponse('Failed to get card order', 'CARD_ORDER_ERROR', 500);
    }
  }

  /**
   * RPC Handler: Get session celebration
   * Story 5.1: AC-5.1.10 - RPC method handler
   */
  private async handleGetSessionCelebration(_request: Request): Promise<Response> {
    try {
      const celebration = await this.getSessionCelebration();
      return new Response(JSON.stringify(celebration), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleGetSessionCelebration:', error);
      return this.errorResponse('Failed to get celebration', 'CELEBRATION_ERROR', 500);
    }
  }

  /**
   * RPC Handler: Get goal progress
   * Story 5.3: AC-5.3.6 - RPC method handler
   */
  private async handleGetGoalProgress(_request: Request): Promise<Response> {
    try {
      const goalProgress = await this.getGoalProgress();
      return new Response(JSON.stringify(goalProgress), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleGetGoalProgress:', error);
      return this.errorResponse('Failed to get goal progress', 'GOAL_PROGRESS_ERROR', 500);
    }
  }

  /**
   * RPC Handler: Get goal celebration
   * Story 5.3: AC-5.3.2 - RPC method handler
   */
  private async handleGetGoalCelebration(_request: Request): Promise<Response> {
    try {
      const celebration = await this.getGoalCelebration();
      return new Response(JSON.stringify(celebration), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleGetGoalCelebration:', error);
      return this.errorResponse('Failed to get goal celebration', 'GOAL_CELEBRATION_ERROR', 500);
    }
  }

  /**
   * RPC Handler: Get pending nudge
   * Story 5.4: AC-5.4.7 - RPC method handler
   */
  private async handleGetNudgeIfPending(_request: Request): Promise<Response> {
    try {
      const nudge = await this.getNudgeIfPending();
      return new Response(JSON.stringify(nudge), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleGetNudgeIfPending:', error);
      return this.errorResponse('Failed to get nudge', 'NUDGE_ERROR', 500);
    }
  }

  /**
   * RPC Handler: Dismiss nudge
   * Story 5.4: AC-5.4.7 - RPC method handler
   */
  private async handleDismissNudge(_request: Request): Promise<Response> {
    try {
      await this.dismissNudge();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleDismissNudge:', error);
      return this.errorResponse('Failed to dismiss nudge', 'NUDGE_DISMISS_ERROR', 500);
    }
  }

  /**
   * RPC Handler: Snooze nudge
   * Story 5.4: AC-5.4.7 - RPC method handler
   */
  private async handleSnoozeNudge(request: Request): Promise<Response> {
    try {
      const { hours } = await request.json<{ hours: number }>();
      await this.snoozeNudge(hours);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DO] Error in handleSnoozeNudge:', error);
      return this.errorResponse('Failed to snooze nudge', 'NUDGE_SNOOZE_ERROR', 500);
    }
  }

  /**
   * Get goal progress for all learning goals
   * Story 5.3: AC-5.3.6 - Goal state management and persistence
   */
  async getGoalProgress(): Promise<GoalProgressSnapshot> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    try {
      // Import goal functions
      const { getAllGoalsProgress } = await import('../lib/companion/goal-detection');

      // Get subject mastery and practice stats
      const subjectMastery = await this.getSubjectMastery();
      const practiceStatsMap: Record<string, SubjectPracticeStats> = {};

      // Fetch practice stats for all subjects
      for (const mastery of subjectMastery) {
        const stats = await this.getSubjectPracticeStats(mastery.subject);
        practiceStatsMap[mastery.subject] = stats;
      }

      // Get completed goals from storage
      const completedGoalIds = (await this.ctx.storage.get<string[]>('completedGoalIds')) || [];
      const completionTimesMap = new Map<string, string>(
        (await this.ctx.storage.get<[string, string][]>('goalCompletionTimes')) || []
      );

      // Calculate all goals progress
      const allGoals = getAllGoalsProgress(
        subjectMastery,
        practiceStatsMap,
        completedGoalIds,
        completionTimesMap
      );

      // Categorize goals
      const completed = allGoals.filter((g) => g.status === 'completed');
      const inProgress = allGoals.filter((g) => g.status === 'active' && g.progressPercent > 0);
      const available = allGoals.filter((g) => g.status === 'active' && g.progressPercent === 0);

      return {
        completed,
        inProgress,
        available,
      };
    } catch (error) {
      console.error('[DO] Error getting goal progress:', error);
      throw error;
    }
  }

  /**
   * Get goal celebration if goal was just completed
   * Story 5.3: AC-5.3.2 - Goal achievement celebration
   */
  async getGoalCelebration(): Promise<GoalCelebrationData | null> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    try {
      // Import goal functions
      const { detectGoalCompletion } = await import('../lib/companion/goal-detection');
      const { generateGoalCelebration } = await import('../lib/companion/goal-celebration');

      // Get subject mastery and practice stats
      const subjectMastery = await this.getSubjectMastery();
      const practiceStatsMap: Record<string, SubjectPracticeStats> = {};

      for (const mastery of subjectMastery) {
        const stats = await this.getSubjectPracticeStats(mastery.subject);
        practiceStatsMap[mastery.subject] = stats;
      }

      // Get completed goals
      const completedGoalIds = (await this.ctx.storage.get<string[]>('completedGoalIds')) || [];

      // Detect new completions
      const newCompletions = detectGoalCompletion(
        subjectMastery,
        practiceStatsMap,
        completedGoalIds
      );

      if (newCompletions.length === 0) {
        return null;
      }

      // Take first completion (unlikely to have multiple simultaneously)
      const completion = newCompletions[0];

      // Mark goal as completed
      const updatedCompletedIds = [...completedGoalIds, completion.goalId];
      const completionTimesMap = new Map<string, string>(
        (await this.ctx.storage.get<[string, string][]>('goalCompletionTimes')) || []
      );
      completionTimesMap.set(completion.goalId, completion.completionTime);

      await this.ctx.storage.put('completedGoalIds', updatedCompletedIds);
      await this.ctx.storage.put('goalCompletionTimes', Array.from(completionTimesMap.entries()));

      // Get updated goal progress
      const progressSnapshot = await this.getGoalProgress();

      // Generate celebration
      return generateGoalCelebration(completion, progressSnapshot);
    } catch (error) {
      console.error('[DO] Error getting goal celebration:', error);
      return null;
    }
  }

  /**
   * Get pending retention nudge if applicable
   * Story 5.4: AC-5.4.7 - Nudge state and persistence
   */
  async getNudgeIfPending(): Promise<RetentionNudgeData | null> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    try {
      // Check if nudge is pending
      const nudgeState = await this.ctx.storage.get<StudentNudgeState>('nudgeState');

      if (!nudgeState?.nudgePending || !nudgeState.pendingNudgeData) {
        return null;
      }

      // Check if nudge expired
      const { isNudgeExpired } = await import('../lib/companion/nudge-generator');
      if (isNudgeExpired(nudgeState.pendingNudgeData)) {
        // Clear expired nudge
        await this.ctx.storage.put('nudgeState', {
          ...nudgeState,
          nudgePending: false,
          pendingNudgeData: undefined,
        });
        return null;
      }

      return nudgeState.pendingNudgeData;
    } catch (error) {
      console.error('[DO] Error getting pending nudge:', error);
      return null;
    }
  }

  /**
   * Dismiss retention nudge permanently
   * Story 5.4: AC-5.4.7 - Mark nudge as displayed
   */
  async dismissNudge(): Promise<void> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    try {
      const nudgeState = await this.ctx.storage.get<StudentNudgeState>('nudgeState') || {
        nudgePending: false,
        nudgeHistory: [],
      };

      const now = new Date().toISOString();

      // Record dismissal in history
      if (nudgeState.pendingNudgeData) {
        const event: NudgeEvent = {
          nudgeId: nudgeState.pendingNudgeData.id,
          triggeredAt: nudgeState.pendingNudgeData.generatedAt,
          displayedAt: now,
          action: 'dismissed',
          actionAt: now,
          variant: nudgeState.pendingNudgeData.variant,
        };

        nudgeState.nudgeHistory.push(event);
      }

      // Clear pending nudge
      await this.ctx.storage.put('nudgeState', {
        ...nudgeState,
        nudgePending: false,
        pendingNudgeData: undefined,
        lastNudgeTime: now,
        nextNudgeEligibleAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error('[DO] Error dismissing nudge:', error);
      throw error;
    }
  }

  /**
   * Snooze retention nudge temporarily
   * Story 5.4: AC-5.4.7 - Temporarily dismiss nudge
   */
  async snoozeNudge(hours: number): Promise<void> {
    await this.ensureInitialized();

    if (!this.studentId) {
      throw new StudentCompanionError('Companion not initialized', 'NOT_INITIALIZED', 400);
    }

    try {
      const nudgeState = await this.ctx.storage.get<StudentNudgeState>('nudgeState') || {
        nudgePending: false,
        nudgeHistory: [],
      };

      const now = new Date().toISOString();

      // Record snooze in history
      if (nudgeState.pendingNudgeData) {
        const event: NudgeEvent = {
          nudgeId: nudgeState.pendingNudgeData.id,
          triggeredAt: nudgeState.pendingNudgeData.generatedAt,
          displayedAt: now,
          action: 'snoozed',
          actionAt: now,
          variant: nudgeState.pendingNudgeData.variant,
        };

        nudgeState.nudgeHistory.push(event);
      }

      // Calculate snooze expiration
      const { calculateSnoozeTime } = await import('../lib/companion/nudge-generator');
      const snoozeUntil = calculateSnoozeTime(hours);

      // Clear pending nudge but record snooze
      await this.ctx.storage.put('nudgeState', {
        ...nudgeState,
        nudgePending: false,
        pendingNudgeData: undefined,
        nextNudgeEligibleAt: snoozeUntil,
      });
    } catch (error) {
      console.error('[DO] Error snoozing nudge:', error);
      throw error;
    }
  }
}

