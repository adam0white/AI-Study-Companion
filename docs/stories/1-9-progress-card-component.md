# Story 1.9: Progress Card Component

Status: ready-for-dev

## Story

As a **student**,
I want **to see my progress in the card gallery**,
so that **I can understand my learning journey at a glance**.

## Acceptance Criteria

1. **AC-1.9.1:** Progress card visible in the card gallery
   - Progress card renders in the Card Gallery alongside existing action cards
   - Card follows same design system as other cards (modern & playful theme)
   - Card positioned appropriately in the gallery layout
   - Card is visually distinct from other action cards

2. **AC-1.9.2:** Basic progress indicators displayed
   - Session count displayed (total sessions completed)
   - Recent session topics shown (from session metadata)
   - Time-based metrics (last session date, days active)
   - Visual representation uses placeholder/real data from companion

3. **AC-1.9.3:** Visual representation of progress
   - Progress bars or percentage indicators
   - Numeric metrics clearly formatted
   - Icons or visual elements for quick scanning
   - Color coding for progress status (e.g., green for active, gray for no activity)

4. **AC-1.9.4:** Progress information displayed clearly
   - Typography follows UX design specification
   - Information hierarchy (most important metrics prominent)
   - Labels and values easily distinguishable
   - Numbers formatted appropriately (e.g., "5 sessions" vs "5")

5. **AC-1.9.5:** Progress card is responsive and accessible
   - Responsive layout (mobile, tablet, desktop)
   - Meets WCAG 2.1 AA standards
   - Keyboard navigation support (Tab, Enter)
   - ARIA labels for screen readers
   - Touch targets minimum 44x44px on mobile

6. **AC-1.9.6:** Progress data can be fetched from companion
   - RPC method to retrieve progress data from StudentCompanion DO
   - Progress data includes session count, recent topics, last session date
   - Data fetched asynchronously with loading state
   - Error handling for fetch failures

7. **AC-1.9.7:** Clicking progress card can expand details (future story)
   - Card is clickable/tappable
   - Click handler prepared (can be no-op or navigation placeholder)
   - Visual affordance (cursor, hover state) indicates interactivity
   - Future implementation will show detailed progress view

## Tasks / Subtasks

- [ ] **Task 1: Create Progress Card Component** (AC: 1.9.1, 1.9.3, 1.9.4, 1.9.5)
  - [ ] Create `src/components/progress/ProgressCard.tsx` component file
  - [ ] Define `ProgressCardProps` TypeScript interface
  - [ ] Implement card structure using shadcn/ui Card component as base
  - [ ] Add progress indicators (session count, recent topics, last session)
  - [ ] Implement visual elements (progress bars, icons, metrics)
  - [ ] Style with Tailwind CSS per UX design specification
  - [ ] Ensure responsive layout (mobile/tablet/desktop breakpoints)
  - [ ] Add accessibility attributes (ARIA labels, keyboard navigation)
  - [ ] Test: Component test for rendering and styling

- [ ] **Task 2: Integrate Progress Card into Card Gallery** (AC: 1.9.1)
  - [ ] Modify `src/components/layout/CardGallery.tsx`
  - [ ] Import ProgressCard component
  - [ ] Add ProgressCard to gallery layout (position after Hero card)
  - [ ] Pass progress data as props
  - [ ] Ensure card fits gallery grid system
  - [ ] Test: Visual test in browser, verify card appears correctly

- [ ] **Task 3: Define Progress Data Types** (AC: 1.9.2, 1.9.6)
  - [ ] Create or extend `src/lib/rpc/types.ts`
  - [ ] Define `ProgressData` interface:
    - sessionCount: number
    - recentTopics: string[]
    - lastSessionDate: string (ISO 8601)
    - daysActive: number
    - totalMinutesStudied: number (optional)
  - [ ] Define `GetProgressResponse` type for RPC response
  - [ ] Test: TypeScript compilation, no type errors

- [ ] **Task 4: Implement getProgress RPC Method in StudentCompanion DO** (AC: 1.9.2, 1.9.6)
  - [ ] Modify `src/durable-objects/StudentCompanion.ts`
  - [ ] Add `getProgress()` RPC method (or extend existing if present)
  - [ ] Query session_metadata table for session count
  - [ ] Query session_metadata for recent session topics (last 3-5 sessions)
  - [ ] Calculate last session date from session_metadata
  - [ ] Calculate days active (days between first and last session)
  - [ ] Return ProgressData object with all metrics
  - [ ] Handle case when no sessions exist (return zeros/empty arrays)
  - [ ] Test: Integration test for RPC method

