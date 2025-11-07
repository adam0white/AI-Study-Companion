# Architecture

## Executive Summary

AI-Study-Companion leverages Cloudflare's stateful serverless platform to create truly personalized AI learning companions at scale. The architecture centers on **Durable Objects**, where each student gets their own isolated, stateful instance with persistent storage, dual-memory system, and automatic memory consolidation.

**Key Architectural Approach:**
- **Single Deployment:** React + Vite frontend served by Cloudflare Workers, with WebSocket RPC to Durable Objects
- **Stateful Serverless:** Each student companion is a Durable Object with isolated D1 database, maintaining state across sessions
- **Hybrid Storage:** R2 for raw transcripts, D1 for structured data, Vectorize for semantic search embeddings
- **Type-Safe RPC:** Native Workers RPC provides end-to-end TypeScript safety without REST endpoints
- **AI Gateway:** Unified interface for Workers AI and external LLMs (OpenAI/Anthropic) with automatic fallback

This architecture proves that serverless can deliver stateful, personalized experiences through isolated Durable Objects while maintaining sub-second response times and production-ready reliability.

## Project Initialization

**First Story Command:**

```bash
# Create Cloudflare Workers project with React + Vite
npm create cloudflare@latest ai-study-companion -- --type=web-app --framework=react --git=true

cd ai-study-companion

# Install additional dependencies
npm install --save-dev @cloudflare/workers-types
npm install @clerk/clerk-js
npm install @tanstack/react-query
npm install class-variance-authority clsx tailwind-merge lucide-react

# Initialize shadcn/ui
npx shadcn@latest init
```

**Configuration:** Use `wrangler.jsonc` (see Project Structure section for complete configuration)

**Base Architecture Established:**
- Cloudflare Workers runtime with TypeScript
- React + Vite for frontend (SPA)
- Wrangler for development and deployment
- ESLint + Prettier for code quality

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
| -------- | -------- | ------- | ------------- | --------- |
| Runtime Platform | Cloudflare Workers | Latest | All Epics | Edge computing, global distribution, sub-second response times |
| Frontend Framework | React + Vite | React@latest, Vite@latest | All UI Epics | Modern, fast dev experience, component ecosystem |
| Language | TypeScript | Latest | All Epics | Type safety, better DX, catches errors at compile time |
| State Management | Durable Objects | Latest | Epics 1-6 | Stateful serverless, isolated per-student storage, WebSocket support |
| Database | Cloudflare D1 (SQLite) | Latest | Epics 1-6 | Serverless SQL, isolated per DO, fast queries |
| Object Storage | Cloudflare R2 | Latest | Epics 1, 4 | Store raw session transcripts, no egress fees |
| Vector Database | Cloudflare Vectorize | Latest | Epics 2, 3 | Semantic search on session content, LLM embeddings |
| AI/LLM | Workers AI + External APIs | Latest | Epics 2-6 | Workers AI for fast responses, external for complex reasoning |
| AI Gateway | Cloudflare AI Gateway | Latest | Epics 2-6 | Unified LLM interface, caching, fallback, observability |
| Authentication | Clerk | @clerk/clerk-js@latest | All Epics | Modern auth, easy integration, secure token management |
| RPC Communication | Workers RPC (Native) | Latest | All Epics | Type-safe client-server communication, no REST boilerplate |
| UI Components | shadcn/ui + Radix UI | Latest | All UI Epics | Accessible, customizable, Tailwind-based components |
| Styling | Tailwind CSS | Latest | All UI Epics | Utility-first, fast styling, matches UX design |
| Data Fetching | React Query | @tanstack/react-query@latest | Epics 2-6 | Client-side state management, caching, real-time updates |
| Real-time Communication | WebSocket (Durable Objects) | Native | Epics 2-3 | Direct WS to student DO, low latency, bidirectional |
| Scheduled Jobs | Durable Object Alarms | Native | Epic 2 | Memory consolidation "sleep" process, per-student scheduling |
| Observability | Cloudflare Native Tools | Latest | All Epics | Workers Observability + Log Explorer, no external services |

## Project Structure

```
ai-study-companion/
├── src/
│   ├── worker.ts                      # Main Workers entry point, routes requests
│   ├── index.html                     # HTML shell for React app
│   ├── main.tsx                       # React app entry point
│   ├── App.tsx                        # Root React component
│   │
│   ├── durable-objects/
│   │   └── StudentCompanion.ts        # Durable Object class for each student
│   │
│   ├── lib/
│   │   ├── rpc/
│   │   │   ├── client.ts              # RPC client for DO communication
│   │   │   └── types.ts               # Shared RPC types (client + server)
│   │   ├── auth.ts                    # Clerk authentication utilities
│   │   ├── db/
│   │   │   ├── schema.ts              # D1 database schema definitions
│   │   │   └── migrations/            # SQL migration files
│   │   ├── ai/
│   │   │   ├── gateway.ts             # AI Gateway client (Workers AI + external)
│   │   │   ├── prompts.ts             # LLM prompt templates
│   │   │   └── embeddings.ts          # Vectorize embedding utilities
│   │   └── utils.ts                   # Shared utility functions
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...                    # Other shadcn components
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx      # Main chat component
│   │   │   ├── MessageBubble.tsx      # Chat message display
│   │   │   └── WebSocketProvider.tsx  # WS connection management
│   │   ├── practice/
│   │   │   ├── PracticeSession.tsx    # Practice question interface
│   │   │   ├── QuestionCard.tsx       # Individual question display
│   │   │   └── FeedbackDisplay.tsx    # Answer feedback
│   │   ├── progress/
│   │   │   ├── ProgressDashboard.tsx  # Multi-dimensional progress
│   │   │   ├── SubjectProgress.tsx    # Subject-specific metrics
│   │   │   └── ProgressChart.tsx      # Visual progress charts
│   │   └── layout/
│   │       ├── Header.tsx             # App header with auth
│   │       ├── CardGallery.tsx        # Card-based layout (from UX)
│   │       └── HeroCard.tsx           # Proactive greeting card
│   │
│   ├── hooks/
│   │   ├── useStudentCompanion.ts     # Hook for RPC to DO
│   │   ├── useWebSocket.ts            # WebSocket connection hook
│   │   ├── useAuth.ts                 # Clerk auth hook
│   │   └── usePractice.ts             # Practice session management
│   │
│   ├── types/
│   │   ├── student.ts                 # Student data types
│   │   ├── memory.ts                  # Memory system types
│   │   ├── practice.ts                # Practice session types
│   │   └── session.ts                 # Tutoring session types
│   │
│   └── styles/
│       └── globals.css                # Tailwind global styles
│
├── public/
│   └── assets/                        # Static assets (icons, images)
│
├── wrangler.jsonc                     # Cloudflare configuration
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite build configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── components.json                    # shadcn/ui configuration
├── .eslintrc.json                     # ESLint rules
└── .prettierrc                        # Prettier formatting
```

## Epic to Architecture Mapping

