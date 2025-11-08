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
  MemoryItem
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

/**
 * Environment bindings interface for Durable Object
 */
interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CLERK_SECRET_KEY: string;
}

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
    
    // Initialize database schema if not already done
    await this.ensureSchemaInitialized();
    
    this.initialized = true;
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

  private async handleGetProgress(_request: Request): Promise<Response> {
    try {
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
        await this.db.prepare(
          'UPDATE students SET last_active_at = ? WHERE id = ?'
        ).bind(now, existingStudent.id).run();
        
        // Store in DO state and cache
        await this.setState('studentId', existingStudent.id);
        this.cache.set('studentId', existingStudent.id);
        
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
  // Database Helper Methods
  // ============================================

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
    // @ts-expect-error - state property exists on DurableObject but types are not fully resolved
    await this.state.storage.put(key, value);
  }

  /**
   * Retrieve a value from durable storage
   */
  private async getState<T>(key: string): Promise<T | undefined> {
    // @ts-expect-error - state property exists on DurableObject but types are not fully resolved
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