- [ ] **Task 5: Create Progress Data Fetching Logic** (AC: 1.9.6)
  - [ ] Create `src/lib/progress/fetchProgress.ts` utility (or add to existing RPC client)
  - [ ] Implement async function to call getProgress RPC method
  - [ ] Use existing RPCClient from Story 1.6 (`src/lib/rpc/client.ts`)
  - [ ] Handle loading state (return loading flag)
  - [ ] Handle error state (catch and return user-friendly error)
  - [ ] Test: Unit test for fetch logic with mocked RPC client

- [ ] **Task 6: Add State Management to Card Gallery** (AC: 1.9.6)
  - [ ] Add useState hooks in CardGallery for progress data
  - [ ] Add useEffect to fetch progress data on component mount
  - [ ] Handle loading state (show skeleton or loading indicator in card)
  - [ ] Handle error state (show error message or fallback data)
  - [ ] Pass fetched data to ProgressCard component
  - [ ] Test: Component test with mock fetch responses

- [ ] **Task 7: Implement Click Handler for Future Expansion** (AC: 1.9.7)
  - [ ] Add onClick prop to ProgressCard component
  - [ ] Wire up click handler in CardGallery (can be console.log for now)
  - [ ] Add visual affordance (cursor pointer, hover effect)
  - [ ] Add comment noting future story will implement detailed view
  - [ ] Test: Manual test - click card, verify handler fires

- [ ] **Task 8: Add Visual Polish** (AC: 1.9.3, 1.9.4, 1.9.5)
  - [ ] Add progress bar component (can use shadcn/ui Progress or custom)
  - [ ] Add icons for different metrics (calendar, topics, count)
  - [ ] Implement color coding (e.g., purple for active progress)
  - [ ] Format numbers (use Intl.NumberFormat or custom formatters)
  - [ ] Add subtle animations (fade-in, progress bar fill)
  - [ ] Test: Visual inspection in browser across breakpoints

- [ ] **Task 9: Testing** (All ACs)
  - [ ] Component test: ProgressCard renders with mock data
  - [ ] Component test: ProgressCard handles empty/zero state
  - [ ] Component test: ProgressCard is accessible (a11y tests)
  - [ ] Component test: ProgressCard responsive (different viewport sizes)
  - [ ] Integration test: getProgress RPC method returns correct data
  - [ ] Integration test: Progress data fetched and displayed in gallery
  - [ ] Manual test: Visual inspection (design matches UX spec)
  - [ ] Manual test: Keyboard navigation (Tab through cards, Enter to click)
  - [ ] Manual test: Screen reader test (VoiceOver/NVDA)

## Dev Notes

### Architecture Patterns and Constraints

**Progress Data Source:**

Progress data is derived from existing session_metadata and short_term_memory tables created in Stories 1.7 and 1.8. No new database tables required.

```sql
-- Query session count
SELECT COUNT(*) FROM session_metadata WHERE student_id = ?

-- Query recent topics
SELECT subjects, date FROM session_metadata
WHERE student_id = ?
ORDER BY date DESC
LIMIT 5

-- Query date range for days active
SELECT MIN(date) as first_session, MAX(date) as last_session
FROM session_metadata
WHERE student_id = ?
```

