/**
 * Mock for cloudflare:workers module
 * Used in tests to simulate Cloudflare Workers runtime
 */

export class DurableObject {
  state: any;
  env: any;
  
  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }
}

// Add other Cloudflare Workers types as needed
export type DurableObjectState = any;
export type DurableObjectNamespace = any;

