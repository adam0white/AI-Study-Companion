/**
 * Retention Nudge Generator
 * Story 5.4: AC-5.4.3, AC-5.4.8 - Generate personalized retention nudges
 *
 * Generates nudge content with natural, encouraging messaging.
 */

import type { RetentionNudgeData, EngagementMetrics } from '../rpc/types';
import { generateId } from '../db/schema';
import {
  determineNudgeVariant,
  formatLearningTime,
  formatTopicsList,
} from './engagement-tracking';

/**
 * Nudge message templates by variant
 * Story 5.4: AC-5.4.8 - Multi-session nudge variants
 */
const NUDGE_TEMPLATES = {
  'super-low': [
    "Let's get started! 🚀 Book a session with your tutor to begin your learning journey.",
    'Ready to learn? 📚 Book a session and start making progress today!',
    'Your tutor is ready to help! 👋 Book a session to get started.',
  ],
  'low': [
    "You're off to a great start! 🌱 Book another session to keep learning.",
    "You've taken the first step! 👣 Keep the momentum - book another session.",
    'Great beginning! 💪 Ready for your next session?',
  ],
  'moderate': [
    "You're doing great! 🌟 Keep the momentum going - book another session!",
    'Two sessions down, your progress is showing! 📈 Keep it up with another session.',
    "You're building a learning habit! 🔥 Ready for session #3?",
  ],
};

/**
 * Nudge emojis by variant
 */
const NUDGE_EMOJIS = {
  'super-low': '🚀',
  'low': '🌱',
  'moderate': '🌟',
};

/**
 * Generate retention nudge data
 * Story 5.4: AC-5.4.1, AC-5.4.2, AC-5.4.3 - Nudge with metrics and natural tone
 *
 * @param metrics - Current engagement metrics
 * @returns Retention nudge data ready for display
 */
export function generateRetentionNudge(
  metrics: EngagementMetrics
): RetentionNudgeData {
  const variant = determineNudgeVariant(metrics.totalSessions);

  const message = selectNudgeMessage(variant);
  const emoji = NUDGE_EMOJIS[variant];

  const nudgeId = generateId();
  const generatedAt = new Date().toISOString();
  const shouldExpireAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    id: nudgeId,
    message,
    variant,
    emoji,
    metrics: {
      sessionsCompleted: metrics.totalSessions,
      topicsLearned: metrics.topicsLearned,
      minutesInvested: metrics.totalLearningMinutes,
      streakDays: metrics.currentStreak > 0 ? metrics.currentStreak : undefined,
    },
    primaryCTA: {
      label: 'Book Session',
      action: 'navigate-booking',
    },
    secondaryCTA: {
      label: 'Maybe later',
      action: 'snooze-nudge',
    },
    generatedAt,
    shouldExpireAt,
  };
}

/**
 * Select nudge message based on variant
 */
function selectNudgeMessage(variant: 'super-low' | 'low' | 'moderate'): string {
  const templates = NUDGE_TEMPLATES[variant];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate personalized nudge subtitle with metrics
 * Story 5.4: AC-5.4.2 - Show progress metrics in nudge
 *
 * @param metrics - Engagement metrics
 * @returns Subtitle string highlighting progress
 */
export function generateNudgeSubtitle(metrics: EngagementMetrics): string {
  const { sessionsCompleted, topicsLearned, minutesInvested, streakDays } =
    {
      sessionsCompleted: metrics.totalSessions,
      topicsLearned: metrics.topicsLearned,
      minutesInvested: metrics.totalLearningMinutes,
      streakDays: metrics.currentStreak,
    };

  if (sessionsCompleted === 0) {
    return 'Start your learning journey today!';
  }

  if (sessionsCompleted === 1) {
    const topic = formatTopicsList(topicsLearned);
    return `You've started learning ${topic}. Keep going!`;
  }

  // For 2+ sessions, show more detailed metrics
  const parts: string[] = [];

  parts.push(`${sessionsCompleted} sessions completed`);

  if (topicsLearned.length > 0) {
    parts.push(`learned ${formatTopicsList(topicsLearned)}`);
  }

  if (minutesInvested > 0) {
    parts.push(`${formatLearningTime(minutesInvested)} invested`);
  }

  if (streakDays && streakDays > 1) {
    parts.push(`${streakDays}-day streak! 🔥`);
  }

  return parts.join(' • ');
}

/**
 * Check if nudge has expired
 *
 * @param nudge - Nudge data
 * @returns true if nudge has expired
 */
export function isNudgeExpired(nudge: RetentionNudgeData): boolean {
  return new Date(nudge.shouldExpireAt).getTime() < Date.now();
}

/**
 * Calculate snooze time
 *
 * @param hours - Number of hours to snooze
 * @returns ISO timestamp when snooze expires
 */
export function calculateSnoozeTime(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
