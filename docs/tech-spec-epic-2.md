# Epic Technical Specification: Memory Intelligence

Date: 2025-11-08
Author: Adam
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 implements the intelligent memory system that enables true personalization in AI-Study-Companion. This epic builds upon the foundation established in Epic 1, adding automatic memory consolidation ("sleep" process) and context-aware memory retrieval that allows the companion to provide personalized responses based on each student's learning history.

The goal is to demonstrate intelligent memory management that enables true personalization. By the end of this epic, the companion automatically consolidates short-term memories into long-term knowledge, retrieves relevant memories when responding to students, and generates context-aware responses that reference the student's personal history. This epic implements Pattern 2 (Automatic Memory Consolidation) from the architecture, proving that serverless can deliver sophisticated data lifecycle management through Durable Object Alarms and LLM-based consolidation.

## Objectives and Scope

**In-Scope:**
- Automatic memory consolidation ("sleep" process) using Durable Object Alarms
- LLM-based consolidation logic that analyzes and categorizes short-term memories
- Long-term memory updates with consolidated insights and background knowledge
- Memory retrieval functions that query both short-term and long-term memory
- Relevance filtering and ranking for memory retrieval
- Context-aware response generation that uses retrieved memories
- Integration of memory retrieval with chat response generation
- Personalization demonstration through memory usage in responses

**Out-of-Scope:**
- Practice question generation (deferred to Epic 3)
- Socratic Q&A implementation (deferred to Epic 3)
- Subject knowledge tracking algorithms (deferred to Epic 4)
- Tutor escalation detection (deferred to Epic 4)
- Progress visualization UI (deferred to Epic 3)
- Real tutoring platform integration (using mocked data)
- Advanced memory search algorithms (basic relevance filtering only)

## System Architecture Alignment

This epic implements the memory intelligence components referenced in the Architecture document:

**Pattern 2: Automatic Memory Consolidation ("Sleep" Process)** - Durable Object Alarms schedule automatic consolidation that runs periodically without manual intervention, using LLM-based summarization to consolidate short-term memories into long-term knowledge.

**Data Architecture** - Extends the memory tables (short_term_memory, long_term_memory) established in Epic 1, adding consolidation_history table for audit trail as defined in Architecture section "Database Schema (D1)".

**AI Gateway Integration** - Uses AI Gateway for LLM consolidation (Workers AI for fast path, external LLM for complex reasoning) as specified in Architecture "Integration Points > Memory Consolidation" section.

**Technology Stack** - Leverages Durable Object Alarms, D1 transactions, Workers AI, and AI Gateway as specified in Architecture "Decision Summary" table.

**Constraints:**
- Must use Durable Object Alarms for scheduling (no external cron jobs)
- Must use LLM for consolidation (no rule-based approach)
- Must preserve important information during consolidation
- Must maintain production-ready state management
- Memory retrieval must be efficient (< 200ms excluding LLM)

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| **Memory Consolidation** (`StudentCompanion.alarm()`) | Automatic consolidation triggered by DO Alarm | Short-term memory records, consolidation schedule | Consolidated long-term memory, archived short-term memory | Backend |
| **Consolidation Logic** (`StudentCompanion.consolidateMemories()`) | LLM-based analysis and categorization of memories | Short-term memory array | Consolidated insights, category assignments | Backend |
| **Memory Retrieval** (`StudentCompanion.retrieveRelevantMemories()`) | Query and filter memories by relevance | Query context, memory type filter | Ranked memory items | Backend |
| **Relevance Scoring** (`StudentCompanion.scoreMemoryRelevance()`) | Calculate relevance score for memory items | Memory content, query context | Relevance scores (0-1) | Backend |
| **Context-Aware Response** (`StudentCompanion.sendMessage()` enhanced) | Generate responses using retrieved memories | User message, retrieved memories | Personalized AI response | Backend |
| **Consolidation History** (`consolidation_history` table) | Audit trail for consolidation events | Consolidation results | Historical records | Backend |

