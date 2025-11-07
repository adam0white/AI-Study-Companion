/**
 * Cloudflare Worker Entry Point
 * Handles requests and serves the React application
 */

// Environment bindings interface
export interface Env {
  ASSETS: Fetcher;
  COMPANION: DurableObjectNamespace;
  DB: D1Database;
  R2: R2Bucket;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
}

// Worker fetch handler
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'ai-study-companion',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // API routes (will be expanded in future stories)
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'API endpoint not yet implemented' }),
        {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Serve React app (static assets)
    try {
      return await env.ASSETS.fetch(request);
    } catch (error) {
      return new Response('Asset not found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;

// Export Durable Object classes
export { StudentCompanion } from './durable-objects/StudentCompanion';

