/**
 * Database Schema Definitions and Initialization
 * D1 Database tables for student data isolation
 */

/**
 * Initialize database schema with all required tables and indexes
 * Uses CREATE TABLE IF NOT EXISTS for idempotency
 * 
 * @param db - D1Database instance
 * @throws Error if schema initialization fails
 */
export async function initializeSchema(db: D1Database): Promise<void> {
  try {
    // Execute all schema statements in a batch for performance
    const statements = [
      // Students table (maps Clerk ID to internal student ID)
      db.prepare(`
        CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          clerk_user_id TEXT UNIQUE NOT NULL,
          email TEXT,
          name TEXT,
          created_at TEXT NOT NULL,
          last_active_at TEXT NOT NULL
        )
      `),
      
      // Short-term memory (recent session context)
      db.prepare(`
        CREATE TABLE IF NOT EXISTS short_term_memory (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          content TEXT NOT NULL,
          session_id TEXT,
          importance_score REAL DEFAULT 0.5,
          created_at TEXT NOT NULL,
          expires_at TEXT,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `),
      
      // Long-term memory (consolidated knowledge)
      db.prepare(`
        CREATE TABLE IF NOT EXISTS long_term_memory (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          tags TEXT,
          confidence_score REAL DEFAULT 0.5,
          source_sessions TEXT,
          created_at TEXT NOT NULL,
          last_accessed_at TEXT NOT NULL,
          last_updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `),
      
      // Session metadata (references to R2 transcripts)
      db.prepare(`
        CREATE TABLE IF NOT EXISTS session_metadata (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          r2_key TEXT NOT NULL,
          date TEXT NOT NULL,
          duration_minutes INTEGER,
          subjects TEXT,
          tutor_name TEXT,
          status TEXT DEFAULT 'processing',
          created_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `),

      // Consolidation history (Story 2.1: AC-2.1.7, AC-2.1.8)
      db.prepare(`
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
        )
      `),

      // Indexes for performance
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_students_clerk_id 
        ON students(clerk_user_id)
      `),
      
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_short_term_student 
        ON short_term_memory(student_id, created_at DESC)
      `),
      
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_long_term_student_category 
        ON long_term_memory(student_id, category)
      `),
      
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_sessions_student_date
        ON session_metadata(student_id, date DESC)
      `),

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_consolidation_student_date
        ON consolidation_history(student_id, consolidated_at DESC)
      `),

      // Practice sessions table (Story 3.1)
      db.prepare(`
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
        )
      `),

      // Practice questions table (Story 3.1)
      db.prepare(`
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
        )
      `),

      // Indexes for practice tables
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_date
        ON practice_sessions(student_id, started_at DESC)
      `),

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_practice_questions_session
        ON practice_questions(session_id)
      `),

      // Chat history table (Story 3.4)
      db.prepare(`
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
        )
      `),

      // Indexes for chat history
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_chat_history_student_date
        ON chat_history(student_id, created_at DESC)
      `),

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_chat_history_conversation
        ON chat_history(conversation_id)
      `),

      // Subject knowledge table for tracking student mastery and discoveries (Story 3.4)
      db.prepare(`
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
        )
      `),

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_subject_knowledge_student_subject
        ON subject_knowledge(student_id, subject)
      `),

      // Engagement events table for tracking student activities (Story 3.4)
      db.prepare(`
        CREATE TABLE IF NOT EXISTS engagement_events (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_data TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id)
        )
      `),

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_engagement_events_student_date
        ON engagement_events(student_id, created_at DESC)
      `),

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_engagement_events_type
        ON engagement_events(event_type)
      `),
    ];

    // Execute all statements as a batch
    await db.batch(statements);
    
  } catch (error) {
    console.error('Schema initialization failed:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Helper function to generate ISO 8601 timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Helper function to generate UUID (uses crypto.randomUUID)
 */
export function generateId(): string {
  return crypto.randomUUID();
}
