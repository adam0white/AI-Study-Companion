/**
 * RPC Client
 * Placeholder for Story 1.6: Connect UI to Companion Backend
 * 
 * Will implement:
 * - HTTP RPC client for Durable Object communication
 * - WebSocket client for real-time chat
 * - Request/response handling
 * - Error handling and retries
 */

import type { RPCResponse } from './types';

export class RPCClient {
  private companionId: string;
  
  constructor(companionId: string) {
    this.companionId = companionId;
  }

  async call(method: string, params: unknown): Promise<RPCResponse> {
    // Full implementation in Story 1.6
    // Future: Send RPC request to Durable Object
    // const request: RPCRequest = { method, params };
    // Use companionId in future implementation
    console.log('RPC call to companion:', this.companionId, method, params);
    return { result: null };
  }
}