| Epic | Primary Components | Storage Used | Key Technologies |
|------|-------------------|--------------|------------------|
| **Epic 1: Foundation & Core Architecture** | `worker.ts`, `StudentCompanion.ts`, `ChatInterface.tsx`, `db/schema.ts`, `rpc/` | D1 (companion isolation), Durable Object state | Durable Objects, D1, Workers RPC, React + Vite |
| **Epic 2: Memory Intelligence** | `StudentCompanion.ts` (memory methods), `db/schema.ts` (memory tables), DO Alarms | D1 (short-term + long-term memory), DO state | Durable Object Alarms, D1 transactions, LLM for consolidation |
| **Epic 3: Learning Interactions** | `PracticeSession.tsx`, `QuestionCard.tsx`, `ProgressDashboard.tsx`, AI prompt templates | D1 (practice history), Vectorize (session embeddings) | Workers AI, Vectorize, React Query, shadcn/ui charts |
| **Epic 4: Intelligence & Escalation** | `ai/gateway.ts`, escalation detection logic in DO, subject tracking | D1 (subject knowledge), Vectorize (content analysis) | AI Gateway (external LLM), Workers AI, D1 analytics queries |
| **Epic 5: Retention Features** | Post-session handlers in DO, `HeroCard.tsx`, DO Alarms for nudges | D1 (engagement metrics, nudge history) | Durable Object Alarms, React Query mutations, WebSocket push |
| **Epic 6: Polish & Production Readiness** | All UI components refinement, mock data generators, spaced repetition algorithms | D1 (learning method metrics), R2 (diverse mock transcripts) | shadcn/ui theming, Tailwind polish, Cloudflare Observability |

## Technology Stack Details

### Core Technologies

**Cloudflare Workers (Runtime Platform)**
- **Version:** Latest (compatibility_date: "2025-02-11")
- **Purpose:** Edge computing runtime for both frontend serving and backend logic
- **Key Features:** Global distribution, sub-second cold starts, automatic scaling
- **Usage:** Main entry point (`worker.ts`) routes requests to Durable Objects or serves React app
- **Configuration:** `nodejs_compat` flag enabled for Node.js API compatibility

**Durable Objects (Stateful Compute + Storage)**
- **Version:** Latest
- **Purpose:** Isolated per-student companion instances with persistent state
- **Key Features:** Strongly consistent storage, WebSocket support, automatic persistence
- **Usage:** Each student gets unique DO instance (`StudentCompanion` class) via `idFromName(studentId)`
- **State Management:** In-memory state + transactional storage API for immediate consistency
- **Lifecycle:** Auto-created on first access, persists indefinitely, hibernates when idle

**D1 Database (Serverless SQLite)**
- **Version:** Latest
- **Purpose:** Structured data storage for memory, practice, progress, sessions
- **Key Features:** SQL queries, transactions, global replication, isolated per DO
- **Schema:**
  - `students` - Student profiles and metadata
  - `short_term_memory` - Recent session data, immediate context
  - `long_term_memory` - Consolidated knowledge, background understanding
  - `practice_sessions` - Practice history, performance metrics
  - `progress_tracking` - Multi-dimensional progress data
  - `session_metadata` - Tutoring session references
- **Access Pattern:** Each Durable Object maintains its own D1 connection

**R2 Object Storage**
- **Version:** Latest
- **Purpose:** Store raw tutoring session transcripts (JSON/text files)
- **Key Features:** No egress fees, S3-compatible API, global access
- **Usage:** Transcripts stored as `sessions/{studentId}/{sessionId}.json`
- **Integration:** DO references R2 keys in D1, fetches on-demand for processing

**Vectorize (Vector Database)**
- **Version:** Latest
- **Purpose:** Semantic search on session content and learning materials
- **Key Features:** Built-in embeddings, similarity search, automatic indexing
- **Usage:** Store embeddings of session transcripts, practice questions, topics
- **Query Pattern:** Retrieve relevant context for practice generation and Q&A

**Workers AI**
- **Version:** Latest models
- **Purpose:** Fast AI inference at the edge for practice generation and simple Q&A
- **Models Used:** 
  - `@cf/meta/llama-3.1-8b-instruct` - Chat responses, practice questions
  - `@cf/baai/bge-base-en-v1.5` - Text embeddings for Vectorize
- **Fallback:** External LLM via AI Gateway for complex reasoning

**AI Gateway**
- **Version:** Latest
- **Purpose:** Unified interface to Workers AI + external LLMs (OpenAI, Anthropic)
- **Key Features:** Request caching, automatic fallback, usage analytics, prompt logging
- **Usage:** All LLM calls routed through gateway for consistency and observability
- **Providers:** Workers AI (primary), OpenAI GPT-4 (complex reasoning), Anthropic Claude (tutor escalation)

**React + Vite (Frontend)**
- **React Version:** Latest stable
- **Vite Version:** Latest stable
- **Purpose:** Modern SPA with fast HMR and optimized production builds
- **Build Output:** Served by Workers as static assets
- **Dev Experience:** Vite dev server proxies to Wrangler dev for full-stack development

**TypeScript**
- **Version:** Latest (5.6+)
- **Configuration:** Strict mode enabled, paths configured for clean imports
- **Usage:** 100% TypeScript codebase (no JavaScript files)
- **Shared Types:** `src/types/` used by both client and server via Workers RPC

**Clerk (Authentication)**
- **Version:** @clerk/clerk-js@latest
- **Purpose:** User authentication and session management
- **Integration:** Client-side Clerk SDK, JWT validation in Workers middleware
- **User Mapping:** Clerk user ID → internal student ID (stored in D1 `students` table)
- **Session Flow:** Clerk JWT → Workers validates → extracts student ID → routes to DO

**shadcn/ui + Radix UI**
- **Version:** Latest
- **Purpose:** Accessible, customizable UI components
- **Theme:** Modern & Playful (purple/pink from UX spec)
- **Components Used:** Button, Card, Input, Dialog, Progress, Tabs, Tooltip, Badge
- **Customization:** Tailwind-based, full control over styling

