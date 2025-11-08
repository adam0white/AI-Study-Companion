/**
 * Authentication utility tests
 * Story 1.11: Integrate Real Clerk Authentication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jose library BEFORE importing auth
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => ({
    /* mock JWKS */
  })),
}));

import { jwtVerify } from 'jose';
import { extractTokenFromHeader, requireAuth, getOrCreateStudentId } from './auth';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('extractTokenFromHeader', () => {
  it('extracts bearer token from Authorization header', () => {
    const request = new Request('https://test.com', {
      headers: {
        Authorization: 'Bearer test-token-123',
      },
    });

    const token = extractTokenFromHeader(request);
    expect(token).toBe('test-token-123');
  });

  it('returns null when no Authorization header', () => {
    const request = new Request('https://test.com');
    const token = extractTokenFromHeader(request);
    expect(token).toBeNull();
  });

  it('returns null for malformed Authorization header', () => {
    const request = new Request('https://test.com', {
      headers: {
        Authorization: 'InvalidFormat',
      },
    });

    const token = extractTokenFromHeader(request);
    expect(token).toBeNull();
  });

  it('handles case-insensitive bearer prefix', () => {
    const request = new Request('https://test.com', {
      headers: {
        Authorization: 'bearer test-token-123',
      },
    });

    const token = extractTokenFromHeader(request);
    expect(token).toBe('test-token-123');
  });
});

describe('getOrCreateStudentId', () => {
  it('returns existing student ID if found', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'existing-uuid' }),
      run: vi.fn(),
    } as any;

    const studentId = await getOrCreateStudentId('clerk_user_123', mockDb);

    expect(studentId).toBe('existing-uuid');
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT id FROM students WHERE clerk_user_id = ?'
    );
    expect(mockDb.bind).toHaveBeenCalledWith('clerk_user_123');
  });

  it('creates new student if not found', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null), // Student doesn't exist
      run: vi.fn().mockResolvedValue({}),
    } as any;

    const studentId = await getOrCreateStudentId('clerk_user_456', mockDb);

    // Should be a valid UUID
    expect(studentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Should have inserted new student
    expect(mockDb.run).toHaveBeenCalled();
  });
});

describe('requireAuth', () => {
  it('returns 401 when no token provided', async () => {
    const request = new Request('https://test.com');
    const env = {
      CLERK_PUBLISHABLE_KEY: 'pk_test_example',
      DB: {} as any,
      COMPANION: {} as any,
      R2: {} as any,
    };

    const result = await requireAuth(request, env);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    const request = new Request('https://test.com', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });
    const env = {
      CLERK_PUBLISHABLE_KEY: 'pk_test_example',
      DB: {} as any,
      COMPANION: {} as any,
      R2: {} as any,
    };

    // Mock jwtVerify to throw error
    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));

    const result = await requireAuth(request, env);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('validates JWT token is required', async () => {
    const request = new Request('https://test.com', {
      headers: {
        Authorization: 'Bearer some-token',
      },
    });

    const env = {
      CLERK_PUBLISHABLE_KEY: 'pk_test_example',
      DB: {} as any,
      COMPANION: {} as any,
      R2: {} as any,
    };

    // Mock jwtVerify to fail (simulating invalid token)
    vi.mocked(jwtVerify).mockRejectedValue(new Error('JWT verification failed'));

    const result = await requireAuth(request, env);

    // Should return 401 error response for invalid tokens
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });
});
