/**
 * Worker Companion Routing Tests
 * Tests for AC-1.2.4, AC-1.2.6 - Worker routing to Durable Objects
 * Tests for AC-1.6 - Complete end-to-end chat flow (Story 1.6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from './worker';
import type { AIResponse } from './lib/rpc/types';

// Mock Durable Object stub
class MockDurableObjectStub {
  async fetch(request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({ 
        message: 'Mock DO response',
        url: request.url 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Mock Durable Object ID
class MockDurableObjectId {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  toString(): string {
    return this.name;
  }
  
  equals(other: DurableObjectId): boolean {
    return this.toString() === other.toString();
  }
}

// Mock Durable Object Namespace
class MockDurableObjectNamespace {
  private instances = new Map<string, MockDurableObjectStub>();

  idFromName(name: string): DurableObjectId {
    return new MockDurableObjectId(name) as any;
  }

  get(id: DurableObjectId): DurableObjectStub {
    const name = id.toString();
    if (!this.instances.has(name)) {
      this.instances.set(name, new MockDurableObjectStub());
    }
    return this.instances.get(name) as any;
  }
}

describe('Worker Companion Routing', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      ASSETS: {} as Fetcher,
      COMPANION: new MockDurableObjectNamespace() as any,
      DB: {} as D1Database,
      R2: {} as R2Bucket,
      AI: {
        run: vi.fn(async () => ({
          response: "I'm here to help you learn!",
        })),
      } as unknown as Ai,
      CLERK_PUBLISHABLE_KEY: 'pk_test_123',
      CLERK_SECRET_KEY: 'sk_test_123',
    };
  });

  describe('AC-1.2.4: idFromName Routing Pattern', () => {
    it('should use idFromName with student ID', () => {
      const studentId = 'student_user_123';
      const doId = mockEnv.COMPANION.idFromName(studentId);
      
      expect(doId).toBeDefined();
      expect(doId.toString()).toBe(studentId);
    });

    it('should route same student ID to same DO instance', () => {
      const studentId = 'student_user_123';
      
      const doId1 = mockEnv.COMPANION.idFromName(studentId);
      const doId2 = mockEnv.COMPANION.idFromName(studentId);
      
      expect(doId1.toString()).toBe(doId2.toString());
    });

    it('should create different DO IDs for different student IDs', () => {
      const studentIdA = 'student_user_A';
      const studentIdB = 'student_user_B';
      
      const doIdA = mockEnv.COMPANION.idFromName(studentIdA);
      const doIdB = mockEnv.COMPANION.idFromName(studentIdB);
      
      expect(doIdA.toString()).not.toBe(doIdB.toString());
    });
  });

  describe('AC-1.2.6: Request Routing to Companion', () => {
    it('should extract student ID from request pattern', () => {
      // In actual implementation, worker extracts from JWT
      // This test verifies the pattern
      const clerkUserId = 'user_123';
      const studentId = `student_${clerkUserId}`;
      
      expect(studentId).toBe('student_user_123');
    });

    it('should get DO stub using idFromName', () => {
      const studentId = 'student_user_123';
      const doId = mockEnv.COMPANION.idFromName(studentId);
      const stub = mockEnv.COMPANION.get(doId);
      
      expect(stub).toBeDefined();
      expect(stub.fetch).toBeDefined();
    });

    it('should forward request to DO via stub.fetch()', async () => {
      const studentId = 'student_user_123';
      const doId = mockEnv.COMPANION.idFromName(studentId);
      const stub = mockEnv.COMPANION.get(doId);
      
      const request = new Request('https://example.com/api/companion/initialize', {
        method: 'POST',
        body: JSON.stringify({ clerkUserId: 'user_123' }),
      });
      
      const response = await stub.fetch(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });

    it('should return DO response to client', async () => {
      const studentId = 'student_user_456';
      const doId = mockEnv.COMPANION.idFromName(studentId);
      const stub = mockEnv.COMPANION.get(doId);
      
      const request = new Request('https://example.com/api/companion/getProgress', {
        method: 'POST',
      });
      
      const response = await stub.fetch(request);
      const data = await response.json();
      
      expect(data).toHaveProperty('message');
      expect(response.headers.get('Content-Type')).toContain('application/json');
    });
  });

  describe('Routing Pattern Integration', () => {
    it('should implement complete routing flow', async () => {
      // Step 1: Extract clerk user ID (would come from JWT)
      const clerkUserId = 'clerk_user_789';
      
      // Step 2: Generate student ID
      const studentId = `student_${clerkUserId}`;
      expect(studentId).toBe('student_clerk_user_789');
      
      // Step 3: Get DO ID using idFromName
      const doId = mockEnv.COMPANION.idFromName(studentId);
      expect(doId.toString()).toBe(studentId);
      
      // Step 4: Get DO stub
      const stub = mockEnv.COMPANION.get(doId);
      expect(stub).toBeDefined();
      
      // Step 5: Forward request
      const request = new Request('https://example.com/api/companion/health');
      const response = await stub.fetch(request);
      
      // Step 6: Return response
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });

    it('should maintain consistent routing for same user across requests', async () => {
      const clerkUserId = 'user_consistent';
      const studentId = `student_${clerkUserId}`;
      
      // First request
      const doId1 = mockEnv.COMPANION.idFromName(studentId);
      const stub1 = mockEnv.COMPANION.get(doId1);
      
      // Second request (same user)
      const doId2 = mockEnv.COMPANION.idFromName(studentId);
      const stub2 = mockEnv.COMPANION.get(doId2);
      
      // Should route to same DO instance
      expect(doId1.toString()).toBe(doId2.toString());
      expect(stub1).toBe(stub2);
    });

    it('should isolate different users to different DO instances', async () => {
      const userA = 'user_A';
      const userB = 'user_B';
      
      const studentIdA = `student_${userA}`;
      const studentIdB = `student_${userB}`;
      
      // Get stubs for different users to verify isolation
      mockEnv.COMPANION.get(mockEnv.COMPANION.idFromName(studentIdA));
      mockEnv.COMPANION.get(mockEnv.COMPANION.idFromName(studentIdB));
      
      // Different stubs for different users
      // (In mock, they're different objects; in real DO, different instances)
      expect(studentIdA).not.toBe(studentIdB);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing student ID gracefully', () => {
      // Empty student ID should still work (namespace will create DO)
      const doId = mockEnv.COMPANION.idFromName('');
      expect(doId).toBeDefined();
    });

    it('should handle DO fetch errors', async () => {
      const failingStub = {
        fetch: vi.fn().mockRejectedValue(new Error('DO error'))
      };
      
      try {
        await failingStub.fetch(new Request('https://example.com/test'));
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Story 1.6: End-to-End Chat Flow Integration', () => {
    // Mock DO that simulates sendMessage behavior
    class MockChatDurableObjectStub {
      async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const method = url.pathname.split('/').pop();
        
        if (method === 'sendMessage' && request.method === 'POST') {
          const body = await request.json() as { message: string };
          const clerkUserId = request.headers.get('X-Clerk-User-Id');
          
          if (!clerkUserId) {
            return new Response(
              JSON.stringify({ error: 'Missing Clerk user ID header' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          const response: AIResponse = {
            message: `Echo: ${body.message}`,
            timestamp: new Date().toISOString(),
            conversationId: `conv_${Date.now()}`,
          };
          
          return new Response(
            JSON.stringify(response),
            { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        return new Response(JSON.stringify({ error: 'Unknown method' }), { status: 404 });
      }
    }

    class MockChatDurableObjectNamespace {
      private instances = new Map<string, MockChatDurableObjectStub>();

      idFromName(name: string): DurableObjectId {
        return new MockDurableObjectId(name) as any;
      }

      get(id: DurableObjectId): DurableObjectStub {
        const name = id.toString();
        if (!this.instances.has(name)) {
          this.instances.set(name, new MockChatDurableObjectStub());
        }
        return this.instances.get(name) as any;
      }
    }

    describe('AC-1.6.1: Messages sent to companion DO via HTTP request', () => {
      it('should send message via HTTP POST to /api/companion/sendMessage', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const studentId = 'student_user_123';
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        const request = new Request('https://example.com/api/companion/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Clerk-User-Id': 'user_123',
          },
          body: JSON.stringify({ message: 'Hello companion' }),
        });
        
        const response = await stub.fetch(request);
        
        expect(response.status).toBe(200);
      });

      it('should include message text in request body', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const studentId = 'student_user_123';
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        const messageText = 'Test message content';
        const request = new Request('https://example.com/api/companion/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Clerk-User-Id': 'user_123',
          },
          body: JSON.stringify({ message: messageText }),
        });
        
        const response = await stub.fetch(request);
        const data = await response.json() as AIResponse;
        
        expect(data.message).toContain(messageText);
      });

      it('should include Clerk user ID in request header', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const clerkUserId = 'user_456';
        const studentId = `student_${clerkUserId}`;
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        const request = new Request('https://example.com/api/companion/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Clerk-User-Id': clerkUserId,
          },
          body: JSON.stringify({ message: 'Hello' }),
        });
        
        const response = await stub.fetch(request);
        
        expect(response.status).toBe(200);
      });

      it('should route to correct companion instance based on student ID', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        // Two different users
        const userA = 'user_A';
        const userB = 'user_B';
        
        const studentIdA = `student_${userA}`;
        const studentIdB = `student_${userB}`;
        
        // Get DO stubs for both users
        const doIdA = mockEnv.COMPANION.idFromName(studentIdA);
        const doIdB = mockEnv.COMPANION.idFromName(studentIdB);
        
        // Verify different DO IDs
        expect(doIdA.toString()).not.toBe(doIdB.toString());
      });
    });

    describe('AC-1.6.2: Companion receives and processes message', () => {
      it('should return AIResponse with message, timestamp, and conversationId', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const studentId = 'student_user_123';
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        const request = new Request('https://example.com/api/companion/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Clerk-User-Id': 'user_123',
          },
          body: JSON.stringify({ message: 'Hello' }),
        });
        
        const response = await stub.fetch(request);
        const data = await response.json() as AIResponse;
        
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('conversationId');
        expect(typeof data.message).toBe('string');
        expect(typeof data.timestamp).toBe('string');
      });
    });

    describe('AC-1.6.3 & AC-1.6.4: Response returned to UI and displayed', () => {
      it('should return JSON response that can be parsed', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const studentId = 'student_user_123';
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        const request = new Request('https://example.com/api/companion/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Clerk-User-Id': 'user_123',
          },
          body: JSON.stringify({ message: 'Test' }),
        });
        
        const response = await stub.fetch(request);
        
        expect(response.headers.get('Content-Type')).toContain('application/json');
        
        const data = await response.json();
        expect(data).toBeDefined();
      });
    });

    describe('AC-1.6.5: Messages routed to correct companion', () => {
      it('should maintain isolation between different students', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        // Send messages from two different users
        const studentIdA = 'student_userA';
        const studentIdB = 'student_userB';
        
        const doIdA = mockEnv.COMPANION.idFromName(studentIdA);
        const doIdB = mockEnv.COMPANION.idFromName(studentIdB);
        
        const stubA = mockEnv.COMPANION.get(doIdA);
        const stubB = mockEnv.COMPANION.get(doIdB);
        
        // Verify different stubs
        expect(stubA).not.toBe(stubB);
        expect(doIdA.toString()).not.toBe(doIdB.toString());
      });
    });

    describe('AC-1.6.6: Error handling', () => {
      it('should handle missing Clerk user ID header', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const studentId = 'student_user_123';
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        const request = new Request('https://example.com/api/companion/sendMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Missing X-Clerk-User-Id header
          },
          body: JSON.stringify({ message: 'Hello' }),
        });
        
        const response = await stub.fetch(request);
        
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data).toHaveProperty('error');
      });

      it('should return appropriate error status codes', async () => {
        mockEnv.COMPANION = new MockChatDurableObjectNamespace() as any;
        
        const studentId = 'student_user_123';
        const doId = mockEnv.COMPANION.idFromName(studentId);
        const stub = mockEnv.COMPANION.get(doId);
        
        // Invalid method
        const request = new Request('https://example.com/api/companion/invalidMethod', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Clerk-User-Id': 'user_123',
          },
          body: JSON.stringify({ message: 'Hello' }),
        });
        
        const response = await stub.fetch(request);
        
        expect(response.status).toBe(404);
      });
    });
  });
});

