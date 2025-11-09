-- Migration: Rename discovery_count to practice_count in subject_knowledge table
-- Date: 2025-11-09
-- Description: Fix column name mismatch - code expects practice_count but table has discovery_count

-- SQLite doesn't support direct column rename, so we need to:
-- 1. Create new column
-- 2. Copy data
-- 3. Drop old column (by recreating the table)

-- Add the new practice_count column
ALTER TABLE subject_knowledge ADD COLUMN practice_count INTEGER DEFAULT 0;

-- Copy data from discovery_count to practice_count
UPDATE subject_knowledge SET practice_count = discovery_count;

-- Now recreate the table without discovery_count
-- This is the only way to drop a column in SQLite

-- Create temporary table with correct schema
CREATE TABLE subject_knowledge_new (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0 CHECK(mastery_level BETWEEN 0.0 AND 1.0),
  strengths TEXT,
  struggles TEXT,
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Copy all data to new table
INSERT INTO subject_knowledge_new
  (id, student_id, subject, mastery_level, strengths, struggles, practice_count, last_practiced_at, created_at, updated_at)
SELECT
  id, student_id, subject, mastery_level, strengths, struggles, practice_count, last_practiced_at, created_at, updated_at
FROM subject_knowledge;

-- Drop old table
DROP TABLE subject_knowledge;

-- Rename new table to original name
ALTER TABLE subject_knowledge_new RENAME TO subject_knowledge;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_subject_knowledge_student_subject
ON subject_knowledge(student_id, subject);
