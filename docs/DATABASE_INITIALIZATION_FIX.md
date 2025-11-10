# Database Initialization Issue - Root Cause and Fix

**Date**: 2025-11-09
**Issue**: Database tables not being created, causing "no such table" errors
**Status**: RESOLVED

## Problem Summary

The application was throwing errors when trying to query Epic 3 tables (practice_sessions, subject_knowledge, etc.):

```
D1_ERROR: no such table: subject_knowledge: SQLITE_ERROR
```

## Root Cause Analysis

### Investigation Process

1. **Confirmed schema definition exists** in `src/lib/db/schema.ts` with all required tables
2. **Found initialization code** calls `initializeSchema()` in `StudentCompanion.ensureSchemaInitialized()`
3. **Discovered the persistence mechanism** uses Durable Object storage flag `schema_initialized` to prevent re-running
4. **Checked actual database state**:
   - Local database had only 5 tables (Epic 2 era)
   - Remote database had 0 tables
   - Epic 3 tables (7 new tables) were completely missing

### The Real Problem

The database was initialized when only Epic 2 tables existed in the schema. When Epic 3 tables were added to `schema.ts`, the Durable Object's persistent flag prevented re-initialization:

```typescript
// This flag persists across DO hibernations
const initialized = await this.getState<boolean>('schema_initialized');

if (!initialized) {
  await initializeSchema(this.db);  // Only runs ONCE per DO
  await this.setState('schema_initialized', true);
}
```

**Result**: New tables defined in schema.ts never got created in the actual database.

## Solution Implemented

### Immediate Fix (Applied)

Manually created all missing tables and indexes using wrangler CLI:

```bash
# Created 7 missing tables:
- consolidation_history
- practice_sessions
- practice_questions
- chat_history
- subject_knowledge
- progress_tracking
- engagement_events

# Created 10 missing indexes
# Updated long_term_memory table with missing columns (tags, created_at, last_accessed_at)
```

**Verification**:
```bash
wrangler d1 execute ai-study-companion-db --local \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Result: All 12 tables now present (11 application tables + _cf_METADATA)

### Long-term Solution (Created)

1. **Created migration files** in `/migrations/`:
   - `0001_epic3_tables.sql` - Creates all Epic 3 tables and indexes
   - `0002_long_term_memory_columns.sql` - Adds missing columns to existing table

2. **Created migration tool** `/scripts/apply-migrations.sh`:
   ```bash
   npm run db:migrate:local   # Apply to local dev database
   npm run db:migrate:remote  # Apply to production database
   npm run db:migrate:both    # Apply to both
   ```

3. **Added package.json scripts** for easy migration management

## Key Learnings

### The Durable Object Initialization Pattern

**Current approach has a critical flaw**:
- Uses persistent flag to prevent re-running schema initialization
- Works fine for static schemas
- BREAKS when schema evolves (new tables added)

**Why this happened**:
1. Epic 2 completed with 5 tables
2. Schema initialized, flag set to `true` in DO storage
3. Epic 3 added 7 new tables to schema.ts
4. DO flag prevented re-initialization
5. New tables never created

### Schema Evolution Best Practices

For Cloudflare D1 and Durable Objects:

1. **Don't rely on schema initialization for migrations**
   - `initializeSchema()` should only run on FIRST deploy
   - Schema changes require explicit migrations

2. **Use versioned migrations**
   - Track schema version in database
   - Run migrations in order
   - Idempotent migrations (CREATE IF NOT EXISTS)

3. **Separate concerns**:
   - Schema initialization: Initial database setup
   - Migrations: Schema evolution over time

## Files Created

- `/migrations/0001_epic3_tables.sql` - Epic 3 table definitions
- `/migrations/0002_long_term_memory_columns.sql` - Column additions
- `/migrations/README.md` - Migration documentation
- `/scripts/apply-migrations.sh` - Migration application tool
- Updated `package.json` with migration scripts

## Database Status

### Local Database (FIXED)
- Tables: 12 (11 application + _cf_METADATA)
- All Epic 3 tables present
- All indexes created
- long_term_memory updated with missing columns

### Remote Database (NEEDS MIGRATION)
- Tables: 0
- Status: Empty, needs initial schema + migrations
- Action Required: Run `npm run db:migrate:remote` before deployment

## Next Steps

1. **Before next deployment**:
   ```bash
   npm run db:migrate:remote
   ```

2. **For future schema changes**:
   - Create new migration file: `/migrations/NNNN_description.sql`
   - Test locally: `npm run db:migrate:local`
   - Apply to remote: `npm run db:migrate:remote`

3. **Consider improving schema initialization**:
   - Add schema version tracking
   - Auto-run pending migrations on DO initialization
   - Add migration status logging

## Prevention

To prevent this issue in the future:

1. **Always create migration files** when adding new tables
2. **Test migrations locally** before deploying
3. **Document schema changes** in migration files
4. **Verify database state** after deployments
5. **Monitor for "no such table" errors** in production logs

## References

- Schema Definition: `src/lib/db/schema.ts`
- DO Initialization: `src/durable-objects/StudentCompanion.ts:ensureSchemaInitialized()`
- Migration Files: `/migrations/`
- Cloudflare D1 Docs: https://developers.cloudflare.com/d1/
