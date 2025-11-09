# Memory Intelligence System

## Overview

The AI Study Companion implements a sophisticated dual-memory architecture that enables true personalization through automatic knowledge consolidation. This system allows the companion to "remember" each student's learning journey, adapting responses based on their background, strengths, struggles, and goals.

## The Magic Moment

When a student returns after multiple sessions, the companion remembers:
- "I know quadratic equations were challenging at first, but you've made great progress!"
- "Based on your strong algebra background, let's tackle this advanced concept"
- "You mentioned wanting to master calculus - this will help with that goal"

This personalization is powered by a dual-memory system that automatically consolidates session data into structured long-term knowledge.

## Dual-Memory Architecture

### Short-Term Memory
**Purpose:** Stores raw session data temporarily for consolidation
**Duration:** 4 hours after session ingestion
**Storage:** D1 Database (`short_term_memory` table)

Short-term memory captures:
- Session transcripts (conversation summaries)
- Topics covered during session
- Student struggles identified
- Student successes demonstrated
- Importance scores (for prioritization)

**Key Characteristics:**
- High volume, ephemeral data
- Expires after consolidation window
- Used as source material for LLM analysis

### Long-Term Memory
**Purpose:** Stores consolidated, structured knowledge about the student
**Duration:** Permanent (updated as new insights emerge)
**Storage:** D1 Database (`long_term_memory` table)

Long-term memory contains four categories:

1. **Background** - Student's academic context, subjects, grade level
2. **Strengths** - Topics/skills the student excels at
3. **Struggles** - Challenging concepts or persistent difficulties
4. **Goals** - Learning objectives and aspirations

**Key Characteristics:**
- Low volume, high-value data
- Confidence scores (updated as evidence accumulates)
- Source session tracking (provenance)
- Cached in-memory for fast retrieval

## Memory Consolidation Flow

```
┌─────────────────┐
│  Session Data   │
│   (Raw Input)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Short-Term     │◄───── Immediate storage
│    Memory       │       (expires in 4 hours)
└────────┬────────┘
         │
         │ Alarm triggers after 4 hours
         │
         ▼
┌─────────────────┐
│ LLM Analysis    │◄───── GPT-4 categorizes and
│ (Consolidation) │       extracts insights
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Long-Term      │◄───── Persistent storage
│    Memory       │       (student profile)
└────────┬────────┘
         │
         │ Cached for 10 minutes
         │
         ▼
┌─────────────────┐
│  Context        │◄───── Assembled for each
│   Assembly      │       chat interaction
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Personalized   │
│   Response      │
└─────────────────┘
```

## Consolidation Process Details

### 1. Session Ingestion
When a tutoring session is completed:
```typescript
await companion.ingestSession({
  id: 'session-123',
  date: '2025-11-08T15:00:00Z',
  subjects: ['Algebra'],
  transcript: [...],
  topics_covered: ['Quadratic equations', 'Discriminant'],
  student_struggles: ['Understanding discriminant purpose'],
  student_successes: ['Calculating discriminant correctly']
});
```

This creates a short-term memory entry with:
- Structured session data
- Importance score (default: 0.8)
- Expiration timestamp (4 hours from now)

### 2. Automatic Alarm Scheduling
Cloudflare Durable Object Alarms enable "sleep" functionality:
```typescript
// Schedule consolidation 4 hours after session
const alarmTime = Date.now() + (4 * 60 * 60 * 1000);
await this.ctx.storage.setAlarm(alarmTime);
```

The companion instance "sleeps" then automatically wakes when the alarm fires.

### 3. LLM-Powered Consolidation
When the alarm triggers:

**Step 3a: Retrieve Short-Term Memories**
```sql
SELECT * FROM short_term_memory
WHERE student_id = ? AND expires_at IS NOT NULL
ORDER BY importance_score DESC
LIMIT 20;
```

**Step 3b: Analyze with LLM**
```typescript
const prompt = `
Analyze these tutoring session summaries and extract:
1. Background information (subjects, context)
2. Strengths (topics student excels at)
3. Struggles (challenging concepts)
4. Goals (learning objectives)

Sessions:
${sessionData}

Return structured JSON with categories and confidence scores.
`;

const insights = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
  prompt,
  temperature: 0.3, // Low for consistent categorization
  max_tokens: 1000
});
```

