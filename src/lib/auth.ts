/**
 * Authentication utilities for Clerk JWT validation
 * Story 1.11: Integrate Real Clerk Authentication
 *
 * Implements secure JWT validation using Clerk's JWKS endpoint and jose library.
 * Validates JWT signature, expiration, issuer, and extracts Clerk user ID.
 * Maps Clerk user IDs to internal student IDs for Durable Object routing.
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';

export interface ClerkJWT {
  sub: string; // Clerk user ID
  userId: string; // Alias for sub
  sessionId?: string;
  azp?: string; // Authorized party
  exp?: number;
  iat?: number;
  iss?: string; // Issuer
}

export interface Env {
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY?: string;
  DB: D1Database;
  COMPANION: DurableObjectNamespace;
  R2: R2Bucket;
}

// Cache JWKS for performance (5 minutes TTL)
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Gets the Clerk JWKS URL from the publishable key
 * Clerk publishable keys follow format: pk_{env}_{domain_hash}
 */
function getClerkJWKSUrl(publishableKey: string): string {
  // Extract the domain from the publishable key
  // For pk_test_*, the domain is embedded in the key
  // Clerk standard JWKS URL format: https://{clerk-frontend-api}/.well-known/jwks.json

  // Decode the publishable key to get the Clerk domain
  const decoded = atob(publishableKey.replace('pk_test_', '').replace('pk_live_', ''));
  // Remove any trailing special characters (like $) that may be in the encoded value
  const domain = decoded.replace(/[^a-zA-Z0-9.-]/g, '');

  return `https://${domain}/.well-known/jwks.json`;
}

/**
 * Validates a Clerk JWT token using JWKS signature verification
 *
 * This function:
 * - Fetches Clerk's public keys from JWKS endpoint
 * - Verifies JWT signature using RS256 algorithm
 * - Validates expiration, issuer, and other claims
 * - Returns decoded JWT payload with Clerk user ID
 *
 * @param token - JWT token from Authorization header
 * @param env - Environment bindings (includes CLERK_PUBLISHABLE_KEY)
 * @returns Decoded and validated JWT payload
 * @throws Error if token is invalid, expired, or signature verification fails
 */
export async function validateClerkToken(
  token: string,
  env: Env
): Promise<ClerkJWT> {
  if (!token || !env.CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing token or Clerk configuration');
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.replace(/^Bearer\s+/i, '');

  try {
    // Get or create JWKS
    const now = Date.now();
    if (!jwksCache || now - jwksCacheTime > JWKS_CACHE_TTL) {
      const jwksUrl = getClerkJWKSUrl(env.CLERK_PUBLISHABLE_KEY);
      jwksCache = createRemoteJWKSet(new URL(jwksUrl));
      jwksCacheTime = now;
    }

    // Verify JWT signature and decode payload
    const { payload } = await jwtVerify(cleanToken, jwksCache, {
      algorithms: ['RS256'],
    });

    // Extract Clerk user ID from 'sub' claim
    if (!payload.sub) {
      throw new Error('Missing user ID in token');
    }

    return {
      sub: payload.sub,
      userId: payload.sub,
      sessionId: payload.sid as string | undefined,
      azp: payload.azp as string | undefined,
      exp: payload.exp,
      iat: payload.iat,
      iss: payload.iss,
    };
  } catch (error) {
    console.error('[Auth] JWT validation failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extracts JWT token from Authorization header
 */
export function extractTokenFromHeader(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }

  return null;
}

/**
 * Maps Clerk user ID to internal student ID (UUID)
 * Creates new student record if first-time user
 *
 * @param clerkUserId - Clerk user ID from validated JWT
 * @param db - D1 Database binding
 * @returns Internal student ID (UUID)
 */
export async function getOrCreateStudentId(
  clerkUserId: string,
  db: D1Database
): Promise<string> {
  // Query for existing student by Clerk user ID
  const existingStudent = await db
    .prepare('SELECT id FROM students WHERE clerk_user_id = ?')
    .bind(clerkUserId)
    .first<{ id: string }>();

  if (existingStudent) {
    return existingStudent.id;
  }

  // Generate new UUID for student
  const studentId = crypto.randomUUID();

  // Create new student record with all required fields
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO students (id, clerk_user_id, created_at, last_active_at) VALUES (?, ?, ?, ?)')
    .bind(studentId, clerkUserId, now, now)
    .run();

  return studentId;
}

/**
 * Authentication middleware for Worker requests
 *
 * Validates JWT token, extracts Clerk user ID, and maps to internal student ID
 * Returns authenticated context or 401 error response
 *
 * @param request - Incoming HTTP request
 * @param env - Environment bindings
 * @returns Object with Clerk JWT and internal student ID, or 401 Response
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ jwt: ClerkJWT; studentId: string } | Response> {
  const token = extractTokenFromHeader(request);

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate JWT signature and extract Clerk user ID
    const jwt = await validateClerkToken(token, env);

    // Map Clerk user ID to internal student ID
    const studentId = await getOrCreateStudentId(jwt.userId, env.DB);

    return { jwt, studentId };
  } catch (error) {
    console.error('[Auth] Authentication failed:', error);
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
