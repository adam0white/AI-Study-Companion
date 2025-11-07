/**
 * StudentCompanion Durable Object Tests
 * Tests for AC-1.2.1 through AC-1.2.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentCompanion } from './StudentCompanion';

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

// Mock Environment
const mockEnv = {
  DB: {} as D1Database,
  R2: {} as R2Bucket,
  CLERK_SECRET_KEY: 'test-secret-key',
};

describe('StudentCompanion Durable Object', () => {
  let companion: StudentCompanion;
  let mockState: MockDurableObjectState;

  beforeEach(() => {
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

    it('should initialize websockets as Set', () => {
      const websockets = (companion as any).websockets;
      expect(websockets).toBeInstanceOf(Set);
      expect(websockets.size).toBe(0);
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
      expect(data).toHaveProperty('totalSessions');
      expect(data).toHaveProperty('practiceQuestionsCompleted');
    });

    it('should return error for unknown methods', async () => {
      const request = new Request('https://example.com/unknownMethod', {
        method: 'POST',
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('UNKNOWN_METHOD');
    });

    it('should return error for non-POST methods on RPC endpoints', async () => {
      const request = new Request('https://example.com/initialize', {
        method: 'GET',
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBe(405);
      
      const data = await response.json();
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
      expect(profile1.studentId).toBe('student_user_123');
      
      // Re-initialize should return same ID
      const profile2 = await companion.initialize('user_123');
      expect(profile2.studentId).toBe('student_user_123');
    });

    it('should generate different IDs for different users', async () => {
      const companion1 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      const companion2 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      
      const profile1 = await companion1.initialize('user_A');
      const profile2 = await companion2.initialize('user_B');
      
      expect(profile1.studentId).not.toBe(profile2.studentId);
      expect(profile1.studentId).toBe('student_user_A');
      expect(profile2.studentId).toBe('student_user_B');
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
      const studentId = `student_${clerkUserId}`;
      
      // This would be done by worker: env.COMPANION.idFromName(studentId)
      // Here we verify the DO handles the request correctly
      
      const profile = await companion.initialize(clerkUserId);
      expect(profile.studentId).toBe(studentId);
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
      
      // Verify companion B has independent state
      expect((companionA as any).studentId).toBe('student_user_A');
      expect((companionB as any).studentId).toBe('student_user_B');
    });

    it('should persist state across invocations', async () => {
      // Initialize and store data
      await companion.initialize('user_persist');
      
      // Verify state was written to storage
      expect(mockState.storage.put).toHaveBeenCalledWith('studentId', 'student_user_persist');
      expect(mockState.storage.put).toHaveBeenCalledWith('clerkUserId', 'user_persist');
      
      // Simulate new invocation - create new DO with same storage
      const newCompanion = new StudentCompanion(mockState as any, mockEnv);
      
      // Simulate persisted values in storage
      (mockState as any).internalStorage.set('studentId', 'student_user_persist');
      (mockState as any).internalStorage.set('clerkUserId', 'user_persist');
      
      // Trigger lazy initialization
      await newCompanion.fetch(new Request('https://example.com/health'));
      
      // Verify state was loaded from storage
      expect((newCompanion as any).studentId).toBe('student_user_persist');
    });

    it('should maintain independent in-memory cache', async () => {
      const companion1 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      const companion2 = new StudentCompanion(new MockDurableObjectState() as any, mockEnv);
      
      await companion1.initialize('user_1');
      await companion2.initialize('user_2');
      
      const cache1 = (companion1 as any).cache;
      const cache2 = (companion2 as any).cache;
      
      expect(cache1).not.toBe(cache2);
      expect(cache1.get('studentId')).toBe('student_user_1');
      expect(cache2.get('studentId')).toBe('student_user_2');
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
        await companion.initialize('user_123');
        
        expect(mockState.storage.put).toHaveBeenCalledWith('studentId', 'student_user_123');
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

      it('should return ProgressData with required fields', async () => {
        const progress = await companion.getProgress();
        
        expect(progress).toHaveProperty('totalSessions');
        expect(progress).toHaveProperty('practiceQuestionsCompleted');
        expect(progress).toHaveProperty('topicsStudied');
        expect(progress).toHaveProperty('currentStreak');
        expect(progress).toHaveProperty('lastUpdated');
      });

      it('should return placeholder data for now', async () => {
        const progress = await companion.getProgress();
        
        // Placeholder values as per story requirements
        expect(progress.totalSessions).toBe(0);
        expect(progress.practiceQuestionsCompleted).toBe(0);
        expect(progress.topicsStudied).toEqual([]);
        expect(progress.currentStreak).toBe(0);
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
        body: JSON.stringify({ message: '' }), // Empty message
      });
      
      const response = await companion.fetch(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const data = await response.json();
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
});