**Step 3c: Update Long-Term Memory**
```typescript
for (const insight of insights) {
  // Check if similar memory exists
  const existing = await findSimilar(insight.content, insight.category);

  if (existing) {
    // Update: increase confidence, add source sessions
    await updateLongTermMemory(existing.id, {
      confidence_score: existing.confidence + 0.1,
      source_sessions: [...existing.sources, ...insight.sources]
    });
  } else {
    // Create: new insight discovered
    await createLongTermMemory({
      category: insight.category,
      content: insight.content,
      confidence_score: 0.5,
      source_sessions: insight.sources
    });
  }
}
```

**Step 3d: Archive Short-Term Memories**
```sql
UPDATE short_term_memory
SET expires_at = NULL
WHERE student_id = ? AND expires_at IS NOT NULL;
```

This preserves short-term data for audit purposes while preventing re-consolidation.

### 4. Consolidation History Tracking
```typescript
await recordConsolidation({
  consolidated_at: new Date().toISOString(),
  short_term_items_processed: 5,
  long_term_items_updated: 3,
  status: 'success'
});
```

## Context Assembly for Personalization

Before generating each response, the companion assembles context:

### 1. Retrieve Long-Term Memory (Cached)
```typescript
const context = {
  background: await getLongTermMemory('background'),
  strengths: await getLongTermMemory('strengths'),
  struggles: await getLongTermMemory('struggles'),
  goals: await getLongTermMemory('goals')
};
```

**Caching Strategy:**
- Long-term memory cached for 10 minutes
- Invalidated after consolidation completes
- Reduces database queries significantly

### 2. Retrieve Recent Short-Term Memory
```typescript
const recentSessions = await getShortTermMemory(5);
```

Provides immediate context from unconsolidated sessions.

### 3. Assemble System Prompt
```typescript
const systemPrompt = `
You are this student's AI learning companion.

STUDENT BACKGROUND:
${context.background.map(m => m.content).join('\n')}

STRENGTHS:
${context.strengths.map(m => m.content).join('\n')}

CURRENT CHALLENGES:
${context.struggles.map(m => m.content).join('\n')}

LEARNING GOALS:
${context.goals.map(m => m.content).join('\n')}

Use this knowledge to provide personalized, encouraging responses
that acknowledge their journey and build on their strengths.
`;
```

### 4. Generate Response
```typescript
const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ],
  temperature: 0.7,
  max_tokens: 500
});
```

The LLM generates responses informed by the student's complete profile.

## UI Components

### ProfileCard
**Location:** Home screen sidebar
**Purpose:** Display consolidated long-term memory
**Refresh:** Every 5 minutes (or on consolidation event)

Shows:
- Background information
- Learning goals
- Strengths
- Areas for growth

### RecentSessions
**Location:** Home screen sidebar
**Purpose:** Show recent session history
**Refresh:** Every 1 minute

Shows:
- Last 5-10 sessions
- Topics covered per session
- Consolidation status (pending/consolidated)
- Session dates

### MemoryStatus
**Location:** Home screen sidebar
**Purpose:** Display consolidation system status
**Refresh:** Every 30 seconds

Shows:
- Last consolidation timestamp
- Number of pending memories
- Next scheduled consolidation

### Personalization Badges
**Location:** Chat interface
**Purpose:** Highlight personalized responses

Displays "Personalized" badge when response references:
- Student's background
- Known strengths
- Previous struggles
- Learning goals

## Demo Data

### Progression Story
The demo data showcases a realistic learning journey:

**Session 1 (3 days ago):** Student struggles with discriminant concept
- "I don't understand why we need it"
- Confused about purpose and significance

**Session 2 (1 day ago):** Student practices and improves
- Correctly calculates discriminants
- Begins understanding practical value

**Session 3 (Current):** Student demonstrates mastery
- Explains discriminant concept clearly
- Identifies all root types confidently
- Shows metacognitive awareness of progress

**Expected Consolidation:**
```json
{
  "background": [
    "Currently studying Algebra with focus on quadratic equations"
  ],
  "struggles": [
    "Initially struggled with discriminant concept (Session 1)"
  ],
  "strengths": [
    "Mastered discriminant calculation and root type identification",
    "Shows strong progression in learning"
  ],
  "goals": [
    "Continue building confidence with quadratic equations"
  ]
}
```

