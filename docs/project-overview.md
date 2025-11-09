# AI Study Companion - Project Overview

## What We're Building

An **AI learning companion** that bridges the gap between tutoring sessions. Each student gets their own stateful AI companion (Durable Object) that:

- Automatically learns from tutoring sessions
- Provides personalized practice questions
- Tracks progress across multiple subjects/goals
- Knows when to escalate students back to human tutors

**Key Innovation:** Stateful serverless architecture using Cloudflare Durable Objects - each student gets an isolated companion instance with dual-memory system (short-term + long-term) and automatic memory consolidation.

---

## Tech Stack

| Component | Technology | What Devs Work With |
|-----------|-----------|---------------------|
| **Frontend** | React + Vite + TypeScript | Standard React components, Tailwind CSS, shadcn/ui |
| **Backend** | Cloudflare Workers + Durable Objects | TypeScript, Workers RPC (not REST) |
| **Database** | Cloudflare D1 (SQLite) | SQL migrations, prepared statements |
| **Storage** | R2 (transcripts), Vectorize (embeddings) | S3-like API, vector operations |
| **AI/LLM** | Workers AI + AI Gateway | LLM prompts, embeddings |
| **Auth** | Clerk | JWT validation, user mapping |

**Developer Skillset Needed:**

- TypeScript (required)
- React (frontend stories)
- SQL (database stories)
- LLM/AI prompt engineering (AI features)
- No DevOps - Cloudflare handles deployment

---

## Epic Breakdown

### ✅ Epic 1: Foundation & Core Architecture (COMPLETE)

**What Was Built:**

- Durable Object per student with isolated database
- Mock session data ingestion
- Basic UI with chat interface
- Core memory structures (short-term + long-term)

**Current State:** Working app with DO architecture functional. Can create student, ingest session, see basic UI.

---

### 🚧 Epic 2: Memory Intelligence (IN PROGRESS)

**Goal:** Smart memory system working

**Stories:**

1. Memory consolidation ("sleep" process) - automatic short-term → long-term
2. Memory retrieval using both memory types
3. Context-aware responses demonstrating personalization

**Technical Focus:**

- Durable Object Alarms for scheduling
- LLM-based consolidation logic
- D1 transactions for memory updates

**Complexity:** Medium-High (novel pattern: automatic memory consolidation)

---

### 📋 Epic 3: Learning Interactions (NEXT)

**Goal:** Core learning features functional

**Stories:**

1. Adaptive practice question generation from sessions
2. Socratic Q&A interface (guided discovery)
3. Multi-dimensional progress tracking + visualization

**Technical Focus:**

- Vectorize for semantic session search
- Workers AI for question generation
- React components for progress display
- D1 queries for analytics

**Complexity:** Medium (AI integration + data visualization)

---

### 📋 Epic 4: Intelligence & Escalation

**Goal:** Companion demonstrates intelligence

**Stories:**

1. Tutor escalation detection (LLM decides when tutor needed)
2. Subject knowledge tracking across hardcoded subjects
3. Natural escalation prompts + booking flow (mocked)

**Technical Focus:**

- AI Gateway for complex LLM reasoning
- Subject tracking schema in D1
- UI flows for escalation

**Complexity:** Medium

---

### 📋 Epic 5: Retention Features

**Goal:** Address churn and retention

**Stories:**

1. Post-session engagement (celebration, progress, streaks)
2. Goal achievement handling + related subject suggestions
3. Retention nudges (Day 7 nudge for <3 sessions)

**Technical Focus:**

- Durable Object Alarms for scheduled nudges
- Engagement event tracking in D1
- WebSocket push notifications

**Complexity:** Low-Medium

---

### 📋 Epic 6: Polish & Production Readiness

**Goal:** Almost production-ready showcase

**Stories:**

1. UI excellence (friendly but sophisticated)
2. Diverse mock data (realistic, convoluted scenarios)
3. Education method integration (spaced repetition, active recall, interleaving)

**Technical Focus:**

- UI/UX refinement across all components
- Mock data generators for R2 transcripts
- Learning algorithm implementations

**Complexity:** Low-Medium (refinement + data generation)

---

## Story Assignment Guide

### Frontend-Heavy Stories

**Assign to:** React developers

- UI components (Epic 3: progress visualization, Epic 5: celebration screens)
- Chat interface enhancements
- Responsive design work
- shadcn/ui component integration

### Backend-Heavy Stories

**Assign to:** Backend/systems developers

- Durable Object logic (Epic 2: consolidation, Epic 4: escalation)
- Database schema + migrations
- RPC method implementations
- Alarm scheduling

### AI/LLM Stories

**Assign to:** Developers with LLM experience

- Practice question generation (Epic 3)
- Memory consolidation prompts (Epic 2)
- Tutor escalation detection (Epic 4)
- Socratic Q&A implementation (Epic 3)

### Full-Stack Stories

**Assign to:** Versatile developers

- Session ingestion flow (backend + frontend)
- Progress tracking (DB + UI)
- Retention features (alarms + notifications + UI)

---

## Success Metrics (What "Done" Looks Like)

**Technical Showcase:**

- Memory consolidation "sleep" process working automatically
- Sub-second DO response times maintained
- System handles complex, convoluted mock data gracefully

**Product Functionality:**

- Practice completion rate: 70%+ (in demo scenarios)
- Multi-dimensional progress tracking visible
- Socratic teaching method demonstrable
- Tutor escalation triggers appropriately

**MVP Complete When:**

- Epics 1-3 functional (foundation + memory + learning)
- Can demo full student journey: session → practice → progress
- Memory system proves personalization value

---

## Story Sizing Reference

**Small (1-2 points):**

- UI component implementation
- Single RPC method
- Simple D1 query/mutation
- Basic prompt template

**Medium (3-5 points):**

- Complex UI feature (progress visualization)
- Multi-step workflow (practice session flow)
- LLM integration with fallback
- Database migration + related logic

**Large (5-8 points):**

- Memory consolidation system (Epic 2)
- Full practice generation pipeline (Epic 3)
- Tutor escalation detection (Epic 4)

**XL (Break Down!):**

- If estimate >8 points, break into smaller stories

---

## Resource Links

- **PRD:** [docs/PRD.md](./PRD.md)
- **Architecture:** [docs/architecture.md](./architecture.md)
- **Product Brief:** [docs/product-brief-AI-Study-Companion-2025-11-06.md](./product-brief-AI-Study-Companion-2025-11-06.md)
- **Wrangler Docs:** <https://developers.cloudflare.com/workers/>
- **Durable Objects:** <https://developers.cloudflare.com/durable-objects/>

---

_This overview provides the tactical information needed for story grooming, sprint planning, and developer assignment. For strategic context, see PRD. For technical deep-dive, see Architecture doc._
