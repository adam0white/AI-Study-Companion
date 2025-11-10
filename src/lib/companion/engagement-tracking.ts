/**
 * Engagement Tracking for Retention Nudges
 * Story 5.4: AC-5.4.1, AC-5.4.5 - Track student engagement for nudge triggers
 *
 * Calculates engagement metrics and determines when retention nudges should be triggered.
 */

import type {
  EngagementMetrics,
  NudgeCriteria,
  RecentSessionData,
} from '../rpc/types';

/**
 * Default nudge criteria
 * Story 5.4: AC-5.4.1, AC-5.4.5 - Nudge trigger thresholds
 */
export const DEFAULT_NUDGE_CRITERIA: NudgeCriteria = {
  minDaysSinceAccess: 7,        // Trigger after 7 days of inactivity
  maxSessionsForTrigger: 3,     // Only trigger if < 3 sessions total
  nudgeFrequencyDays: 7,        // Max once per 7 days
};

/**
 * Calculate engagement metrics from session and app access data
 * Story 5.4: AC-5.4.2 - Progress and momentum display
 *
 * @param lastAppAccess - ISO timestamp of last app access
 * @param lastSessionTime - ISO timestamp of last session
 * @param recentSessions - Array of recent session data
 * @param currentStreak - Current learning streak in days
 * @returns Engagement metrics
 */
export function calculateEngagementMetrics(
  lastAppAccess: string | undefined,
  lastSessionTime: string | undefined,
  recentSessions: RecentSessionData[],
  currentStreak: number
): EngagementMetrics {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Calculate sessions in last 7 days
  const sessionsInLast7Days = recentSessions.filter((session) => {
    const sessionTime = new Date(session.timestamp).getTime();
    return sessionTime > sevenDaysAgo;
  }).length;

  // Extract unique topics learned
  const topicsSet = new Set<string>();
  recentSessions.forEach((session) => {
    session.topics.forEach((topic) => topicsSet.add(topic));
  });

  // Estimate total learning minutes (rough estimate: 20 min per session)
  const totalLearningMinutes = recentSessions.length * 20;

  return {
    totalSessions: recentSessions.length,
    sessionsInLast7Days,
    lastAppAccess: lastAppAccess || new Date(0).toISOString(),
    lastSessionTime: lastSessionTime || new Date(0).toISOString(),
    currentStreak,
    totalLearningMinutes,
    topicsLearned: Array.from(topicsSet),
  };
}

/**
 * Determine if nudge should be triggered
 * Story 5.4: AC-5.4.5 - Nudge scheduling and timing
 *
 * @param metrics - Current engagement metrics
 * @param lastNudgeTime - ISO timestamp of last nudge (if any)
 * @param criteria - Nudge trigger criteria
 * @returns true if nudge should be triggered
 */
export function shouldTriggerNudge(
  metrics: EngagementMetrics,
  lastNudgeTime: string | undefined,
  criteria: NudgeCriteria = DEFAULT_NUDGE_CRITERIA
): boolean {
  const now = Date.now();

  // Check if too many sessions (student is already engaged)
  if (metrics.totalSessions >= criteria.maxSessionsForTrigger) {
    return false;
  }

  // Check if enough time has passed since last app access
  const daysSinceAccess =
    (now - new Date(metrics.lastAppAccess).getTime()) / (24 * 60 * 60 * 1000);

  if (daysSinceAccess < criteria.minDaysSinceAccess) {
    return false;
  }

  // Check if enough time has passed since last nudge
  if (lastNudgeTime) {
    const daysSinceNudge =
      (now - new Date(lastNudgeTime).getTime()) / (24 * 60 * 60 * 1000);

    if (daysSinceNudge < criteria.nudgeFrequencyDays) {
      return false;
    }
  }

  return true;
}

/**
 * Determine nudge variant based on session count
 * Story 5.4: AC-5.4.8 - Multi-session nudge variants
 *
 * @param sessionsCompleted - Total number of sessions completed
 * @returns Nudge variant type
 */
export function determineNudgeVariant(
  sessionsCompleted: number
): 'super-low' | 'low' | 'moderate' {
  if (sessionsCompleted === 0) return 'super-low';
  if (sessionsCompleted === 1) return 'low';
  if (sessionsCompleted === 2) return 'moderate';

  // Shouldn't reach here if nudge criteria working correctly
  return 'moderate';
}

/**
 * Calculate time until next nudge eligibility
 *
 * @param lastNudgeTime - ISO timestamp of last nudge
 * @param criteria - Nudge criteria
 * @returns ISO timestamp when next nudge can be triggered
 */
export function calculateNextNudgeEligibleTime(
  lastNudgeTime: string,
  criteria: NudgeCriteria = DEFAULT_NUDGE_CRITERIA
): string {
  const lastNudge = new Date(lastNudgeTime);
  const nextEligible = new Date(
    lastNudge.getTime() + criteria.nudgeFrequencyDays * 24 * 60 * 60 * 1000
  );
  return nextEligible.toISOString();
}

/**
 * Format learning time for display
 * Story 5.4: AC-5.4.2 - Nudge shows progress metrics
 *
 * @param minutes - Total learning minutes
 * @returns Formatted string (e.g., "2 hours", "45 minutes")
 */
export function formatLearningTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min`;
}

/**
 * Format topics list for display in nudge
 *
 * @param topics - Array of topic names
 * @returns Formatted string (e.g., "Algebra and Geometry")
 */
export function formatTopicsList(topics: string[]): string {
  if (topics.length === 0) return 'various topics';
  if (topics.length === 1) return topics[0];
  if (topics.length === 2) return `${topics[0]} and ${topics[1]}`;

  // For 3+ topics, show first two + count
  return `${topics[0]}, ${topics[1]}, and ${topics.length - 2} more`;
}