**Personalized Response Example:**
> User: "Can you help me with discriminants again?"
>
> Companion: "I remember discriminants were confusing for you at first, but you made incredible progress! You went from struggling with the basic concept to mastering all three types of roots in just a few days. What specific aspect would you like to review?"

## Manual Consolidation (Testing)

For development and testing:

```typescript
// Trigger consolidation immediately (bypass alarm)
const result = await companion.triggerConsolidation();

console.log(`
  Processed: ${result.shortTermItemsProcessed} sessions
  Created: ${result.longTermItemsCreated} new memories
  Updated: ${result.longTermItemsUpdated} existing memories
`);
```

## Performance Optimizations

### 1. In-Memory Caching
- Long-term memory cached for 10 minutes
- Avoids redundant database queries
- Invalidated on consolidation

### 2. Batch Processing
- Consolidation processes max 20 memories per run
- Prevents excessive LLM token usage
- Prioritizes by importance score

### 3. Incremental Updates
- Existing memories updated with new evidence
- Confidence scores increment per supporting session
- Avoids duplicate entries

### 4. Lazy Loading
- Context assembled only when needed
- Short-term memory queried on-demand
- UI components fetch independently

## Observability

### Consolidation History
Track all consolidation runs:
```typescript
const history = await companion.getConsolidationHistory(10);

history.forEach(entry => {
  console.log(`
    Date: ${entry.consolidated_at}
    Processed: ${entry.short_term_items_processed}
    Updated: ${entry.long_term_items_updated}
    Status: ${entry.status}
  `);
});
```

### Memory Status
Monitor system health:
```typescript
const status = await companion.getMemoryStatus();

console.log(`
  Last Consolidation: ${status.lastConsolidation}
  Pending Memories: ${status.pendingMemories}
  Next Consolidation: ${status.nextConsolidation}
`);
```

### Logs
Cloudflare Workers logs track:
- Consolidation triggers (alarm events)
- LLM API calls and token usage
- Database query performance
- Cache hit/miss rates

## Best Practices

### For Developers

1. **Session Data Quality**
   - Provide detailed transcript summaries
   - Explicitly list struggles and successes
   - Include topic coverage

2. **Consolidation Timing**
   - 4-hour delay allows multiple sessions to batch
   - Reduces LLM API calls
   - Provides richer context for analysis

3. **Memory Updates**
   - Always check for existing similar memories
   - Update confidence scores incrementally
   - Track source sessions for provenance

4. **Testing**
   - Use manual consolidation trigger for tests
   - Verify long-term memory updates
   - Test personalized response generation

### For Product Teams

1. **User Communication**
   - Explain memory system in onboarding
   - Show consolidation status in UI
   - Highlight personalization with badges

2. **Privacy Considerations**
   - All data isolated to student's Durable Object
   - No cross-student data sharing
   - Clear data retention policies

3. **Performance Monitoring**
   - Track consolidation success rates
   - Monitor LLM token usage
   - Measure response personalization quality

## Future Enhancements

### Planned Features
- Vector embeddings for semantic memory search
- Multi-turn conversation context (beyond single message)
- Memory importance decay (older = lower confidence)
- User-triggered consolidation (on-demand insights)

### Experimental Ideas
- Cross-topic pattern recognition
- Learning velocity metrics
- Predictive struggle identification
- Personalized practice problem generation

## References

- [PRD: Epic 2 - Memory Intelligence](./PRD.md#Epic-2:-Memory-Intelligence)
- [Architecture: Data Flow Lifecycle](./architecture.md#Data-Flow-Lifecycle)
- [Story 2.1: Memory Consolidation Alarm System](./stories/2.1-memory-consolidation-alarm-system.md)
- [Story 2.2: LLM-Based Memory Consolidation Logic](./stories/2.2-llm-based-memory-consolidation-logic.md)
- [Story 2.3: Memory Retrieval and Context Assembly](./stories/2.3-memory-retrieval-and-context-assembly.md)
- [Story 2.4: Context-Aware Response Generation](./stories/2.4-context-aware-response-generation.md)
- [Story 2.5: Demonstrate Personalization Through Memory](./stories/2.5-demonstrate-personalization-through-memory.md)
