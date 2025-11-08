/**
 * Session Ingestion Logic
 * Story 1.8: Mock Session Data Ingestion
 *
 * Handles parsing, chunking, and storing tutoring session data
 */

import type { SessionInput, TranscriptTurn, SessionIngestionResult } from './types';
import { createShortTermMemory } from '../db/memory';
import { generateId, getCurrentTimestamp } from '../db/schema';

/**
 * Chunk transcript into meaningful segments for memory storage
 * Strategy: Group consecutive turns by speaker, or split long turns
 *
 * @param transcript - Array of transcript turns
 * @returns Array of chunked content with metadata
 */
export function chunkTranscript(transcript: TranscriptTurn[]): Array<{
  content: string;
  speaker: string;
  topics: string[];
}> {
  const chunks: Array<{ content: string; speaker: string; topics: string[] }> = [];

  if (transcript.length === 0) {
    return chunks;
  }

  // Simple chunking: each turn becomes a chunk
  // More sophisticated chunking can be added later (group by topic, time window, etc.)
  for (const turn of transcript) {
    // Extract basic topics from this turn
    const topics = extractTopics(turn.text);

    chunks.push({
      content: turn.text,
      speaker: turn.speaker,
      topics,
    });
  }

  return chunks;
}

/**
 * Extract key topics/concepts from text
 * Simple keyword-based extraction (can be enhanced with LLM later)
 *
 * @param text - Text to analyze
 * @returns Array of identified topics/keywords
 */
export function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  // Subject keywords
  const subjectKeywords = {
    math: ['math', 'algebra', 'geometry', 'calculus', 'equation', 'formula'],
    science: ['science', 'physics', 'chemistry', 'biology', 'experiment'],
    history: ['history', 'war', 'revolution', 'ancient', 'medieval'],
    english: ['english', 'grammar', 'writing', 'essay', 'literature'],
    programming: ['code', 'programming', 'function', 'variable', 'algorithm'],
  };

  // Check for subject mentions
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      if (!topics.includes(subject)) {
        topics.push(subject);
      }
    }
  }

  // Extract question words (indicates student questions or teaching moments)
  if (lowerText.includes('how') || lowerText.includes('why') || lowerText.includes('what')) {
    if (!topics.includes('question')) {
      topics.push('question');
    }
  }

  // Extract practice/homework indicators
  if (lowerText.includes('practice') || lowerText.includes('homework') || lowerText.includes('exercise')) {
    if (!topics.includes('practice')) {
      topics.push('practice');
    }
  }

  return topics;
}

/**
 * Calculate session duration from transcript timestamps
 * If timestamps are not available or invalid, returns undefined
 *
 * @param transcript - Array of transcript turns with timestamps
 * @returns Duration in minutes, or undefined
 */