### Data Models and Contracts

**Database Tables (D1) - New/Extended:**

```sql
-- Consolidation history (audit trail)
CREATE TABLE consolidation_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  consolidated_at TEXT NOT NULL,
  short_term_items_processed INTEGER NOT NULL,
  long_term_items_updated INTEGER NOT NULL,
  status TEXT DEFAULT 'success',          -- 'success', 'partial', 'failed'
  error_message TEXT,                     -- If status is 'failed' or 'partial'
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Index for consolidation history queries
CREATE INDEX idx_consolidation_student_date ON consolidation_history(student_id, consolidated_at DESC);
```

**Extended Memory Structures:**

```typescript
// Enhanced memory interfaces
interface MemoryConsolidationResult {
  shortTermItemsProcessed: number;
  longTermItemsCreated: number;
  longTermItemsUpdated: number;
  categories: string[];  // Categories created/updated
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

interface ConsolidatedInsight {
  category: 'background' | 'strengths' | 'struggles' | 'goals';
  content: string;  // JSON: consolidated summary
  confidenceScore: number;  // 0.0 to 1.0
  sourceSessionIds: string[];
}

interface MemoryRetrievalOptions {
  query?: string;  // Context for relevance scoring
  memoryType?: 'short_term' | 'long_term' | 'both';
  category?: string;  // Filter by long-term category
  limit?: number;  // Max items to return
  minRelevanceScore?: number;  // Minimum relevance threshold
}

interface RetrievedMemory {
  id: string;
  type: 'short_term' | 'long_term';
  content: string;
  category?: string;
  relevanceScore: number;
  createdAt: string;
  importanceScore?: number;
  confidenceScore?: number;
}
```

**LLM Prompt Structures:**

```typescript
interface ConsolidationPrompt {
  system: string;  // System instructions for consolidation
  memories: Array<{
    id: string;
    content: string;
    importanceScore: number;
    createdAt: string;
  }>;
  studentContext?: string;  // Existing long-term memory summary
}

interface ConsolidationResponse {
  insights: ConsolidatedInsight[];
  summary: string;  // Overall consolidation summary
}
```

### APIs and Interfaces

**Extended Student Companion RPC Methods:**

```typescript
interface StudentCompanionRPC {
  // ... existing methods from Epic 1 ...
  
  // Memory Management (Epic 2)
  getShortTermMemory(limit?: number): Promise<MemoryItem[]>;
  getLongTermMemory(category?: string): Promise<MemoryItem[]>;
  retrieveRelevantMemories(options: MemoryRetrievalOptions): Promise<RetrievedMemory[]>;
  triggerConsolidation(): Promise<ConsolidationResult>;  // Manual trigger for testing
  getConsolidationHistory(limit?: number): Promise<ConsolidationHistory[]>;
  
  // Enhanced Chat (Epic 2)
  sendMessage(message: string): Promise<AIResponse>;  // Now uses memory retrieval
}

// Enhanced AI Response with memory context
interface AIResponse {
  message: string;
  type: 'chat' | 'socratic' | 'escalation';
  metadata?: {
    confidence: number;
    sources?: string[];  // Session IDs referenced
    memoriesUsed?: string[];  // Memory IDs used for context
    personalizationLevel: 'none' | 'low' | 'medium' | 'high';
  };
}

interface ConsolidationResult {
  success: boolean;
  shortTermItemsProcessed: number;
  longTermItemsCreated: number;
  longTermItemsUpdated: number;
  error?: string;
}

interface ConsolidationHistory {
  id: string;
  consolidatedAt: string;
  shortTermItemsProcessed: number;
  longTermItemsUpdated: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}
```

### Workflows and Sequencing

**Memory Consolidation Workflow:**