**Tailwind CSS**
- **Version:** Latest (v4 if stable, else v3 latest)
- **Purpose:** Utility-first styling matching UX design system
- **Configuration:** Custom colors (purple #8B5CF6, pink #EC4899), spacing scale
- **Integration:** PostCSS, Vite plugin, shadcn/ui compatible

**React Query (@tanstack/react-query)**
- **Version:** Latest (v5)
- **Purpose:** Client-side data fetching, caching, and synchronization
- **Usage:** Wrap RPC calls to Durable Objects, manage loading/error states
- **Features:** Automatic refetching, optimistic updates, query invalidation

### Integration Points

**Frontend ↔ Backend Communication (Workers RPC)**
- **Protocol:** Native Cloudflare Workers RPC (no REST)
- **Type Safety:** Shared TypeScript interfaces in `src/lib/rpc/types.ts`
- **Client:** `src/lib/rpc/client.ts` wraps RPC calls with React Query
- **Server:** Durable Object methods exposed as RPC endpoints
- **Transport:** HTTP for RPC, WebSocket for real-time chat

**Authentication Flow**
```
User Login (Clerk) 
  → Clerk JWT issued 
  → Frontend includes JWT in requests 
  → Workers middleware validates JWT 
  → Extract Clerk user ID 
  → Lookup/create internal student ID (D1) 
  → Route to student's Durable Object
```

**Session Data Ingestion**
```
Session Transcript (mock or real) 
  → Upload to R2 (raw JSON) 
  → Trigger DO method via RPC 
  → DO reads from R2 
  → Extract metadata → D1 
  → Generate embeddings → Vectorize 
  → Store short-term memory → D1 
  → Schedule consolidation alarm
```

**Memory Consolidation ("Sleep" Process)**
```
DO Alarm triggers (post-session + X hours) 
  → DO loads short-term memory from D1 
  → LLM via AI Gateway consolidates insights 
  → Update long-term memory in D1 
  → Archive/cleanup short-term memory 
  → Alarm complete, DO hibernates
```

**Practice Question Generation**
```
Student requests practice 
  → RPC to DO 
  → DO queries Vectorize (relevant session content) 
  → DO calls Workers AI (generate questions) 
  → Questions stored in D1 
  → Return to client via RPC 
  → React Query caches response
```

**Real-Time Chat (WebSocket)**
```
Client establishes WebSocket to Workers 
  → Workers upgrades connection 
  → Routes to student's Durable Object 
  → DO maintains WebSocket in memory 
  → Bidirectional message flow 
  → DO processes with LLM 
  → Push responses via WebSocket
```

**AI Gateway Request Flow**
```
DO needs LLM inference 
  → Calls AI Gateway endpoint 
  → Gateway checks cache (if enabled) 
  → Route to Workers AI (fast) OR external LLM (complex) 
  → Log request/response for observability 
  → Return to DO 
  → DO processes response
```

## Novel Architectural Patterns

This project introduces several innovative patterns that don't have established precedents:

### Pattern 1: Stateful Serverless Personalization

**Problem:** Traditional serverless is stateless, making true personalization difficult without external databases that add latency and complexity.

**Solution:** Each student gets a dedicated Durable Object that maintains state in-memory and persists automatically, combining the benefits of serverless (automatic scaling, no infrastructure) with stateful compute (persistent connections, in-memory state).

**Implementation:**
```typescript
// Each student gets a unique DO instance
const studentId = getInternalStudentId(clerkUserId);
const doId = env.COMPANION.idFromName(studentId);
const companion = env.COMPANION.get(doId);

// DO maintains state across invocations
class StudentCompanion extends DurableObject {
  private db: D1Database;
  private cache: Map<string, any>; // In-memory cache
  private websockets: Set<WebSocket>;
  
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.db = env.DB; // Isolated D1 connection
    this.cache = new Map();
    this.websockets = new Set();
  }
  
  // State persists between method calls
  // WebSockets maintained in memory
  // D1 provides durable storage
}
```

**Why Novel:** Combines serverless auto-scaling with stateful per-user instances, enabling true personalization without external state stores.

**Affects Epics:** All (1-6)

### Pattern 2: Automatic Memory Consolidation ("Sleep" Process)

**Problem:** AI companions need both immediate context (short-term memory) and deep understanding (long-term memory), but manually managing memory is error-prone and doesn't scale.

**Solution:** Durable Object Alarms schedule automatic "sleep" processes that consolidate short-term memories into long-term knowledge using LLM-based summarization, mimicking human memory consolidation during sleep.

**Implementation:**
```typescript
class StudentCompanion extends DurableObject {
  async ingestSession(sessionData: SessionData) {
    // Store in short-term memory
    await this.db.prepare(
      'INSERT INTO short_term_memory (content, timestamp) VALUES (?, ?)'
    ).bind(sessionData.content, Date.now()).run();
    
    // Schedule consolidation alarm (e.g., 4 hours later)
    const alarmTime = Date.now() + (4 * 60 * 60 * 1000);
    await this.state.storage.setAlarm(alarmTime);
  }
  
  async alarm() {
    // Triggered automatically by Durable Object
    const shortTermMemories = await this.loadShortTermMemory();
    
    // LLM consolidates into insights
    const insights = await this.consolidateMemories(shortTermMemories);
    
    // Update long-term memory
    await this.updateLongTermMemory(insights);
    
    // Cleanup short-term memory
    await this.archiveShortTermMemory();
  }
}
```

**Why Novel:** Automated, per-user memory lifecycle management using serverless scheduling, mimicking biological memory consolidation.

**Affects Epics:** Epic 2 (primary), Epics 3-6 (depends on consolidated memory)

### Pattern 3: Type-Safe RPC Without REST APIs

**Problem:** Traditional REST APIs require maintaining separate type definitions, route handlers, and client code, leading to type mismatches and boilerplate.

**Solution:** Cloudflare Workers RPC allows direct method invocation on Durable Objects with full TypeScript type safety, eliminating REST boilerplate while maintaining type consistency.

**Implementation:**
```typescript
// Shared types (src/lib/rpc/types.ts)
export interface StudentCompanionRPC {
  sendMessage(message: string): Promise<AIResponse>;
  startPractice(subject: string): Promise<PracticeSession>;
  getProgress(): Promise<ProgressData>;
}

// Server (src/durable-objects/StudentCompanion.ts)
export class StudentCompanion extends DurableObject implements StudentCompanionRPC {
  async sendMessage(message: string): Promise<AIResponse> {
    // Implementation with full type safety
  }
  
  async startPractice(subject: string): Promise<PracticeSession> {
    // Implementation with full type safety
  }
  
  async getProgress(): Promise<ProgressData> {
    // Implementation with full type safety
  }
}

// Client (React hooks)
const companion = useStudentCompanion();
const response = await companion.sendMessage("Help with algebra");
// ↑ Full TypeScript autocomplete and type checking
```

**Why Novel:** Zero-overhead RPC with compile-time type safety, no code generation or manual type synchronization required.

**Affects Epics:** All (1-6)

### Pattern 4: Hybrid Storage Strategy for AI Applications

**Problem:** AI applications need different storage for different data types (raw transcripts, structured data, vector embeddings), but managing multiple storage systems is complex.

**Solution:** Coordinated use of R2 (raw data), D1 (structured queries), and Vectorize (semantic search) with Durable Object as the orchestrator, providing optimal storage for each data type while maintaining consistency.

**Implementation:**
```typescript
class StudentCompanion extends DurableObject {
  async ingestSession(sessionData: SessionData) {
    // 1. Store raw transcript in R2
    const transcriptKey = `sessions/${this.studentId}/${sessionData.id}.json`;
    await this.env.R2.put(transcriptKey, JSON.stringify(sessionData.transcript));
    
    // 2. Store metadata in D1 for queries
    await this.db.prepare(
      'INSERT INTO session_metadata (id, date, duration, subjects, r2_key) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      sessionData.id, 
      sessionData.date, 
      sessionData.duration, 
      sessionData.subjects, 
      transcriptKey
    ).run();
    
    // 3. Generate and store embeddings in Vectorize
    const embeddings = await this.generateEmbeddings(sessionData.content);
    await this.env.VECTORIZE.upsert({
      id: sessionData.id,
      values: embeddings,
      metadata: { studentId: this.studentId, type: 'session' }
    });
    
    // 4. Store processed summary in short-term memory (D1)
    await this.storeShortTermMemory(sessionData);
  }
  
  async findRelevantContext(query: string): Promise<Context[]> {
    // Query Vectorize for semantic relevance
    const similarSessions = await this.env.VECTORIZE.query(query, { topK: 5 });
    
    // Load metadata from D1
    const metadata = await this.loadSessionMetadata(similarSessions.ids);
    
    // Fetch full transcripts from R2 only if needed
    const transcripts = await Promise.all(
      metadata.map(m => this.env.R2.get(m.r2_key))
    );
    
    return transcripts;
  }
}
```

**Why Novel:** Orchestrated multi-storage strategy optimized for AI workloads, with Durable Object providing consistency layer across storage types.

**Affects Epics:** Epics 1-4 (data storage and retrieval)

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Patterns

**Files and Directories:**
- **React Components:** PascalCase (e.g., `ChatInterface.tsx`, `StudentCompanion.ts`)
- **Utilities/Hooks:** camelCase (e.g., `useStudentCompanion.ts`, `formatDate.ts`)
- **Types/Interfaces:** PascalCase (e.g., `StudentData.ts`, `MemoryRecord.ts`)
- **Directories:** kebab-case (e.g., `durable-objects/`, `ai-gateway/`)

**Code Entities:**
- **Interfaces/Types:** PascalCase with descriptive names (e.g., `StudentCompanionRPC`, `PracticeSession`)
- **Functions/Methods:** camelCase, verb-first (e.g., `sendMessage`, `loadMemory`, `generateQuestions`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Database Tables:** snake_case (e.g., `short_term_memory`, `practice_sessions`)
- **Database Columns:** snake_case (e.g., `student_id`, `created_at`, `session_duration`)

**Durable Object Naming:**
- **Class Names:** PascalCase + "DO" suffix optional (e.g., `StudentCompanion`)
- **Instance IDs:** Use `idFromName(studentId)` pattern consistently
- **Storage Keys:** snake_case (e.g., `last_consolidation`, `active_sessions`)

**R2 Key Patterns:**
- **Sessions:** `sessions/{studentId}/{sessionId}.json`
- **Assets:** `assets/{type}/{filename}`
- Always use forward slashes, lowercase, descriptive segments

**Vectorize IDs:**
- **Format:** `{type}:{entityId}` (e.g., `session:abc123`, `question:xyz789`)
- Enables filtering by type using metadata

### Structure Patterns

**Component Organization:**
```
src/components/
  ├── ui/              # shadcn/ui base components
  ├── {feature}/       # Feature-specific components
  │   ├── {Feature}Main.tsx      # Main container
  │   ├── {Feature}Item.tsx      # Sub-components
  │   └── use{Feature}.ts        # Feature hook
  └── layout/          # Layout components
```

**Hooks Pattern:**
- One hook per file
- Export as default with descriptive name
- Co-locate with feature if feature-specific
- Place in `/hooks` if shared across features

**Type Definitions:**
- Shared types in `/types` directory
- Feature-specific types in feature directory
- RPC types in `/lib/rpc/types.ts` (shared client/server)
- Database types generated from schema

**Durable Object Structure:**
```typescript
export class StudentCompanion extends DurableObject {
  // Private fields
  private db: D1Database;
  private cache: Map<string, any>;
  private websockets: Set<WebSocket>;
  
  // Constructor
  constructor(state: DurableObjectState, env: Env) { }
  
  // Lifecycle methods
  async alarm() { }
  
  // Public RPC methods (alphabetical)
  async getProgress() { }
  async sendMessage() { }
  async startPractice() { }
  
  // Private helper methods (alphabetical)
  private async loadMemory() { }
  private async storeMemory() { }
}
```

**Test Organization:**
- Co-locate tests with source: `Component.test.tsx` next to `Component.tsx`
- Use `describe` blocks for grouping related tests
- One assertion per test when possible

**Testing Patterns:**
```typescript
// Vitest configuration (vite.config.ts)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // For React components
    setupFiles: './src/test/setup.ts'
  }
});

// Component test example (ChatInterface.test.tsx)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';

describe('ChatInterface', () => {
  it('renders message input', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });
});

// Durable Object test example (StudentCompanion.test.ts)
import { describe, it, expect } from 'vitest';
import { StudentCompanion } from './StudentCompanion';

describe('StudentCompanion', () => {
  it('consolidates short-term memory', async () => {
    // Unit test for consolidation logic
    const memories = [{ content: 'test', timestamp: Date.now() }];
    const consolidated = await consolidateMemories(memories);
    expect(consolidated).toBeDefined();
  });
});
```

**Testing Strategy:**
- **Unit Tests**: Core logic functions (consolidation, question generation)
- **Component Tests**: Critical UI components (chat, practice interface)
- **Manual Testing**: End-to-end flows, visual design, DO behavior
- **Minimal Automation**: Focus on high-value tests, not 100% coverage

### Format Patterns

**API Response Format (RPC):**
```typescript
// Success response
{
  data: T,           // Actual response data
  meta?: {           // Optional metadata
    timestamp: string,
    requestId: string
  }
}

// Error response
{
  error: {
    code: string,     // Machine-readable error code
    message: string,  // Human-readable message
    details?: any     // Additional error context
  }
}
```

**Date/Time Format:**
- **Storage:** ISO 8601 strings in D1 (e.g., `2025-01-27T10:30:00Z`)
- **Display:** Relative time for recent ("2 hours ago"), absolute for old
- **Timezone:** UTC in storage, user's local in display
- **Timestamps:** Unix milliseconds for alarm scheduling

**Database Query Results:**
- Always use prepared statements with parameter binding
- Return arrays for multiple results, single object for one result
- Use `NULL` for missing values, never `undefined` in database

**LLM Prompt Format:**
```typescript
const prompt = {
  system: "System context and instructions",
  messages: [
    { role: "user", content: "User message" },
    { role: "assistant", content: "AI response" }
  ],
  temperature: 0.7,  // Consistent default
  max_tokens: 500    // Reasonable default
};
```

### Communication Patterns

**WebSocket Messages:**
```typescript
// Client → Server
{
  type: "message" | "practice" | "ping",
  payload: any,
  requestId: string  // For correlation
}

// Server → Client
{
  type: "response" | "notification" | "pong",
  payload: any,
  requestId?: string  // If responding to request
}
```

**RPC Error Handling:**
```typescript
// Throw custom errors from DO methods
class StudentCompanionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

// Client catches and handles
try {
  await companion.sendMessage(msg);
} catch (error) {
  if (error instanceof StudentCompanionError) {
    // Handle known error
  } else {
    // Handle unknown error
  }
}
```

**Event Names (if using event emitters):**
- Use colon-separated namespaces: `companion:message:sent`
- Past tense for completed actions
- Present tense for ongoing states

### Lifecycle Patterns

**Component Lifecycle:**
```typescript
// React Query for data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['student', 'progress'],
  queryFn: () => companion.getProgress(),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  refetchOnWindowFocus: false
});

// Show loading state
if (isLoading) return <LoadingSpinner />;

// Show error state
if (error) return <ErrorDisplay error={error} />;

// Show data
return <ProgressDisplay data={data} />;
```

**Durable Object Lifecycle:**
```typescript
class StudentCompanion extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Initialize connections
    this.db = env.DB;
    // DO NOT await async operations in constructor
  }
  
  // Use lazy initialization for async setup
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.loadCache();
      this.initialized = true;
    }
  }
  
  async sendMessage(msg: string) {
    await this.ensureInitialized();
    // Handle request
  }
}
```

**Error Recovery:**
- Retry transient errors (network, timeout) up to 3 times with exponential backoff
- Log and surface persistent errors to user
- Never silently swallow errors

### Location Patterns

**Routing (Workers):**
```typescript
// Pattern: /{api|ws}/{resource}/{action}
/api/companion/message      // RPC endpoint
/ws/companion               // WebSocket endpoint
/assets/*                   // Static assets (Vite build output)
/*                          // Fallback to index.html (SPA)
```

**Database Migrations:**
- Location: `src/lib/db/migrations/`
- Naming: `{timestamp}_{description}.sql` (e.g., `20250127_create_memory_tables.sql`)
- Run in order, track applied migrations in `_migrations` table

**Environment Variables:**
- Defined in `wrangler.jsonc` under `vars` (non-sensitive) or `secrets` (sensitive)
- Access via `env.VARIABLE_NAME` in Workers/DO
- Never hardcode secrets in code

### Consistency Patterns

**Error Handling Strategy:**
```typescript
// DO method error handling
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

**Logging Strategy:**
```typescript
// Structured logging pattern
console.log(JSON.stringify({
  level: 'info' | 'warn' | 'error',
  timestamp: new Date().toISOString(),
  component: 'StudentCompanion',
  action: 'sendMessage',
  studentId: this.studentId,
  duration: endTime - startTime,
  metadata: { /* additional context */ }
}));
```

**Date Handling:**
```typescript
// Always use Date objects or ISO strings, never timestamps
const now = new Date().toISOString();  // Storage
const display = formatDistanceToNow(parseISO(now));  // Display

// Use date-fns for all date operations
import { format, parseISO, formatDistanceToNow } from 'date-fns';
```

**Loading States:**
- Always show loading indicators for async operations >200ms
- Use skeleton screens for initial loads
- Use spinners for user-triggered actions
- Show progress bars for long operations

## Consistency Rules

**All patterns defined in Implementation Patterns section above apply to all code written by AI agents.**

**Key Enforcements:**
- **Naming:** PascalCase components, camelCase functions, snake_case database, kebab-case directories
- **Structure:** Feature-based organization, co-located tests, shared types in `/types`
- **Formats:** ISO 8601 dates, structured JSON responses, prepared SQL statements
- **Communication:** Type-safe RPC, structured WebSocket messages, custom error classes
- **Lifecycle:** React Query for fetching, lazy DO initialization, retry transient errors
- **Locations:** Consistent routing patterns, timestamped migrations, secrets in env
- **Consistency:** Structured logging, date-fns for dates, loading indicators >200ms

**Agent Mandate:** When implementing any story, refer to Implementation Patterns section for specific guidance. If a pattern doesn't exist for your use case, follow the closest existing pattern.

## Data Architecture

### Database Schema (D1)

**Core Tables:**

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

-- Practice sessions
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  difficulty_level INTEGER DEFAULT 1,     -- 1-5 scale
  questions_total INTEGER NOT NULL,
  questions_correct INTEGER NOT NULL,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Practice questions
CREATE TABLE practice_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_options TEXT NOT NULL,           -- JSON array
  correct_answer TEXT NOT NULL,
  student_answer TEXT,
  is_correct BOOLEAN,
  time_to_answer_seconds INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id)
);

-- Progress tracking (multi-dimensional)
CREATE TABLE progress_tracking (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  dimension TEXT NOT NULL,                -- 'subject', 'goal', 'overall'
  dimension_value TEXT NOT NULL,          -- e.g., 'Algebra', 'SAT Prep'
  metric_type TEXT NOT NULL,              -- 'mastery', 'practice_count', 'streak'
  metric_value REAL NOT NULL,
  last_updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE(student_id, dimension, dimension_value, metric_type)
);

-- Subject knowledge tracking
CREATE TABLE subject_knowledge (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0,         -- 0.0 to 1.0
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TEXT,
  struggles TEXT,                         -- JSON: specific topics
  strengths TEXT,                         -- JSON: specific topics
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE(student_id, subject)
);

-- Engagement tracking (for retention features)
CREATE TABLE engagement_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  event_type TEXT NOT NULL,               -- 'session', 'practice', 'login', 'nudge_sent'
  event_data TEXT,                        -- JSON: event-specific data
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Consolidation history (audit trail)
CREATE TABLE consolidation_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  consolidated_at TEXT NOT NULL,
  short_term_items_processed INTEGER,
  long_term_items_updated INTEGER,
  status TEXT DEFAULT 'success',          -- 'success', 'partial', 'failed'
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_students_clerk_id ON students(clerk_user_id);
CREATE INDEX idx_short_term_student ON short_term_memory(student_id, created_at DESC);
CREATE INDEX idx_long_term_student_category ON long_term_memory(student_id, category);
CREATE INDEX idx_sessions_student_date ON session_metadata(student_id, date DESC);
CREATE INDEX idx_practice_student ON practice_sessions(student_id, started_at DESC);
CREATE INDEX idx_progress_student_dimension ON progress_tracking(student_id, dimension, dimension_value);
CREATE INDEX idx_subject_knowledge_student ON subject_knowledge(student_id, subject);
CREATE INDEX idx_engagement_student_type ON engagement_events(student_id, event_type, created_at DESC);
```

### R2 Storage Structure

```
sessions/
  {studentId}/
    {sessionId}.json          -- Raw session transcript
    {sessionId}_metadata.json -- Additional metadata

mock-data/
  transcripts/
    diverse_sessions/         -- Varied mock data for testing
```

**Session Transcript Format:**
```json
{
  "id": "session_abc123",
  "student_id": "student_xyz",
  "date": "2025-01-27T14:30:00Z",
  "duration_minutes": 60,
  "tutor_name": "Jane Smith",
  "subjects": ["Algebra", "Quadratic Equations"],
  "transcript": [
    {
      "speaker": "tutor",
      "timestamp": "00:02:15",
      "text": "Let's work through quadratic equations..."
    },
    {
      "speaker": "student",
      "timestamp": "00:03:10",
      "text": "I'm confused about the discriminant..."
    }
  ],
  "topics_covered": [
    "Quadratic formula",
    "Discriminant calculation",
    "Root types"
  ],
  "student_struggles": ["Discriminant concept"],
  "student_successes": ["Factoring simple equations"]
}
```

### Vectorize Index Structure

**Index Configuration:**
- **Dimensions:** 768 (matching `@cf/baai/bge-base-en-v1.5` model)
- **Metric:** Cosine similarity
- **Index Name:** `session-embeddings`

**Vector Metadata Schema:**
```typescript
{
  id: "session:abc123" | "question:xyz789",
  values: number[],  // 768-dimensional embedding
  metadata: {
    student_id: string,
    type: "session" | "question" | "topic",
    subject?: string,
    date?: string,
    content_preview: string  // First 100 chars
  }
}
```

### Data Relationships

```
Students (1) ─── (N) Short-Term Memory
Students (1) ─── (N) Long-Term Memory
Students (1) ─── (N) Session Metadata ─── (1) R2 Transcript
Students (1) ─── (N) Practice Sessions ─── (N) Practice Questions
Students (1) ─── (N) Progress Tracking
Students (1) ─── (N) Subject Knowledge
Students (1) ─── (N) Engagement Events
Students (1) ─── (N) Consolidation History

Session Metadata (1) ─── (N) Vectorize Embeddings (by metadata)
```

### Data Flow Lifecycle

**1. Session Ingestion:**
```
Transcript Upload → R2 Storage → Session Metadata (D1) → 
Generate Embeddings → Vectorize → Short-Term Memory (D1) → 
Schedule Consolidation Alarm
```

**2. Memory Consolidation:**
```
Alarm Triggers → Load Short-Term (D1) → LLM Consolidation → 
Update Long-Term (D1) → Archive Short-Term → Log History
```

**3. Practice Generation:**
```
Student Request → Query Vectorize (relevant sessions) → 
Load Session Metadata (D1) → Fetch Transcripts (R2) → 
Generate Questions (LLM) → Store Questions (D1) → Return
```

**4. Progress Tracking:**
```
Practice Complete → Calculate Metrics → Update Progress (D1) → 
Update Subject Knowledge (D1) → Log Engagement Event (D1)
```

## API Contracts

### Student Companion RPC Methods

**Type-safe RPC interface exposed by Student Companion Durable Object:**

```typescript
interface StudentCompanionRPC {
  // Authentication & Initialization
  initialize(clerkUserId: string): Promise<StudentProfile>;
  
  // Chat & Messaging
  sendMessage(message: string): Promise<AIResponse>;
  getChatHistory(limit?: number): Promise<ChatMessage[]>;
  
  // Session Management
  ingestSession(sessionData: SessionData): Promise<IngestResult>;
  getSessionHistory(limit?: number): Promise<SessionMetadata[]>;
  
  // Practice
  startPractice(options: PracticeOptions): Promise<PracticeSession>;
  submitAnswer(questionId: string, answer: string): Promise<AnswerFeedback>;
  completePractice(sessionId: string): Promise<PracticeResult>;
  
  // Progress & Analytics
  getProgress(dimension?: string): Promise<ProgressData>;
  getSubjectKnowledge(): Promise<SubjectKnowledge[]>;
  getStreaks(): Promise<StreakData>;
  
  // Memory
  getShortTermMemory(limit?: number): Promise<MemoryItem[]>;
  getLongTermMemory(category?: string): Promise<MemoryItem[]>;
  triggerConsolidation(): Promise<ConsolidationResult>;  // Manual trigger for testing
}
```

**Request/Response Types:**

```typescript
// Chat
interface AIResponse {
  message: string;
  type: 'chat' | 'socratic' | 'escalation';
  metadata?: {
    confidence: number;
    sources?: string[];  // Session IDs referenced
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Practice
interface PracticeOptions {
  subject?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  questionCount?: number;
  focusAreas?: string[];  // Specific topics
}

interface PracticeSession {
  id: string;
  subject: string;
  questions: PracticeQuestion[];
  startedAt: string;
}

interface PracticeQuestion {
  id: string;
  text: string;
  options: string[];
  metadata: {
    difficulty: number;
    topic: string;
  };
}

interface AnswerFeedback {
  isCorrect: boolean;
  explanation: string;
  correctAnswer?: string;  // Only if incorrect
  nextQuestion?: PracticeQuestion;
}

interface PracticeResult {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  duration: number;  // seconds
  subjectMasteryDelta: number;  // Change in mastery
  achievements?: string[];
}

// Progress
interface ProgressData {
  overall: {
    practiceSessionsCompleted: number;
    tutoringSessionsCompleted: number;
    currentStreak: number;
    longestStreak: number;
  };
  bySubject: {
    [subject: string]: {
      mastery: number;  // 0.0 to 1.0
      practiceCount: number;
      lastPracticed: string;
    };
  };
  byGoal?: {
    [goal: string]: {
      progress: number;  // 0.0 to 1.0
      sessionsCompleted: number;
    };
  };
}

// Memory
interface MemoryItem {
  id: string;
  content: string;  // Human-readable summary
  type: 'short_term' | 'long_term';
  category?: string;
  createdAt: string;
  importance?: number;
}

// Session ingestion
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
  embeddingsGenerated: number;
  consolidationScheduledFor?: string;
}
```

### WebSocket Protocol

**Connection:**
```typescript
// Client initiates WebSocket to /ws/companion
ws://workers-domain/ws/companion?token={clerkJWT}&studentId={internalStudentId}
```

**Message Format:**

```typescript
// Client → Server
{
  type: "message" | "practice" | "ping" | "subscribe",
  payload: any,
  requestId: string  // UUID for correlation
}

// Server → Client
{
  type: "response" | "notification" | "pong" | "error",
  payload: any,
  requestId?: string,  // Present if responding to request
  timestamp: string
}
```

**Message Types:**

```typescript
// Chat message
Client: {
  type: "message",
  payload: { text: "Help me with algebra" },
  requestId: "req-123"
}

Server: {
  type: "response",
  payload: {
    message: "I'd love to help! What specific algebra topic?",
    type: "socratic"
  },
  requestId: "req-123",
  timestamp: "2025-01-27T10:30:00Z"
}

// Real-time notification (proactive)
Server: {
  type: "notification",
  payload: {
    notificationType: "practice_available",
    message: "New practice questions ready for Algebra!",
    actionUrl: "/practice/algebra"
  },
  timestamp: "2025-01-27T10:35:00Z"
}

// Progress update (server push)
Server: {
  type: "notification",
  payload: {
    notificationType: "progress_update",
    data: {
      subject: "Algebra",
      mastery: 0.75,
      masteryDelta: +0.05
    }
  },
  timestamp: "2025-01-27T10:40:00Z"
}

// Heartbeat
Client: {
  type: "ping",
  requestId: "ping-1"
}

Server: {
  type: "pong",
  requestId: "ping-1",
  timestamp: "2025-01-27T10:30:05Z"
}
```

### Error Responses

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
  };
}

