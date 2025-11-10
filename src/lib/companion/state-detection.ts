/**
 * Student State Detection Logic
 * Story 5.0: AC-5.0.2 - Hero card state variants based on student activity
 */

import type { StudentStateType, RecentSessionData } from '../rpc/types';

export interface DetectStateInput {
  lastAppAccess?: string; // ISO timestamp
  lastSessionTime?: string; // ISO timestamp
  recentSessions: RecentSessionData[];
  hasCompletedAnySession: boolean;
  achievementToday?: boolean;
}

/**
 * Detect student state based on activity patterns
 *
 * Priority order (highest to lowest):
 * 1. celebration - recent session within 1 hour
 * 2. achievement - milestone achieved today
 * 3. re_engagement - 3+ days inactive
 * 4. first_session - no previous sessions
 * 5. default - standard state
 *
 * @param input - Activity data for state detection
 * @returns Student state type
 */
export function detectStudentState(input: DetectStateInput): StudentStateType {
  const now = Date.now();

  // Check if student has ever completed a session
  if (!input.hasCompletedAnySession && input.recentSessions.length === 0) {
    return 'first_session';
  }

  // Check for celebration state (recent session within 1 hour)
  if (input.lastSessionTime) {
    const lastSessionTimestamp = new Date(input.lastSessionTime).getTime();
    const hoursSinceSession = (now - lastSessionTimestamp) / (1000 * 60 * 60);

    if (hoursSinceSession < 1) {
      return 'celebration';
    }
  }

  // Check for achievement state
  if (input.achievementToday) {
    return 'achievement';
  }

  // Check for re-engagement state (3+ days inactive)
  if (input.lastAppAccess) {
    const lastAccessTimestamp = new Date(input.lastAppAccess).getTime();
    const daysSinceAccess = (now - lastAccessTimestamp) / (1000 * 60 * 60 * 24);

    if (daysSinceAccess >= 3) {
      return 're_engagement';
    }
  }

  // Default state
  return 'default';
}

/**
 * Get gradient colors for a given state
 * Story 5.0: AC-5.0.4 - Gradient backgrounds for special celebration moments
 *
 * @param state - Student state type
 * @returns Gradient color pair or undefined for solid background
 */
export function getGradientColors(state: StudentStateType): [string, string] | undefined {
  switch (state) {
    case 'celebration':
    case 'achievement':
      return ['#8B5CF6', '#EC4899']; // Purple to pink
    case 're_engagement':
      return ['#8B5CF6', '#06B6D4']; // Purple to cyan
    case 'default':
    case 'first_session':
    default:
      return undefined; // Solid background
  }
}

/**
 * Get emoticon for a given state
 *
 * @param state - Student state type
 * @returns Emoticon string
 */
export function getEmoticon(state: StudentStateType): string {
  switch (state) {
    case 'celebration':
      return '🎉';
    case 're_engagement':
      return '💪';
    case 'achievement':
      return '⭐';
    case 'first_session':
      return '👋';
    case 'default':
    default:
      return '👋';
  }
}

import type { CTAConfig } from '../rpc/types';

/**
 * Get CTA configuration for a given state
 * Story 5.0: AC-5.0.3 - Hero card CTAs adapt to student state
 *
 * @param state - Student state type
 * @returns Primary and secondary CTA configurations
 */
export function getCTAConfig(state: StudentStateType): {
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
} {
  switch (state) {
    case 'celebration':
      return {
        primaryCTA: { label: 'Start Practice', action: 'practice' },
        secondaryCTA: { label: 'View Progress', action: 'progress' },
      };
    case 're_engagement':
      return {
        primaryCTA: { label: "Let's Get Back to It", action: 're_engagement' },
        secondaryCTA: { label: 'View Progress', action: 'progress' },
      };
    case 'achievement':
      return {
        primaryCTA: { label: 'Continue Learning', action: 'practice' },
        secondaryCTA: { label: 'Start Practice', action: 'practice' },
      };
    case 'first_session':
      return {
        primaryCTA: { label: 'Get Started', action: 'chat' },
        secondaryCTA: { label: 'Take Tour', action: 'tour' },
      };
    case 'default':
    default:
      return {
        primaryCTA: { label: 'Start Practice', action: 'practice' },
        secondaryCTA: { label: 'Ask Question', action: 'chat' },
      };
  }
}
