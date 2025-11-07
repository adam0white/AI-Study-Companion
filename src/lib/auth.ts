/**
 * Authentication utilities for Clerk JWT validation
 * 
 * This is a placeholder structure - full implementation in Story 1.2
 */

export interface ClerkJWT {
  sub: string;
  userId: string;
  sessionId?: string;
}

/**
 * Validates Clerk JWT token
 * @param _token - JWT token from Authorization header
 * @param _secretKey - Clerk secret key from environment
 * @returns Decoded JWT payload or null if invalid
 */
export async function validateClerkJWT(
  _token: string,
  _secretKey: string
): Promise<ClerkJWT | null> {
  // Placeholder - full implementation in Story 1.2
  return null;
}

