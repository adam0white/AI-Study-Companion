# Story 1.2: Durable Object Companion Class Structure

Status: ready-for-dev

## Story

As a **developer**,
I want **a Durable Object class that represents a student companion**,
so that **each student can have an isolated, stateful companion instance**.

## Acceptance Criteria

1. **AC-1.2.1:** StudentCompanion class extends DurableObject base class
   - Class `StudentCompanion` in `src/durable-objects/StudentCompanion.ts` extends `DurableObject` from `cloudflare:workers`
   - Constructor accepts `DurableObjectState` and `Env` parameters
   - Constructor calls `super(state, env)`
   - No compilation errors from Durable Object extension

2. **AC-1.2.2:** Constructor initializes state (database connection, cache)
   - D1 database connection initialized from `env.DB` binding
   - In-memory cache initialized (Map for caching frequently accessed data)
   - WebSocket connections set initialized (for future chat support)
   - Lazy initialization pattern used for async operations

3. **AC-1.2.3:** Implements basic fetch handler for HTTP requests
   - `fetch(request: Request): Promise<Response>` method implemented
   - Handles basic HTTP routes (health check, RPC endpoints)
   - Returns JSON responses for RPC method calls
   - Basic error handling with try/catch

4. **AC-1.2.4:** Unique ID based on student ID via `idFromName(studentId)`
   - Worker routes requests using `env.COMPANION.idFromName(studentId)`
   - Each unique studentId gets isolated Durable Object instance
   - Multiple requests with same studentId route to same DO instance
   - Different studentIds create separate DO instances

5. **AC-1.2.5:** Can be instantiated via Durable Object namespace
   - Durable Object binding configured in `wrangler.jsonc` (`COMPANION` namespace)
   - Durable Object migration configured for StudentCompanion class
   - Worker can access DO via `env.COMPANION.idFromName(studentId).get()`
   - DO instance responds to fetch requests

6. **AC-1.2.6:** Requests can be routed to companion using student ID
   - Worker validates Clerk JWT and extracts student ID
   - Worker uses `idFromName(studentId)` to get DO stub
   - Worker forwards request to DO via `stub.fetch(request)`
   - Response from DO returned to client

7. **AC-1.2.7:** Each student ID creates/isolates a separate companion instance
   - Test: Create two students (studentA, studentB) and verify isolated instances
   - Verify data stored in one DO not accessible from another
   - Verify each DO maintains independent state
   - Verify DO state persists across invocations for same student

## Tasks / Subtasks

- [ ] **Task 1: Implement StudentCompanion Class Structure** (AC: 1, 2)
  - [ ] Update `src/durable-objects/StudentCompanion.ts` with proper class definition
  - [ ] Extend `DurableObject` from `cloudflare:workers`
  - [ ] Implement constructor with state and env parameters
  - [ ] Initialize D1 database connection (`this.db = env.DB`)
  - [ ] Initialize in-memory cache (`this.cache = new Map()`)
  - [ ] Initialize WebSocket set (`this.websockets = new Set()`)
  - [ ] Add private fields with TypeScript type annotations

- [ ] **Task 2: Implement Fetch Handler** (AC: 3)
  - [ ] Implement `fetch(request: Request): Promise<Response>` method
  - [ ] Parse request URL and determine routing (health check, RPC methods)
  - [ ] Handle GET /health → return basic health status
  - [ ] Handle POST requests for RPC method calls (parse method name from URL)
  - [ ] Implement basic error handling (try/catch with error responses)
  - [ ] Return JSON responses with appropriate status codes

- [ ] **Task 3: Implement Basic RPC Method Stubs** (AC: 3, 6)
  - [ ] Create `initialize(clerkUserId: string)` method stub
  - [ ] Create `sendMessage(message: string)` method stub (placeholder response)
  - [ ] Create `getProgress()` method stub (return placeholder data)
  - [ ] Each method returns Promise with typed response
  - [ ] Add JSDoc comments for each method

- [ ] **Task 4: Configure Worker Routing to DO** (AC: 4, 5, 6)
  - [ ] Update `src/worker.ts` to handle `/api/companion/*` routes
  - [ ] Extract student ID from validated JWT (use auth middleware)
  - [ ] Use `env.COMPANION.idFromName(studentId)` to get DO stub
  - [ ] Forward request to DO: `stub.fetch(request)`
  - [ ] Return DO response to client
  - [ ] Handle errors if DO not accessible

- [ ] **Task 5: Verify Durable Object Configuration** (AC: 5)
  - [ ] Verify `wrangler.jsonc` has COMPANION binding configured
  - [ ] Verify migrations section includes StudentCompanion class
  - [ ] Test local development: `wrangler dev` starts without errors
  - [ ] Verify DO can be instantiated and responds to requests

- [ ] **Task 6: Implement State Persistence Verification** (AC: 7)
  - [ ] Add method to set state: `setState(key: string, value: any)`
  - [ ] Add method to get state: `getState(key: string)`
  - [ ] Use `this.state.storage.put(key, value)` for persistence
  - [ ] Use `this.state.storage.get(key)` for retrieval
  - [ ] Test: Set state, make subsequent requests, verify state persists

