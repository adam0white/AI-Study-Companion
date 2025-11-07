# Epic Technical Specification: Foundation & Core Architecture

Date: 2025-11-07 10:34
Author: Adam
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the foundational architecture for AI-Study-Companion, implementing the core stateful serverless pattern using Cloudflare Durable Objects. This epic creates a working application foundation where each student gets an isolated, persistent companion instance with its own database, enabling true personalization at scale. The epic delivers a functional UI foundation with card-based navigation, chat interface, and basic memory structures that enable subsequent epics to build upon.

The goal is to have a working app where we can create a student, ingest a session, and see basic UI with foundation systems operational. This epic implements Pattern 1 (Stateful Serverless Personalization) from the architecture, proving that serverless can deliver stateful, personalized experiences through isolated Durable Objects.

## Objectives and Scope

**In-Scope:**
- Cloudflare Workers project initialization with TypeScript and build system
- Durable Object class structure for student companions with isolated instances
- D1 database setup with isolated database per companion
- Card Gallery UI foundation with hero card and action cards (Chat, Practice, Progress)
- Chat modal interface component with message bubbles
- Frontend-to-backend connection via Workers RPC
- Core memory system structure (short-term and long-term memory tables)
- Mock session data ingestion pipeline
- Progress card component with basic progress display

**Out-of-Scope:**
- Memory consolidation ("sleep" process) - deferred to Epic 2
- LLM integration for intelligent responses - deferred to Epic 2
- Practice question generation - deferred to Epic 3
- Socratic Q&A implementation - deferred to Epic 3
- Real tutoring platform integration - using mocked data
- Advanced progress tracking algorithms - basic display only
- Authentication UI (handled by Clerk SDK)
- Production deployment pipeline - basic wrangler setup only

## System Architecture Alignment

This epic implements the foundational components referenced in the Architecture document:

**Pattern 1: Stateful Serverless Personalization** - Each student gets a dedicated Durable Object (`StudentCompanion` class) via `idFromName(studentId)`, maintaining isolated state and database connection.

**Project Structure** - Establishes the base directory structure (`src/durable-objects/`, `src/components/`, `src/lib/rpc/`, `src/lib/db/`) as defined in Architecture section "Project Structure".

**Data Architecture** - Implements core database schema (students, short_term_memory, long_term_memory, session_metadata tables) from Architecture section "Database Schema (D1)".

**Technology Stack** - Uses Cloudflare Workers, Durable Objects, D1, React + Vite, shadcn/ui, Clerk authentication, and Workers RPC as specified in Architecture "Decision Summary" table.

**Constraints:**
- Must use Durable Objects for stateful instances (no alternative)
- Must use D1 for structured data storage (no alternative)
- Must follow Workers RPC pattern for type-safe communication (no REST endpoints)
- Must implement card-based UI per UX Design Specification "Card Gallery" direction

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| **Worker Entry Point** (`src/worker.ts`) | Routes requests, validates auth, serves React app | HTTP requests, WebSocket connections | HTTP responses, React app assets | Backend |
| **StudentCompanion DO** (`src/durable-objects/StudentCompanion.ts`) | Per-student stateful instance, handles RPC methods | RPC method calls, WebSocket messages | RPC responses, WebSocket messages | Backend |
| **RPC Client** (`src/lib/rpc/client.ts`) | Type-safe client for DO communication | RPC method calls from React | RPC responses | Frontend |
| **Database Schema** (`src/lib/db/schema.ts`) | Database table definitions and migrations | Migration commands | Database schema | Backend |
| **Card Gallery** (`src/components/layout/CardGallery.tsx`) | Main UI layout with hero and action cards | Student data, companion state | Card-based navigation | Frontend |
| **Chat Interface** (`src/components/chat/ChatInterface.tsx`) | Chat modal with message bubbles | User messages, companion responses | Chat UI, message display | Frontend |
| **Session Ingestion** (DO method) | Processes and stores mock session data | Session transcript JSON | Stored session metadata, short-term memory | Backend |
| **Progress Card** (`src/components/progress/ProgressCard.tsx`) | Displays basic progress metrics | Progress data from DO | Progress visualization | Frontend |

### Data Models and Contracts

**Database Tables (D1):**

