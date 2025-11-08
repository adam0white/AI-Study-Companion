# AI-Study-Companion - Epic Breakdown

**Author:** Adam
**Date:** 2025-01-27
**Project Level:** Medium Complexity
**Target Scale:** 100+ concurrent students

---

## Overview

This document provides the complete epic and story breakdown for AI-Study-Companion, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

### Epic Structure Summary

**Epic 1: Foundation & Core Architecture**
*Goal: Establish working application foundation with Durable Objects, basic UI, and core memory structures*
- Project setup and infrastructure initialization
- Durable Object per student with isolated database
- Basic UI foundation with chat interface
- Core memory system (short-term and long-term structures)
- Mock session data ingestion
- **Bug fixes: UI styling, authentication, and chat functionality** (Stories 1.10-1.12)

**Epic 2: Memory Intelligence**
*Goal: Implement smart memory system with automatic consolidation and context-aware retrieval*
- Memory consolidation ("sleep" process)
- Memory retrieval and context-aware responses
- Personalization demonstrated through memory usage

**Epic 3: Learning Interactions**
*Goal: Enable core learning features - adaptive practice and Socratic Q&A*
- Adaptive practice question generation
- Socratic Q&A interface
- Multi-dimensional progress tracking and visualization

**Epic 4: Intelligence & Escalation**
*Goal: Add intelligent features - tutor escalation detection and subject knowledge tracking*
- Tutor escalation detection (LLM-based)
- Subject knowledge tracking
- Natural escalation prompts and booking flow

**Epic 5: Retention Features**
*Goal: Implement features that maintain engagement and reduce churn*
- Post-session engagement (celebration, progress)
- Goal achievement handling with related subject suggestions
- Retention nudges (Day 7 nudge for <3 sessions)

**Epic 6: Polish & Production Readiness**
*Goal: Refine UI, add diverse mock data, and integrate proven education methods*
- UI excellence (friendly but sophisticated)
- Diverse mock data (realistic, convoluted scenarios)
- Education method integration (spaced repetition, active recall, interleaving)

**Sequencing Rationale:**
- Epic 1 establishes foundation that all subsequent work depends on
- Epic 2 builds the intelligence layer that enables personalization
- Epic 3 delivers core user value (learning interactions)
- Epic 4 adds intelligence that enhances the learning experience
- Epic 5 addresses retention and engagement
- Epic 6 polishes and demonstrates production readiness

This structure follows iterative incremental development - each epic produces visible, functional progress while building on previous work.

---

## Epic 1: Foundation & Core Architecture

**Goal:** Establish working application foundation with Durable Objects, basic UI, and core memory structures. By the end of this epic, we have a working app where we can create a student, ingest a session, and see basic UI with foundation systems operational.

### Story 1.1: Project Setup and Infrastructure Initialization

As a **developer**,
I want **project structure, build system, and deployment pipeline configured**,
So that **all subsequent development work has a solid foundation**.

**Acceptance Criteria:**

**Given** a new project repository
**When** I run the setup commands
**Then** the project has:
- Cloudflare Workers project structure initialized
- TypeScript configuration and build system
- Basic deployment pipeline (wrangler configuration)
- Core dependencies installed (Workers, Durable Objects, D1)
- Development environment ready for local testing
- Git repository initialized with appropriate .gitignore

**And** the project structure follows Cloudflare best practices
**And** I can deploy a basic "Hello World" worker to Cloudflare

**Prerequisites:** None (this is the foundation story)

**Technical Notes:**
- Use `wrangler init` or equivalent to bootstrap Cloudflare Workers project
- Configure TypeScript with appropriate compiler options
- Set up Durable Objects namespace configuration
- Configure D1 database bindings
- Create basic project structure (src/, types/, etc.)
- Install and configure Clerk authentication:
  - `npm install @clerk/clerk-js`
  - Set up JWT validation middleware in Workers
  - Store Clerk secrets via `wrangler secret put CLERK_SECRET_KEY`
  - Configure Clerk publishable key in wrangler.jsonc
- See Architecture document: "Project Initialization" and "Authentication & Authorization" sections for complete setup

---

### Story 1.2: Durable Object Companion Class Structure

As a **developer**,
I want **a Durable Object class that represents a student companion**,
So that **each student can have an isolated, stateful companion instance**.

**Acceptance Criteria:**

**Given** the project is set up (Story 1.1)
**When** I create a Durable Object companion class
**Then** the class:
- Extends DurableObject base class
- Has a constructor that initializes state
- Implements basic fetch handler for HTTP requests
- Has a unique ID based on student ID
- Can be instantiated via Durable Object namespace

**And** I can route requests to a companion using student ID
**And** each student ID creates/isolates a separate companion instance

**Prerequisites:** Story 1.1

**Technical Notes:**
- Create CompanionDO class in appropriate file structure
- Configure Durable Object binding in wrangler.toml
- Implement basic state initialization
- Student ID routing: `idFromName(studentId)` pattern
- See Architecture document: "Pattern 1: Stateful Serverless Personalization" and "Project Structure" sections

---

### Story 1.3: Isolated Database per Companion

As a **developer**,
I want **each companion to have its own isolated database**,
So that **student data is completely separated and secure**.

**Acceptance Criteria:**

**Given** a companion instance exists (Story 1.2)
**When** I access the companion's database
**Then**:
- Each companion has its own D1 database instance
- Database is isolated from other companions
- I can create tables and store data specific to that student
- Database persists across companion invocations

**And** database schema can be initialized per companion
**And** queries are scoped to that companion's database only

**Prerequisites:** Story 1.2

**Technical Notes:**
- Use D1 database binding per Durable Object
- Initialize schema on first companion creation
- Store database reference in companion state
- See Architecture document: "Data Architecture > Database Schema (D1)" section for complete table definitions

---

### Story 1.4: Card Gallery Home Interface

As a **student**,
I want **a card-based interface to access companion features**,
So that **I can easily navigate and see what's available**.

**Acceptance Criteria:**