// Common error codes
const ERROR_CODES = {
  INVALID_INPUT: "Input validation failed",
  UNAUTHORIZED: "Authentication required",
  NOT_FOUND: "Resource not found",
  RATE_LIMITED: "Too many requests",
  INTERNAL_ERROR: "Internal server error",
  LLM_TIMEOUT: "AI service timeout",
  DB_ERROR: "Database operation failed"
};
```

## Security Architecture

### Authentication & Authorization

**Clerk Authentication Flow:**
```
1. User logs in via Clerk (frontend)
2. Clerk issues JWT with user claims
3. Frontend includes JWT in all requests (RPC) and WebSocket handshake
4. Workers middleware validates JWT signature and expiry
5. Extract Clerk user ID from JWT
6. Lookup/create internal student ID in D1
7. Route request to student's Durable Object using internal ID
```

**JWT Validation (Workers Middleware):**
```typescript
async function validateClerkToken(request: Request): Promise<string> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('UNAUTHORIZED');
  
  // Verify JWT signature using Clerk's JWKS
  const payload = await verifyJWT(token, env.CLERK_JWKS_URL);
  
  // Extract Clerk user ID
  return payload.sub;  // Clerk user ID
}
```

**Internal Student ID Mapping:**
- Clerk user ID stored in D1 `students` table
- Internal student ID is UUID v4, never exposed to client
- Mapping table ensures one-to-one relationship
- Internal ID used for all Durable Object routing

### Data Isolation

**Per-Student Isolation:**
- Each student gets unique Durable Object instance (via `idFromName(studentId)`)
- Durable Object maintains isolated D1 database connection
- All queries scoped to `student_id` column
- No cross-student data access possible
- WebSocket connections isolated per DO instance

**Database Row-Level Security:**
```sql
-- All queries include student_id filter
SELECT * FROM short_term_memory WHERE student_id = ?;
SELECT * FROM practice_sessions WHERE student_id = ?;

