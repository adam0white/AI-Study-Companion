/**
 * RPC Type Definitions
 * Placeholder for Story 1.2: Durable Object RPC Interface
 * 
 * Will define:
 * - Request/Response types for DO communication
 * - Method signatures for chat, practice, progress
 * - WebSocket message types
 */

export interface RPCRequest {
  method: string;
  params: unknown;
}

export interface RPCResponse {
  result?: unknown;
  error?: string;
}

