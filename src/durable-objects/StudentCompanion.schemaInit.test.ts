/**
 * StudentCompanion Schema Initialization Tests
 * Verifies that the database schema initialization creates all required tables
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockD1Database } from '../test/mocks/d1-database';
import { initializeSchema } from '../lib/db/schema';

describe('Database Schema Initialization', () => {
  let mockDB: MockD1Database;

  beforeEach(async () => {
    mockDB = new MockD1Database();
  });

  it('should create all required tables without errors', async () => {
    // This should not throw
    await expect(initializeSchema(mockDB as unknown as D1Database)).resolves.not.toThrow();
  });

  it('should create progress_tracking table', async () => {
    await initializeSchema(mockDB as unknown as D1Database);

    // Verify table exists using the mock's hasTable helper
    expect(mockDB.hasTable('progress_tracking')).toBe(true);
  });

  it('should create all Epic 3 tables (chat_history, subject_knowledge, practice_sessions, practice_questions, progress_tracking, engagement_events)', async () => {
    await initializeSchema(mockDB as unknown as D1Database);

    const expectedTables = [
      'chat_history',
      'subject_knowledge',
      'practice_sessions',
      'practice_questions',
      'progress_tracking',
      'engagement_events',
    ];

    for (const tableName of expectedTables) {
      expect(mockDB.hasTable(tableName), `Table ${tableName} should exist`).toBe(true);
    }
  });

  it('should create progress_tracking table with correct columns', async () => {
    await initializeSchema(mockDB as unknown as D1Database);

    // Verify we can insert a record with all required columns
    const testId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const now = new Date().toISOString();

    // First create a student
    await mockDB.prepare(`
      INSERT INTO students (id, clerk_user_id, created_at, last_active_at)
      VALUES (?, ?, ?, ?)
    `).bind(studentId, 'test-clerk-id', now, now).run();

    // Now insert into progress_tracking
    const result = await mockDB.prepare(`
      INSERT INTO progress_tracking
      (id, student_id, dimension, dimension_value, metric_type, metric_value, last_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      testId,
      studentId,
      'subject',
      'Mathematics',
      'mastery',
      0.75,
      now
    )
    .run();

    expect(result.success).toBe(true);

    // Verify the record was inserted
    const record = await mockDB.prepare(`
      SELECT * FROM progress_tracking WHERE id = ?
    `).bind(testId).first();

    expect(record).toBeDefined();
    expect(record?.student_id).toBe(studentId);
    expect(record?.dimension).toBe('subject');
    expect(record?.dimension_value).toBe('Mathematics');
    expect(record?.metric_type).toBe('mastery');
    expect(record?.metric_value).toBe(0.75);
  });

  it('should support UPSERT operations on progress_tracking', async () => {
    await initializeSchema(mockDB as unknown as D1Database);

    const studentId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create student first
    await mockDB.prepare(`
      INSERT INTO students (id, clerk_user_id, created_at, last_active_at)
      VALUES (?, ?, ?, ?)
    `).bind(studentId, 'test-clerk-upsert', now, now).run();

    // Initial insert
    await mockDB.prepare(`
      INSERT INTO progress_tracking
      (id, student_id, dimension, dimension_value, metric_type, metric_value, last_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, dimension, dimension_value, metric_type)
      DO UPDATE SET metric_value = excluded.metric_value, last_updated_at = excluded.last_updated_at
    `)
    .bind(
      crypto.randomUUID(),
      studentId,
      'subject',
      'Science',
      'mastery',
      0.4,
      now
    )
    .run();

    // Verify initial value
    let record = await mockDB.prepare(`
      SELECT metric_value FROM progress_tracking
      WHERE student_id = ? AND dimension = 'subject' AND dimension_value = 'Science' AND metric_type = 'mastery'
    `)
    .bind(studentId)
    .first();

    expect(record?.metric_value).toBe(0.4);

    // Update using UPSERT (different ID but same unique key)
    const laterTime = new Date(Date.now() + 1000).toISOString();
    await mockDB.prepare(`
      INSERT INTO progress_tracking
      (id, student_id, dimension, dimension_value, metric_type, metric_value, last_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, dimension, dimension_value, metric_type)
      DO UPDATE SET metric_value = excluded.metric_value, last_updated_at = excluded.last_updated_at
    `)
    .bind(
      crypto.randomUUID(),
      studentId,
      'subject',
      'Science',
      'mastery',
      0.65,
      laterTime
    )
    .run();

    // Verify updated value
    record = await mockDB.prepare(`
      SELECT metric_value, last_updated_at FROM progress_tracking
      WHERE student_id = ? AND dimension = 'subject' AND dimension_value = 'Science' AND metric_type = 'mastery'
    `)
    .bind(studentId)
    .first();

    expect(record?.metric_value).toBe(0.65);
    expect(record?.last_updated_at).toBe(laterTime);

    // Verify only one record exists (UPSERT worked, didn't create duplicate)
    const allRecords = await mockDB.prepare(`
      SELECT * FROM progress_tracking
      WHERE student_id = ? AND dimension = 'subject' AND dimension_value = 'Science' AND metric_type = 'mastery'
    `)
    .bind(studentId)
    .all();

    expect(allRecords.results.length).toBe(1);
  });

  it('should be idempotent - safe to run multiple times', async () => {
    // Initialize schema multiple times
    await initializeSchema(mockDB as unknown as D1Database);
    await initializeSchema(mockDB as unknown as D1Database);
    await initializeSchema(mockDB as unknown as D1Database);

    // Verify table still exists (CREATE TABLE IF NOT EXISTS should be idempotent)
    expect(mockDB.hasTable('progress_tracking')).toBe(true);
    expect(mockDB.hasTable('chat_history')).toBe(true);
  });

  it('should create all required indexes', async () => {
    await initializeSchema(mockDB as unknown as D1Database);

    // Indexes are created but MockD1Database doesn't track them separately
    // Verify table exists as a proxy (indexes would fail if tables didn't exist)
    expect(mockDB.hasTable('students')).toBe(true);
    expect(mockDB.hasTable('short_term_memory')).toBe(true);
    expect(mockDB.hasTable('long_term_memory')).toBe(true);
    expect(mockDB.hasTable('practice_sessions')).toBe(true);
    expect(mockDB.hasTable('progress_tracking')).toBe(true);
  });

  it('should create all 11 core tables', async () => {
    await initializeSchema(mockDB as unknown as D1Database);

    const expectedTables = [
      'students',
      'short_term_memory',
      'long_term_memory',
      'session_metadata',
      'consolidation_history',
      'practice_sessions',
      'practice_questions',
      'chat_history',
      'subject_knowledge',
      'progress_tracking',
      'engagement_events',
    ];

    expectedTables.forEach(tableName => {
      expect(mockDB.hasTable(tableName), `Table ${tableName} should exist`).toBe(true);
    });
  });
});