```sql
-- Students table (maps Clerk ID to internal student ID)
CREATE TABLE students (
  id TEXT PRIMARY KEY,                    -- Internal student ID (UUID)
  clerk_user_id TEXT UNIQUE NOT NULL,     -- Clerk user ID
  email TEXT,
  name TEXT,
  created_at TEXT NOT NULL,               -- ISO 8601 timestamp
  last_active_at TEXT NOT NULL
);

-- Short-term memory (recent session context)
CREATE TABLE short_term_memory (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  content TEXT NOT NULL,                  -- JSON: session excerpts, insights
  session_id TEXT,                        -- Reference to session
  importance_score REAL DEFAULT 0.5,      -- For consolidation priority
  created_at TEXT NOT NULL,
  expires_at TEXT,                        -- When to consolidate/archive
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Long-term memory (consolidated knowledge)
CREATE TABLE long_term_memory (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  category TEXT NOT NULL,                 -- 'background', 'strengths', 'struggles', 'goals'
  content TEXT NOT NULL,                  -- JSON: consolidated insights
  confidence_score REAL DEFAULT 0.5,      -- How confident we are
  last_updated_at TEXT NOT NULL,
  source_sessions TEXT,                   -- JSON array of session IDs
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Session metadata (references to R2 transcripts)
CREATE TABLE session_metadata (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,                   -- R2 object key
  date TEXT NOT NULL,                     -- Session date
  duration_minutes INTEGER,
  subjects TEXT,                          -- JSON array
  tutor_name TEXT,
  status TEXT DEFAULT 'processing',       -- 'processing', 'completed', 'error'
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

**TypeScript Interfaces:**

```typescript
// Student profile
interface StudentProfile {
  id: string;
  clerkUserId: string;
  email?: string;
  name?: string;
  createdAt: string;
  lastActiveAt: string;
}

// Memory structures
interface ShortTermMemory {
  id: string;
  studentId: string;
  content: string; // JSON string
  sessionId?: string;
  importanceScore: number;
  createdAt: string;
  expiresAt?: string;
}

interface LongTermMemory {
  id: string;
  studentId: string;
  category: 'background' | 'strengths' | 'struggles' | 'goals';
  content: string; // JSON string
  confidenceScore: number;
  lastUpdatedAt: string;
  sourceSessions: string[];
}

// Session data
interface SessionMetadata {
  id: string;
  studentId: string;
  r2Key: string;
  date: string;
  durationMinutes?: number;
  subjects: string[];
  tutorName?: string;
  status: 'processing' | 'completed' | 'error';
  createdAt: string;
}

interface SessionTranscript {
  id: string;
  studentId: string;
  date: string;
  durationMinutes: number;
  tutorName?: string;
  subjects: string[];
  transcript: TranscriptEntry[];
  topicsCovered?: string[];
  studentStruggles?: string[];
  studentSuccesses?: string[];
}

interface TranscriptEntry {
  speaker: 'tutor' | 'student';
  timestamp: string;
  text: string;
}
```

### APIs and Interfaces

**Student Companion RPC Methods (Epic 1 subset):**

```typescript
interface StudentCompanionRPC {
  // Authentication & Initialization
  initialize(clerkUserId: string): Promise<StudentProfile>;
  
  // Chat & Messaging (basic - placeholder responses)
  sendMessage(message: string): Promise<AIResponse>;
  getChatHistory(limit?: number): Promise<ChatMessage[]>;
  
  // Session Management
  ingestSession(sessionData: SessionData): Promise<IngestResult>;
  getSessionHistory(limit?: number): Promise<SessionMetadata[]>;
  
  // Progress (basic)
  getProgress(): Promise<ProgressData>;
  
