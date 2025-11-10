# Schema Mismatch Fix: practice_count Column

## Date
2025-11-09

## Problem
Database query was failing with error:
```
D1_ERROR: no such column: practice_count at offset 40: SQLITE_ERROR
```

This occurred in the `getMultiDimensionalProgress()` method when querying the `subject_knowledge` table.

## Root Cause
The migration file `0001_epic3_tables.sql` created the `subject_knowledge` table with a column named **`discovery_count`**, but the application code expected **`practice_count`**.

### Migration Schema (WRONG)
```sql
CREATE TABLE IF NOT EXISTS subject_knowledge (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0,
  strengths TEXT,
  struggles TEXT,
  discovery_count INTEGER DEFAULT 0,  -- WRONG NAME
  last_practiced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

### Application Code Expectation
The code in `StudentCompanion.ts` was using `practice_count` in:
- Line 4147: UPDATE query
- Line 4180: INSERT query
- Line 4224: Progress tracking update
- Line 4321: SELECT query (where error occurred)
- Line 4331: TypeScript type definition
- Line 4450: Property mapping

## Solution

### 1. Fixed Base Migration
Updated `migrations/0001_epic3_tables.sql` to use correct column name:
```sql
CREATE TABLE IF NOT EXISTS subject_knowledge (
  ...
  practice_count INTEGER DEFAULT 0,  -- CORRECTED
  ...
);
```

### 2. Created Migration to Fix Existing Databases
Created `migrations/0002_rename_discovery_count_to_practice_count.sql`:
- Adds new `practice_count` column
- Copies data from `discovery_count`
- Recreates table without `discovery_count` column
- Restores indexes

## Verification

### Database Schema After Fix
```bash
wrangler d1 execute ai-study-companion-db --local --command="PRAGMA table_info(subject_knowledge);"
```

Result shows column 6 is now `practice_count`:
```json
{
  "cid": 6,
  "name": "practice_count",
  "type": "INTEGER",
  "notnull": 0,
  "dflt_value": "0",
  "pk": 0
}
```

### Query Test
```bash
wrangler d1 execute ai-study-companion-db --local \
  --command="SELECT subject, mastery_level, practice_count FROM subject_knowledge LIMIT 1;"
```

Result: Query succeeds without error.

## Impact
- Fixes D1_ERROR in `getMultiDimensionalProgress()`
- All queries using `practice_count` now work correctly
- No data loss (existing `discovery_count` values preserved)
- Tests using `practice_count` will now work

## Files Modified
1. `/migrations/0001_epic3_tables.sql` - Fixed base migration
2. `/migrations/0002_rename_discovery_count_to_practice_count.sql` - Migration for existing DBs

## Notes
- The name "practice_count" is semantically correct for tracking practice sessions
- "discovery_count" was misleading and didn't match the business logic
- This fix aligns the database schema with the application code expectations