-- Foreign key constraints enforce referential integrity
FOREIGN KEY (student_id) REFERENCES students(id)
```

**R2 Object Isolation:**
- All R2 keys prefixed with `sessions/{studentId}/`
- DO can only access keys matching its student ID
- No bucket-wide list operations allowed

**Vectorize Isolation:**
- All vectors tagged with `student_id` in metadata
- Queries filtered by metadata: `{ student_id: thisStudentId }`
- No cross-student semantic search possible

### Data Protection

**Encryption:**
- **In Transit:** All HTTPS/TLS (Cloudflare automatic)
- **At Rest:** Cloudflare encrypts all storage (D1, R2, Vectorize) automatically
- **WebSocket:** WSS (secure WebSocket) enforced
- **Secrets:** Environment variables stored in Cloudflare secrets (encrypted)

**Data Retention:**
- Short-term memory: Expires after consolidation (configurable TTL)
- Long-term memory: Persists indefinitely unless student requests deletion
- Session transcripts: Retained in R2 for reference
- Practice history: Retained for progress tracking
- User can request complete data deletion (GDPR compliance ready)

### Input Validation

**All Inputs Validated:**
```typescript
// Example validation pattern
async sendMessage(message: string): Promise<AIResponse> {
  // Length validation
  if (message.length > 5000) {
    throw new StudentCompanionError('Message too long', 'INVALID_INPUT', 400);
  }
  
  // Content validation (basic)
  if (message.trim().length === 0) {
    throw new StudentCompanionError('Message empty', 'INVALID_INPUT', 400);
  }
  
  // Sanitize for storage (prevent injection)
  const sanitized = sanitizeInput(message);
  
  // Process...
}
```

**SQL Injection Prevention:**
- Always use prepared statements with parameter binding
- Never string concatenation for SQL queries
- D1 driver handles escaping automatically

**XSS Prevention:**
- All user content sanitized before display
- React's automatic escaping for text content
- HTML sanitization for any rich text (if added)

### Access Controls

**Workers Middleware Checks:**
```typescript
// Every request validates authentication
async function handleRequest(request: Request) {
  // Validate JWT
  const clerkUserId = await validateClerkToken(request);
  
  // Get/create internal student ID
  const studentId = await getOrCreateStudentId(clerkUserId);
  
  // Route to DO with verified student ID
  const doId = env.COMPANION.idFromName(studentId);
  const companion = env.COMPANION.get(doId);
  
  // Forward request
  return companion.fetch(request);
}
```

**Durable Object Method Access:**
- All public methods assume authenticated request (validated by Workers)
- Internal methods are private (TypeScript private keyword)
- No public methods expose sensitive internal state directly

### Secrets Management

**Environment Variables:**
```jsonc
// wrangler.jsonc
{
  "vars": {
    // Non-sensitive configuration
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "info"
  }
}

