/**
 * StudentCompanion completePractice Tests
 * Story 3.3: Practice Session Completion Tracking
 * Tests for AC-3.3.1, AC-3.3.2, AC-3.3.3, AC-3.3.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentCompanion } from './StudentCompanion';
import { MockD1Database } from '../test/mocks/d1-database';

// Mock DurableObjectState
class MockDurableObjectState {
  private internalStorage = new Map<string, any>();

  storage = {
    get: vi.fn(async <T>(key: string): Promise<T | undefined> => {
      return this.internalStorage.get(key);
    }),
    put: vi.fn(async <T>(key: string, value: T): Promise<void> => {
      this.internalStorage.set(key, value);
    }),
    delete: vi.fn(async (key: string): Promise<boolean> => {
      return this.internalStorage.delete(key);
    }),
    list: vi.fn(),
    deleteAll: vi.fn(),
    getAlarm: vi.fn(),
    setAlarm: vi.fn(),
    deleteAlarm: vi.fn(),
  };

  id = {
    toString: () => 'test-do-id',
    equals: () => false,
    name: 'test-student',
  };

  blockConcurrencyWhile = vi.fn(async (callback: () => Promise<void>) => {
    await callback();
  }) as any;

  waitUntil = vi.fn();
}

// Mock Environment
let mockDB: MockD1Database;

const createMockEnv = () => {
  mockDB = new MockD1Database();
  return {
    DB: mockDB as unknown as D1Database,
    R2: {} as R2Bucket,
    AI: {} as Ai,
    VECTORIZE: {} as any,
    CLERK_SECRET_KEY: 'test-secret-key',
  };
};

const mockEnv = createMockEnv();

function createCompanion(studentId?: string): StudentCompanion {
  const mockState = new MockDurableObjectState();
  const companion = new StudentCompanion(mockState as any, mockEnv);
  (companion as any).ctx = mockState;
  (companion as any).studentId = studentId || 'test-student-id';
  return companion;
}

describe('completePractice - Story 3.3', () => {
  beforeEach(() => {
    mockDB.reset();
  });

  describe('AC-3.3.1: Practice completion is recorded', () => {
    it('should update practice_sessions with completion data', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';
      const startedAt = new Date('2025-11-09T10:00:00Z').toISOString();

      // Setup: Create practice session
      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Algebra', 10, 0, '${startedAt}', 0)
      `);

      // Setup: Add answered questions
      for (let i = 1; i <= 10; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B","C","D"]', 'A', '${i <= 8 ? 'A' : 'B'}', ${i <= 8 ? 1 : 0}, 30, 'topic${i}', '${startedAt}')
        `);
      }

      // Act: Complete practice
      const result = await companion.completePractice(sessionId);

      // Assert: Session marked complete
      const session = await mockDB.prepare('SELECT * FROM practice_sessions WHERE id = ?').bind(sessionId).first();
      expect(session).toBeDefined();
      expect(session?.completed).toBe(1);
      expect(session?.completed_at).toBeDefined();
      expect(session?.duration_seconds).toBeGreaterThan(0);
      expect(result.completedAt).toBeDefined();
    });

    it('should calculate duration from started_at to completed_at', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';
      const startedAt = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Algebra', 5, 0, '${startedAt}', 0)
      `);

      for (let i = 1; i <= 5; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', 'A', 1, 30, 'topic${i}', '${startedAt}')
        `);
      }

      const result = await companion.completePractice(sessionId);

      // Duration should be approximately 5 minutes (300 seconds) ± 2 seconds
      expect(result.durationSeconds).toBeGreaterThanOrEqual(298);
      expect(result.durationSeconds).toBeLessThanOrEqual(305);
    });

    it('should persist completion across sessions', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Math', 3, 0, '${new Date().toISOString()}', 0)
      `);

      for (let i = 1; i <= 3; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', 'A', 1, 20, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      await companion.completePractice(sessionId);

      // Verify completion persists
      const session = await mockDB.prepare('SELECT completed FROM practice_sessions WHERE id = ?').bind(sessionId).first();
      expect(session?.completed).toBe(1);
    });
  });

  describe('AC-3.3.2: Performance metrics are stored', () => {
    it('should calculate and store accuracy percentage', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Science', 10, 0, '${new Date().toISOString()}', 0)
      `);

      // 7 correct, 3 incorrect = 70% accuracy
      for (let i = 1; i <= 10; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', '${i <= 7 ? 'A' : 'B'}', ${i <= 7 ? 1 : 0}, 25, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      const result = await companion.completePractice(sessionId);

      expect(result.accuracy).toBe(70);
      expect(result.questionsCorrect).toBe(7);
      expect(result.questionsTotal).toBe(10);
    });

    it('should calculate average time per question', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'History', 4, 0, '${new Date().toISOString()}', 0)
      `);

      // Times: 20, 30, 40, 50 seconds -> average = 35 seconds
      const times = [20, 30, 40, 50];
      for (let i = 1; i <= 4; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', 'A', 1, ${times[i - 1]}, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      const result = await companion.completePractice(sessionId);

      expect(result.averageTimePerQuestion).toBe(35);
    });

    it('should store individual question metrics', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Geography', 2, 0, '${new Date().toISOString()}', 0)
      `);

      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q1', '${sessionId}', 'Question 1', '["A","B"]', 'A', 'A', 1, 45, 'capitals', '${new Date().toISOString()}')
      `);

      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q2', '${sessionId}', 'Question 2', '["A","B"]', 'B', 'A', 0, 30, 'rivers', '${new Date().toISOString()}')
      `);

      await companion.completePractice(sessionId);

      // Verify question data persists
      const questions = await mockDB.prepare('SELECT * FROM practice_questions WHERE session_id = ?').bind(sessionId).all();
      expect(questions.results).toHaveLength(2);
      expect(questions.results[0]).toMatchObject({
        is_correct: 1,
        time_to_answer_seconds: 45,
      });
      expect(questions.results[1]).toMatchObject({
        is_correct: 0,
        time_to_answer_seconds: 30,
      });
    });
  });

  describe('AC-3.3.3: Progress is updated in companion memory', () => {
    it('should update subject_knowledge with new mastery_level', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      // Setup: Create existing subject_knowledge with mastery 0.5
      await mockDB.exec(`
        INSERT INTO subject_knowledge (id, student_id, subject, mastery_level, practice_count, struggles, strengths)
        VALUES ('sk1', 'test-student-id', 'Physics', 0.5, 0, '[]', '[]')
      `);

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Physics', 10, 0, '${new Date().toISOString()}', 0)
      `);

      // 8/10 correct = 80% accuracy
      for (let i = 1; i <= 10; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', '${i <= 8 ? 'A' : 'B'}', ${i <= 8 ? 1 : 0}, 30, 'mechanics', '${new Date().toISOString()}')
        `);
      }

      const result = await companion.completePractice(sessionId);

      // Story 4.3 formula: new = old + (1 - old) * success * 0.1
      // New mastery = 0.5 + (1 - 0.5) * 0.8 * 0.1 = 0.5 + 0.04 = 0.54
      const subjectKnowledge = await mockDB.prepare('SELECT mastery_level FROM subject_knowledge WHERE student_id = ? AND subject = ?')
        .bind('test-student-id', 'Physics')
        .first();

      expect(subjectKnowledge?.mastery_level).toBeCloseTo(0.54, 2);
      expect(result.newMasteryLevel).toBeCloseTo(0.54, 2);
      expect(result.subjectMasteryDelta).toBeCloseTo(0.04, 2);
    });

    it('should increment practice_count', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO subject_knowledge (id, student_id, subject, mastery_level, practice_count, struggles, strengths)
        VALUES ('sk1', 'test-student-id', 'Chemistry', 0.4, 2, '[]', '[]')
      `);

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Chemistry', 5, 0, '${new Date().toISOString()}', 0)
      `);

      for (let i = 1; i <= 5; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', 'A', 1, 20, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      await companion.completePractice(sessionId);

      const subjectKnowledge = await mockDB.prepare('SELECT practice_count FROM subject_knowledge WHERE student_id = ? AND subject = ?')
        .bind('test-student-id', 'Chemistry')
        .first();

      expect(subjectKnowledge?.practice_count).toBe(3);
    });

    it('should update last_practiced_at timestamp', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO subject_knowledge (id, student_id, subject, mastery_level, practice_count, last_practiced_at, struggles, strengths)
        VALUES ('sk1', 'test-student-id', 'Biology', 0.3, 1, '2025-11-01T00:00:00Z', '[]', '[]')
      `);

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Biology', 3, 0, '${new Date().toISOString()}', 0)
      `);

      for (let i = 1; i <= 3; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', 'A', 1, 25, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      await companion.completePractice(sessionId);

      const subjectKnowledge = await mockDB.prepare('SELECT last_practiced_at FROM subject_knowledge WHERE student_id = ? AND subject = ?')
        .bind('test-student-id', 'Biology')
        .first();

      const lastPracticedAt = new Date(subjectKnowledge?.last_practiced_at as string);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastPracticedAt.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeLessThan(1); // Should be within last minute
    });

    it('should update struggles JSON with incorrect topics', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO subject_knowledge (id, student_id, subject, mastery_level, practice_count, struggles, strengths)
        VALUES ('sk1', 'test-student-id', 'Math', 0.6, 1, '["fractions"]', '[]')
      `);

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Math', 5, 0, '${new Date().toISOString()}', 0)
      `);

      // 3 correct, 2 incorrect (on geometry and algebra)
      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q1', '${sessionId}', 'Q1', '["A","B"]', 'A', 'A', 1, 20, 'addition', '${new Date().toISOString()}')
      `);
      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q2', '${sessionId}', 'Q2', '["A","B"]', 'A', 'B', 0, 25, 'geometry', '${new Date().toISOString()}')
      `);
      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q3', '${sessionId}', 'Q3', '["A","B"]', 'A', 'A', 1, 22, 'subtraction', '${new Date().toISOString()}')
      `);
      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q4', '${sessionId}', 'Q4', '["A","B"]', 'A', 'B', 0, 30, 'algebra', '${new Date().toISOString()}')
      `);
      await mockDB.exec(`
        INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
        VALUES ('q5', '${sessionId}', 'Q5', '["A","B"]', 'A', 'A', 1, 18, 'multiplication', '${new Date().toISOString()}')
      `);

      await companion.completePractice(sessionId);

      const subjectKnowledge = await mockDB.prepare('SELECT struggles FROM subject_knowledge WHERE student_id = ? AND subject = ?')
        .bind('test-student-id', 'Math')
        .first();

      const struggles = JSON.parse(subjectKnowledge?.struggles as string);
      expect(struggles).toContain('geometry');
      expect(struggles).toContain('algebra');
      expect(struggles).toContain('fractions'); // Original struggle preserved
    });

    it('should create new subject_knowledge record if missing', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'NewSubject', 5, 0, '${new Date().toISOString()}', 0)
      `);

      for (let i = 1; i <= 5; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', '${i <= 4 ? 'A' : 'B'}', ${i <= 4 ? 1 : 0}, 20, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      await companion.completePractice(sessionId);

      const subjectKnowledge = await mockDB.prepare('SELECT * FROM subject_knowledge WHERE student_id = ? AND subject = ?')
        .bind('test-student-id', 'NewSubject')
        .first();

      expect(subjectKnowledge).toBeDefined();
      expect(subjectKnowledge?.mastery_level).toBeCloseTo(0.24, 2); // 80% * 0.3 = 0.24 (first session)
      expect(subjectKnowledge?.practice_count).toBe(1);
    });
  });

  describe('AC-3.3.6: Completion is visible in engagement events', () => {
    it('should log practice_complete engagement event', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'test-session-id';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'English', 8, 0, '${new Date().toISOString()}', 0)
      `);

      for (let i = 1; i <= 8; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', '${i <= 6 ? 'A' : 'B'}', ${i <= 6 ? 1 : 0}, 25, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      await companion.completePractice(sessionId);

      const event = await mockDB.prepare('SELECT * FROM engagement_events WHERE student_id = ? AND event_type = ?')
        .bind('test-student-id', 'practice_complete')
        .first();

      expect(event).toBeDefined();
      expect(event?.event_type).toBe('practice_complete');

      const eventData = JSON.parse(event?.event_data as string);
      expect(eventData.sessionId).toBe(sessionId);
      expect(eventData.subject).toBe('English');
      expect(eventData.questionsCorrect).toBe(6);
      expect(eventData.questionsTotal).toBe(8);
      expect(eventData.accuracy).toBe(75);
      expect(eventData.duration).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent session', async () => {
      const companion = createCompanion('test-student-id');

      await expect(companion.completePractice('non-existent-session')).rejects.toThrow('Practice session not found');
    });

    it('should throw error for unauthorized access', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'other-student-session';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'other-student-id', 'Math', 5, 0, '${new Date().toISOString()}', 0)
      `);

      await expect(companion.completePractice(sessionId)).rejects.toThrow('Unauthorized');
    });

    it('should throw error for already completed session', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'completed-session';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed, completed_at)
        VALUES ('${sessionId}', 'test-student-id', 'Math', 5, 4, '${new Date().toISOString()}', 1, '${new Date().toISOString()}')
      `);

      await expect(companion.completePractice(sessionId)).rejects.toThrow('Session already completed');
    });

    it('should throw error for incomplete session (unanswered questions)', async () => {
      const companion = createCompanion('test-student-id');
      const sessionId = 'incomplete-session';

      await mockDB.exec(`
        INSERT INTO practice_sessions (id, student_id, subject, questions_total, questions_correct, started_at, completed)
        VALUES ('${sessionId}', 'test-student-id', 'Math', 5, 0, '${new Date().toISOString()}', 0)
      `);

      // Only 3 out of 5 questions answered
      for (let i = 1; i <= 3; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', 'A', 1, 20, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      // Add 2 unanswered questions
      for (let i = 4; i <= 5; i++) {
        await mockDB.exec(`
          INSERT INTO practice_questions (id, session_id, question_text, answer_options, correct_answer, student_answer, is_correct, time_to_answer_seconds, topic, created_at)
          VALUES ('q${i}', '${sessionId}', 'Question ${i}', '["A","B"]', 'A', NULL, NULL, NULL, 'topic${i}', '${new Date().toISOString()}')
        `);
      }

      await expect(companion.completePractice(sessionId)).rejects.toThrow('questions remain unanswered');
    });
  });
});
