# Database Migrations

This directory contains SQL migration files for the D1 database.

## Running Migrations

### Local Development
```bash
# Run migration on local database
wrangler d1 execute ai-study-companion-db --local --file=./migrations/0001_epic3_tables.sql
wrangler d1 execute ai-study-companion-db --local --file=./migrations/0002_long_term_memory_columns.sql
```

### Remote Production
```bash
# Run migration on remote database
wrangler d1 execute ai-study-companion-db --remote --file=./migrations/0001_epic3_tables.sql
wrangler d1 execute ai-study-companion-db --remote --file=./migrations/0002_long_term_memory_columns.sql
```

## Migration History

- **0001_epic3_tables.sql** - Adds Epic 3 tables for practice sessions, chat history, subject knowledge, progress tracking, and engagement events
- **0002_long_term_memory_columns.sql** - Adds missing columns to long_term_memory table (tags, created_at, last_accessed_at)

## Notes

- All migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotency
- Migrations are safe to run multiple times
- The schema initialization in `src/lib/db/schema.ts` should match these migrations
