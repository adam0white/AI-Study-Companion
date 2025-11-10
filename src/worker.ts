/**
 * Cloudflare Worker Entry Point
 * Handles requests and serves the React application
 */

import { StudentCompanion as StudentCompanionClass } from './durable-objects/StudentCompanion';
import { requireAuth } from './lib/auth';

// Environment bindings interface
export interface Env {
  ASSETS: Fetcher;
  COMPANION: DurableObjectNamespace;
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
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

    // Route to Durable Object for companion API
    if (url.pathname.startsWith('/api/companion')) {
      return handleCompanionRequest(request, env);
    }

    // Other API routes (will be expanded in future stories)
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
      const response = await env.ASSETS.fetch(request);

      // Inject runtime environment variables into HTML
      // This allows the frontend to access env vars that aren't available at build time
      if (url.pathname === '/' || url.pathname.endsWith('.html')) {
        const html = await response.text();

        // Inject Clerk publishable key as runtime config
        const injectedHtml = html.replace(
          '<head>',
          `<head>
    <script>
      // Runtime environment variables injected by Worker
      window.ENV = {
        VITE_CLERK_PUBLISHABLE_KEY: "${env.CLERK_PUBLISHABLE_KEY}"
      };
    </script>`
        );

        return new Response(injectedHtml, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      return response;
    } catch (error) {
      return new Response('Asset not found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle requests to /api/companion/* by routing to Durable Object
 * Pattern: Validate JWT → Map to internal student ID → Route to DO instance
 * Story 1.11: Now uses real Clerk authentication with internal ID mapping
 */
async function handleCompanionRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Validate JWT and get authenticated user (Story 1.11)
    const authResult = await requireAuth(request, env);

    // If auth failed, authResult is an error Response
    if (authResult instanceof Response) {
      return authResult;
    }

    // Extract Clerk user ID and internal student ID
    const { jwt, studentId } = authResult;

    // Get Durable Object ID using internal student ID (UUID)
    // This ensures each Clerk user always routes to the same DO instance
    const doId = env.COMPANION.idFromName(studentId);

    // Log request routing (Story 1.12: AC-1.12.1, AC-1.12.6)
    console.log('[Worker] Routing request to Durable Object', {
      path: new URL(request.url).pathname,
      method: request.method,
      clerkUserId: jwt.userId,
      studentId: studentId,
      doInstanceId: doId.toString(),
      timestamp: new Date().toISOString(),
    });

    // Get Durable Object stub
    const companion = env.COMPANION.get(doId);

    // Create new request with Clerk user ID header for DO context
    // Clone the request first to avoid consuming the original body stream
    const clonedRequest = request.clone();

    // Clone headers and add authentication context
    const headers = new Headers(clonedRequest.headers);
    headers.set('X-Clerk-User-Id', jwt.userId);
    headers.set('X-Student-Id', studentId);

    // Create modified request with cloned body
    const requestInit: RequestInit = {
      method: clonedRequest.method,
      headers,
    };

    // Only add body for methods that support it
    if (clonedRequest.method !== 'GET' && clonedRequest.method !== 'HEAD') {
      requestInit.body = clonedRequest.body;
    }

    const modifiedRequest = new Request(clonedRequest.url, requestInit);

    // Forward the modified request to the Durable Object
    // The DO will handle routing to specific methods and auto-initialize if needed
    const response = await companion.fetch(modifiedRequest);

    // Read the response body to ensure it's fully consumed
    // This fixes an issue in local dev where streaming bodies may hang
    const responseBody = await response.text();

    // Add CORS headers to response
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error routing to Durable Object:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to route request to companion',
        code: 'ROUTING_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Export Durable Object class
export const StudentCompanion = StudentCompanionClass;

