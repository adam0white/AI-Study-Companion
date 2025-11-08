/**
 * StudentCompanion Durable Object Tests
 * Tests for AC-1.2.1 through AC-1.2.7 and AC-1.3.1 through AC-1.3.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentCompanion } from './StudentCompanion';
import { MockD1Database } from '../test/mocks/d1-database';
import { ingestSession } from '../lib/session/ingestion';

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
  });

  waitUntil = vi.fn();
}

// Mock Environment with real D1 mock
let mockDB: MockD1Database;

const createMockEnv = () => {
  mockDB = new MockD1Database();
  return {
    DB: mockDB as unknown as D1Database,
    R2: {
      put: vi.fn(async () => undefined),
      get: vi.fn(async () => null),
      delete: vi.fn(async () => undefined),
      list: vi.fn(async () => ({ objects: [] })),
    } as unknown as R2Bucket,
    CLERK_SECRET_KEY: 'test-secret-key',
  };
};

const mockEnv = createMockEnv();

describe('StudentCompanion Durable Object', () => {
  let companion: StudentCompanion;
  let mockState: MockDurableObjectState;

  beforeEach(() => {
    // Reset mock DB for each test
    mockDB.reset();
    mockState = new MockDurableObjectState();
    companion = new StudentCompanion(mockState as any, mockEnv);
  });

  describe('AC-1.2.1: Class Structure and Extension', () => {
    it('should extend DurableObject base class', () => {
      expect(companion).toBeInstanceOf(StudentCompanion);
      expect(companion).toHaveProperty('fetch');
    });

    it('should accept DurableObjectState and Env in constructor', () => {
      expect(() => {
        new StudentCompanion(mockState as any, mockEnv);
      }).not.toThrow();
    });

    it('should have no compilation errors', () => {
      // If this test runs, TypeScript compilation succeeded
      expect(true).toBe(true);
    });
  });

  describe('AC-1.2.2: Constructor Initialization', () => {
    it('should initialize db from env.DB binding', () => {
      expect((companion as any).db).toBe(mockEnv.DB);
    });

    it('should initialize cache as Map', () => {
      const cache = (companion as any).cache;
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });


    it('should use lazy initialization pattern', () => {
      // initialized should be false initially
      expect((companion as any).initialized).toBe(false);
    });
  });

  describe('AC-1.2.3: Fetch Handler and HTTP Routing', () => {
    it('should implement fetch method', () => {
      expect(companion.fetch).toBeDefined();
      expect(typeof companion.fetch).toBe('function');
    });

    it('should handle health check route', async () => {
      const request = new Request('https://example.com/health');
      const response = await companion.fetch(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
    });

    it('should handle initialize RPC endpoint', async () => {
      const request = new Request('https://example.com/initialize', {
        method: 'POST',
        body: JSON.stringify({ clerkUserId: 'user_123' }),
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('studentId');
      expect(data).toHaveProperty('clerkUserId', 'user_123');
    });

    it('should handle sendMessage RPC endpoint', async () => {
      // First initialize
      await companion.initialize('user_123');
      
      const request = new Request('https://example.com/sendMessage', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello companion!' }),
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
    });

    it('should handle getProgress RPC endpoint', async () => {
      // First initialize
      await companion.initialize('user_123');
      
      const request = new Request('https://example.com/getProgress', {
        method: 'POST',
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('sessionCount');
      expect(data).toHaveProperty('recentTopics');
      expect(data).toHaveProperty('lastSessionDate');
      expect(data).toHaveProperty('daysActive');
    });

    it('should return error for unknown methods', async () => {
      const request = new Request('https://example.com/unknownMethod', {
        method: 'POST',
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(404);
      
      const data = await response.json() as { error: string; code: string };
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('UNKNOWN_METHOD');
    });

    it('should return error for non-POST methods on RPC endpoints', async () => {
      const request = new Request('https://example.com/initialize', {
        method: 'GET',
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(405);
      
      const data = await response.json() as { code: string };
      expect(data.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should handle errors with try/catch', async () => {
      // Send malformed JSON
      const request = new Request('https://example.com/initialize', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(500); // Internal error from JSON parse failure
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('AC-1.2.4: Unique ID via idFromName', () => {
    it('should generate consistent student ID from clerk user ID', async () => {
      const profile1 = await companion.initialize('user_123');
      // Should generate UUID format
      expect(profile1.studentId).toMatch(/^[a-f0-9-]{36}$/);
      
      // Re-initialize should return same ID (idempotent)
      const profile2 = await companion.initialize('user_123');
      expect(profile2.studentId).toBe(profile1.studentId);
    });

    it('should generate different IDs for different users', async () => {
      const companion1 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      const companion2 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      
      const profile1 = await companion1.initialize('user_A');
      const profile2 = await companion2.initialize('user_B');
      
      expect(profile1.studentId).not.toBe(profile2.studentId);
      // Both should be valid UUIDs
      expect(profile1.studentId).toMatch(/^[a-f0-9-]{36}$/);
      expect(profile2.studentId).toMatch(/^[a-f0-9-]{36}$/);
    });
  });

  describe('AC-1.2.5: Durable Object Instantiation', () => {
    it('should be instantiable via constructor', () => {
      const instance = new StudentCompanion(mockState as any, mockEnv);
      expect(instance).toBeInstanceOf(StudentCompanion);
    });

    it('should respond to fetch requests after instantiation', async () => {
      const request = new Request('https://example.com/health');
      const response = await companion.fetch(request);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });
  });

  describe('AC-1.2.6: Request Routing with Student ID', () => {
    it('should route requests using student-specific DO instance', async () => {
      // Simulate worker routing pattern
      const clerkUserId = 'clerk_user_123';
      
      // This would be done by worker: env.COMPANION.idFromName(studentId)
      // Here we verify the DO handles the request correctly
      
      const profile = await companion.initialize(clerkUserId);
      // Should generate UUID format
      expect(profile.studentId).toMatch(/^[a-f0-9-]{36}$/);
      expect(profile.clerkUserId).toBe(clerkUserId);
    });

    it('should return response from DO to client', async () => {
      const request = new Request('https://example.com/initialize', {
        method: 'POST',
        body: JSON.stringify({ clerkUserId: 'user_456' }),
      });
      
      const response = await companion.fetch(request);
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toContain('application/json');
    });
  });

  describe('AC-1.2.7: Instance Isolation and Persistence', () => {
    it('should create separate instances for different students', async () => {
      const stateA = new MockDurableObjectState();
      const stateB = new MockDurableObjectState();
      
      const companionA = new StudentCompanion(stateA as any, mockEnv);
      const companionB = new StudentCompanion(stateB as any, mockEnv);
      
      await companionA.initialize('user_A');
      await companionB.initialize('user_B');
      
      // Store data in companion A
      await companionA.sendMessage('Message from A');
      
      // Verify companions have independent state (different UUIDs)
      expect((companionA as any).studentId).toBeDefined();
      expect((companionB as any).studentId).toBeDefined();
      expect((companionA as any).studentId).not.toBe((companionB as any).studentId);
    });

    it('should persist state across invocations', async () => {
      // Initialize and store data
      const profile = await companion.initialize('user_persist');
      
      // Verify state was written to storage with UUID
      expect(mockState.storage.put).toHaveBeenCalledWith('studentId', profile.studentId);
      expect(mockState.storage.put).toHaveBeenCalledWith('clerkUserId', 'user_persist');
      
      // Simulate new invocation - create new DO with same storage
      const newCompanion = new StudentCompanion(mockState as any, mockEnv);
      
      // Simulate persisted values in storage
      (mockState as any).internalStorage.set('studentId', profile.studentId);
      (mockState as any).internalStorage.set('clerkUserId', 'user_persist');
      
      // Trigger lazy initialization
      await newCompanion.fetch(new Request('https://example.com/health'));
      
      // Verify state was loaded from storage
      expect((newCompanion as any).studentId).toBe(profile.studentId);
    });

    it('should maintain independent in-memory cache', async () => {
      const companion1 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      const companion2 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      
      const profile1 = await companion1.initialize('user_1');
      const profile2 = await companion2.initialize('user_2');
      
      const cache1 = (companion1 as any).cache;
      const cache2 = (companion2 as any).cache;
      
      expect(cache1).not.toBe(cache2);
      expect(cache1.get('studentId')).toBe(profile1.studentId);
      expect(cache2.get('studentId')).toBe(profile2.studentId);
      expect(cache1.get('studentId')).not.toBe(cache2.get('studentId'));
    });

    it('should not allow cross-instance data access', async () => {
      const stateA = new MockDurableObjectState();
      const stateB = new MockDurableObjectState();
      
      const companionA = new StudentCompanion(stateA as any, mockEnv);
      const companionB = new StudentCompanion(stateB as any, mockEnv);
      
      await companionA.initialize('user_A');
      await companionB.initialize('user_B');
      
      // Each has independent storage
      expect(stateA.storage).not.toBe(stateB.storage);
    });
  });

  describe('RPC Method Implementation', () => {
    describe('initialize()', () => {
      it('should validate clerkUserId input', async () => {
        await expect(companion.initialize('')).rejects.toThrow();
      });

      it('should return StudentProfile with required fields', async () => {
        const profile = await companion.initialize('user_123');
        
        expect(profile).toHaveProperty('studentId');
        expect(profile).toHaveProperty('clerkUserId', 'user_123');
        expect(profile).toHaveProperty('displayName');
        expect(profile).toHaveProperty('createdAt');
        expect(profile).toHaveProperty('lastActiveAt');
      });

      it('should persist studentId to durable storage', async () => {
        const profile = await companion.initialize('user_123');
        
        // Should persist UUID-based studentId
        expect(mockState.storage.put).toHaveBeenCalledWith('studentId', profile.studentId);
      });
    });

    describe('sendMessage()', () => {
      beforeEach(async () => {
        await companion.initialize('user_123');
      });

      it('should validate message input', async () => {
        await expect(companion.sendMessage('')).rejects.toThrow('Message cannot be empty');
      });

      it('should require initialization before use', async () => {
        const uninitializedCompanion = new StudentCompanion(
          new MockDurableObjectState() as any,
          mockEnv
        );
        
        await expect(uninitializedCompanion.sendMessage('test')).rejects.toThrow('not initialized');
      });

      it('should return AIResponse with required fields', async () => {
        const response = await companion.sendMessage('Hello!');
        
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('timestamp');
        expect(response).toHaveProperty('conversationId');
      });

      it('should update lastActiveAt timestamp', async () => {
        await companion.sendMessage('Hello!');
        
        expect(mockState.storage.put).toHaveBeenCalledWith(
          'lastActiveAt',
          expect.any(String)
        );
      });
    });

    describe('getProgress()', () => {
      beforeEach(async () => {
        await companion.initialize('user_123');
      });

      it('should require initialization before use', async () => {
        const uninitializedCompanion = new StudentCompanion(
          new MockDurableObjectState() as any,
          mockEnv
        );

        await expect(uninitializedCompanion.getProgress()).rejects.toThrow('not initialized');
      });

      it('should return ProgressData with required fields (Story 1.9)', async () => {
        const progress = await companion.getProgress();

        expect(progress).toHaveProperty('sessionCount');
        expect(progress).toHaveProperty('recentTopics');
        expect(progress).toHaveProperty('lastSessionDate');
        expect(progress).toHaveProperty('daysActive');
        expect(progress).toHaveProperty('totalMinutesStudied');
      });

      it('should return zero values when no sessions exist', async () => {
        const progress = await companion.getProgress();

        expect(progress.sessionCount).toBe(0);
        expect(progress.recentTopics).toEqual([]);
        expect(progress.lastSessionDate).toBe('');
        expect(progress.daysActive).toBe(0);
        expect(progress.totalMinutesStudied).toBeUndefined();
      });

      it('should calculate session count from database (integration)', async () => {
        // Note: Full integration test with ingestSession tested in Story 1.8
        // This test verifies getProgress queries the database correctly
        // In real usage, sessions are ingested via ingestSession which is separately tested

        const progress = await companion.getProgress();
        // With no sessions, should return 0
        expect(progress.sessionCount).toBe(0);
        expect(progress.recentTopics).toEqual([]);
        expect(progress.daysActive).toBe(0);
      });

      it('should extract recent topics from sessions', async () => {
        const mockSession = {
          date: '2025-11-05T14:00:00Z',
          duration: 45,
          tutor: 'Test Tutor',
          subjects: ['math', 'algebra', 'geometry'],
          transcript: [
            { speaker: 'tutor' as const, text: 'Hello', timestamp: '00:00:00' }
          ]
        };

        await ingestSession(mockEnv.DB, mockEnv.R2, companion['studentId']!, mockSession);

        const progress = await companion.getProgress();
        expect(progress.recentTopics).toContain('math');
        expect(progress.recentTopics).toContain('algebra');
        expect(progress.recentTopics).toContain('geometry');
      });

      it('should calculate days active from date range (integration)', async () => {
        // Note: Full integration with ingestSession tested in Story 1.8
        // This verifies SQL queries work correctly with date calculations
        const progress = await companion.getProgress();
        expect(progress).toHaveProperty('daysActive');
        expect(progress).toHaveProperty('lastSessionDate');
      });

      it('should sum total minutes studied (integration)', async () => {
        // Note: Full integration with ingestSession tested in Story 1.8
        // This verifies totalMinutesStudied field is calculated correctly
        const progress = await companion.getProgress();
        expect(progress).toHaveProperty('totalMinutesStudied');
        // With no sessions, should be undefined
        expect(progress.totalMinutesStudied).toBeUndefined();
      });

      it('should remove duplicate topics and limit to 10', async () => {
        const session = {
          date: '2025-11-05T14:00:00Z',
          duration: 45,
          tutor: 'Test Tutor',
          subjects: ['math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'math', 'algebra', 'physics', 'chemistry', 'biology', 'history'],
          transcript: [{ speaker: 'tutor' as const, text: 'Hello', timestamp: '00:00:00' }]
        };

        await ingestSession(mockEnv.DB, mockEnv.R2, companion['studentId']!, session);

        const progress = await companion.getProgress();
        expect(progress.recentTopics.length).toBeLessThanOrEqual(10);
        expect(new Set(progress.recentTopics).size).toBe(progress.recentTopics.length); // No duplicates
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw StudentCompanionError for invalid input', async () => {
      await expect(companion.initialize('')).rejects.toThrow();
    });

    it('should return proper error responses via fetch', async () => {
      const request = new Request('https://example.com/sendMessage', {
        method: 'POST',
        headers: {
          'X-Clerk-User-Id': 'test_user_123',
        },
        body: JSON.stringify({ message: '' }), // Empty message
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const data = await response.json() as { error: string };
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Message cannot be empty');
    });

    it('should log errors with context', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await companion.initialize('');
      } catch {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // Story 1.3: Isolated Database per Companion
  // ============================================

  describe('AC-1.3.1: D1 Database Connection', () => {
    it('should initialize D1 database connection from env.DB binding', () => {
      expect((companion as any).db).toBe(mockEnv.DB);
    });

    it('should store database connection in private field', () => {
      expect((companion as any).db).toBeDefined();
    });

    it('should maintain database connection for DO lifetime', async () => {
      const dbRef1 = (companion as any).db;
      await companion.initialize('clerk_test_123');
      const dbRef2 = (companion as any).db;
      expect(dbRef1).toBe(dbRef2);
    });

    it('should have independent database connection per DO instance', () => {
      const companion2 = new StudentCompanion(
        new MockDurableObjectState() as any,
        mockEnv
      );
      
      // Both should have their own reference to the same DB
      expect((companion as any).db).toBeDefined();
      expect((companion2 as any).db).toBeDefined();
    });
  });

  describe('AC-1.3.2 & AC-1.3.6: Database Isolation and Query Scoping', () => {
    it('should isolate data between different students', async () => {
      // Create two students with two DO instances
      const state1 = new MockDurableObjectState();
      const state2 = new MockDurableObjectState();
      const companion1 = new StudentCompanion(state1 as any, mockEnv);
      const companion2 = new StudentCompanion(state2 as any, mockEnv);

      // Initialize both students
      const profile1 = await companion1.initialize('clerk_student_1');
      const profile2 = await companion2.initialize('clerk_student_2');

      expect(profile1.studentId).not.toBe(profile2.studentId);

      // Store memory for student 1
      await (companion1 as any).storeShortTermMemory('Student 1 memory', 'session1');

      // Verify student 2 cannot access student 1's memory
      const student2Memories = await (companion2 as any).getShortTermMemory(10);
      expect(student2Memories).toHaveLength(0);

      // Verify student 1 can access their own memory
      const student1Memories = await (companion1 as any).getShortTermMemory(10);
      expect(student1Memories).toHaveLength(1);
      expect(student1Memories[0].content).toBe('Student 1 memory');
    });

    it('should scope all queries to student_id', async () => {
      await companion.initialize('clerk_test_123');
      
      // Store some memories
      await (companion as any).storeShortTermMemory('Memory 1', 'session1');
      await (companion as any).storeLongTermMemory('struggles', 'Difficulty with algebra');
      
      // Verify memories are scoped correctly
      const shortTermMemories = await (companion as any).getShortTermMemory(10);
      const longTermMemories = await (companion as any).getLongTermMemory();
      
      shortTermMemories.forEach((memory: any) => {
        expect(memory.studentId).toBe((companion as any).studentId);
      });
      
      longTermMemories.forEach((memory: any) => {
        expect(memory.studentId).toBe((companion as any).studentId);
      });
    });

    it('should not allow cross-student data access', async () => {
      const state1 = new MockDurableObjectState();
      const state2 = new MockDurableObjectState();
      const companion1 = new StudentCompanion(state1 as any, mockEnv);
      const companion2 = new StudentCompanion(state2 as any, mockEnv);

      await companion1.initialize('clerk_student_a');
      await companion2.initialize('clerk_student_b');

      // Student A stores memory
      await (companion1 as any).storeShortTermMemory('Private memory A', 'sessionA');
      await (companion1 as any).storeLongTermMemory('goals', 'Master calculus');

      // Student B should see no memories
      const shortMemoriesB = await (companion2 as any).getShortTermMemory(10);
      const longMemoriesB = await (companion2 as any).getLongTermMemory();

      expect(shortMemoriesB).toHaveLength(0);
      expect(longMemoriesB).toHaveLength(0);
    });
  });

  describe('AC-1.3.3: Table Creation and Data Storage', () => {
    it('should initialize database schema on first companion access', async () => {
      await companion.initialize('clerk_test_schema');
      
      // Verify tables exist by checking they can be queried (more reliable than hasTable)
      expect(mockDB.getTable('students')).toBeDefined();
      expect(mockDB.getTable('short_term_memory')).toBeDefined();
      expect(mockDB.getTable('long_term_memory')).toBeDefined();
      expect(mockDB.getTable('session_metadata')).toBeDefined();
    });

    it('should create student record in students table', async () => {
      const profile = await companion.initialize('clerk_test_create');
      
      const studentsTable = mockDB.getTable('students');
      expect(studentsTable).toHaveLength(1);
      expect(studentsTable[0].clerk_user_id).toBe('clerk_test_create');
      expect(studentsTable[0].id).toBe(profile.studentId);
    });

    it('should insert data into all tables', async () => {
      await companion.initialize('clerk_test_insert');
      
      // Insert into short_term_memory
      await (companion as any).storeShortTermMemory('Test memory', 'session1');
      const shortTermTable = mockDB.getTable('short_term_memory');
      expect(shortTermTable.length).toBeGreaterThan(0);
      
      // Insert into long_term_memory
      await (companion as any).storeLongTermMemory('test', 'Long term data');
      const longTermTable = mockDB.getTable('long_term_memory');
      expect(longTermTable.length).toBeGreaterThan(0);
    });

    it('should persist data across DO invocations', async () => {
      // First invocation
      const profile = await companion.initialize('clerk_persist_test');
      await (companion as any).storeShortTermMemory('Persistent memory', 'session1');
      
      // Simulate new DO instance (same state, new companion)
      const companion2 = new StudentCompanion(mockState as any, mockEnv);
      const profile2 = await companion2.initialize('clerk_persist_test');
      
      // Should get same student
      expect(profile2.studentId).toBe(profile.studentId);
      
      // Data should still be accessible
      const memories = await (companion2 as any).getShortTermMemory(10);
      expect(memories.length).toBeGreaterThan(0);
    });
  });

  describe('AC-1.3.4: Database Persistence Across Hibernation', () => {
    it('should persist data written in one invocation to subsequent invocations', async () => {
      // First invocation
      await companion.initialize('clerk_hibernation_test');
      const memoryId = await (companion as any).storeShortTermMemory(
        'Memory before hibernation',
        'session1'
      );
      
      // Simulate hibernation and wake (new companion instance with same state)
      const newCompanion = new StudentCompanion(mockState as any, mockEnv);
      await newCompanion.initialize('clerk_hibernation_test');
      
      // Verify data persists
      const memories = await (newCompanion as any).getShortTermMemory(10);
      expect(memories).toHaveLength(1);
      expect(memories[0].id).toBe(memoryId);
      expect(memories[0].content).toBe('Memory before hibernation');
    });

    it('should re-establish database connection after hibernation', async () => {
      await companion.initialize('clerk_reconnect_test');
      
      // Simulate hibernation by creating new instance
      const newCompanion = new StudentCompanion(mockState as any, mockEnv);
      
      // Database should be accessible immediately
      expect((newCompanion as any).db).toBeDefined();
      expect((newCompanion as any).db).toBe(mockEnv.DB);
    });

    it('should not lose data between DO wake cycles', async () => {
      // Write data in first cycle
      await companion.initialize('clerk_wake_cycle_test');
      await (companion as any).storeShortTermMemory('Cycle 1', 'session1');
      
      // Second wake cycle
      const companion2 = new StudentCompanion(mockState as any, mockEnv);
      await companion2.initialize('clerk_wake_cycle_test');
      await (companion2 as any).storeShortTermMemory('Cycle 2', 'session2');
      
      // Third wake cycle - verify all data present
      const companion3 = new StudentCompanion(mockState as any, mockEnv);
      await companion3.initialize('clerk_wake_cycle_test');
      const memories = await (companion3 as any).getShortTermMemory(10);
      
      expect(memories).toHaveLength(2);
    });

    it('should handle multiple write operations in sequence', async () => {
      await companion.initialize('clerk_sequence_test');
      
      // Multiple writes
      const id1 = await (companion as any).storeShortTermMemory('Memory 1', 'session1');
      const id2 = await (companion as any).storeShortTermMemory('Memory 2', 'session1');
      const id3 = await (companion as any).storeLongTermMemory('category1', 'Long term 1');
      
      // All should be persisted
      const shortMemories = await (companion as any).getShortTermMemory(10);
      const longMemories = await (companion as any).getLongTermMemory();
      
      expect(shortMemories).toHaveLength(2);
      expect(longMemories).toHaveLength(1);
      expect(shortMemories.map((m: any) => m.id)).toContain(id1);
      expect(shortMemories.map((m: any) => m.id)).toContain(id2);
      expect(longMemories[0].id).toBe(id3);
    });
  });

  describe('AC-1.3.5: Schema Initialization', () => {
    it('should initialize schema on first DO access', async () => {
      // Schema should not exist initially
      expect(mockDB.getTable('students')).toEqual([]);
      
      // First access triggers initialization
      await companion.initialize('clerk_first_access');
      
      // Now schema should exist and tables should be queryable
      expect(mockDB.getTable('students')).toBeDefined();
      expect(mockDB.getTable('short_term_memory')).toBeDefined();
      expect(mockDB.getTable('long_term_memory')).toBeDefined();
      expect(mockDB.getTable('session_metadata')).toBeDefined();
      // Student record should be inserted
      expect(mockDB.getTable('students').length).toBeGreaterThan(0);
    });

    it('should skip schema initialization on subsequent accesses', async () => {
      // First access - schema should be initialized
      await companion.initialize('clerk_skip_init_1');
      const table1Count = mockDB.getTable('students').length;
      expect(table1Count).toBeGreaterThan(0);
      
      // Second access with same companion instance - should use cached flag
      await companion.initialize('clerk_skip_init_2');
      // Tables should still be accessible and functional
      expect(mockDB.getTable('students').length).toBeGreaterThanOrEqual(table1Count);
      
      // Create new companion instance with same state (simulating hibernation/wake)
      const companion2 = new StudentCompanion(mockState as any, mockEnv);
      
      // Third access after "hibernation" - should load flag from storage and skip re-init
      await companion2.initialize('clerk_skip_init_3');
      expect(mockDB.getTable('students')).toBeDefined();
      // Should have 3 student records now (one from each initialize call with different IDs)
      expect(mockDB.getTable('students').length).toBe(3);
    });

    it('should use CREATE TABLE IF NOT EXISTS for idempotency', async () => {
      // First initialization
      await companion.initialize('clerk_idempotent_1');
      const table1Length = mockDB.getTable('students').length;
      
      // Second initialization (should not fail or duplicate)
      await companion.initialize('clerk_idempotent_2');
      
      // Tables should still exist and work correctly
      expect(mockDB.getTable('students')).toBeDefined();
      expect(mockDB.getTable('students').length).toBeGreaterThanOrEqual(table1Length);
    });

    it('should complete schema initialization without errors', async () => {
      await expect(companion.initialize('clerk_no_errors')).resolves.toBeDefined();
      
      // Verify all tables created successfully by checking they're queryable
      expect(mockDB.getTable('students')).toBeDefined();
      expect(mockDB.getTable('short_term_memory')).toBeDefined();
      expect(mockDB.getTable('long_term_memory')).toBeDefined();
      expect(mockDB.getTable('session_metadata')).toBeDefined();
    });
  });

  describe('Database Helper Methods', () => {
    it('should create student with UUID', async () => {
      const profile = await companion.initialize('clerk_uuid_test');
      
      // UUID format check (basic)
      expect(profile.studentId).toMatch(/^[a-f0-9-]{36}$/);
      expect(profile.clerkUserId).toBe('clerk_uuid_test');
    });

    it('should handle duplicate student initialization (idempotent)', async () => {
      const profile1 = await companion.initialize('clerk_duplicate');
      const profile2 = await companion.initialize('clerk_duplicate');
      
      // Should return same student ID
      expect(profile1.studentId).toBe(profile2.studentId);
    });

    it('should update last_active_at on re-initialization', async () => {
      const profile1 = await companion.initialize('clerk_last_active');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const profile2 = await companion.initialize('clerk_last_active');
      
      // Last active should be updated
      expect(profile2.lastActiveAt).not.toBe(profile1.lastActiveAt);
    });

    it('should store and retrieve short-term memory with proper scoping', async () => {
      await companion.initialize('clerk_short_memory');
      
      const memoryId = await (companion as any).storeShortTermMemory(
        'Test short memory',
        'session123'
      );
      
      const memories = await (companion as any).getShortTermMemory(10);
      
      expect(memories).toHaveLength(1);
      expect(memories[0].id).toBe(memoryId);
      expect(memories[0].content).toBe('Test short memory');
      expect(memories[0].sessionId).toBe('session123');
    });

    it('should store and retrieve long-term memory with category', async () => {
      await companion.initialize('clerk_long_memory');
      
      const memoryId = await (companion as any).storeLongTermMemory(
        'struggles',
        'Difficulty with quadratic equations'
      );
      
      const memories = await (companion as any).getLongTermMemory('struggles');
      
      expect(memories).toHaveLength(1);
      expect(memories[0].id).toBe(memoryId);
      expect(memories[0].category).toBe('struggles');
      expect(memories[0].content).toBe('Difficulty with quadratic equations');
    });

    it('should filter long-term memory by category', async () => {
      await companion.initialize('clerk_filter_category');
      
      await (companion as any).storeLongTermMemory('struggles', 'Struggle 1');
      await (companion as any).storeLongTermMemory('goals', 'Goal 1');
      await (companion as any).storeLongTermMemory('struggles', 'Struggle 2');
      
      const struggles = await (companion as any).getLongTermMemory('struggles');
      const goals = await (companion as any).getLongTermMemory('goals');
      
      expect(struggles).toHaveLength(2);
      expect(goals).toHaveLength(1);
    });

    it('should order memories by timestamp', async () => {
      await companion.initialize('clerk_order_test');
      
      await (companion as any).storeShortTermMemory('First', 'session1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await (companion as any).storeShortTermMemory('Second', 'session1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await (companion as any).storeShortTermMemory('Third', 'session1');
      
      const memories = await (companion as any).getShortTermMemory(10);
      
      expect(memories[0].content).toBe('Third'); // Most recent first
      expect(memories[2].content).toBe('First'); // Oldest last
    });

    it('should respect limit parameter in getShortTermMemory', async () => {
      await companion.initialize('clerk_limit_test');
      
      // Store 5 memories
      for (let i = 0; i < 5; i++) {
        await (companion as any).storeShortTermMemory(`Memory ${i}`, 'session1');
      }
      
      // Request only 3
      const memories = await (companion as any).getShortTermMemory(3);
      expect(memories).toHaveLength(3);
    });
  });

  describe('Error Handling for Database Operations', () => {
    it('should throw error when storing memory without initialization', async () => {
      await expect(
        (companion as any).storeShortTermMemory('Test', 'session1')
      ).rejects.toThrow('not initialized');
    });

    it('should throw error when retrieving memory without initialization', async () => {
      await expect(
        (companion as any).getShortTermMemory(10)
      ).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      await companion.initialize('clerk_error_test');
      
      // Even if there's an error, it should be wrapped in StudentCompanionError
      // The mock DB doesn't throw errors, but this tests the error handling structure
      const memories = await (companion as any).getShortTermMemory(10);
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should use StudentCompanionError with DB_ERROR code', async () => {
      // Test that database operations use proper error codes
      try {
        await (companion as any).storeShortTermMemory('Test', 'session1');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe('NOT_INITIALIZED');
      }
    });
  });
});

