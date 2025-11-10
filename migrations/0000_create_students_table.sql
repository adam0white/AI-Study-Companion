-- Migration: Create students table in global D1 database
-- Date: 2025-11-09
-- Description: Creates the students table for mapping Clerk user IDs to internal student IDs
-- This table must exist in the GLOBAL D1 database (env.DB) for authentication routing

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_clerk_id
ON students(clerk_user_id);