  // Memory (basic read)
  getShortTermMemory(limit?: number): Promise<MemoryItem[]>;
  getLongTermMemory(category?: string): Promise<MemoryItem[]>;
}
```

**Request/Response Types:**

```typescript
interface AIResponse {
  message: string;
  type: 'chat' | 'placeholder';
  metadata?: {
    confidence: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SessionData {
  id: string;
  transcript: SessionTranscript;
  date: string;
  duration: number;
  subjects: string[];
  tutorName?: string;
}

interface IngestResult {
  sessionId: string;
  status: 'success' | 'processing' | 'error';
  shortTermMemoriesCreated: number;
}

interface ProgressData {
  overall: {
    practiceSessionsCompleted: number;
    tutoringSessionsCompleted: number;
    currentStreak: number;
  };
  bySubject: {
    [subject: string]: {
      mastery: number;
      practiceCount: number;
      lastPracticed?: string;
    };
  };
}

interface MemoryItem {
  id: string;
  content: string;
  type: 'short_term' | 'long_term';
  category?: string;
  createdAt: string;
}
```

**Worker Routes:**

```
GET  /                    → Serve React app (index.html)
GET  /assets/*           → Serve static assets (Vite build output)
POST /api/companion/*    → RPC endpoint (routes to DO)
WS   /ws/companion       → WebSocket endpoint (routes to DO)
POST /api/session/ingest → Session ingestion endpoint (routes to DO)
```

### Workflows and Sequencing

**1. Student Initialization Flow:**
```
User logs in via Clerk
  → Frontend receives Clerk JWT
  → Frontend calls companion.initialize(clerkUserId)
  → Worker validates JWT, extracts Clerk user ID
  → Worker routes to StudentCompanion DO via idFromName(studentId)
  → DO checks if student exists in D1
  → If new: Creates student record in D1
  → If existing: Loads student profile
  → Returns StudentProfile to frontend
  → Frontend displays Card Gallery with student context
```

**2. Session Ingestion Flow:**
```
Mock session transcript provided (JSON)
  → POST /api/session/ingest with sessionData
  → Worker routes to student's DO
  → DO stores raw transcript in R2 (sessions/{studentId}/{sessionId}.json)
  → DO extracts metadata (date, duration, subjects)
  → DO stores session_metadata in D1
  → DO parses transcript and extracts key topics (basic keyword extraction)
  → DO stores entries in short_term_memory table
  → DO returns IngestResult with status
  → Frontend displays success/error message
```

**3. Chat Message Flow:**
```
User types message in ChatInterface
  → Frontend calls companion.sendMessage(message)
  → Worker routes to student's DO via RPC
  → DO receives message (placeholder processing)
  → DO returns placeholder AIResponse
  → Frontend displays response in chat bubbles
  → Chat history stored in DO state (in-memory for Epic 1)
```

**4. Card Gallery Display Flow:**
```
User opens application
  → Frontend calls companion.getProgress()
  → Worker routes to student's DO
  → DO queries D1 for progress metrics
  → DO returns ProgressData
  → Frontend displays Card Gallery:
    - Hero card with greeting (placeholder)
    - Action cards (Chat, Practice, Progress)
    - Progress card with basic metrics
```

**5. Database Initialization Flow:**
```
First companion access for student
  → DO constructor checks if schema initialized
  → DO runs CREATE TABLE statements if tables don't exist
  → DO creates student record if new student
  → Schema persisted in D1, available for all subsequent accesses
```

## Non-Functional Requirements

### Performance

**Targets (from PRD NFRs):**
- **Durable Object Access:** Sub-second response times for state retrieval
- **Initial Page Load:** < 2 seconds on 3G connection
- **Chat Response Time:** < 200ms (excluding LLM processing - Epic 1 uses placeholder responses)

**Epic 1 Specific:**
- Database queries: < 100ms for simple SELECT queries
- RPC method calls: < 50ms overhead (excluding DO processing time)
- React app bundle size: < 300KB initial load (with code splitting)
- Card Gallery render: < 100ms from data load to display

**Measurement:** Response times measured at 95th percentile using Cloudflare Workers Observability.

### Security

**Authentication:**
- Clerk JWT validation in Workers middleware before routing to DO
- Internal student ID mapping (Clerk user ID → UUID) stored in D1
- No student data exposed without valid JWT

**Data Isolation:**
- Each student gets isolated Durable Object instance via `idFromName(studentId)`
- All D1 queries scoped to `student_id` column
- R2 keys prefixed with `sessions/{studentId}/` for isolation
- No cross-student data access possible

**Input Validation:**
- All RPC method inputs validated (message length, required fields)
- SQL injection prevention via prepared statements with parameter binding
- XSS prevention via React's automatic escaping

**Secrets Management:**
- Clerk secret key stored in Cloudflare secrets (not in code)
- Environment variables for non-sensitive config in `wrangler.jsonc`

### Reliability/Availability

**Durable Object Persistence:**
- DO state persists automatically across invocations
- D1 database provides durable storage (survives DO hibernation)
- R2 storage for session transcripts (99.9% availability SLA from Cloudflare)

**Error Handling:**
- Transient errors (network, timeout) retry up to 3 times with exponential backoff
- Database errors logged and surfaced to user with friendly messages
- Graceful degradation: UI shows error states, doesn't crash

**Availability:**
- Cloudflare Workers provides global edge distribution
- Automatic failover and load balancing
- No single point of failure (each DO is isolated)

### Observability

**Logging:**
- Structured JSON logging for all DO method calls
- Log level: INFO for normal operations, WARN for slow operations (>200ms), ERROR for failures
- Log fields: timestamp, component, action, studentId, duration, metadata

**Metrics:**
- Cloudflare Workers Observability tracks CPU time, duration per request
- Custom metrics: RPC method call counts, database query durations
- Slow query logging (> 500ms) for database operations

**Debugging:**
- Request IDs for tracing requests through system
- Error stack traces logged with context (studentId, method name)
- Development mode: Detailed error messages, production: Generic error messages

## Dependencies and Integrations

**Core Dependencies:**

| Dependency | Version | Purpose | Epic 1 Usage |
|------------|---------|---------|--------------|
| `@cloudflare/workers-types` | Latest | TypeScript types for Workers | Type definitions |
| `@clerk/clerk-js` | Latest | Authentication SDK | Client-side auth (UI handled by Clerk) |
| `react` | Latest | UI framework | Card Gallery, Chat Interface |
| `vite` | Latest | Build tool | Development and production builds |
| `wrangler` | Latest | Cloudflare CLI | Deployment and development |
| `typescript` | Latest | Type safety | All code |

**UI Dependencies:**

| Dependency | Version | Purpose | Epic 1 Usage |
|------------|---------|---------|--------------|
| `shadcn/ui` | Latest | UI component library | Card, Dialog, Button components |
| `tailwindcss` | Latest | CSS framework | Styling per UX Design Spec |
| `@tanstack/react-query` | Latest | Data fetching | RPC client wrapper (Epic 1: basic setup) |
| `lucide-react` | Latest | Icons | Card icons, UI icons |

**Cloudflare Services:**

| Service | Binding | Purpose | Epic 1 Usage |
|---------|---------|---------|--------------|
| Durable Objects | `COMPANION` | Stateful student instances | StudentCompanion class |
| D1 Database | `DB` | Structured data storage | Memory, session, student tables |
| R2 Storage | `R2` | Object storage | Session transcript storage |
| Workers AI | `AI` | AI inference | Not used in Epic 1 (placeholder responses) |

**Integration Points:**

- **Clerk Authentication:** JWT validation middleware in Workers, Clerk SDK in React
- **Cloudflare Workers RPC:** Type-safe communication between React and Durable Objects
- **R2 API:** Store and retrieve session transcripts (S3-compatible API)

**Version Constraints:**
- Node.js 20+ (LTS) required for development
- Cloudflare compatibility_date: "2025-02-11" (from Architecture)
- All dependencies use latest stable versions (no beta/alpha)

## Acceptance Criteria (Authoritative)

**AC-1.1: Project Setup Complete**
- Cloudflare Workers project structure initialized with TypeScript
- Build system configured (Vite for React, Wrangler for Workers)
- Basic deployment pipeline (wrangler.jsonc configured)
- Core dependencies installed (Workers, Durable Objects, D1, Clerk)
- Development environment ready for local testing
- Git repository initialized with appropriate .gitignore
- Project structure follows Cloudflare best practices
- Can deploy basic "Hello World" worker to Cloudflare

**AC-1.2: Durable Object Class Created**
- StudentCompanion class extends DurableObject base class
- Constructor initializes state (database connection, cache)
- Implements basic fetch handler for HTTP requests
- Unique ID based on student ID via `idFromName(studentId)`
- Can be instantiated via Durable Object namespace
- Requests can be routed to companion using student ID
- Each student ID creates/isolates a separate companion instance

**AC-1.3: Isolated Database per Companion**
- Each companion has its own D1 database connection
- Database is isolated from other companions (queries scoped to student_id)
- Can create tables and store data specific to that student
- Database persists across companion invocations
- Database schema can be initialized per companion (on first access)
- All queries scoped to that companion's database only

**AC-1.4: Card Gallery UI Implemented**
- Hero card with greeting area (placeholder content initially)
- Action cards grid (Chat, Practice, Progress cards)
- Card-based layout that's friendly and approachable
- Responsive grid (1-col mobile, 2-col tablet, 3-col desktop)
- Cards are clickable to navigate (even if placeholder destinations)
- Cards have basic hover/active states
- Interface is responsive (works on mobile and desktop)

**AC-1.5: Chat Modal Interface Created**
- Chat interface opens (modal on desktop, full-screen on mobile)
- Chat message bubbles visible (companion and user messages)
- Message input area with send button
- Typing indicators when companion is responding
- Responsive chat interface
- Can type messages and see them appear
- Chat interface can be closed to return to card gallery
- Chat messages clearly differentiated (companion vs user)

**AC-1.6: UI Connected to Backend**
- Messages sent to companion Durable Object via RPC
- Companion receives the message and can process it
- Response is returned to the UI
- Response appears in the chat interface
- Messages routed to the correct companion based on student ID
- Basic error handling in place (network errors, etc.)

**AC-1.7: Core Memory System Structure**
- Short-term memory structure defined (schema/types)
- Long-term memory structure defined (schema/types)
- Memory can be stored in companion's database
- Memory can be retrieved from database
- Basic memory operations (create, read) are functional
- Memory structures support needed data types (text, metadata, timestamps)
- Memory associated with correct student (via companion isolation)

**AC-1.8: Mock Session Data Ingestion**
- Session data processed and stored in companion's short-term memory
- Session metadata extracted (date, duration, subjects)
- Key topics/concepts identified (basic extraction initially)
- Session data associated with correct student companion
- Can verify session data is stored correctly
- Multiple sessions can be ingested for the same student

**AC-1.9: Progress Card Component**
- Progress card visible in the card gallery
- Basic progress indicators displayed (can be placeholder data initially)
- Visual representation of progress (bars, numbers, metrics)
- Progress information displayed clearly
- Progress card is responsive and accessible
- Progress data can be fetched from companion (even if placeholder)
- Clicking progress card can expand details (future story)

## Traceability Mapping

| AC | Spec Section | Component/API | Test Idea |
|----|--------------|---------------|-----------|
| AC-1.1 | Project Initialization, Technology Stack | `wrangler.jsonc`, `package.json`, project structure | Verify project builds, deploys, and runs locally |
| AC-1.2 | Pattern 1: Stateful Serverless Personalization | `StudentCompanion` DO class, `worker.ts` routing | Create two students, verify isolated DO instances |
| AC-1.3 | Data Architecture > Database Schema | D1 database binding, schema initialization | Query database, verify student_id scoping works |
| AC-1.4 | Design Direction: Card Gallery | `CardGallery.tsx`, `HeroCard.tsx`, `ActionCard.tsx` | Render cards, test responsive breakpoints, verify click handlers |
| AC-1.5 | Component Library: Chat Message Bubbles | `ChatInterface.tsx`, `MessageBubble.tsx` | Open chat modal, send message, verify bubbles render |
| AC-1.6 | Integration Points: Frontend ↔ Backend | RPC client, `sendMessage` RPC method | Send message from UI, verify reaches DO, response returns |
| AC-1.7 | Data Architecture > Database Schema | `short_term_memory`, `long_term_memory` tables | Store memory, retrieve memory, verify isolation |
| AC-1.8 | Integration Points: Session Data Ingestion | `ingestSession` RPC method, R2 storage | Ingest mock session, verify stored in D1 and R2 |
| AC-1.9 | Component Library: Progress Visualization | `ProgressCard.tsx`, `getProgress` RPC method | Display progress card, verify data fetches and renders |

## Risks, Assumptions, Open Questions

**Risks:**

1. **Risk: Durable Object Cold Start Latency**
   - **Impact:** First request to new DO may be slow (>1s)
   - **Mitigation:** Use in-memory caching, pre-warm DOs for active students
   - **Status:** Monitor in development, optimize if needed

2. **Risk: Database Schema Migration Complexity**
   - **Impact:** Schema changes require careful migration strategy
   - **Mitigation:** Use D1 migrations, test migrations in dev environment first
   - **Status:** Epic 1 uses initial schema only, migrations deferred

3. **Risk: RPC Type Safety Across Client/Server**
   - **Impact:** Type mismatches between React and DO could cause runtime errors
   - **Mitigation:** Shared types in `src/lib/rpc/types.ts`, strict TypeScript
   - **Status:** Architecture pattern addresses this, verify in implementation

**Assumptions:**

1. **Assumption: Clerk Authentication Works Seamlessly**
   - Clerk SDK handles all auth UI, Workers middleware validates JWT
   - **Validation:** Test Clerk integration early in Story 1.1

2. **Assumption: Mock Session Data Format is Sufficient**
   - JSON transcript format from Architecture doc is complete
   - **Validation:** Create sample mock data, verify ingestion works

3. **Assumption: shadcn/ui Components Meet UX Requirements**
   - Base components can be customized to match Modern & Playful theme
   - **Validation:** Build card components early, verify styling flexibility

**Open Questions:**

1. **Question: Should database schema initialization happen per-DO or globally?**
   - **Decision:** Per-DO initialization (simpler, isolated)
   - **Rationale:** Each DO checks and initializes schema on first access

2. **Question: How to handle R2 bucket creation in development?**
   - **Decision:** Create bucket via wrangler CLI, reference in config
   - **Rationale:** Standard Cloudflare workflow

3. **Question: Should chat history persist in Epic 1 or just in-memory?**
   - **Decision:** In-memory for Epic 1, persistent storage deferred to Epic 2
   - **Rationale:** Keeps Epic 1 focused on foundation, chat persistence not critical

## Test Strategy Summary

**Test Levels:**

1. **Unit Tests (Minimal):**
   - Core logic functions (memory CRUD operations, session parsing)
   - Database query helpers
   - Type validation utilities
   - **Framework:** Vitest
   - **Coverage Target:** Critical paths only (not 100%)

2. **Component Tests:**
   - Card Gallery rendering and interactions
   - Chat Interface message display
   - Progress Card data display
   - **Framework:** Vitest + React Testing Library
   - **Coverage:** Key UI components only

3. **Integration Tests (Manual):**
   - End-to-end flows: Student login → Card Gallery → Chat → Session ingestion
   - RPC communication between React and DO
   - Database isolation verification
   - **Approach:** Manual testing with real Cloudflare resources

4. **Manual Testing:**
   - Visual design verification (matches UX spec)
   - Responsive design across breakpoints
   - Accessibility (keyboard navigation, screen reader)
   - **Tools:** Browser DevTools, Lighthouse, manual inspection

**Test Coverage of Acceptance Criteria:**

- **AC-1.1:** Manual verification of project setup, deployment test
- **AC-1.2:** Unit test DO class creation, integration test routing
- **AC-1.3:** Integration test database isolation, unit test queries
- **AC-1.4:** Component test Card Gallery, manual test responsive
- **AC-1.5:** Component test Chat Interface, manual test modal behavior
- **AC-1.6:** Integration test RPC flow, manual test error handling
- **AC-1.7:** Unit test memory CRUD, integration test database operations
- **AC-1.8:** Integration test session ingestion, manual test data verification
- **AC-1.9:** Component test Progress Card, integration test data fetching

**Edge Cases to Test:**

- New student first access (schema initialization)
- Multiple students accessing simultaneously (isolation)
- Invalid session data format (error handling)
- Network errors during RPC calls (retry logic)
- Empty progress data (UI graceful handling)

**Testing Approach:**

- **Minimal Automation:** Focus on high-value tests, not 100% coverage
- **Manual Testing Priority:** Visual design, user flows, accessibility
- **Integration Testing:** Real Cloudflare resources (dev environment)
- **Performance Testing:** Manual verification of response times

## Post-Review Follow-ups

- [ ] Story 1.2: Implement Clerk JWT signature verification in `src/lib/auth.ts` so Worker authentication satisfies AC-1.2.6 before routing to Durable Objects.

