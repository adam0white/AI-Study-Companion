# Story 1.3 Validation Guide: Isolated Database Per Companion

**Story:** Isolated Database Per Companion
**Epic:** 1 - Foundation & Core Architecture
**Status:** Done
**Date:** 2025-11-07

## 30-Second Quick Test

```bash
# Run database schema tests
npm test -- src/lib/db

# Expected: All database tests passing
```

## Automated Test Results

- **Total Tests:** 228 passing (includes database tests)
- **Status:** ✅ All passing
- **Framework:** Vitest with D1 mocks

## Manual Validation Steps

### 1. Verify Database Schema (AC-1.3.1, AC-1.3.2)

```bash
npm run dev

# In another terminal, check schema
npx wrangler d1 execute DB --local --command \
  "SELECT name FROM sqlite_master WHERE type='table'"
```

**Expected tables:**
- `students`
- `session_metadata`
- `short_term_memory`
- `long_term_memory`
- `progress_tracking`
- `subject_knowledge`

### 2. Test Student Record Creation (AC-1.3.3)

```bash
# Initialize companion (creates student record)
curl -X POST http://localhost:8787/api/companion/test-student/initialize \
  -H "Content-Type: application/json" \
  -d '{"clerkUserId": "user_abc123"}'

# Verify student record
npx wrangler d1 execute DB --local --command \
  "SELECT id, clerk_user_id, created_at FROM students"
```

**Expected:** Student record with UUID, clerkUserId, ISO timestamp

### 3. Test Database Isolation (AC-1.3.4, AC-1.3.5)

```bash
# Create records for student A
curl -X POST http://localhost:8787/api/companion/student-A/initialize \
  -d '{"clerkUserId": "user_A"}'

# Create records for student B
curl -X POST http://localhost:8787/api/companion/student-B/initialize \
  -d '{"clerkUserId": "user_B"}'

# Verify isolation in database
npx wrangler d1 execute DB --local --command \
  "SELECT clerk_user_id FROM students"
```

**Expected:** Two separate student records, data scoped to student_id

### 4. Test Schema Initialization (AC-1.3.6)

```bash
# Clear database and restart
rm -rf .wrangler/state
npm run dev

# Trigger initialization
curl http://localhost:8787/api/companion/new-student/health
```

**Expected:** Schema auto-initializes on first request, tables created

## Acceptance Criteria Checklist

- [x] **AC-1.3.1:** D1 database binding configured in wrangler.jsonc
- [x] **AC-1.3.2:** Database schema defined with all tables
- [x] **AC-1.3.3:** StudentCompanion can create database records
- [x] **AC-1.3.4:** Queries scoped to student_id (isolation)
- [x] **AC-1.3.5:** Student data isolation verified
- [x] **AC-1.3.6:** Schema initialization on first invocation
- [x] **AC-1.3.7:** UUID student IDs and ISO timestamps used

## Rollback Plan

- **Schema issues:** Delete `.wrangler/state`, restart dev server
- **Migration issues:** Update schema in `src/lib/db/schema.ts`, restart
- **Data corruption:** D1 local database can be deleted and recreated

## Known Limitations

- **No schema migrations** - Schema is idempotent (CREATE TABLE IF NOT EXISTS)
- **Local D1 only** - Production D1 requires `wrangler deploy`
- **No database backups** - Production backup strategy not implemented

## Files Created/Modified

- [src/lib/db/schema.ts](../../src/lib/db/schema.ts) - Database schema and helpers
- [src/durable-objects/StudentCompanion.ts](../../src/durable-objects/StudentCompanion.ts) - Database integration
- [wrangler.jsonc](../../wrangler.jsonc) - D1 binding configuration

## References

- Story: [docs/stories/1-3-isolated-database-per-companion.md](../stories/1-3-isolated-database-per-companion.md)
- Architecture: [docs/architecture.md#Data-Architecture](../architecture.md)