**Given** I am a student accessing the application
**When** I open the application
**Then** I see:
- Hero card with greeting area (placeholder content initially)
- Action cards grid (Chat, Practice, Progress cards)
- Card-based layout that's friendly and approachable
- Responsive grid (1-col mobile, 2-col tablet, 3-col desktop)

**And** I can click cards to navigate (even if placeholder destinations)
**And** cards have basic hover/active states
**And** the interface is responsive (works on mobile and desktop)

**Prerequisites:** Story 1.1 (project setup)

**Technical Notes:**
- Create card-based layout using Card Gallery design direction
- Implement basic card components (Hero Card, Action Cards)
- Basic card state management (default, hover, active)
- No backend connection required yet (placeholder content)
- See Architecture document: "Technology Stack Details" and "Project Structure" sections for React + Vite + shadcn/ui setup
- UX design: docs/ux-design-specification.md (Card Gallery, lines 309-369)

**UX Design Impact:** Complexity increased from basic chat to card-based navigation system with multiple card types and states.

---

### Story 1.5: Chat Modal Interface

As a **student**,
I want **a chat interface to interact with my companion**,
So that **I can have conversations and ask questions**.

**Acceptance Criteria:**

**Given** card gallery exists (Story 1.4)
**When** I click the Chat action card
**Then**:
- Chat interface opens (modal on desktop, full-screen on mobile)
- I see chat message bubbles (companion and user messages)
- Message input area with send button
- Typing indicators when companion is responding
- Responsive chat interface

**And** I can type messages and see them appear
**And** chat interface can be closed to return to card gallery
**And** chat messages are clearly differentiated (companion vs user)

**Prerequisites:** Story 1.4

**Technical Notes:**
- Create chat modal component (shadcn/ui Dialog as base)
- Implement chat message bubble components (custom)
- Message input with send functionality
- Modal responsive behavior (full-screen mobile, centered desktop)
- No backend connection required yet (placeholder responses)
- UX design: docs/ux-design-specification.md (Chat Message Bubbles, lines 527-534)

**UX Design Impact:** New story - chat is now a modal, not main interface. Custom chat bubble component required.

---

### Story 1.6: Connect UI to Companion Backend

As a **student**,
I want **my chat messages to reach my companion**,
So that **I can have real conversations with my personalized companion**.

**Acceptance Criteria:**

**Given** chat UI exists (Story 1.5) and companion backend exists (Story 1.2)
**When** I send a message in the chat
**Then**:
- Message is sent to the companion Durable Object via HTTP request
- Companion receives the message and can process it
- Response is returned to the UI
- Response appears in the chat interface

**And** messages are routed to the correct companion based on student ID
**And** basic error handling is in place (network errors, etc.)

**Prerequisites:** Stories 1.2, 1.5

**Technical Notes:**
- Create API route in Worker that routes to Durable Object
- Implement fetch handler in companion to receive messages
- Add basic CORS handling if needed
- Simple request/response pattern (can be placeholder responses initially)
- Student ID passed via URL parameter or header

---

### Story 1.7: Core Memory System Structure

As a **developer**,
I want **memory structures for short-term and long-term memory**,
So that **the companion can store and retrieve student information**.

**Acceptance Criteria:**

**Given** a companion instance with database (Stories 1.2, 1.3)
**When** I implement memory structures
**Then**:
- Short-term memory structure is defined (schema/types)
- Long-term memory structure is defined (schema/types)
- Memory can be stored in companion's database
- Memory can be retrieved from database
- Basic memory operations (create, read) are functional

**And** memory structures support the data types needed (text, metadata, timestamps)
**And** memory is associated with the correct student (via companion isolation)

**Prerequisites:** Stories 1.2, 1.3

**Technical Notes:**
- Define TypeScript interfaces/types for memory structures
- Create database tables for short-term and long-term memory
- Implement basic CRUD operations for memory
- See Architecture document: "Data Architecture > Database Schema (D1)" section - short_term_memory and long_term_memory tables
- Short-term: recent, immediate context
- Long-term: consolidated, background knowledge

---

### Story 1.8: Mock Session Data Ingestion

As a **developer**,
I want **to ingest mock session data into the companion**,
So that **I can test the system with realistic data**.

**Acceptance Criteria:**

**Given** companion and memory system exist (Stories 1.2, 1.7)
**When** I provide mock session data (transcript/recording)
**Then**:
- Session data is processed and stored in companion's short-term memory
- Session metadata is extracted (date, duration, subjects)
- Key topics/concepts are identified (can be basic extraction initially)
- Session data is associated with the correct student companion

**And** I can verify session data is stored correctly
**And** multiple sessions can be ingested for the same student

**Prerequisites:** Stories 1.2, 1.7

**Technical Notes:**
- Create mock session data format (JSON structure)
- Implement ingestion endpoint or function
- Parse session data and extract metadata
- Store in short-term memory structure
- Basic topic extraction (can be keyword-based initially, LLM-based later)
- See Architecture document: "R2 Storage Structure" section for session transcript format (JSON schema)

---

### Story 1.9: Progress Card Component

As a **student**,
I want **to see my progress in the card gallery**,
So that **I can understand my learning journey at a glance**.

**Acceptance Criteria:**

**Given** card gallery exists (Story 1.4) and companion has data (Story 1.8)
**When** I view the card gallery
**Then** I see:
- Progress card in the card gallery
- Basic progress indicators (can be placeholder data initially)
- Visual representation of progress (bars, numbers, metrics)
- Progress information is displayed clearly

**And** progress card is responsive and accessible
**And** progress data can be fetched from companion (even if placeholder)
**And** clicking progress card can expand details (future story)

**Prerequisites:** Story 1.4

**Technical Notes:**
- Create progress card component (custom component)
- Basic progress data structure (can be mocked initially)
- Visual indicators (progress bars, percentages, metrics)
- Responsive layout within card grid
- See Architecture document: "Data Architecture > Database Schema" - progress_tracking and subject_knowledge tables
- UX design: docs/ux-design-specification.md (Progress Visualization, lines 541-547)