// Secrets (set via wrangler CLI, never in code)
// wrangler secret put CLERK_SECRET_KEY
// wrangler secret put OPENAI_API_KEY
// wrangler secret put ANTHROPIC_API_KEY
```

**Access Pattern:**
```typescript
// In Workers/DO
const apiKey = env.OPENAI_API_KEY;  // From secret
```

### Compliance Considerations

**COPPA/FERPA Ready (for production):**
- Data isolation architecture supports regulatory requirements
- Parental consent flow can be added to Clerk authentication
- Data retention policies configurable
- Export/deletion capabilities built into architecture

**Note:** As a showcase project with mock data, full COPPA/FERPA compliance not implemented in MVP, but architecture designed to support it.

## Performance Considerations

### Performance Targets (from PRD NFRs)

- **Chat Response Time:** < 200ms (excluding LLM processing)
- **Durable Object Access:** Sub-second response times
- **Initial Page Load:** < 2 seconds on 3G connection
- **Practice Question Generation:** < 1 second from request to display
- **Progress Visualization:** < 500ms for data aggregation

### Optimization Strategies

**Durable Object Performance:**
```typescript
class StudentCompanion extends DurableObject {
  private cache: Map<string, CachedData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  
  // In-memory caching for frequent reads
  private async getCachedOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<T> {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached as T;
    }
    
