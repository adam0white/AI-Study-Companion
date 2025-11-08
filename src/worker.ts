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
      return await env.ASSETS.fetch(request);
    } catch (error) {
      return new Response('Asset not found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle requests to /api/companion/* by routing to Durable Object
 * Pattern: Validate JWT → Extract student ID → Route to DO instance
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

    // Validate JWT and get user identity
    const authResult = await requireAuth(request, env);
    
    // If auth failed, authResult is an error Response
    if (authResult instanceof Response) {
      return authResult;
    }

    // Extract Clerk user ID from validated JWT
    const clerkUserId = authResult.userId;
    
    // Generate student ID from Clerk user ID (consistent with DO initialization)
    const studentId = `student_${clerkUserId}`;

    // Get Durable Object ID using idFromName pattern for consistent routing
    const doId = env.COMPANION.idFromName(studentId);
    
    // Get Durable Object stub
    const companion = env.COMPANION.get(doId);

    // Create new request with Clerk user ID header for DO auto-initialization
    const modifiedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        'X-Clerk-User-Id': clerkUserId,
      },
    });

    // Forward the modified request to the Durable Object
    // The DO will handle routing to specific methods and auto-initialize if needed
    const response = await companion.fetch(modifiedRequest);
    
    // Add CORS headers to response
    const corsResponse = new Response(response.body, response);
    corsResponse.headers.set('Access-Control-Allow-Origin', '*');
    corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return corsResponse;
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

