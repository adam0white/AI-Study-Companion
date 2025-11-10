/**
 * Achievement Badge System
 * Detects and creates achievement badges based on session data and memory
 * Story 5.1: AC-5.1.4 - Achievement badges unlock
 */

import type { AchievementBadge, SessionMetrics } from '../types/celebration';
import type { SubjectMastery } from '../rpc/types';

// ============================================
// Badge Detection Logic
// ============================================

interface BadgeDetectionContext {
  sessionMetrics: SessionMetrics;
  subjectMastery?: SubjectMastery[];
  consecutiveDays?: number;
  totalSessions?: number;
}

/**
 * Detect unlocked badges based on session metrics and student memory
 * Story 5.1: AC-5.1.4 - Badge detection with unlock conditions
 */
export function detectUnlockedBadges(
  context: BadgeDetectionContext
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];
  const now = new Date().toISOString();

  // Accuracy badges
  badges.push(...detectAccuracyBadges(context.sessionMetrics, now));

  // Streak badges
  if (context.consecutiveDays) {
    badges.push(...detectStreakBadges(context.consecutiveDays, now));
  }

  // Subject mastery badges
  if (context.subjectMastery) {
    badges.push(...detectMasteryBadges(context.subjectMastery, now));
  }

  // Consistency badges
  if (context.consecutiveDays) {
    badges.push(...detectConsistencyBadges(context.consecutiveDays, now));
  }

  // Focus badges
  badges.push(...detectFocusBadges(context.sessionMetrics, now));

  return badges;
}

/**
 * Detect accuracy-based badges
 * Badge types: 70%, 80%, 90%, 100% (Perfect Score)
 */
function detectAccuracyBadges(
  metrics: SessionMetrics,
  timestamp: string
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];
  const accuracy = metrics.accuracy;

  if (accuracy >= 100) {
    badges.push({
      id: 'accuracy_100',
      type: 'accuracy',
      title: 'Perfect Score',
      description: 'Achieved 100% accuracy! Flawless performance!',
      icon: '🏆',
      color: 'text-yellow-500',
      unlockedAt: timestamp,
    });
  } else if (accuracy >= 90) {
    badges.push({
      id: 'accuracy_90',
      type: 'accuracy',
      title: '90% Accuracy',
      description: 'Achieved 90%+ accuracy! Mastery-level performance!',
      icon: '🎯',
      color: 'text-purple-500',
      unlockedAt: timestamp,
    });
  } else if (accuracy >= 80) {
    badges.push({
      id: 'accuracy_80',
      type: 'accuracy',
      title: '80% Accuracy',
      description: 'Achieved 80%+ accuracy! Great understanding!',
      icon: '⭐',
      color: 'text-blue-500',
      unlockedAt: timestamp,
    });
  } else if (accuracy >= 70) {
    badges.push({
      id: 'accuracy_70',
      type: 'accuracy',
      title: '70% Accuracy',
      description: 'Achieved 70%+ accuracy! Solid progress!',
      icon: '✨',
      color: 'text-green-500',
      unlockedAt: timestamp,
    });
  }

  return badges;
}

/**
 * Detect streak-based badges
 * Badge types: 3-day, 7-day, 14-day streaks
 */
function detectStreakBadges(
  consecutiveDays: number,
  timestamp: string
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];

  if (consecutiveDays >= 14) {
    badges.push({
      id: 'streak_14',
      type: 'streak',
      title: '14-Day Streak',
      description: 'Completed sessions on 14 consecutive days! Incredible dedication!',
      icon: '🔥',
      color: 'text-orange-500',
      unlockedAt: timestamp,
    });
  } else if (consecutiveDays >= 7) {
    badges.push({
      id: 'streak_7',
      type: 'streak',
      title: '7-Day Streak',
      description: 'Completed sessions on 7 consecutive days! Keep it up!',
      icon: '🔥',
      color: 'text-red-500',
      unlockedAt: timestamp,
    });
  } else if (consecutiveDays >= 3) {
    badges.push({
      id: 'streak_3',
      type: 'streak',
      title: '3-Day Streak',
      description: 'Completed sessions on 3 consecutive days! Great consistency!',
      icon: '🔥',
      color: 'text-yellow-500',
      unlockedAt: timestamp,
    });
  }

  return badges;
}

/**
 * Detect subject mastery badges
 * Criteria: 80%+ average accuracy over 5+ sessions
 */
function detectMasteryBadges(
  subjectMastery: SubjectMastery[],
  timestamp: string
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];

  for (const subject of subjectMastery) {
    if (subject.mastery_score >= 0.8 && subject.practice_count >= 5) {
      badges.push({
        id: `mastery_${subject.subject.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'mastery',
        title: `${subject.subject} Master`,
        description: `Achieved 80%+ mastery in ${subject.subject} over 5+ sessions!`,
        icon: '🎓',
        color: 'text-purple-600',
        unlockedAt: timestamp,
      });
    }
  }

  return badges;
}

/**
 * Detect consistency-based badges
 * Similar to streak but with different thresholds
 */
function detectConsistencyBadges(
  consecutiveDays: number,
  timestamp: string
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];

  if (consecutiveDays >= 14) {
    badges.push({
      id: 'consistency_dedicated',
      type: 'consistency',
      title: 'Dedicated Learner',
      description: 'Completed sessions every day for 2 weeks! Outstanding commitment!',
      icon: '💪',
      color: 'text-indigo-600',
      unlockedAt: timestamp,
    });
  } else if (consecutiveDays >= 7) {
    badges.push({
      id: 'consistency_consistent',
      type: 'consistency',
      title: 'Consistent Learner',
      description: 'Completed sessions every day for a week! Great habit!',
      icon: '📚',
      color: 'text-blue-600',
      unlockedAt: timestamp,
    });
  }

  return badges;
}

/**
 * Detect focus-based badges
 * Badge types: Deep Focus (single subject), Rapid Progress (20%+ improvement)
 */
function detectFocusBadges(
  metrics: SessionMetrics,
  timestamp: string
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];

  // Deep Focus: Single subject session
  if (metrics.topicsLearned.length === 1) {
    badges.push({
      id: 'focus_deep',
      type: 'focus',
      title: 'Deep Focus',
      description: 'Dedicated session to mastering a single topic!',
      icon: '🎯',
      color: 'text-cyan-600',
      unlockedAt: timestamp,
    });
  }

  // Rapid Progress: 20%+ accuracy improvement
  if (
    metrics.comparisonToPrevious &&
    metrics.comparisonToPrevious.accuracyChange >= 20
  ) {
    badges.push({
      id: 'focus_rapid',
      type: 'focus',
      title: 'Rapid Progress',
      description: `Improved accuracy by ${metrics.comparisonToPrevious.accuracyChange}% in this session!`,
      icon: '🚀',
      color: 'text-pink-600',
      unlockedAt: timestamp,
    });
  }

  return badges;
}

/**
 * Get badge display color for background gradient
 */
export function getBadgeGradient(type: AchievementBadge['type']): string {
  const gradients = {
    accuracy: 'from-purple-500 to-pink-500',
    streak: 'from-red-500 to-orange-500',
    mastery: 'from-indigo-500 to-purple-600',
    consistency: 'from-blue-500 to-indigo-600',
    focus: 'from-cyan-500 to-blue-600',
  };
  return gradients[type];
}
