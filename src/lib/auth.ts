/**
 * Authentication utilities for Clerk JWT validation
 * 
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * =================================
 * This is a DEVELOPMENT-ONLY implementation that does NOT verify JWT signatures.
 * It is INSECURE and MUST NOT be used in production or with real user data.
 * 
 * Current limitations:
 * - No signature verification (tokens can be forged)
 * - No JWKS validation against Clerk's public keys
 * - No issuer validation
 * - No audience validation
 * 
 * This placeholder exists ONLY to satisfy Story 1.1's foundation requirements.
 * Full secure implementation is REQUIRED in Story 1.2 before any real usage.
 * 
 * DO NOT DEPLOY THIS TO PRODUCTION.
 */

export interface ClerkJWT {
  sub: string;
  userId: string;
  sessionId?: string;
  azp?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

/**
 * Decodes a JWT token payload WITHOUT verification
 * 
 * ⚠️ INSECURE: Does not verify signature - development only!
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if malformed
 */
function decodeJWTUnsafe(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Use Buffer for base64url decoding (nodejs_compat)
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * ⚠️ INSECURE: Decodes JWT WITHOUT signature verification
 * 
 * DO NOT USE IN PRODUCTION. This function:
 * - Does NOT verify the JWT signature (anyone can forge tokens)
 * - Does NOT validate against Clerk's JWKS public keys
 * - Does NOT check issuer or audience claims
 * - secretKey parameter is UNUSED (no cryptographic verification)
 * 
 * This exists ONLY as a placeholder for Story 1.1 foundation setup.
 * 
 * @param token - JWT token from Authorization header
 * @param secretKey - UNUSED (no verification performed)
 * @returns Decoded JWT payload or null if invalid structure/expired
 * 
 * TODO Story 1.2 (REQUIRED):
 * - Implement proper JWKS-based signature verification
 * - Fetch Clerk's public keys from /.well-known/jwks.json
 * - Verify signature using RS256 algorithm
 * - Validate issuer, audience, and other critical claims
 * - Use proper JWT verification library or Web Crypto API
 */
export async function validateClerkJWT(
  token: string,
  secretKey: string
): Promise<ClerkJWT | null> {
  // Runtime warning to prevent accidental production use
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] CRITICAL: validateClerkJWT does not verify signatures. DO NOT USE IN PRODUCTION.');
  }

  if (!token || !secretKey) {
    return null;
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  
  // ⚠️ INSECURE: Only decodes, does NOT verify signature
  const payload = decodeJWTUnsafe(cleanToken);
  
  if (!payload) {
    return null;
  }

  // Check expiration (basic sanity check only)
  if (payload.exp && payload.exp < Date.now() / 1000) {
    return null;
  }

  // Extract Clerk-specific claims
  return {
    sub: payload.sub,
    userId: payload.sub,
    sessionId: payload.sid,
    azp: payload.azp,
    exp: payload.exp,
    iat: payload.iat,
    iss: payload.iss,
  };
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
 * Middleware helper to protect routes with authentication
 */
export async function requireAuth(
  request: Request,
  env: { CLERK_SECRET_KEY: string }
): Promise<ClerkJWT | Response> {
  const token = extractTokenFromHeader(request);
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ⚠️ DEVELOPMENT BYPASS: Accept mock tokens for local testing
  // Remove this in production!
  if (token === 'dev-mock-token' || token === 'mock-clerk-jwt-token') {
    return {
      sub: 'dev_user_123',
      userId: 'dev_user_123',
      sessionId: 'dev_session',
    };
  }

  const jwt = await validateClerkJWT(token, env.CLERK_SECRET_KEY);
  
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return jwt;
}