- [ ] **Task 7: Test Isolation Between Students** (AC: 7)
  - [ ] Create test studentA, store data in their DO
  - [ ] Create test studentB, verify cannot access studentA's data
  - [ ] Make multiple requests to studentA's DO, verify state consistency
  - [ ] Make multiple requests to studentB's DO, verify state consistency
  - [ ] Verify each DO maintains independent in-memory cache

- [ ] **Task 8: Update Type Definitions** (AC: 1, 2, 3)
  - [ ] Create/update `src/lib/rpc/types.ts` with RPC interface
  - [ ] Define `StudentCompanionRPC` interface with method signatures
  - [ ] Define request/response types for each RPC method
  - [ ] Define `Env` interface with Cloudflare bindings (COMPANION, DB, R2)
  - [ ] Ensure StudentCompanion class implements StudentCompanionRPC

- [ ] **Task 9: Integration Testing** (All ACs)
  - [ ] Test: Send request to /api/companion/health → verify DO health response
  - [ ] Test: Call initialize method → verify DO creates student profile
  - [ ] Test: Call sendMessage → verify placeholder response
  - [ ] Test: Call getProgress → verify placeholder progress data
  - [ ] Test: Verify DO state persists across multiple requests
  - [ ] Deploy and test in production environment

## Dev Notes

### Architecture Patterns and Constraints

