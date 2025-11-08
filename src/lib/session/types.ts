/**
 * Session Data Types
 * Story 1.8: Mock Session Data Ingestion
 */

/**
 * Speaker in a tutoring session
 */
export type Speaker = 'tutor' | 'student';

/**
 * Single turn in a session transcript
 */
export interface TranscriptTurn {
  speaker: Speaker;
  text: string;
  timestamp: string; // Format: "HH:MM:SS" or ISO 8601
}

/**
 * Complete session data for ingestion
 */
export interface SessionInput {
  date: string; // ISO 8601 timestamp
  duration?: number; // Duration in minutes (optional, will be calculated if not provided)
  tutor?: string; // Tutor name
  subjects?: string[]; // Array of subject names
  transcript: TranscriptTurn[];
}

/**
 * Session ingestion result
 */
export interface SessionIngestionResult {
  sessionId: string;
  memoriesCreated: number;
  r2Key: string;
  topics: string[];
}

/**
 * Processed session metadata (matches database schema)
 */
export interface SessionMetadata {
  id: string;
  studentId: string;
  r2Key: string;
  date: string;
  durationMinutes?: number;
  subjects?: string;  // JSON string or comma-separated
  tutorName?: string;
  status: string;
  createdAt: string;
}
