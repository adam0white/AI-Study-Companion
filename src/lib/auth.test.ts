/**
 * Authentication utility tests
 */

import { describe, it, expect } from 'vitest';
import { validateClerkJWT, extractTokenFromHeader } from './auth';

describe('extractTokenFromHeader', () => {
  it('extracts bearer token from Authorization header', () => {
    const request = new Request('https://test.com', {
      headers: {
        'Authorization': 'Bearer test-token-123',
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
        'Authorization': 'InvalidFormat',
      },
    });
    
    const token = extractTokenFromHeader(request);
    expect(token).toBeNull();
  });
});

describe('validateClerkJWT (INSECURE - dev only)', () => {
  it('returns null for empty token', async () => {
    const result = await validateClerkJWT('', 'secret');
    expect(result).toBeNull();
  });

  it('returns null for malformed token', async () => {
    const result = await validateClerkJWT('not-a-jwt', 'secret');
    expect(result).toBeNull();
  });

  it('decodes valid JWT structure WITHOUT verifying signature', async () => {
    // ⚠️ This test demonstrates the security flaw - any token is accepted
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: 'user_123',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      sid: 'session_456',
    })).toString('base64url');
    const signature = 'FORGED-SIGNATURE'; // ⚠️ This should fail but doesn't
    const token = `${header}.${payload}.${signature}`;

    const result = await validateClerkJWT(token, 'secret');
    
    // ⚠️ SECURITY ISSUE: Forged token is accepted
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('user_123');
    expect(result?.sessionId).toBe('session_456');
  });

  it('rejects expired tokens', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: 'user_123',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    })).toString('base64url');
    const signature = 'fake-signature';
    const token = `${header}.${payload}.${signature}`;

    const result = await validateClerkJWT(token, 'secret');
    expect(result).toBeNull();
  });
});