```
1. Durable Object Alarm triggers (scheduled after session ingestion)
   ↓
2. Load short-term memories from D1 (WHERE expires_at <= NOW())
   ↓
3. If no memories to consolidate → Log and reschedule alarm
   ↓
4. Load existing long-term memory for context
   ↓
5. Build consolidation prompt with short-term memories + context
   ↓
6. Call AI Gateway (Workers AI fast path, fallback to external LLM)
   ↓
7. Parse consolidation response (insights by category)
   ↓
8. Begin D1 transaction:
   a. Insert/update long-term memory records
   b. Archive short-term memories (move to archive or delete)
   c. Insert consolidation_history record
   ↓
9. Commit transaction
   ↓
10. Log consolidation completion
   ↓
11. Schedule next alarm (if more memories pending)
```

**Memory Retrieval Workflow:**

```
1. Student sends message via sendMessage()
   ↓
2. Extract query context from message (keywords, intent)
   ↓
3. Retrieve short-term memories (last N items, high importance)
   ↓
4. Retrieve long-term memories (all categories or specific)
   ↓
5. Score relevance for each memory:
   - Keyword matching
   - Semantic similarity (if Vectorize available)
   - Recency (for short-term)
   - Importance/confidence scores
   ↓
6. Rank memories by relevance score
   ↓
7. Filter by minRelevanceScore threshold
   ↓
8. Limit to top N memories (default: 5)
   ↓
9. Format memories for LLM context
   ↓
10. Generate response using memories + message
   ↓
11. Return response with metadata (memories used, personalization level)
```

**Context-Aware Response Generation:**

```
1. User message received
   ↓
2. Retrieve relevant memories (see Memory Retrieval Workflow)
   ↓
3. Build LLM prompt:
   - System: Companion personality + memory context
   - Messages: Conversation history + current message
   - Context: Retrieved memories formatted as background
   ↓
4. Call AI Gateway for response generation
   ↓
5. Parse response and extract:
   - Main message content
   - References to student history (if any)
   - Personalization indicators
   ↓
6. Store message in short-term memory (for future context)
   ↓
7. Return response with metadata
```

## Non-Functional Requirements

### Performance

**Memory Consolidation:**
- Consolidation process completes within 30 seconds for typical batch (10-20 short-term memories)
- LLM consolidation call: < 10 seconds (Workers AI) or < 20 seconds (external LLM fallback)
- D1 transaction commit: < 500ms

**Memory Retrieval:**
- Memory retrieval (excluding LLM): < 200ms (per PRD NFR)
- Relevance scoring for 50 memories: < 100ms
- Database queries: < 100ms (indexed queries)

**Context-Aware Response:**
- Total response time: < 2 seconds (including LLM processing)
- Memory retrieval + scoring: < 200ms
- LLM response generation: < 1.5 seconds (Workers AI) or < 3 seconds (external LLM)

**Measurement:** Response times measured at 95th percentile, excluding external API calls beyond our control.

### Security

**Memory Data Protection:**
- All memory content stored encrypted at rest (Cloudflare D1 automatic encryption)
- Memory queries scoped to student_id (row-level security)
- No cross-student memory access possible (Durable Object isolation)

**LLM Prompt Security:**
- Memory content sanitized before sending to LLM (remove PII if present)
- Consolidation prompts do not expose sensitive student data unnecessarily
- AI Gateway logs do not contain full memory content (truncated for privacy)

**Consolidation Process Security:**
- Alarm triggers validated (only scheduled alarms execute)
- Transaction rollback on errors (no partial consolidation state)
- Error messages logged without exposing sensitive memory content

**Data Retention:**
- Short-term memory expires after consolidation (configurable TTL)
- Long-term memory persists indefinitely (student data retention policy)
- Consolidation history retained for audit trail (30 days minimum)

### Reliability/Availability

**Consolidation Reliability:**
- Consolidation process retries on transient failures (up to 3 attempts)
- Partial failures logged but do not block future consolidations
- Failed consolidations marked in history for manual review
- Alarm reschedules automatically if consolidation fails

