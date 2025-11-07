/**
 * Worker entry point tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('Worker', () => {
  it('health check endpoint returns correct response', async () => {
    // Mock environment
    const mockEnv = {
      ASSETS: {
        fetch: vi.fn(),
      },
      COMPANION: {},
      DB: {},
      R2: {},
      CLERK_PUBLISHABLE_KEY: 'test-key',
      CLERK_SECRET_KEY: 'test-secret',
    };

    const request = new Request('https://test.com/health');
    
    // Import worker default export
    const worker = await import('./worker');
    const response = await worker.default.fetch(request, mockEnv as any, {} as any);
    
    expect(response.status).toBe(200);
    
    const json = await response.json();
    expect(json).toHaveProperty('status', 'ok');
    expect(json).toHaveProperty('service', 'ai-study-companion');
    expect(json).toHaveProperty('timestamp');
  });

  it('API routes return 501 for unimplemented endpoints', async () => {
    const mockEnv = {
      ASSETS: { fetch: vi.fn() },
      COMPANION: {},
      DB: {},
      R2: {},
      CLERK_PUBLISHABLE_KEY: 'test-key',
      CLERK_SECRET_KEY: 'test-secret',
    };

    const request = new Request('https://test.com/api/test');
    
    const worker = await import('./worker');
    const response = await worker.default.fetch(request, mockEnv as any, {} as any);
    
    expect(response.status).toBe(501);
    
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });
});

