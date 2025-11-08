/**
 * Memory CRUD Operations
 * Story 1.7: Core Memory System Structure
 *
 * Implements create and read operations for short-term and long-term memory
 * All operations scoped to student_id for isolation
 */

import type { ShortTermMemory, LongTermMemory, CreateShortTermMemoryInput, CreateLongTermMemoryInput } from '../rpc/types';
import { generateId, getCurrentTimestamp } from './schema';

// ============================================
// Short-Term Memory Operations
// ============================================

/**
 * Create a new short-term memory record
 *
 * @param db - D1Database instance
 * @param studentId - Student ID for isolation
 * @param input - Memory content and metadata
 * @returns Created short-term memory record
 */
export async function createShortTermMemory(
  db: D1Database,
  studentId: string,
  input: CreateShortTermMemoryInput
): Promise<ShortTermMemory> {
  const id = generateId();
  const createdAt = getCurrentTimestamp();
  const importanceScore = input.importanceScore ?? 0.5;

  await db
    .prepare(`
      INSERT INTO short_term_memory (
        id, student_id, content, session_id, importance_score, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      studentId,
      input.content,
      input.sessionId || null,
      importanceScore,
      createdAt,
      input.expiresAt || null
    )
    .run();

  return {
    id,
    studentId,
    content: input.content,
    sessionId: input.sessionId,
    importanceScore,
    createdAt,
    expiresAt: input.expiresAt,
  };
}

/**
 * Get short-term memories for a student
 *
 * @param db - D1Database instance
 * @param studentId - Student ID for filtering
 * @param options - Optional filters (limit, minImportance, since date)
 * @returns Array of short-term memory records
 */
export async function getShortTermMemories(
  db: D1Database,
  studentId: string,
  options?: {
    limit?: number;
    minImportance?: number;
    since?: string; // ISO 8601 timestamp
  }
): Promise<ShortTermMemory[]> {
  let query = `
    SELECT * FROM short_term_memory
    WHERE student_id = ?
  `;
  const params: (string | number)[] = [studentId];

  if (options?.minImportance !== undefined) {
    query += ` AND importance_score >= ?`;
    params.push(options.minImportance);
  }

  if (options?.since) {
    query += ` AND created_at >= ?`;
    params.push(options.since);
  }

  query += ` ORDER BY created_at DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const result = await db.prepare(query).bind(...params).all<{
    id: string;
    student_id: string;
    content: string;
    session_id: string | null;
    importance_score: number;
    created_at: string;
    expires_at: string | null;
  }>();

  return result.results.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    content: row.content,
    sessionId: row.session_id || undefined,
    importanceScore: row.importance_score,
    createdAt: row.created_at,
    expiresAt: row.expires_at || undefined,
  }));
}

/**
 * Get a single short-term memory by ID
 * Verifies student_id matches for isolation
 *
 * @param db - D1Database instance
 * @param studentId - Student ID for isolation check
 * @param memoryId - Memory record ID
 * @returns Short-term memory record or null if not found
 */
export async function getShortTermMemoryById(
  db: D1Database,
  studentId: string,
  memoryId: string
): Promise<ShortTermMemory | null> {
  const result = await db
    .prepare(`
      SELECT * FROM short_term_memory
      WHERE id = ? AND student_id = ?
    `)
    .bind(memoryId, studentId)
    .first<{
      id: string;
      student_id: string;
      content: string;
      session_id: string | null;
      importance_score: number;
      created_at: string;
      expires_at: string | null;
    }>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    studentId: result.student_id,
    content: result.content,
    sessionId: result.session_id || undefined,
    importanceScore: result.importance_score,
    createdAt: result.created_at,
    expiresAt: result.expires_at || undefined,
  };
}

// ============================================
// Long-Term Memory Operations
// ============================================

/**
 * Create a new long-term memory record
 *
 * @param db - D1Database instance
 * @param studentId - Student ID for isolation
 * @param input - Memory content, category, and tags
 * @returns Created long-term memory record
 */
export async function createLongTermMemory(
  db: D1Database,
  studentId: string,
  input: CreateLongTermMemoryInput
): Promise<LongTermMemory> {
  const id = generateId();
  const createdAt = getCurrentTimestamp();
  const lastAccessedAt = createdAt;
  const tagsJson = input.tags ? JSON.stringify(input.tags) : '[]';

  await db
    .prepare(`
      INSERT INTO long_term_memory (
        id, student_id, content, category, tags, created_at, last_accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      studentId,
      input.content,
      input.category,
      tagsJson,
      createdAt,
      lastAccessedAt
    )
    .run();

  return {
    id,
    studentId,
    content: input.content,
    category: input.category,
    tags: tagsJson,
    createdAt,
    lastAccessedAt,
  };
}

/**
 * Get long-term memories for a student
 *
 * @param db - D1Database instance
 * @param studentId - Student ID for filtering
 * @param options - Optional filters (limit, category, tag search)
 * @returns Array of long-term memory records
 */
export async function getLongTermMemories(
  db: D1Database,
  studentId: string,
  options?: {
    limit?: number;
    category?: string;
    tag?: string; // Single tag to filter by (JSON LIKE query)
  }
): Promise<LongTermMemory[]> {
  let query = `
    SELECT * FROM long_term_memory
    WHERE student_id = ?
  `;
  const params: (string | number)[] = [studentId];

  if (options?.category) {
    query += ` AND category = ?`;
    params.push(options.category);
  }

  if (options?.tag) {
    query += ` AND tags LIKE ?`;
    params.push(`%"${options.tag}"%`);
  }

  query += ` ORDER BY last_accessed_at DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const result = await db.prepare(query).bind(...params).all<{
    id: string;
    student_id: string;
    content: string;
    category: string;
    tags: string;
    created_at: string;
    last_accessed_at: string;
  }>();

  return result.results.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    content: row.content,
    category: row.category,
    tags: row.tags,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
  }));
}

/**
 * Get a single long-term memory by ID
 * Verifies student_id matches for isolation
 * Updates last_accessed_at timestamp
 *
 * @param db - D1Database instance
 * @param studentId - Student ID for isolation check
 * @param memoryId - Memory record ID
 * @returns Long-term memory record or null if not found
 */
export async function getLongTermMemoryById(
  db: D1Database,
  studentId: string,
  memoryId: string
): Promise<LongTermMemory | null> {
  const result = await db
    .prepare(`
      SELECT * FROM long_term_memory
      WHERE id = ? AND student_id = ?
    `)
    .bind(memoryId, studentId)
    .first<{
      id: string;
      student_id: string;
      content: string;
      category: string;
      tags: string;
      created_at: string;
      last_accessed_at: string;
    }>();

  if (!result) {
    return null;
  }

  // Update last_accessed_at timestamp
  const newAccessTime = getCurrentTimestamp();
  await db
    .prepare(`
      UPDATE long_term_memory
      SET last_accessed_at = ?
      WHERE id = ?
    `)
    .bind(newAccessTime, memoryId)
    .run();

  return {
    id: result.id,
    studentId: result.student_id,
    content: result.content,
    category: result.category,
    tags: result.tags,
    createdAt: result.created_at,
    lastAccessedAt: newAccessTime, // Return updated timestamp
  };
}