[Source: docs/tech-spec-epic-1.md#Data-Models-and-Contracts]

**RPC Pattern:**

Follow established RPC pattern from Story 1.6. Use existing `RPCClient` class at `src/lib/rpc/client.ts` to call getProgress method.

```typescript
const client = new RPCClient(getToken);
const progressData = await client.call<ProgressData>('getProgress');
```

[Source: stories/1-6-connect-ui-to-companion-backend.md#New-Services-Created]

**Component Design:**

Follow Card Gallery design system from Story 1.4. ProgressCard should match visual style of other action cards (modern & playful theme with purple accents).

```
Card Structure:
- Gradient or solid background (match Hero card style)
- Title: "Your Progress"
- Metrics section: Session count, recent topics, last session
- Visual indicators: Progress bars, icons
- Footer: Optional CTA or encouragement message
```

[Source: docs/ux-design-specification.md#Progress-Visualization]
[Source: stories/1-4-card-gallery-home-interface.md#Completion-Notes]

**Responsive Breakpoints:**

```
Mobile (< 640px): Full-width card, vertical layout
Tablet (640-1024px): Card in 2-column grid
Desktop (> 1024px): Card in 3-column grid
```

[Source: docs/ux-design-specification.md#Responsive-Strategy]

**Accessibility Requirements:**

- WCAG 2.1 AA compliance
- Keyboard navigation: Tab, Enter keys
- Focus indicators: 2px purple outline
- ARIA labels for metrics and progress bars
- Color contrast: 4.5:1 for text

[Source: docs/ux-design-specification.md#Accessibility-Strategy]

### Project Structure Notes

**Files to Create:**

1. `src/components/progress/ProgressCard.tsx` - Main progress card component
2. `src/components/progress/ProgressCard.test.tsx` - Component tests
3. `src/lib/progress/` - Optional directory for progress utilities (or add to existing lib)

**Files to Modify:**

1. `src/components/layout/CardGallery.tsx` - Add ProgressCard to gallery
2. `src/durable-objects/StudentCompanion.ts` - Add/extend getProgress RPC method
3. `src/lib/rpc/types.ts` - Add ProgressData interface

**No Conflicts Detected:**

- Progress card is new component, no conflicts with existing UI
- RPC method may already exist from Story 1.2 placeholder - extend with real implementation
- Uses existing session_metadata table from Story 1.8
- Follows established patterns from Stories 1.4 (UI) and 1.6 (RPC)

### Learnings from Previous Story

**From Story 1-8-mock-session-data-ingestion (Status: done)**

**New Services Created:**
- **Session Ingestion Module** at `src/lib/session/ingestion.ts` - Provides session data processing
- **Session Types** at `src/lib/session/types.ts` - TypeScript interfaces for session data
- **RPC Endpoints:** `ingestSession` and `getSessions` in StudentCompanion DO

**Data Available:**
- `session_metadata` table contains:
  - Session count per student
  - Session dates (for calculating last session, days active)
  - Subjects array (JSON) for displaying recent topics
  - Duration in minutes
  - Tutor names
- Use `getSessions` RPC method to retrieve session list if needed

**Implementation Patterns:**
- Helper functions pattern: `chunkTranscript()`, `extractTopics()`, `calculateDuration()`, `buildR2Key()`
- JSON serialization for complex data (subjects array stored as JSON string in D1)
- ISO 8601 timestamp format for dates
- Error handling with try/catch and user-friendly messages

**Progress Data Can Be Calculated:**
- Session count: `COUNT(*) FROM session_metadata WHERE student_id = ?`
- Recent topics: Parse `subjects` JSON from latest 3-5 sessions
- Last session: `MAX(date) FROM session_metadata`
- Days active: Difference between MIN(date) and MAX(date)

**Technical Debt from Previous Story:**
- LLM-based topic extraction deferred (basic keywords only) - affects topic quality displayed in progress card
- No session update/delete operations - not blocking for progress display

**Files to Reuse:**
- `src/lib/session/types.ts` - Import session-related types if needed
- `src/durable-objects/StudentCompanion.ts` - Add getProgress method to existing DO class
- `src/lib/rpc/client.ts` - Existing RPC client for progress data fetching

**Warnings for This Story:**
- If no sessions ingested yet, handle zero state gracefully (show "No sessions yet" message)
- Subjects may be empty array for some sessions - handle undefined/null cases
- Session dates are ISO strings - parse with `new Date()` for calculations

[Source: docs/stories/1-8-mock-session-data-ingestion.md#Completion-Notes-List]
[Source: docs/stories/1-8-mock-session-data-ingestion.md#Files-Modified]

### References

- [Source: docs/epics.md#Story-1.9-Progress-Card-Component] - Story requirements and user narrative
- [Source: docs/tech-spec-epic-1.md#AC-1.9-Progress-Card-Component] - Acceptance criteria details
- [Source: docs/architecture.md#Pattern-1-Stateful-Serverless-Personalization] - DO pattern for progress data
- [Source: docs/ux-design-specification.md#Progress-Visualization] - Visual design guidance
- [Source: stories/1-4-card-gallery-home-interface.md] - Card Gallery patterns
- [Source: stories/1-6-connect-ui-to-companion-backend.md] - RPC client usage
- [Source: stories/1-8-mock-session-data-ingestion.md] - Session data structure and availability

## Dev Agent Record

### Context Reference

- docs/stories/1-9-progress-card-component.context.xml

### Agent Model Used

Claude Sonnet 4.5 (2025-11-07)

### Debug Log References

### Completion Notes List

### File List
