/**
 * Practice Utilities
 * Story 3.3: Practice Session Completion Tracking
 *
 * Utility functions for practice session data processing:
 * - Streak calculation from engagement events
 * - Duration formatting (seconds to minutes/seconds)
 * - Accuracy formatting
 */

export interface EngagementEvent {
  id: string;
  student_id: string;
  event_type: string;
  event_data: string; // JSON string
  created_at: string; // ISO 8601 timestamp
}

export interface PracticeStreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculate practice streak from engagement events
 * Story 3.3: AC-3.3.6 - Streak calculation
 *
 * Algorithm:
 * - Only counts unique calendar days (multiple practices on same day = 1 day)
 * - Consecutive days increase streak
 * - Gap > 1 day resets current streak
 * - Longest streak tracked separately
 *
 * @param events - Array of practice_complete engagement events (sorted by created_at DESC)
 * @returns Current streak and longest streak
 */
export function calculatePracticeStreak(events: EngagementEvent[]): PracticeStreakResult {
  if (events.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Extract unique calendar dates (ignore time, only consider calendar day)
  const dates = events.map((e) => {
    const date = new Date(e.created_at);
    // Reset time to midnight for consistent date comparison
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  });

  // Remove duplicates and sort descending (most recent first)
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a);

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  let currentStreakBroken = false;

  // Calculate streaks by comparing consecutive dates
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = uniqueDates[i];
    const next = uniqueDates[i + 1];

    // Calculate difference in days
    const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day - increment streak
      tempStreak++;
      if (!currentStreakBroken) {
        // Still part of current streak
        currentStreak = tempStreak;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else if (diffDays > 1) {
      // Gap detected - mark current streak as broken
      currentStreakBroken = true;
      tempStreak = 1;
    }
    // If diffDays === 0, same day (should not happen after deduplication)
  }

  return { currentStreak, longestStreak };
}

/**
 * Format duration from seconds to human-readable string
 * Story 3.3: AC-3.3.4 - Duration display
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "5 minutes 23 seconds")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
}

/**
 * Format accuracy as percentage with color coding
 * Story 3.3: AC-3.3.4 - Accuracy display
 *
 * @param correct - Number of correct answers
 * @param total - Total number of questions
 * @returns Formatted accuracy percentage (0-100)
 */
export function formatAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Get accuracy color class based on percentage
 * Story 3.3: AC-3.3.4 - Color-coded accuracy
 *
 * @param accuracy - Accuracy percentage (0-100)
 * @returns Tailwind CSS color class
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return 'text-green-600';
  if (accuracy >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get mastery level display text
 * Story 3.3: AC-3.3.4 - Mastery display
 *
 * @param masteryLevel - Mastery level (0.0-1.0)
 * @returns Formatted percentage string
 */
export function formatMasteryLevel(masteryLevel: number): string {
  return `${Math.round(masteryLevel * 100)}%`;
}

/**
 * Get mastery change display with sign
 * Story 3.3: AC-3.3.4 - Mastery delta display
 *
 * @param delta - Mastery change (-1.0 to 1.0)
 * @returns Formatted percentage string with sign (e.g., "+5.2%", "-2.1%")
 */
export function formatMasteryDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}