**UX Design Impact:** Progress is now a card in the gallery, not a separate section. Custom component required.

---

### Story 1.10: Fix UI Styling and Visibility Issues

As a **student**,
I want **all text and UI elements to be clearly visible and properly styled**,
So that **I can actually read and interact with the application**.

**Acceptance Criteria:**

**Given** the application is running (Stories 1.1-1.9)
**When** I view any page or component
**Then**:
- All text is visible with proper contrast (no white text on white background)
- Chat modal has proper opacity and is clearly visible (not transparent/difficult to view)
- Tailwind CSS is properly loaded and applied to all components
- All components use the Modern & Playful theme colors consistently
- Text colors meet WCAG 2.1 AA contrast requirements

**And** all card components are clearly visible with proper backgrounds
**And** chat interface has solid background with readable text
**And** all interactive elements have visible hover/active states
**And** no styling regressions from previous stories

**Prerequisites:** Stories 1.1-1.9

**Technical Notes:**
- Verify Tailwind CSS import and configuration is correct
- Check `index.css` for proper base styles
- Ensure all components use Tailwind classes or explicit colors
- Fix Dialog/Modal backdrop and content opacity
- Verify CSS cascade doesn't override intended styles
- Test across different browsers (Chrome, Firefox, Safari)
- **IMPORTANT:** Fix any other unrelated bugs or discrepancies encountered during this work

**Root Causes to Investigate:**
- CSS import syntax in `index.css` (`@import "tailwindcss"` may not be correct)
- Missing base text color classes on components
- Dialog overlay/content opacity settings
- Potential CSS build/bundling issues with Vite

---

### Story 1.11: Integrate Real Clerk Authentication

As a **student**,
I want **real authentication using Clerk**,
So that **my data is secure and I have a proper login experience**.

**Acceptance Criteria:**

**Given** Clerk is configured in the project (Story 1.1)
**When** I access the application
**Then**:
- Clerk authentication UI is displayed (sign-in/sign-up)
- I can sign in with real credentials (email/password, OAuth, etc.)
- JWT token is obtained from Clerk SDK (not mocked)
- Token is properly passed to all RPC requests
- Unauthenticated users cannot access companion features

**And** `App.tsx` uses real Clerk token getter (not `'mock-token-for-dev'`)
**And** `ChatModal.tsx` uses real Clerk token getter (not mock tokens)
**And** Worker validates real Clerk JWT tokens
**And** all "mock-token" placeholders are removed from codebase
**And** authentication state is properly managed (sign-in/sign-out)

**Prerequisites:** Story 1.1

**Technical Notes:**
- Install and configure `@clerk/clerk-react` for React components
- Add `<ClerkProvider>` to app root
- Use `useAuth()` hook to get real tokens
- Replace all mock token getters: `App.tsx:27`, `ChatModal.tsx:44`
- Implement proper auth flow: sign-in → token → RPC calls
- Add sign-out functionality
- Test token refresh and expiration handling
- Verify Worker JWT validation works with real Clerk tokens
- **IMPORTANT:** Fix any other unrelated bugs or discrepancies encountered during this work

**References:**
- Clerk React Quickstart: https://clerk.com/docs/quickstarts/react
- Clerk with Cloudflare Workers: https://clerk.com/docs/references/backend/overview

---

### Story 1.12: Verify and Fix Chat-to-Durable-Object Connection

As a **developer**,
I want **to verify the chat actually connects to and uses the Durable Object properly**,
So that **we have confidence the core architecture is working as designed**.

**Acceptance Criteria:**

**Given** chat UI exists (Story 1.5) and DO exists (Story 1.2)
**When** I send a message in the chat
**Then**:
- Message reaches the correct StudentCompanion Durable Object instance
- DO state is properly initialized and persisted
- DO responds with actual processing (not just placeholder echo)
- Memory system is used (short-term memory stores conversation)
- Multiple messages maintain conversation context
- Each student gets isolated DO instance (verified with logging/debugging)

**And** remove placeholder echo response: `StudentCompanion.ts:492` ("Echo: ${message} (AI integration coming in future stories)")
**And** implement basic AI response (can use Workers AI or simple logic for now)
**And** conversation history is stored in short-term memory
**And** subsequent messages can reference previous context
**And** logging/debugging confirms DO isolation and state persistence

**Prerequisites:** Stories 1.2, 1.5, 1.6, 1.7

**Technical Notes:**
- Replace placeholder echo with actual response generation
- Use Workers AI for basic chat responses OR implement rule-based responses
- Store each message in short-term memory (Story 1.7 structure)
- Retrieve recent conversation history for context
- Add structured logging to trace request flow: Client → Worker → DO
- Verify DO instance isolation with multiple test users
- Test DO state persistence across multiple requests
- Document actual behavior vs architecture expectations
- **IMPORTANT:** Fix any other unrelated bugs or discrepancies encountered during this work

