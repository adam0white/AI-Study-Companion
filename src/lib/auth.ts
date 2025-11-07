/**
 * Authentication utilities for Clerk JWT validation
 * Basic implementation for Story 1.1
 * 
 * Note: This is a simplified validation. Full Clerk session management
 * and advanced features will be implemented in Story 1.2
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
 * Decodes a JWT token (without verification)
 * Used for development/testing - NOT for production
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Validates Clerk JWT token
 * @param token - JWT token from Authorization header
 * @param secretKey - Clerk secret key from environment
 * @returns Decoded JWT payload or null if invalid
 * 
 * Basic implementation for Story 1.1:
 * - Validates token structure
 * - Decodes payload
 * - Checks expiration
 * 
 * TODO Story 1.2: Add full JWKS verification with Clerk's public keys
 */
export async function validateClerkJWT(
  token: string,
  secretKey: string
): Promise<ClerkJWT | null> {
  if (!token || !secretKey) {
    return null;
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  
  // Decode the JWT (basic validation for Story 1.1)
  const payload = decodeJWT(cleanToken);
  
  if (!payload) {
    return null;
  }

  // Check expiration
  if (payload.exp && payload.exp < Date.now() / 1000) {
    return null;
  }

  // Extract Clerk-specific claims
  return {
    sub: payload.sub,
    userId: payload.sub, // Clerk uses 'sub' as userId
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

  const jwt = await validateClerkJWT(token, env.CLERK_SECRET_KEY);
  
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return jwt;
}

