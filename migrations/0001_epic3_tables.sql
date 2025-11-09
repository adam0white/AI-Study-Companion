-- Migration: Add Epic 3 tables for practice and progress tracking
-- Date: 2025-11-09
-- Description: Adds missing tables that were not created during initial schema initialization

-- consolidation_history table (Story 2.1)
CREATE TABLE IF NOT EXISTS consolidation_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  consolidated_at TEXT NOT NULL,
  short_term_items_processed INTEGER NOT NULL,
  long_term_items_created INTEGER DEFAULT 0,
  long_term_items_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_student_date
ON consolidation_history(student_id, consolidated_at DESC);

-- Practice sessions table (Story 3.1)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  difficulty_level INTEGER DEFAULT 1 CHECK(difficulty_level BETWEEN 1 AND 5),
  questions_total INTEGER NOT NULL,
  questions_correct INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_date
ON practice_sessions(student_id, started_at DESC);

-- Practice questions table (Story 3.1)
CREATE TABLE IF NOT EXISTS practice_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_options TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  topic TEXT,
  session_reference TEXT,
  student_answer TEXT,
  is_correct BOOLEAN,
  time_to_answer_seconds INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_practice_questions_session
ON practice_questions(session_id);

-- Chat history table (Story 3.4)
CREATE TABLE IF NOT EXISTS chat_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'assistant' CHECK(message_type IN ('user', 'assistant', 'socratic_question')),
  metadata TEXT,
  conversation_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_history_student_date
ON chat_history(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_history_conversation
ON chat_history(conversation_id);

-- Subject knowledge table (Story 3.4)
CREATE TABLE IF NOT EXISTS subject_knowledge (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0 CHECK(mastery_level BETWEEN 0.0 AND 1.0),
  strengths TEXT,
  struggles TEXT,
  discovery_count INTEGER DEFAULT 0,
  last_practiced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_subject_knowledge_student_subject
ON subject_knowledge(student_id, subject);

-- Progress tracking table (Story 3.5)
CREATE TABLE IF NOT EXISTS progress_tracking (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  dimension_value TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value REAL NOT NULL,
  last_updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE(student_id, dimension, dimension_value, metric_type)
);

CREATE INDEX IF NOT EXISTS idx_progress_tracking_student_dimension
ON progress_tracking(student_id, dimension, dimension_value);

CREATE INDEX IF NOT EXISTS idx_progress_tracking_updated
ON progress_tracking(last_updated_at DESC);

-- Engagement events table (Story 3.4)
CREATE TABLE IF NOT EXISTS engagement_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_student_date
ON engagement_events(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_events_type
ON engagement_events(event_type);