export function calculateDuration(transcript: TranscriptTurn[]): number | undefined {
  if (transcript.length < 2) {
    return undefined;
  }

  try {
    // Try to parse timestamps (format: "HH:MM:SS")
    const firstTimestamp = transcript[0].timestamp;
    const lastTimestamp = transcript[transcript.length - 1].timestamp;

    const parseTimestamp = (ts: string): number => {
      const parts = ts.split(':');
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts.map(p => parseInt(p, 10));
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    const startSeconds = parseTimestamp(firstTimestamp);
    const endSeconds = parseTimestamp(lastTimestamp);
    const durationSeconds = endSeconds - startSeconds;

    if (durationSeconds > 0) {
      return Math.ceil(durationSeconds / 60); // Round up to nearest minute
    }
  } catch {
    // If timestamp parsing fails, return undefined
    return undefined;
  }

  return undefined;
}

/**
 * Build R2 storage key for session data
 *
 * @param studentId - Student ID
 * @param sessionId - Session ID
 * @returns R2 key path
 */
export function buildR2Key(studentId: string, sessionId: string): string {
  return `sessions/${studentId}/${sessionId}.json`;
}

/**
 * Ingest a session: store in R2, create metadata, create memories
 *
 * @param db - D1Database instance
 * @param r2 - R2Bucket instance
 * @param studentId - Student ID for association
 * @param sessionData - Session input data
 * @returns Ingestion result with session ID and stats
 */
export async function ingestSession(
  db: D1Database,
  r2: R2Bucket,
  studentId: string,
  sessionData: SessionInput
): Promise<SessionIngestionResult> {
  // Generate session ID
  const sessionId = generateId();
  const createdAt = getCurrentTimestamp();

  // Calculate duration if not provided
  const duration = sessionData.duration ?? calculateDuration(sessionData.transcript);

  // Build R2 key
  const r2Key = buildR2Key(studentId, sessionId);

  // Store raw transcript in R2
  const transcriptJson = JSON.stringify({
    sessionId,
    date: sessionData.date,
    duration,
    tutor: sessionData.tutor,
    subjects: sessionData.subjects,
    transcript: sessionData.transcript,
  });

  await r2.put(r2Key, transcriptJson, {
    httpMetadata: {
      contentType: 'application/json',
    },
  });

  // Extract all topics from transcript
  const allTopics = new Set<string>();
  const chunks = chunkTranscript(sessionData.transcript);

  for (const chunk of chunks) {
    chunk.topics.forEach(topic => allTopics.add(topic));
  }

  // Add provided subjects to topics
  if (sessionData.subjects) {
    sessionData.subjects.forEach(subject => allTopics.add(subject.toLowerCase()));
  }

  const topicsArray = Array.from(allTopics);

  // Create session metadata record
  await db
    .prepare(`
      INSERT INTO session_metadata (
        id, student_id, r2_key, date, duration_minutes, subjects, tutor_name, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      sessionId,
      studentId,
      r2Key,
      sessionData.date,
      duration || null,
      topicsArray.length > 0 ? JSON.stringify(topicsArray) : null,
      sessionData.tutor || null,
      'completed',
      createdAt
    )
    .run();

  // Create short-term memories for each chunk
  let memoriesCreated = 0;

  for (const chunk of chunks) {
    // Determine importance score based on content
    // Higher score for student questions, practice, or tutor explanations
    let importanceScore = 0.5; // Default

    if (chunk.topics.includes('question')) {
      importanceScore = 0.7; // Questions are important
    }
    if (chunk.topics.includes('practice')) {
      importanceScore = 0.6; // Practice is moderately important
    }
    if (chunk.speaker === 'tutor' && chunk.content.length > 100) {
      importanceScore = 0.6; // Long tutor explanations are important
    }

    // Store chunk as short-term memory
    await createShortTermMemory(db, studentId, {
      content: JSON.stringify({
        text: chunk.content,
        speaker: chunk.speaker,
        topics: chunk.topics,
      }),
      sessionId,
      importanceScore,
      // Expire after 30 days (will be consolidated before then in Epic 2)
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    memoriesCreated++;
  }

  return {
    sessionId,
    memoriesCreated,
    r2Key,
    topics: topicsArray,
  };
}

/**
 * Retrieve session metadata for a student
 *
 * @param db - D1Database instance
 * @param studentId - Student ID
 * @param limit - Optional limit on number of sessions to return
 * @returns Array of session metadata records
 */
export async function getSessionsForStudent(
  db: D1Database,
  studentId: string,
  limit?: number
): Promise<Array<{
  id: string;
  r2Key: string;
  date: string;
  durationMinutes: number | null;
  subjects: string | null;
  tutorName: string | null;
  status: string;
  createdAt: string;
}>> {
  let query = `
    SELECT id, r2_key, date, duration_minutes, subjects, tutor_name, status, created_at
    FROM session_metadata
    WHERE student_id = ?
    ORDER BY date DESC
  `;

  const params: any[] = [studentId];

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const result = await db.prepare(query).bind(...params).all<{
    id: string;
    r2_key: string;
    date: string;
    duration_minutes: number | null;
    subjects: string | null;
    tutor_name: string | null;
    status: string;
    created_at: string;
  }>();

  return result.results.map(row => ({
    id: row.id,
    r2Key: row.r2_key,
    date: row.date,
    durationMinutes: row.duration_minutes,
    subjects: row.subjects,
    tutorName: row.tutor_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}
