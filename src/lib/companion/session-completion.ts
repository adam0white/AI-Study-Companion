/**
 * Session Completion Detection
 * Detects when new session data is available for celebration
 * Story 5.1: AC-5.1.1 - Session celebration display appears after ingestion
 */

import type { SessionCompletionEvent } from '../types/celebration';
import type { SessionMetadata } from '../rpc/types';

// ============================================
// Session Completion Detection
// ============================================

/**
 * Detect if a session is eligible for celebration
 * Story 5.1: AC-5.1.1 - Celebration triggers when new session detected
 */
export function detectSessionCompletion(
  sessions: SessionMetadata[],
  lastCelebratedSessionId?: string
): SessionCompletionEvent | null {
  if (sessions.length === 0) {
    return null;
  }

  // Sort by createdAt to get most recent
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const mostRecentSession = sortedSessions[0];

  // Check if this session has already been celebrated
  if (lastCelebratedSessionId === mostRecentSession.id) {
    return null;
  }

  // Check if session is recent (within 1 hour)
  const sessionTime = new Date(mostRecentSession.createdAt).getTime();
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  if (sessionTime < oneHourAgo) {
    // Session is too old, skip celebration
    return null;
  }

  // Parse session subjects/topics
  const topics = parseSessionTopics(mostRecentSession);

  // Create completion event
  return {
    newSessionId: mostRecentSession.id,
    sessionTimestamp: mostRecentSession.createdAt,
    topics,
    accuracy: 0, // Will be calculated from session content
    questionsAnswered: 0, // Will be calculated from session content
    duration: mostRecentSession.durationMinutes || 30,
  };
}

/**
 * Parse topics from session metadata
 */
function parseSessionTopics(session: SessionMetadata): string[] {
  if (!session.subjects) {
    return ['General Study'];
  }

  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(session.subjects);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If single string, return as array
    return [session.subjects];
  } catch {
    // If not JSON, split by comma or return as single topic
    if (session.subjects.includes(',')) {
      return session.subjects.split(',').map((s) => s.trim());
    }
    return [session.subjects];
  }
}

/**
 * Extract metrics from session content
 * This would parse the actual session JSON from R2
 */
export function extractSessionMetrics(sessionContent: any): {
  accuracy: number;
  questionsAnswered: number;
  correctAnswers: number;
} {
  // Default values
  let accuracy = 75;
  let questionsAnswered = 10;
  let correctAnswers = 8;

  // If session has Q&A entries, calculate from them
  if (sessionContent && Array.isArray(sessionContent.entries)) {
    const qaEntries = sessionContent.entries.filter(
      (entry: any) => entry.type === 'question'
    );
    questionsAnswered = qaEntries.length;

    // For mock data, calculate a reasonable accuracy
    // In real implementation, this would check actual answers
    correctAnswers = Math.floor(questionsAnswered * 0.75);
    accuracy = questionsAnswered > 0 ? (correctAnswers / questionsAnswered) * 100 : 0;
  }

  return {
    accuracy,
    questionsAnswered,
    correctAnswers,
  };
}

/**
 * Calculate consecutive session days (streak)
 */
export function calculateStreak(sessions: SessionMetadata[]): number {
  if (sessions.length === 0) {
    return 0;
  }

  // Sort sessions by date
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  let streak = 1;
  let currentDate = new Date(sortedSessions[0].createdAt);
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 1; i < sortedSessions.length; i++) {
    const sessionDate = new Date(sortedSessions[i].createdAt);
    sessionDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      streak++;
      currentDate = sessionDate;
    } else if (daysDiff > 1) {
      // Streak broken
      break;
    }
    // If daysDiff === 0, it's the same day, continue
  }

  return streak;
}

/**
 * Calculate improvement from previous session
 */
export function calculateImprovement(
  currentAccuracy: number,
  sessions: SessionMetadata[]
): {
  accuracyChange: number;
  speedImprovement: string;
} | null {
  if (sessions.length < 2) {
    return null;
  }

  // For mock data, assume previous accuracy was 10-15% lower
  // In real implementation, this would come from stored session metrics
  const previousAccuracy = Math.max(0, currentAccuracy - 12);
  const accuracyChange = currentAccuracy - previousAccuracy;

  // Calculate speed improvement qualitatively
  let speedImprovement = 'Similar pace';
  if (accuracyChange >= 15) {
    speedImprovement = 'Much faster';
  } else if (accuracyChange >= 5) {
    speedImprovement = 'Faster';
  }

  return {
    accuracyChange,
    speedImprovement,
  };
}