    const data = await loader();
    this.cache.set(key, data as any);
    this.cacheExpiry.set(key, Date.now() + ttlMs);
    
    return data;
  }
  
  // Batch D1 queries
  async getStudentData() {
    // Single query instead of multiple
    const result = await this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM practice_sessions WHERE student_id = ?) as practice_count,
        (SELECT AVG(mastery_level) FROM subject_knowledge WHERE student_id = ?) as avg_mastery
      FROM students WHERE id = ?
    `).bind(this.studentId, this.studentId, this.studentId).first();
    
    return result;
  }
}
```

**Database Query Optimization:**
- Indexed columns for all WHERE clauses
- Batch updates instead of individual INSERTs
- Use prepared statements (cached by D1)
- Limit result sets with TOP/LIMIT clauses
- Avoid SELECT *, specify needed columns

**LLM Response Optimization:**
```typescript
async generatePracticeQuestions(subject: string): Promise<Question[]> {
  // Check cache first
  const cached = await this.getCachedQuestions(subject);
  if (cached) return cached;
  
  // Use Workers AI for speed (fast path)
  try {
    const questions = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: buildPracticePrompt(subject),
      max_tokens: 500
    });
    
    await this.cacheQuestions(subject, questions);
    return questions;
    
  } catch (error) {
    // Fallback to external LLM if Workers AI fails
    return this.generateViaAIGateway(subject);
  }
}
```

**Frontend Optimization:**
- **Code Splitting:** Lazy load components with React.lazy()
- **React Query:** Aggressive caching (5 min staleTime for progress)
- **Optimistic Updates:** Update UI immediately, sync in background
- **Skeleton Screens:** Show structure while loading data
- **Virtual Scrolling:** For long chat histories (react-window)

**Asset Optimization:**
- Vite automatically code splits and tree shakes
- Images served from R2 with Cloudflare CDN caching
- Tailwind purges unused CSS in production
- Bundle size monitored (target < 300KB initial)

### Caching Strategy

**Client-Side (React Query):**
```typescript
// Progress data cached for 5 minutes
const { data } = useQuery({
  queryKey: ['progress', studentId],
  queryFn: () => companion.getProgress(),
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000
});

// Practice sessions cached for 1 minute
const { data } = useQuery({
  queryKey: ['practice', sessionId],
  queryFn: () => companion.getPracticeSession(sessionId),
  staleTime: 60 * 1000
});
```

**Durable Object In-Memory Cache:**
- Student profile: 5 minutes
- Long-term memory: 10 minutes (changes infrequently)
- Subject knowledge: 2 minutes
- Cache invalidated on writes