**Memory Retrieval Reliability:**
- Graceful degradation: If memory retrieval fails, response generated without memory context
- Fallback to basic response if LLM unavailable
- Memory queries use prepared statements (SQL injection prevention)

**State Consistency:**
- D1 transactions ensure atomic consolidation (all-or-nothing)
- No orphaned memory records (foreign key constraints)
- Consolidation history provides audit trail for debugging

**Availability:**
- Memory retrieval available even if consolidation in progress (non-blocking)
- Consolidation runs asynchronously (does not block user requests)
- DO Alarms survive DO hibernation (scheduled alarms persist)

### Observability

**Logging Requirements:**
- Consolidation events logged with: student_id, items processed, status, duration
- Memory retrieval logged with: student_id, query context, memories retrieved count, duration
- LLM calls logged with: provider, model, tokens used, duration, success/failure
- Errors logged with full context (student_id, operation, error message, stack trace)

**Metrics to Track:**
- Consolidation success rate (success / total attempts)
- Average consolidation duration
- Memory retrieval latency (p50, p95, p99)
- Personalization level distribution (none/low/medium/high)
- LLM usage by provider (Workers AI vs external)

**Structured Logging Format:**
```typescript
{
  level: 'info' | 'warn' | 'error',
  timestamp: ISO8601,
  component: 'StudentCompanion',
  action: 'consolidateMemories' | 'retrieveMemories' | 'sendMessage',
  studentId: string,
  duration: number,
  metadata: { /* operation-specific data */ }
}
```

**Debugging Support:**
- Consolidation history table provides audit trail
- Manual consolidation trigger for testing/debugging
- Memory retrieval can be tested independently
- LLM prompts logged (truncated) for debugging response quality

## Dependencies and Integrations

**External Dependencies:**
- **Workers AI** (`@cloudflare/ai`) - Fast LLM inference for consolidation and responses
- **AI Gateway** - Unified LLM interface with fallback to external providers (OpenAI/Anthropic)
- **Durable Object Alarms** - Native scheduling for consolidation triggers
- **D1 Database** - Transactional storage for memory and consolidation history

**Internal Dependencies:**
- **Epic 1 Foundation** - StudentCompanion DO class, memory tables, RPC infrastructure
- **Database Schema** - short_term_memory, long_term_memory tables (from Epic 1)
- **RPC Client** - Type-safe communication (from Epic 1)

**Integration Points:**
- **Session Ingestion** (Epic 1) - Triggers consolidation alarm scheduling
- **Chat Interface** (Epic 1) - Uses enhanced sendMessage() with memory retrieval
- **Future Epics** - Memory retrieval used by Epic 3 (practice generation), Epic 4 (escalation detection)

**Version Constraints:**
- Cloudflare Workers compatibility_date: "2025-02-11" (for DO Alarms support)
- Workers AI models: Latest available (`@cf/meta/llama-3.1-8b-instruct` for text generation)
- D1: Latest (transactional support required)

## Acceptance Criteria (Authoritative)

**AC-2.1.1:** Given companion has short-term memories stored, when the consolidation process runs, then short-term memories are analyzed and categorized.

**AC-2.1.2:** Given consolidation process runs, then relevant information is moved/consolidated into long-term memory.

**AC-2.1.3:** Given consolidation process runs, then short-term memory is cleaned up (old items removed or archived).

**AC-2.1.4:** Given consolidation process runs, then long-term memory maintains at least basic student background.

**AC-2.1.5:** Given consolidation is scheduled, then process runs periodically without manual intervention.

**AC-2.1.6:** Given consolidation completes, then consolidation preserves important information.

**AC-2.1.7:** Given consolidation runs, then the process demonstrates production-ready state management.

**AC-2.1.8:** Given consolidation completes, then I can verify consolidation happened by checking memory structures.

**AC-2.2.1:** Given companion has both short-term and long-term memories, when a student sends a message, then companion retrieves relevant short-term memories.