**Pattern 1: Stateful Serverless Personalization (Core Implementation)**
- Each student gets unique Durable Object instance via `idFromName(studentId)`
- DO maintains state in-memory (cache Map) and persists automatically
- Combines serverless auto-scaling with stateful per-user instances
- No external state stores required - state managed within DO
- [Source: docs/architecture.md#Pattern-1-Stateful-Serverless-Personalization]

**Durable Object Structure Pattern:**
```typescript
export class StudentCompanion extends DurableObject {
  // Private fields
  private db: D1Database;
  private cache: Map<string, any>;
  private websockets: Set<WebSocket>;
  private studentId?: string;
  
  // Constructor - no async operations
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.db = env.DB;
    this.cache = new Map();
    this.websockets = new Set();
  }
  
  // Fetch handler - entry point for all requests
  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized();
    // Route and handle requests
  }
  
  // Lazy initialization for async setup
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.loadCache();
      this.initialized = true;
    }
  }
  
  // Public RPC methods
  async initialize(clerkUserId: string): Promise<StudentProfile> { }
  async sendMessage(message: string): Promise<AIResponse> { }
  async getProgress(): Promise<ProgressData> { }
  
  // Private helper methods
  private async loadCache() { }
  private async setState(key: string, value: any) {
    await this.state.storage.put(key, value);
  }
  private async getState(key: string) {
    return await this.state.storage.get(key);
  }
}
```
[Source: docs/architecture.md#Durable-Object-Structure]

**Naming Patterns:**
- Class name: `StudentCompanion` (PascalCase, descriptive)
- Private fields: `camelCase` with TypeScript `private` keyword
- Public methods: `camelCase`, verb-first (initialize, sendMessage, getProgress)
- [Source: docs/architecture.md#Naming-Patterns]

**Worker Routing Pattern:**
```typescript
// In src/worker.ts
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
  // Route to Durable Object
  if (url.pathname.startsWith('/api/companion')) {
    // Validate JWT and get student ID
    const clerkUserId = await validateClerkToken(request);
    const studentId = await getOrCreateStudentId(clerkUserId, env);
    
    // Get DO stub and forward request
    const doId = env.COMPANION.idFromName(studentId);
    const companion = env.COMPANION.get(doId);
    return companion.fetch(request);
  }
  
  // Other routes...
}
```
[Source: docs/architecture.md#Pattern-1-Stateful-Serverless-Personalization]

**Configuration Requirements:**
- `wrangler.jsonc` must include Durable Objects binding:
```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "COMPANION",
        "class_name": "StudentCompanion",
        "script_name": "ai-study-companion"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["StudentCompanion"]
    }
  ]
}
```
[Source: docs/architecture.md#Deployment-Architecture]

**RPC Pattern (Type-Safe Communication):**
- Define shared interface in `src/lib/rpc/types.ts`
- DO methods implement interface for type safety
- No REST boilerplate - direct method invocation
- Full TypeScript autocomplete and type checking
- [Source: docs/architecture.md#Pattern-3-Type-Safe-RPC-Without-REST-APIs]

**Error Handling Strategy:**
```typescript
async sendMessage(msg: string): Promise<AIResponse> {
  try {
    // Validate input
    if (!msg || msg.trim().length === 0) {
      throw new StudentCompanionError(
        "Message cannot be empty",
        "INVALID_INPUT",
        400
      );
    }
    
    // Execute with retry logic for transient failures
    return await this.executeWithRetry(() => 
      this.processMessage(msg)
    );
    
  } catch (error) {
    // Log error with context
    console.error('Error in sendMessage:', {
      studentId: this.studentId,
      message: msg.substring(0, 50),
      error: error.message
    });
    
    // Re-throw with proper error type
    if (error instanceof StudentCompanionError) {
      throw error;
    }
    throw new StudentCompanionError(
      "Failed to process message",
      "INTERNAL_ERROR",
      500
    );
  }
}
```
[Source: docs/architecture.md#Error-Handling-Strategy]

**Database Connection:**
- D1 database binding accessed via `env.DB`
- Each DO maintains isolated D1 connection
- All queries must scope to `student_id` for isolation
- Use prepared statements with parameter binding (prevent SQL injection)
- [Source: docs/architecture.md#Data-Architecture]

**State Persistence:**
- Use `this.state.storage.put(key, value)` for durable storage
- Use `this.state.storage.get(key)` for retrieval
- State persists across DO invocations and hibernations
- In-memory cache (Map) for frequently accessed data (not persistent)
- [Source: docs/architecture.md#Durable-Object-Performance]

### Project Structure Notes

**Alignment with Unified Project Structure:**
- Durable Object class: `src/durable-objects/StudentCompanion.ts`
- RPC type definitions: `src/lib/rpc/types.ts`
- RPC client (future): `src/lib/rpc/client.ts`
- Worker routing: `src/worker.ts` (update existing)
- Custom errors: `src/lib/errors.ts` (create)

**Files to Modify:**
1. `src/durable-objects/StudentCompanion.ts` - Replace placeholder with full implementation
2. `src/worker.ts` - Add routing to DO for /api/companion/* paths
3. `src/lib/rpc/types.ts` - Create shared RPC interface and types
4. `src/lib/errors.ts` - Create StudentCompanionError class
5. `wrangler.jsonc` - Verify DO binding and migrations configured

**Files to Create:**
- `src/lib/rpc/types.ts` - RPC interfaces and type definitions
- `src/lib/errors.ts` - Custom error classes
- `src/durable-objects/StudentCompanion.test.ts` - DO unit tests (optional)

**No Conflicts Detected:**
- All file paths align with Architecture structure
- Durable Object pattern matches Architecture specification
- RPC pattern follows Architecture guidance

### Learnings from Previous Story

**From Story 1-1-project-setup-and-infrastructure-initialization (Status: done)**

**New Files Created:**
- `src/durable-objects/StudentCompanion.ts` - Placeholder DO class exists
- `wrangler.jsonc` - DO binding already configured with migrations
- `src/lib/auth.ts` - JWT validation structure available for use
- `src/lib/utils.ts` - Utility functions available (cn helper)
- Project structure directories created and ready for implementation

**Architectural Decisions:**
- Wrangler 4.45+ auto-provisions D1 database - no manual creation needed
- Durable Objects must extend `DurableObject` from `cloudflare:workers`
- DO migrations require `migrations` section in wrangler.jsonc
- When DO is in same script, omit `script_name` from bindings

**Technical Debt:**
- StudentCompanion currently returns placeholder response only
- Auth middleware is stub - JWT validation needs full implementation
- No RPC client implementation yet (deferred to Story 1.6)

**Testing Setup:**
- Vitest configured and working (12 tests passing)
- Test setup in `src/test/setup.ts` with Cloudflare Workers mocks
- Auth tests demonstrate pattern for DO testing

**Warnings/Recommendations:**
- Use lazy initialization pattern for async operations in DO constructor
- DO cannot have async operations in constructor - use `ensureInitialized()` pattern
- Always scope database queries to `student_id` for isolation
- Use prepared statements for all database operations

**Interfaces/Methods to Reuse:**
- `validateClerkJWT()` from `src/lib/auth.ts` for JWT validation
- `getOrCreateStudentId()` pattern needed for student ID mapping
- `cn()` utility from `src/lib/utils.ts` for component styling

**Files Modified:**
- Will modify existing `src/durable-objects/StudentCompanion.ts` (replace placeholder)
- Will modify existing `src/worker.ts` (add DO routing)
- Will create new files: `src/lib/rpc/types.ts`, `src/lib/errors.ts`

[Source: docs/stories/1-1-project-setup-and-infrastructure-initialization.md#Completion-Notes-List]

### References

- [Source: docs/epics.md#Story-1.2-Durable-Object-Companion-Class-Structure] - Story requirements and acceptance criteria
- [Source: docs/tech-spec-epic-1.md#AC-1.2-Durable-Object-Class-Created] - Detailed acceptance criteria from tech spec
- [Source: docs/architecture.md#Pattern-1-Stateful-Serverless-Personalization] - Core pattern implementation details
- [Source: docs/architecture.md#Durable-Object-Structure] - DO class structure and patterns
- [Source: docs/architecture.md#Pattern-3-Type-Safe-RPC-Without-REST-APIs] - RPC implementation pattern
- [Source: docs/architecture.md#Error-Handling-Strategy] - Error handling patterns
- [Source: docs/architecture.md#Naming-Patterns] - Code naming conventions
- [Source: docs/PRD.md#FR-1-Student-Companion-Instance] - Functional requirements for companion
- [Source: docs/stories/1-1-project-setup-and-infrastructure-initialization.md#Completion-Notes-List] - Previous story learnings

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