**Vectorize Query Optimization:**
- Limit topK to reasonable number (5-10)
- Filter by metadata early to reduce search space
- Cache embedding generation for repeated content

### Monitoring Performance

**Cloudflare Workers Observability:**
- CPU time per request tracked automatically
- Duration metrics logged
- Slow query logging (> 500ms)

**Custom Performance Logging:**
```typescript
async sendMessage(msg: string): Promise<AIResponse> {
  const start = Date.now();
  
  try {
    const response = await this.processMessage(msg);
    
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn('Slow message processing', { duration, msgLength: msg.length });
    }
    
    return response;
  } finally {
    // Always log performance
    console.log(JSON.stringify({
      action: 'sendMessage',
      duration: Date.now() - start,
      studentId: this.studentId
    }));
  }
}
```

## Deployment Architecture

### Cloudflare Deployment Model

**Single Deployment, Global Edge:**
- React frontend + Workers backend deployed as single unit
- Automatically distributed to Cloudflare's global edge network
- Zero infrastructure management required
- Automatic HTTPS, DDoS protection, CDN included

**Deployment Command:**
```bash
# Deploy to production
npm run deploy

# Deploys to Cloudflare Workers
# - Compiles TypeScript
# - Builds React app with Vite
# - Uploads to Cloudflare
# - Configures bindings (DO, D1, R2, Vectorize, AI)
```

### Environment Configuration

**wrangler.jsonc (Complete Configuration):**
```jsonc
{
  "name": "ai-study-companion",
  "main": "src/worker.ts",
  "compatibility_date": "2025-02-11",
  "compatibility_flags": ["nodejs_compat"],
  
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },
  
  "durable_objects": {
    "bindings": [
      {
        "name": "COMPANION",
        "class_name": "StudentCompanion",
        "script_name": "ai-study-companion"
      }
    ]
  },
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ai-study-companion-prod",
      "database_id": "created-via-wrangler-d1-create"
    }
  ],
  
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "session-embeddings"
    }
  ],
  
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "ai-study-companion-sessions"
    }
  ],
  
  "ai": {
    "binding": "AI"
  },
  
  "vars": {
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "info",
    "CLERK_PUBLISHABLE_KEY": "pk_live_..."
  }
}
```

**Secrets (set separately via CLI):**
```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put AI_GATEWAY_ID
```

### Resource Provisioning

**Initial Setup (One-Time):**
```bash
# Create D1 database
wrangler d1 create ai-study-companion-prod
# Copy database_id to wrangler.jsonc

# Run migrations
wrangler d1 migrations apply ai-study-companion-prod

# Create R2 bucket
wrangler r2 bucket create ai-study-companion-sessions

# Create Vectorize index
wrangler vectorize create session-embeddings --dimensions=768 --metric=cosine

# Set up AI Gateway
# (via Cloudflare dashboard - get gateway ID)
```

### CI/CD Pipeline

**GitHub Actions (Example):**
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build
      - run: npm run test
      
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
```

### Environment Strategies

**Development:**
- `wrangler dev` - Local development with hot reload
- Uses local Miniflare for Durable Objects simulation
- D1 local database for development
- Mock LLM responses to avoid API costs

**Staging:**
- Separate wrangler config: `wrangler.staging.jsonc`
- Separate D1/R2/Vectorize resources
- Test with real AI integrations
- Preview deployments for PRs

**Production:**
- Main deployment from `main` branch
- Production resources with backups
- Full observability enabled
- Secrets managed securely

## Development Environment

### Prerequisites

**Required:**
- Node.js 20+ (LTS)
- npm 10+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (free tier sufficient for development)
- Clerk account (free tier)

**Optional:**
- Git
- VS Code with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript

### Setup Commands

```bash
# 1. Create project from starter
npm create cloudflare@latest ai-study-companion -- --type=web-app --framework=react --git=true

cd ai-study-companion

# 2. Install dependencies
npm install --save-dev @cloudflare/workers-types vitest @testing-library/react @testing-library/jest-dom jsdom
npm install @clerk/clerk-js @tanstack/react-query
npm install class-variance-authority clsx tailwind-merge lucide-react date-fns

# 3. Initialize shadcn/ui
npx shadcn@latest init
# Select options:
# - Style: Default
# - Base color: Violet
# - CSS variables: Yes

# 4. Install commonly needed shadcn components
npx shadcn@latest add button card input dialog progress tabs tooltip badge

# 5. Configure Cloudflare resources (see Deployment Architecture)
wrangler d1 create ai-study-companion-dev
wrangler r2 bucket create ai-study-companion-dev
wrangler vectorize create session-embeddings-dev --dimensions=768 --metric=cosine

# 6. Set up environment secrets
wrangler secret put CLERK_SECRET_KEY --env dev
wrangler secret put OPENAI_API_KEY --env dev
wrangler secret put ANTHROPIC_API_KEY --env dev

# 7. Run database migrations
wrangler d1 migrations apply ai-study-companion-dev

# 8. Start development server
npm run dev
# Runs Wrangler dev + Vite dev concurrently
```

### Development Workflow

**Local Development:**
```bash
# Start dev server (Workers + Vite HMR)
npm run dev

# Run type checking
npm run type-check

# Run linter
npm run lint

# Format code
npm run format

# Run tests (Vitest)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Database Operations:**
```bash
# Create new migration
wrangler d1 migrations create ai-study-companion-dev {migration_name}

# Apply migrations
wrangler d1 migrations apply ai-study-companion-dev

# Execute SQL directly (development)
wrangler d1 execute ai-study-companion-dev --command="SELECT * FROM students LIMIT 10"
```

**Durable Objects Testing:**
```bash
# Wrangler dev automatically simulates DO locally
# Access DO via: http://localhost:8787/api/companion/...

# View DO state
wrangler dev --local-protocol=https --inspect
```

### IDE Configuration

**VS Code settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

**TypeScript paths (tsconfig.json):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

## Architecture Decision Records

Key architectural decisions documented for reference:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Platform** | Cloudflare (Workers + DO + D1 + R2 + Vectorize) | Stateful serverless, integrated services, global edge, cost-effective |
| **Communication** | Workers RPC | Type-safe, zero boilerplate, direct DO method invocation |
| **Storage Strategy** | Hybrid (R2/D1/Vectorize) | Optimal storage per data type, DO orchestrates consistency |
| **Scheduling** | Durable Object Alarms | Per-student scheduling, no external queue, survives hibernation |
| **Authentication** | Clerk | Modern auth, JWT-based, minimal implementation |
| **Client State** | React Query | Purpose-built for async fetching, caching, optimistic updates |
| **UI Components** | shadcn/ui | Copy-paste control, Radix accessibility, Tailwind-based |
| **Testing** | Vitest | Vite-native, minimal automation, unit + manual testing |

**Trade-offs Accepted:**
- Cloudflare vendor lock-in (acceptable for showcase)
- RPC pattern is Cloudflare-specific (enables type safety)
- Multi-storage complexity (optimal performance/cost per type)
- DO Alarms tied to instance lifecycle (enables per-student isolation)

---

_Architecture v1.0 - 2025-01-27 - For: Adam_

