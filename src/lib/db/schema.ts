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
          created_at TEXT NOT NULL,
          last_accessed_at TEXT NOT NULL,
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