**AC-2.2.2:** Given companion has both short-term and long-term memories, when a student sends a message, then companion retrieves relevant long-term memories.

**AC-2.2.3:** Given memories are retrieved, then memories are used to inform response generation.

**AC-2.2.4:** Given memories are used in response, then response demonstrates awareness of student's history/context.

**AC-2.2.5:** Given memory retrieval executes, then memory retrieval is efficient (doesn't slow down responses).

**AC-2.2.6:** Given memories are retrieved, then retrieved memories are relevant to the current conversation.

**AC-2.2.7:** Given response is generated, then I can verify memory usage in companion responses.

**AC-2.3.1:** Given companion can retrieve memories, when I have a conversation with my companion, then responses reference my past sessions or learning history.

**AC-2.3.2:** Given conversation occurs, then companion remembers what I've learned.

**AC-2.3.3:** Given conversation occurs, then companion adapts responses based on my progress.

**AC-2.3.4:** Given conversation occurs, then responses feel personalized, not generic.

**AC-2.3.5:** Given personalized responses are generated, then personalization is visible in the conversation.

**AC-2.3.6:** Given conversation occurs, then companion demonstrates understanding of my learning journey.

## Traceability Mapping

| AC ID | Spec Section | Component/API | Test Idea |
|-------|--------------|---------------|-----------|
| AC-2.1.1 | Services and Modules > Memory Consolidation | `StudentCompanion.consolidateMemories()` | Unit test: Verify memories are analyzed and categorized by LLM |
| AC-2.1.2 | Workflows > Memory Consolidation | `StudentCompanion.alarm()` → D1 transaction | Integration test: Verify short-term memories moved to long-term |
| AC-2.1.3 | Workflows > Memory Consolidation | D1 transaction (archive short-term) | Integration test: Verify old short-term memories removed/archived |
| AC-2.1.4 | Data Models > ConsolidatedInsight | Long-term memory INSERT/UPDATE | Integration test: Verify basic student background maintained |
| AC-2.1.5 | Workflows > Memory Consolidation | Durable Object Alarms | E2E test: Verify alarm schedules automatically after session ingestion |
| AC-2.1.6 | Workflows > Memory Consolidation | LLM consolidation logic | Unit test: Verify important information preserved in consolidation |
| AC-2.1.7 | Workflows > Memory Consolidation | D1 transaction atomicity | Integration test: Verify transaction rollback on errors |
| AC-2.1.8 | Data Models > ConsolidationHistory | `getConsolidationHistory()` RPC | Integration test: Verify consolidation_history records created |
| AC-2.2.1 | APIs > retrieveRelevantMemories() | `StudentCompanion.retrieveRelevantMemories()` | Unit test: Verify short-term memories retrieved by relevance |
| AC-2.2.2 | APIs > retrieveRelevantMemories() | `StudentCompanion.retrieveRelevantMemories()` | Unit test: Verify long-term memories retrieved by relevance |
| AC-2.2.3 | Workflows > Context-Aware Response | `sendMessage()` enhanced | Integration test: Verify memories passed to LLM prompt |
| AC-2.2.4 | Workflows > Context-Aware Response | AI Response metadata | E2E test: Verify response references student history |
| AC-2.2.5 | Performance NFR | Memory retrieval latency | Performance test: Verify retrieval < 200ms (excluding LLM) |
| AC-2.2.6 | Services > Relevance Scoring | `scoreMemoryRelevance()` | Unit test: Verify relevance scores rank memories correctly |
| AC-2.2.7 | APIs > AIResponse metadata | Response metadata.memoriesUsed | Integration test: Verify memory IDs included in response |
| AC-2.3.1 | Workflows > Context-Aware Response | LLM prompt with memory context | E2E test: Verify responses reference past sessions |
| AC-2.3.2 | Workflows > Context-Aware Response | Long-term memory retrieval | E2E test: Verify companion references learned concepts |
| AC-2.3.3 | Workflows > Context-Aware Response | Progress-based adaptation | E2E test: Verify responses adapt to student progress |
| AC-2.3.4 | Workflows > Context-Aware Response | Personalization level | E2E test: Verify responses feel personalized vs generic |
| AC-2.3.5 | APIs > AIResponse metadata | metadata.personalizationLevel | E2E test: Verify personalization level visible in conversation |
| AC-2.3.6 | Workflows > Context-Aware Response | Memory context in responses | E2E test: Verify companion demonstrates understanding of journey |

## Risks, Assumptions, Open Questions

**Risks:**

**R-2.1:** LLM consolidation may fail or produce low-quality insights, leading to information loss or incorrect long-term memory updates.
- **Mitigation:** Implement retry logic, validate consolidation output, maintain audit trail, allow manual review of failed consolidations.

**R-2.2:** Memory retrieval latency may exceed 200ms target if relevance scoring is too complex or database queries are slow.
- **Mitigation:** Optimize relevance scoring algorithm, use database indexes, limit memory retrieval to top N items, cache frequently accessed memories.

**R-2.3:** Consolidation process may consume excessive LLM tokens/costs if run too frequently or with too many memories per batch.
- **Mitigation:** Batch memories efficiently, use Workers AI (free tier) for fast path, set reasonable consolidation frequency, monitor LLM usage.

**R-2.4:** DO Alarm scheduling may be unreliable or fail to trigger, causing memory consolidation delays.
- **Mitigation:** Implement alarm health checks, log alarm scheduling, provide manual trigger option, monitor alarm execution.

**Assumptions:**

**A-2.1:** Workers AI provides sufficient quality for memory consolidation (fast path). External LLM fallback available for complex cases.
**A-2.2:** D1 transactions provide sufficient atomicity for consolidation operations (no partial state).
**A-2.3:** Relevance scoring using keyword matching is sufficient for MVP (semantic similarity via Vectorize deferred).
**A-2.4:** Memory consolidation frequency of 4 hours after session ingestion is reasonable (configurable).

**Open Questions:**

**Q-2.1:** What is the optimal batch size for memory consolidation? (Start with 10-20 memories, adjust based on performance)
**Q-2.2:** Should short-term memories be archived or deleted after consolidation? (Start with deletion, add archive if needed)
**Q-2.3:** How to handle consolidation failures that leave system in inconsistent state? (Transaction rollback, manual review)
**Q-2.4:** What personalization level threshold indicates successful memory integration? (Start with "medium" or "high" in metadata)

## Test Strategy Summary

**Test Levels:**

**Unit Tests:**
- Memory consolidation logic (categorization, insight extraction)
- Relevance scoring algorithm (keyword matching, ranking)
- Memory retrieval filtering and ranking
- LLM prompt building (consolidation and response generation)
- Error handling and retry logic

**Integration Tests:**
- D1 transaction atomicity (consolidation all-or-nothing)
- DO Alarm scheduling and triggering
- Memory retrieval with database queries
- Consolidation history audit trail
- RPC method invocation with memory operations

**End-to-End Tests:**
- Full consolidation workflow (alarm → consolidation → verification)
- Memory retrieval → response generation → personalization verification
- Multiple consolidation cycles (verify state consistency)
- Error scenarios (LLM failure, database errors, alarm failures)

**Test Coverage Focus:**
- Core consolidation logic: 80%+ coverage
- Memory retrieval: 70%+ coverage
- Error handling: All error paths tested
- Integration points: All RPC methods tested

**Test Frameworks:**
- **Unit/Integration:** Vitest (already configured in Epic 1)
- **E2E:** Manual testing + automated RPC tests
- **Performance:** Custom performance tests for latency targets

**Edge Cases:**
- Empty short-term memory (no consolidation needed)
- Very large memory batches (50+ items)
- LLM timeout or failure (fallback behavior)
- Concurrent consolidation attempts (transaction locking)
- Memory retrieval with no relevant memories (graceful degradation)