**AI Response Options:**
1. **Workers AI** (Cloudflare's AI models): Use `@cloudflare/ai` for text generation
2. **Rule-based**: Simple keyword matching + templated responses
3. **External API**: Call OpenAI/Anthropic (requires API key setup)

**Memory Integration:**
- Store each user message in `short_term_memory` table
- Store each companion response in `short_term_memory` table
- Retrieve last N messages as context for response generation

---

## Epic 2: Memory Intelligence

**Goal:** Implement smart memory system with automatic consolidation and context-aware retrieval. By the end of this epic, the companion demonstrates intelligent memory management that enables true personalization.

### Story 2.1: Memory Consolidation ("Sleep" Process)

As a **system**,
I want **to automatically consolidate short-term memories into long-term memory**,
So that **the companion maintains both immediate context and deep understanding**.

**Acceptance Criteria:**

**Given** companion has short-term memories stored (from Story 1.8)
**When** the consolidation process runs
**Then**:
- Short-term memories are analyzed and categorized
- Relevant information is moved/consolidated into long-term memory
- Short-term memory is cleaned up (old items removed or archived)
- Long-term memory maintains at least basic student background
- Process runs periodically without manual intervention

**And** consolidation preserves important information
**And** the process demonstrates production-ready state management
**And** I can verify consolidation happened by checking memory structures

**Prerequisites:** Stories 1.7, 1.8

**Technical Notes:**
- Implement "sleep" process that runs on schedule or trigger
- Define consolidation logic (what moves, what stays, what gets removed)
- Use Durable Object alarms or scheduled events
- Update both short-term and long-term memory structures
- Log consolidation events for verification
- See Architecture document: "Pattern 2: Automatic Memory Consolidation" and "Integration Points > Memory Consolidation" sections

---

### Story 2.2: Memory Retrieval for Personalization

As a **companion**,
I want **to retrieve relevant memories when responding to students**,
So that **I can provide personalized, context-aware responses**.

**Acceptance Criteria:**

**Given** companion has both short-term and long-term memories (from Story 2.1)
**When** a student sends a message
**Then**:
- Companion retrieves relevant short-term memories
- Companion retrieves relevant long-term memories
- Memories are used to inform response generation
- Response demonstrates awareness of student's history/context

**And** memory retrieval is efficient (doesn't slow down responses)
**And** retrieved memories are relevant to the current conversation
**And** I can verify memory usage in companion responses

**Prerequisites:** Stories 2.1, 1.6 (chat connection)

**Technical Notes:**
- Implement memory retrieval functions
- Query both short-term and long-term memory structures
- Filter/rank memories by relevance
- Pass memories to response generation (can be placeholder initially)
- See Architecture document: "Data Architecture > Database Schema" for query patterns and memory table structures

---

### Story 2.3: Context-Aware Response Generation

As a **student**,
I want **my companion to respond using my personal history**,
So that **conversations feel personalized and relevant**.

**Acceptance Criteria:**

**Given** companion can retrieve memories (Story 2.2)
**When** I have a conversation with my companion
**Then**:
- Responses reference my past sessions or learning history
- Companion remembers what I've learned
- Companion adapts responses based on my progress
- Responses feel personalized, not generic

**And** personalization is visible in the conversation
**And** companion demonstrates understanding of my learning journey

**Prerequisites:** Story 2.2

**Technical Notes:**
- Integrate memory retrieval with response generation
- Use retrieved memories to inform LLM prompts (when LLM integrated)
- Format responses to show personalization
- Can use placeholder responses initially that reference memory
- See Architecture document: "AI Gateway" and "Integration Points > AI Gateway Request Flow" sections for LLM integration

---

## Epic 3: Learning Interactions

**Goal:** Enable core learning features - adaptive practice and Socratic Q&A. By the end of this epic, students can practice what they've learned and ask questions using proven educational methods.

### Story 3.0: Practice Question Interface Component

As a **student**,
I want **an engaging interface for practice questions**,
So that **practice feels interactive and immediate**.

**Acceptance Criteria:**

**Given** card gallery exists (Story 1.4)
**When** I click the Practice action card
**Then**:
- Practice interface opens (modal or full-screen depending on device)
- I see a practice question card with clear question display
- Answer options are presented clearly
- Progress indicator shows question X of Y
- Submit/Next button functionality

**And** interface provides immediate visual feedback (correct/incorrect)
**And** practice interface is responsive (large touch targets on mobile)
**And** interface matches Modern & Playful theme (purple/pink palette)

**Prerequisites:** Story 1.4

**Technical Notes:**
- Create practice question interface component (custom)
- Implement answer selection UI (multiple choice initially)
- Immediate feedback states (correct green, incorrect red)
- Progress indicator component
- Responsive layout (full-screen mobile, centered modal desktop)
- UX design: docs/ux-design-specification.md (Practice Question Interface, lines 535-540)
- Minimum 44x44px touch targets on mobile

**UX Design Impact:** New story - practice interface is a custom component with specific states and feedback patterns.

---

### Story 3.1: Practice Question Generation from Session Content

As a **student**,
I want **to practice questions based on what I learned in sessions**,
So that **I can reinforce my learning between tutoring sessions**.

**Acceptance Criteria:**

**Given** companion has session data in memory (from Story 1.8)
**When** I request practice questions
**Then**:
- Questions are generated from actual session topics/content
- Questions are relevant to what was covered
- Questions are displayed in a clear, readable format
- I can see what I'm practicing (subject, topic, etc.)

**And** questions are derived from session content (not generic)
**And** I can start a practice session
**And** questions are presented one at a time or in a set

**Prerequisites:** Stories 1.8, 2.2 (memory retrieval), 3.0 (practice interface)

**Technical Notes:**
- Extract topics/concepts from session data
- Generate questions based on extracted content
- Can use LLM for question generation or template-based initially
- Store practice questions in companion state
- See Architecture document: "Integration Points > Practice Question Generation" and "Workers AI" sections

---

### Story 3.2: Adaptive Practice Difficulty

As a **student**,
I want **practice questions that adapt to my performance**,
So that **I'm challenged appropriately and can improve**.

**Acceptance Criteria:**

**Given** practice questions can be generated (Story 3.1)
**When** I answer practice questions
**Then**:
- System tracks my performance (correct/incorrect)
- Difficulty adjusts based on my answers
- Questions focus on areas where I struggled (from memory)
- Practice adapts to my learning level

**And** difficulty progression feels natural
**And** I can see my performance during practice
**And** practice becomes more challenging as I improve

**Prerequisites:** Story 3.1

**Technical Notes:**
- Track practice performance in companion state
- Implement difficulty adjustment algorithm
- Use memory to identify struggle areas
- Adjust question selection based on performance
- See Architecture document: "Data Architecture" section - practice_sessions and practice_questions tables for tracking

---

### Story 3.3: Practice Session Completion Tracking

As a **student**,
I want **my practice sessions to be tracked**,
So that **I can see my progress and completion**.

**Acceptance Criteria:**

**Given** I can do practice questions (Stories 3.1, 3.2)
**When** I complete a practice session
**Then**:
- Practice completion is recorded
- Performance metrics are stored (questions answered, accuracy, etc.)
- Progress is updated in my companion's memory
- I can see completion status

**And** practice data informs future question selection
**And** completion is visible in progress display

**Prerequisites:** Stories 3.1, 3.2

**Technical Notes:**
- Store practice session data in companion state
- Track completion status
- Update progress metrics
- Link practice data to memory system
- See Architecture document: "Data Architecture" section - practice_sessions table and "Data Flow Lifecycle > Progress Tracking"

---

### Story 3.4: Socratic Q&A Component

As a **student**,
I want **to ask questions and get Socratic-style guidance**,
So that **I learn through discovery rather than just receiving answers**.

**Acceptance Criteria:**

**Given** I can chat with my companion (Story 1.6)
**When** I ask a question about something I'm learning
**Then**:
- Companion responds with guided questions (Socratic method)
- Companion helps me discover answers rather than just telling me
- Follow-up questions guide my thinking
- Responses encourage understanding over memorization

**And** Socratic method is evident in the conversation flow
**And** companion uses my learning history to inform questions
**And** I feel like I'm discovering, not just receiving information
**And** hint system allows progressive disclosure

**Prerequisites:** Stories 1.6, 2.3 (context-aware responses)

**Technical Notes:**
- Implement Socratic questioning pattern in response generation
- Use LLM prompts that encourage guided discovery
- Structure responses as questions that lead to understanding
- Use memory to tailor questions to student's level
- Create hint reveal UI component (progressive disclosure pattern)
- See Architecture document: "AI Gateway" section and "Technology Stack Details > Workers AI" for prompt patterns
- UX design: docs/ux-design-specification.md (Socratic Q&A Components, lines 548-554)

**UX Design Impact:** Complexity increased - requires custom hint reveal UI component with progressive disclosure.

---

### Story 3.5: Multi-Dimensional Progress Tracking

As a **student**,
I want **to see my progress across multiple dimensions**,
So that **I understand my growth in different areas**.

**Acceptance Criteria:**

**Given** companion tracks various activities (practice, sessions, etc.)
**When** I view my progress
**Then** I see:
- Progress by subject/goal
- Progress over time
- Practice completion rates
- Knowledge gains across different areas
- Visual representation of multi-dimensional progress

**And** progress is accurate and up-to-date
**And** progress visualization is clear and understandable
**And** I can see progress from different perspectives (by subject, by time, etc.)

**Prerequisites:** Stories 1.9 (progress display), 3.3 (practice tracking), 2.1 (memory consolidation)

**Technical Notes:**
- Aggregate progress data from multiple sources (sessions, practice, memory)
- Calculate progress metrics across dimensions
- Create visualizations (charts, graphs, progress bars)
- Update progress display UI with real data
- See Architecture document: "API Contracts > Progress" section for ProgressData interface and metrics calculation

---

### Story 3.6: Progress Visualization UI

As a **student**,
I want **visual representations of my progress**,
So that **I can quickly understand my learning journey at a glance**.

**Acceptance Criteria:**

**Given** progress data exists (Story 3.5)
**When** I view the progress section
**Then** I see:
- Visual progress indicators (bars, charts, graphs)
- Subject/goal breakdown clearly displayed
- Time-based progress views
- Clear connection between my actions and progress shown

**And** visualizations are responsive and accessible
**And** progress makes the "magic" of personalization visible
**And** I can drill down to see details if needed

**Prerequisites:** Story 3.5

**Technical Notes:**
- Implement progress visualization components
- Use charts/graphs library or custom visualizations
- Display multi-dimensional data clearly
- Ensure WCAG accessibility compliance
- See Architecture document: "Project Structure" section for component organization and UX design specification for visual requirements

---

## Epic 4: Intelligence & Escalation

**Goal:** Add intelligent features - tutor escalation detection and subject knowledge tracking. By the end of this epic, the companion demonstrates intelligence in knowing when students need human help and tracking knowledge across subjects.

### Story 4.1: Tutor Escalation Detection

As a **student**,
I want **my companion to recognize when I need a human tutor**,
So that **I get the right level of help at the right time**.

**Acceptance Criteria:**

**Given** I'm having a conversation with my companion (Story 1.6)
**When** I'm struggling with complex concepts or showing frustration
**Then**:
- Companion detects that I need tutor intervention (LLM-based detection)
- Companion recognizes repeated struggles or frustration signals
- Companion provides natural escalation prompts
- Escalation feels helpful, not like a failure

**And** detection is accurate (doesn't escalate unnecessarily)
**And** escalation prompts are natural and encouraging
**And** I can see why companion suggested a tutor

**Prerequisites:** Stories 1.6, 2.3 (context-aware responses), 3.4 (Q&A)

**Technical Notes:**
- Implement LLM-based detection of escalation needs
- Analyze conversation for frustration/complexity signals
- Define escalation criteria and thresholds
- Generate natural escalation prompts
- See Architecture document: "AI Gateway" section for LLM integration patterns and external LLM usage for complex reasoning

---

### Story 4.2: Booking Flow Integration (Mocked)

As a **student**,
I want **to book a tutor session when my companion suggests it**,
So that **I can seamlessly transition to human help**.

**Acceptance Criteria:**

**Given** companion detects I need a tutor (Story 4.1)
**When** companion suggests booking a session
**Then**:
- I see a booking flow or prompt
- Booking process is clear and simple
- Booking is mocked but demonstrates real integration pattern
- I can complete the booking flow

**And** booking feels like a natural next step
**And** booking flow is accessible and user-friendly

**Prerequisites:** Story 4.1

**Technical Notes:**
- Create mocked booking flow UI
- Implement booking endpoint (mocked response)
- Design booking flow to demonstrate real integration pattern
- Store booking intent in companion state
- See Architecture document: "Integration Points" and NFR "Integration" sections for mocked integration patterns

---

### Story 4.3: Subject Knowledge Tracking

As a **system**,
I want **to track student knowledge across hardcoded subjects**,
So that **I can provide personalized learning experiences by subject**.

**Acceptance Criteria:**

**Given** companion has session and practice data (from previous epics)
**When** knowledge is assessed
**Then**:
- Knowledge is tracked per subject area (hardcoded subjects)
- Progress is visible in subject-specific views
- Mastery levels are calculated per subject
- Knowledge tracking informs practice question selection

**And** subject knowledge is accurate based on student activity
**And** knowledge tracking updates as student learns
**And** I can see my knowledge across different subjects

**Prerequisites:** Stories 1.8 (session data), 3.3 (practice tracking), 2.1 (memory)

**Technical Notes:**
- Define hardcoded subject list
- Implement knowledge assessment algorithm
- Track knowledge per subject in companion state
- Calculate mastery levels
- Use knowledge data to inform practice selection
- See Architecture document: "Data Architecture > Database Schema" - subject_knowledge table for tracking structure

---

### Story 4.4: Subject-Specific Progress Views

As a **student**,
I want **to see my progress broken down by subject**,
So that **I understand my strengths and areas for improvement**.

**Acceptance Criteria:**

**Given** subject knowledge is tracked (Story 4.3)
**When** I view my progress
**Then** I see:
- Progress broken down by subject
- Subject-specific knowledge levels
- Areas where I'm strong and areas to improve
- Clear visualization of subject progress

**And** subject views are clear and actionable
**And** I can see how my knowledge has changed over time per subject

**Prerequisites:** Stories 4.3, 3.6 (progress visualization)

**Technical Notes:**
- Add subject filtering to progress views
- Display subject-specific metrics
- Create subject breakdown visualizations
- Link to practice question selection by subject
- See Architecture document: "API Contracts > Progress" section for bySubject interface structure

---

## Epic 5: Retention Features

**Goal:** Implement features that maintain engagement and reduce churn. By the end of this epic, the companion actively maintains student engagement through celebrations, goal achievement handling, and retention nudges.

### Story 5.0: Dynamic Hero Card & Proactive Greetings

As a **student**,
I want **the hero card to greet me with context from my recent sessions**,
So that **I feel the companion knows me and my progress**.

**Acceptance Criteria:**

**Given** I have completed sessions and the companion has memory (Stories 1.8, 2.1)
**When** I open the application
**Then**:
- Hero card displays proactive greeting referencing recent sessions
- Greeting is context-aware (mentions specific topics/achievements)
- Hero card adapts based on my activity (celebration, re-engagement, achievement)
- Primary and secondary CTAs are relevant to my current state

**And** greeting feels personalized, not generic
**And** hero card uses gradient backgrounds for celebration moments
**And** companion's intelligence is visible through specific references

**Prerequisites:** Stories 1.4 (card gallery), 1.8 (session data), 2.1 (memory)

**Technical Notes:**
- Implement hero card dynamic content generation
- Use memory retrieval to personalize greetings
- Implement card state variants (celebration, re-engagement, achievement)
- Apply gradient backgrounds for special states (purple to pink)
- Generate context-aware CTAs based on student state
- UX design: docs/ux-design-specification.md (Hero Card, lines 513-519; Proactive Companion, lines 381-389)

**UX Design Impact:** New story - hero card is key to making companion intelligence visible. Requires dynamic content generation and multiple states.

---

### Story 5.0b: Dynamic Card Ordering Intelligence

As a **student**,
I want **action cards to rearrange based on what's most relevant to me**,
So that **the interface adapts to my needs and keeps things fresh**.

**Acceptance Criteria:**

**Given** card gallery exists with action cards (Story 1.4)
**When** I use the application over time
**Then**:
- Cards dynamically reorder based on context
- After session completion: Practice card moves to prominent position
- After inactivity: Chat card becomes prominent with re-engagement
- After milestone: Progress card highlights achievement
- When struggling: Practice card shows specific subject focus

**And** card ordering changes are smooth and non-jarring
**And** ordering demonstrates companion's understanding of my needs
**And** interface feels alive and responsive, not static

**Prerequisites:** Stories 1.4 (card gallery), 1.8 (session data), 2.2 (memory retrieval)

**Technical Notes:**
- Implement card ordering algorithm based on student state
- Define ordering rules for different contexts
- Use memory and activity data to determine card priority
- Implement smooth card reordering transitions
- Store card ordering state in companion
- UX design: docs/ux-design-specification.md (Dynamic Card Ordering, lines 322-327, 351-358)

**UX Design Impact:** New story - card ordering intelligence is critical to "preventing mundane interface" goal. Requires state-based ordering algorithm.

---

### Story 5.1: Session Celebration Display

As a **student**,
I want **to celebrate session completion with visual feedback**,
So that **achievements feel rewarding and motivating**.

**Acceptance Criteria:**

**Given** I complete a tutoring session (session data ingested)
**When** I open the application after the session
**Then**:
- Session celebration display appears (modal or hero card state)
- Celebration message references specific session content
- Progress highlights are shown visually
- Achievement badges unlock (if applicable)
- Celebration has visual flair (animations, confetti optional)

**And** celebration feels genuine and personalized
**And** I can see what I accomplished
**And** celebration transitions smoothly to practice invitation

**Prerequisites:** Stories 1.8 (session ingestion), 1.9 (progress display), 5.0 (hero card)

**Technical Notes:**
- Create session celebration component (custom)
- Implement celebration animation/entrance effects
- Display progress highlights with visual indicators
- Achievement badge design and unlock animation
- Integrate with hero card celebration state
- UX design: docs/ux-design-specification.md (Session Celebration Display, lines 555-561)

**UX Design Impact:** New story - session celebration is a custom component with animations. Split from post-session engagement for clarity.

---

### Story 5.2: Post-Session Engagement Flow

As a **student**,
I want **to be engaged immediately after a tutoring session**,
So that **I maintain momentum and motivation**.

**Acceptance Criteria:**

**Given** I complete a tutoring session and see celebration (Story 5.1)
**When** I interact with my companion after the session
**Then**:
- Hero card shows celebration message with session context
- Progress card displays streaks, knowledge gained, multi-goal progress
- Practice card moves to prominent position
- Companion offers immediate practice invitation via hero card CTA

**And** post-session engagement happens automatically
**And** I'm motivated to continue learning
**And** all options visible on single screen (no forced flow)

**Prerequisites:** Stories 1.8 (session ingestion), 1.9 (progress display), 3.1 (practice), 3.5 (multi-dimensional progress), 5.0 (hero card), 5.0b (card ordering), 5.1 (celebration)

**Technical Notes:**
- Detect when new session data is ingested
- Coordinate hero card celebration state
- Update card ordering (practice to prominent)
- Display progress updates in progress card
- Offer practice via hero card CTA
- See Architecture document: "Integration Points > Session Data Ingestion" for data flow and UX design for engagement patterns
- UX design: docs/ux-design-specification.md (Post-Session Flow, lines 374-416)

**UX Design Impact:** Complexity increased - coordinates multiple components (hero card, card ordering, progress card) for cohesive engagement.

---

### Story 5.3: Goal Achievement Detection

As a **system**,
I want **to detect when a student completes a learning goal**,
So that **I can celebrate achievement and suggest next steps**.

**Acceptance Criteria:**

**Given** student has learning goals and progress is tracked
**When** a student completes a learning goal
**Then**:
- System detects goal completion
- Achievement is celebrated appropriately
- Related subjects are suggested automatically
- Multi-goal perspective is shown (not just completed goal)

**And** celebration feels meaningful
**And** suggestions are relevant and helpful
**And** student sees what's next, not just what's done

**Prerequisites:** Stories 3.5 (progress tracking), 4.3 (subject knowledge)

**Technical Notes:**
- Define goal completion criteria
- Implement goal detection logic
- Generate celebration messages
- Implement related subject suggestion algorithm
- Display multi-goal progress view
- See Architecture document: "API Contracts > Progress" section for byGoal interface and goal tracking structure

---

### Story 5.4: Retention Nudges

As a **student**,
I want **gentle reminders to maintain my learning momentum**,
So that **I stay engaged between sessions**.

**Acceptance Criteria:**

**Given** I'm a student with <3 sessions by Day 7
**When** Day 7 arrives
**Then**:
- I receive a retention nudge (natural booking prompt)
- Nudge shows my progress and momentum
- Booking feels like natural next step, not pressure
- Nudge is encouraging, not pushy

**And** nudges are personalized based on my activity
**And** nudges maintain momentum without being annoying
**And** I can see why the nudge is relevant to me

**Prerequisites:** Stories 1.8 (session tracking), 3.5 (progress), 4.2 (booking flow)

**Technical Notes:**
- Implement nudge scheduling logic
- Track days since last session
- Generate personalized nudge messages
- Link to booking flow
- Store nudge history
- See Architecture document: "Pattern 2: Automatic Memory Consolidation" section for DO Alarms scheduling pattern (similar approach)

---

## Epic 6: Polish & Production Readiness

**Goal:** Refine UI, add diverse mock data, and integrate proven education methods. By the end of this epic, the application is almost production-ready and demonstrates sophisticated system capabilities.

### Story 6.1: UI Excellence - Modern & Playful Theme

As a **student**,
I want **a beautiful, polished interface with the Modern & Playful theme**,
So that **the application feels professional, engaging, and fun**.

**Acceptance Criteria:**

**Given** basic UI exists (from previous epics)
**When** I use the application
**Then**:
- Interface uses Modern & Playful color theme (purple/pink palette)
- Design follows shadcn/ui foundation with custom components
- Typography uses system font stack with clear hierarchy
- Spacing follows 4px base unit system
- All components meet WCAG 2.1 AA accessibility standards

**And** UI makes the "magic" of personalization visible through dynamic cards
**And** interface is responsive across all breakpoints (mobile, tablet, desktop)
**And** minimum 44x44px touch targets on mobile
**And** color contrast meets accessibility requirements (4.5:1 text, 3:1 UI)
**And** UI demonstrates production-ready quality

**Prerequisites:** All previous UI stories (1.4, 1.5, 1.9, 3.0, 3.6, 5.0, 5.1)

**Technical Notes:**
- Apply complete UX design specification
- Implement Modern & Playful color palette (Primary #8B5CF6, Accent #EC4899)
- Use shadcn/ui base components with custom styling
- Implement 7 custom components per UX spec
- Typography scale from 36px (H1) to 12px (Tiny)
- 4px base spacing system (xs to 3xl)
- Ensure WCAG 2.1 AA compliance throughout
- Test keyboard navigation and screen reader support
- UX design: docs/ux-design-specification.md (complete specification)

**UX Design Impact:** Significantly increased complexity - complete design system implementation with 7 custom components, accessibility compliance, and responsive breakpoints.

---

### Story 6.2: Diverse Mock Data Generation

As a **developer**,
I want **realistic, diverse mock data**,
So that **I can demonstrate the system handling complex, real-world scenarios**.

**Acceptance Criteria:**

**Given** the system is functional
**When** I load mock data
**Then**:
- Mock data includes multiple students with varying patterns
- Data includes diverse subjects, session types, learning histories
- Data is realistic and convoluted (not sanitized)
- Data demonstrates real-world messiness (forgotten sessions, partial completions, changing goals)
- System handles complex data gracefully

**And** mock data showcases system intelligence
**And** data demonstrates multi-dimensional progress tracking
**And** I can see the system making sense of chaos

**Prerequisites:** All previous epics (system must be functional)

**Technical Notes:**
- Create mock data generation scripts
- Include diverse student scenarios
- Add realistic complexity and edge cases
- Test system with convoluted data
- Demonstrate memory consolidation with complex histories
- See Architecture document: "R2 Storage Structure" section for session transcript format and mock data organization

---

### Story 6.3: Spaced Repetition Integration

As a **student**,
I want **practice questions that use spaced repetition**,
So that **I remember what I learn long-term**.

**Acceptance Criteria:**

**Given** I can do practice questions (Story 3.1)
**When** I practice over time
**Then**:
- Questions are scheduled using spaced repetition algorithm
- Questions I struggle with appear more frequently
- Questions I master appear less frequently
- Spacing increases as I improve
- System tracks repetition intervals

**And** spaced repetition improves my retention
**And** practice feels natural, not forced
**And** I can see spaced repetition working in my progress

**Prerequisites:** Stories 3.1, 3.2, 3.3 (practice system)

**Technical Notes:**
- Implement spaced repetition algorithm (e.g., SM-2 or similar)
- Track question difficulty and student performance
- Schedule questions based on repetition intervals
- Update intervals based on performance
- Store repetition data in companion state
- See Architecture document: "Data Architecture > Database Schema" - practice_questions table for repetition tracking

---

### Story 6.4: Active Recall Integration

As a **student**,
I want **practice that uses active recall techniques**,
So that **I strengthen my memory through retrieval practice**.

**Acceptance Criteria:**

**Given** I can do practice questions (Story 3.1)
**When** I practice
**Then**:
- Questions require me to recall information (not just recognize)
- Practice emphasizes retrieval over recognition
- Questions test understanding, not just memorization
- Active recall is integrated into question format

**And** active recall improves my learning
**And** practice feels challenging but achievable
**And** I can see active recall working in my progress

**Prerequisites:** Stories 3.1, 3.2 (practice system)

**Technical Notes:**
- Design questions for active recall (open-ended, fill-in-blank, etc.)
- Emphasize retrieval in question generation
- Track active recall performance
- Integrate with spaced repetition
- See Architecture document: "AI Gateway" and "Workers AI" sections for LLM-based question generation approaches

---

### Story 6.5: Interleaving Practice Integration

As a **student**,
I want **practice that mixes different topics**,
So that **I learn to distinguish between concepts and apply knowledge flexibly**.

**Acceptance Criteria:**

**Given** I can do practice questions (Story 3.1)
**When** I practice
**Then**:
- Questions mix different topics/subjects (not blocked by topic)
- Practice requires me to switch between concepts
- Interleaving improves my ability to distinguish concepts
- Practice feels varied and engaging

**And** interleaving is integrated with spaced repetition
**And** practice adapts based on my needs
**And** I can see interleaving working in my progress

**Prerequisites:** Stories 3.1, 3.2, 6.3 (spaced repetition), 4.3 (subject tracking)

**Technical Notes:**
- Implement interleaving algorithm for question selection
- Mix topics within practice sessions
- Balance interleaving with focused practice
- Track interleaving effectiveness
- Integrate with other learning methods
- See Architecture document: "Data Architecture > Database Schema" - subject_knowledge table for multi-subject tracking that enables interleaving

---

## Epic Breakdown Summary

**Total Epics:** 6
**Total Stories:** 37 (updated: +3 bug fix stories added to Epic 1)

**Epic Distribution:**
- Epic 1 (Foundation): 12 stories (was 9, +3 for critical bug fixes - Stories 1.10-1.12)
- Epic 2 (Memory Intelligence): 3 stories (unchanged)
- Epic 3 (Learning Interactions): 7 stories (was 6, +1 for practice interface component)
- Epic 4 (Intelligence & Escalation): 4 stories (unchanged)
- Epic 5 (Retention Features): 6 stories (was 3, +3 for hero card, card ordering, celebration component)
- Epic 6 (Polish & Production): 5 stories (unchanged, but 6.1 significantly expanded)

**Epic 1 Bug Fix Stories (Added 2025-11-08):**
- **Story 1.10:** Fix UI styling and visibility issues (white text, transparent chat modal)
- **Story 1.11:** Integrate real Clerk authentication (remove mock tokens)
- **Story 1.12:** Verify and fix chat-to-DO connection (remove placeholder echo, add real AI)

**UX Design Impact Summary:**
- **6 new stories added** to implement custom components and UX patterns
- **7 existing stories modified** with increased complexity from UX requirements
- **7 custom components** identified that need implementation
- **Story numbering adjusted** to accommodate new stories (1.4-1.9 renumbered)

**New Stories Added:**
1. Story 1.5: Chat Modal Interface (was part of 1.4, now separate)
2. Story 3.0: Practice Question Interface Component
3. Story 5.0: Dynamic Hero Card & Proactive Greetings
4. Story 5.0b: Dynamic Card Ordering Intelligence
5. Story 5.1: Session Celebration Display (split from old 5.1)
6. Story 5.2: Post-Session Engagement Flow (refined old 5.1)

**Stories with Increased Complexity:**
1. Story 1.4: Now card gallery (was basic chat) - Card Gallery design direction
2. Story 1.9: Now progress card in gallery (was separate section)
3. Story 3.4: Added hint system UI component requirement
4. Story 5.2: Now coordinates multiple components (was simpler)
5. Story 6.1: Complete design system implementation with accessibility

**Key Characteristics:**
- All stories are vertically sliced (deliver complete functionality)
- Stories are sequentially ordered with clear prerequisites
- Each story is sized for single-session completion
- BDD acceptance criteria provide clear testability
- Stories build incrementally toward working software
- Foundation epic establishes all necessary infrastructure
- Each epic delivers visible, functional value

**Dependencies:**
- Epic 1 is foundation for all subsequent work
- Epic 2 builds intelligence layer that enhances all features
- Epic 3 delivers core user value
- Epic 4 adds intelligence features
- Epic 5 addresses engagement and retention
- Epic 6 polishes and demonstrates production readiness

**Ready for Implementation:**
This epic breakdown provides a clear roadmap for iterative incremental development. Each story can be implemented independently while building toward a complete, working application that demonstrates sophisticated system design and delivers real user value.

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

_Created through collaborative discovery between Adam and AI facilitator._

