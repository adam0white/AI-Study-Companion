-- Migration: Add missing columns to long_term_memory table
-- Date: 2025-11-09
-- Description: Adds tags, created_at, and last_accessed_at columns that were missing from Epic 2 schema

-- Add missing columns with default values
-- Note: SQLite doesn't support adding NOT NULL columns without defaults to existing tables
ALTER TABLE long_term_memory ADD COLUMN tags TEXT;
ALTER TABLE long_term_memory ADD COLUMN created_at TEXT NOT NULL DEFAULT '2025-11-09T00:00:00.000Z';
ALTER TABLE long_term_memory ADD COLUMN last_accessed_at TEXT NOT NULL DEFAULT '2025-11-09T00:00:00.000Z';
