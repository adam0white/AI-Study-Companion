/**
 * Unit Tests for Card Ordering Algorithm
 * Story 5.0b: AC-5.0b.1 - Dynamic card ordering with priority scoring
 */

import { describe, it, expect } from 'vitest';
import {
  computeSessionRecencyScore,
  computeInactivityBonus,
  computeInactivityPenalty,
  computeMilestoneBonus,
  computeGoalCompletionBonus,
  computeKnowledgeMilestoneBonus,
  computeStreakBonus,
  computeStreakContinuationBonus,
  computeStruggleFocusBonus,
  computeReengagementNeedBonus,
  computePracticePriority,
  computeChatPriority,
  computeProgressPriority,
  computeCardOrder,
  type CardOrderInput,
} from './card-ordering';
import type { RecentSessionData, SubjectPracticeStats, StudentAchievement } from '../rpc/types';

describe('Card Ordering Algorithm - Priority Scoring Functions', () => {
  describe('computeSessionRecencyScore', () => {
    it('should return 30 points for session within 1 hour', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
      expect(computeSessionRecencyScore(thirtyMinutesAgo)).toBe(30);
    });

    it('should return 20 points for session 1-2 hours ago', () => {
      const now = new Date();
      const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000).toISOString();
      expect(computeSessionRecencyScore(ninetyMinutesAgo)).toBe(20);
    });

    it('should return 10 points for session 2-4 hours ago', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
      expect(computeSessionRecencyScore(threeHoursAgo)).toBe(10);
    });

    it('should return 5 points for session 4-24 hours ago', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      expect(computeSessionRecencyScore(twelveHoursAgo)).toBe(5);
    });

    it('should return 0 points for session > 24 hours ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      expect(computeSessionRecencyScore(twoDaysAgo)).toBe(0);
    });

    it('should return 0 points when no session time provided', () => {
      expect(computeSessionRecencyScore(undefined)).toBe(0);
    });
  });

  describe('computeInactivityBonus', () => {
    it('should return 40 points for 7+ days inactivity', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityBonus(sevenDaysAgo)).toBe(40);
    });

    it('should return 40 points for 3-7 days inactivity', () => {
      const now = new Date();
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityBonus(fourDaysAgo)).toBe(40);
    });

    it('should return 20 points for 1-3 days inactivity', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityBonus(twoDaysAgo)).toBe(20);
    });

    it('should return 0 points for < 1 day inactivity', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityBonus(twelveHoursAgo)).toBe(0);
    });

    it('should return 0 points when no last access provided', () => {
      expect(computeInactivityBonus(undefined)).toBe(0);
    });
  });

  describe('computeInactivityPenalty', () => {
    it('should return 10 points penalty for 7+ days inactivity', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityPenalty(sevenDaysAgo)).toBe(10);
    });

    it('should return 10 points penalty for 3-7 days inactivity', () => {
      const now = new Date();
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityPenalty(fourDaysAgo)).toBe(10);
    });

    it('should return 5 points penalty for 1-3 days inactivity', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityPenalty(twoDaysAgo)).toBe(5);
    });

    it('should return 0 penalty for < 1 day inactivity', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      expect(computeInactivityPenalty(twelveHoursAgo)).toBe(0);
    });
  });

  describe('computeMilestoneBonus', () => {
    it('should return 40 points when achievementToday is true', () => {
      expect(computeMilestoneBonus(true, [])).toBe(40);
    });

    it('should return 40 points for achievements in last 24 hours', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'milestone', description: 'Test', timestamp: twelveHoursAgo },
      ];
      expect(computeMilestoneBonus(false, achievements)).toBe(40);
    });

    it('should return 0 points for achievements > 24 hours ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'milestone', description: 'Test', timestamp: twoDaysAgo },
      ];
      expect(computeMilestoneBonus(false, achievements)).toBe(0);
    });

    it('should return 0 points when no achievements', () => {
      expect(computeMilestoneBonus(false, [])).toBe(0);
    });
  });

  describe('computeGoalCompletionBonus', () => {
    it('should return 20 points for goal completion today', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'goal_completion', description: 'Test', timestamp: twelveHoursAgo },
      ];
      expect(computeGoalCompletionBonus(achievements)).toBe(20);
    });

    it('should return 0 points for goal completion > 24 hours ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'goal_completion', description: 'Test', timestamp: twoDaysAgo },
      ];
      expect(computeGoalCompletionBonus(achievements)).toBe(0);
    });

    it('should return 0 points when no achievements', () => {
      expect(computeGoalCompletionBonus([])).toBe(0);
    });
  });

  describe('computeKnowledgeMilestoneBonus', () => {
    it('should return 15 points for mastery level achieved today', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'mastery_level', description: 'Test', timestamp: twelveHoursAgo },
      ];
      expect(computeKnowledgeMilestoneBonus(achievements)).toBe(15);
    });

    it('should return 0 points for mastery level > 24 hours ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'mastery_level', description: 'Test', timestamp: twoDaysAgo },
      ];
      expect(computeKnowledgeMilestoneBonus(achievements)).toBe(0);
    });
  });

  describe('computeStreakBonus', () => {
    it('should return 10 points for 7+ day streak', () => {
      expect(computeStreakBonus(7)).toBe(10);
      expect(computeStreakBonus(10)).toBe(10);
    });

    it('should return 5 points for 3-6 day streak', () => {
      expect(computeStreakBonus(3)).toBe(5);
      expect(computeStreakBonus(6)).toBe(5);
    });

    it('should return 0 points for < 3 day streak', () => {
      expect(computeStreakBonus(2)).toBe(0);
      expect(computeStreakBonus(1)).toBe(0);
    });

    it('should return 0 points when no streak', () => {
      expect(computeStreakBonus(undefined)).toBe(0);
      expect(computeStreakBonus(0)).toBe(0);
    });
  });

  describe('computeStreakContinuationBonus', () => {
    it('should return 10 points for active streak without recent practice', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      expect(computeStreakContinuationBonus(5, oneDayAgo)).toBe(10);
    });

    it('should return 0 points if practiced within 12 hours', () => {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      expect(computeStreakContinuationBonus(5, sixHoursAgo)).toBe(0);
    });

    it('should return 0 points if streak < 2 days', () => {
      expect(computeStreakContinuationBonus(1, undefined)).toBe(0);
      expect(computeStreakContinuationBonus(0, undefined)).toBe(0);
    });
  });

  describe('computeStruggleFocusBonus', () => {
    it('should return 20 points when student struggling with subject', () => {
      const practiceStats: Record<string, SubjectPracticeStats> = {
        Math: {
          totalSessions: 5,
          averageScore: 0.6, // < 70%
          longestStreak: 0,
          currentStreak: 0,
        },
      };
      expect(computeStruggleFocusBonus(practiceStats)).toBe(20);
    });

    it('should return 0 points when student not struggling', () => {
      const practiceStats: Record<string, SubjectPracticeStats> = {
        Math: {
          totalSessions: 5,
          averageScore: 0.85, // > 70%
          longestStreak: 0,
          currentStreak: 0,
        },
      };
      expect(computeStruggleFocusBonus(practiceStats)).toBe(0);
    });

    it('should return 0 points when too few practice sessions', () => {
      const practiceStats: Record<string, SubjectPracticeStats> = {
        Math: {
          totalSessions: 1, // < 2 sessions
          averageScore: 0.5,
          longestStreak: 0,
          currentStreak: 0,
        },
      };
      expect(computeStruggleFocusBonus(practiceStats)).toBe(0);
    });

    it('should return 0 points when no practice stats', () => {
      expect(computeStruggleFocusBonus(undefined)).toBe(0);
      expect(computeStruggleFocusBonus({})).toBe(0);
    });
  });

  describe('computeReengagementNeedBonus', () => {
    it('should return 20 points when low recent activity', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const recentSessions: RecentSessionData[] = [
        { topics: ['Math'], timestamp: tenDaysAgo, achievements: [] },
      ];
      expect(computeReengagementNeedBonus(undefined, recentSessions)).toBe(20);
    });

    it('should return 0 points when sufficient recent activity', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const recentSessions: RecentSessionData[] = [
        { topics: ['Math'], timestamp: twoDaysAgo, achievements: [] },
        { topics: ['Science'], timestamp: twoDaysAgo, achievements: [] },
        { topics: ['English'], timestamp: twoDaysAgo, achievements: [] },
      ];
      expect(computeReengagementNeedBonus(undefined, recentSessions)).toBe(0);
    });

    it('should return 0 points when no sessions', () => {
      expect(computeReengagementNeedBonus(undefined, [])).toBe(0);
    });

    it('should return 20 points when only one recent session (low activity)', () => {
      expect(computeReengagementNeedBonus(undefined, [
        { topics: [], timestamp: new Date().toISOString(), achievements: [] },
      ])).toBe(20);
    });
  });
});

describe('Card Ordering Algorithm - Priority Computation', () => {
  describe('computePracticePriority', () => {
    it('should compute high priority after recent session', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

      const input: CardOrderInput = {
        lastSessionTime: thirtyMinutesAgo,
        recentSessions: [],
        hasCompletedAnySession: true,
      };

      const priority = computePracticePriority(input);
      expect(priority.card).toBe('practice');
      expect(priority.score).toBe(60); // 30 base + 30 session recency
      expect(priority.factors.sessionRecency).toBe(30);
    });

    it('should compute high priority when struggling', () => {
      const practiceStats: Record<string, SubjectPracticeStats> = {
        Math: {
          totalSessions: 5,
          averageScore: 0.6,
          longestStreak: 0,
          currentStreak: 0,
        },
      };

      const input: CardOrderInput = {
        recentSessions: [],
        hasCompletedAnySession: true,
        practiceStats,
      };

      const priority = computePracticePriority(input);
      expect(priority.score).toBe(50); // 30 base + 20 struggle focus
      expect(priority.factors.struggleFocus).toBe(20);
    });

    it('should apply inactivity penalty', () => {
      const now = new Date();
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

      const input: CardOrderInput = {
        lastAppAccess: fourDaysAgo,
        recentSessions: [],
        hasCompletedAnySession: true,
      };

      const priority = computePracticePriority(input);
      expect(priority.score).toBe(20); // 30 base - 10 inactivity penalty
      expect(priority.factors.inactivityPenalty).toBe(10);
    });
  });

  describe('computeChatPriority', () => {
    it('should compute high priority during inactivity', () => {
      const now = new Date();
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

      const input: CardOrderInput = {
        lastAppAccess: fourDaysAgo,
        recentSessions: [],
        hasCompletedAnySession: true,
      };

      const priority = computeChatPriority(input);
      expect(priority.card).toBe('chat');
      expect(priority.score).toBe(60); // 20 base + 40 inactivity bonus
      expect(priority.factors.inactivityBonus).toBe(40);
    });

    it('should apply session recency penalty', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

      const input: CardOrderInput = {
        lastSessionTime: thirtyMinutesAgo,
        recentSessions: [],
        hasCompletedAnySession: true,
      };

      const priority = computeChatPriority(input);
      expect(priority.score).toBe(5); // 20 base - 15 session recency penalty
      expect(priority.factors.sessionRecency).toBe(-15);
    });
  });

  describe('computeProgressPriority', () => {
    it('should compute high priority after milestone', () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const achievements: StudentAchievement[] = [
        { type: 'milestone', description: 'Test', timestamp: twelveHoursAgo },
      ];

      const input: CardOrderInput = {
        recentSessions: [],
        hasCompletedAnySession: true,
        achievementToday: true,
        recentAchievements: achievements,
      };

      const priority = computeProgressPriority(input);
      expect(priority.card).toBe('progress');
      expect(priority.score).toBe(50); // 10 base + 40 milestone bonus
      expect(priority.factors.milestoneBonus).toBe(40);
    });

    it('should compute priority with streak bonus', () => {
      const input: CardOrderInput = {
        recentSessions: [],
        hasCompletedAnySession: true,
        currentStreak: 7,
      };

      const priority = computeProgressPriority(input);
      expect(priority.score).toBe(20); // 10 base + 10 streak bonus
      expect(priority.factors.streakBonus).toBe(10);
    });
  });
});

describe('Card Ordering Algorithm - Complete Ordering', () => {
  it('should prioritize Practice after recent session (Post-Session Context)', () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    const input: CardOrderInput = {
      lastSessionTime: thirtyMinutesAgo,
      lastAppAccess: thirtyMinutesAgo,
      recentSessions: [
        { topics: ['Math'], timestamp: thirtyMinutesAgo, achievements: [] },
      ],
      hasCompletedAnySession: true,
    };

    const result = computeCardOrder(input);
    expect(result.order[0]).toBe('practice');
    expect(result.context.studentState).toBe('celebration');
    expect(result.context.reason).toContain('Post-session celebration');
  });

  it('should prioritize Chat after 3+ days inactivity (Re-engagement Context)', () => {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

    const input: CardOrderInput = {
      lastAppAccess: fourDaysAgo,
      recentSessions: [],
      hasCompletedAnySession: true,
    };

    const result = computeCardOrder(input);
    expect(result.order[0]).toBe('chat');
    expect(result.context.studentState).toBe('re_engagement');
    expect(result.context.reason).toContain('Re-engagement needed');
  });

  it('should prioritize Progress after milestone (Achievement Context)', () => {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const achievements: StudentAchievement[] = [
      { type: 'milestone', description: 'Test', timestamp: twelveHoursAgo },
    ];

    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
      achievementToday: true,
      recentAchievements: achievements,
    };

    const result = computeCardOrder(input);
    expect(result.order[0]).toBe('progress');
    expect(result.context.studentState).toBe('achievement');
    expect(result.context.reason).toContain('Achievement milestone');
  });

  it('should prioritize Practice when struggling (Struggle Focus Context)', () => {
    const practiceStats: Record<string, SubjectPracticeStats> = {
      Math: {
        totalSessions: 5,
        averageScore: 0.6,
        longestStreak: 0,
        currentStreak: 0,
      },
    };

    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
      practiceStats,
    };

    const result = computeCardOrder(input);
    expect(result.order[0]).toBe('practice');
    expect(result.context.reason).toContain('Struggling subject');
  });

  it('should use default ordering (Default Context)', () => {
    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
    };

    const result = computeCardOrder(input);
    expect(result.order).toEqual(['practice', 'chat', 'progress']);
    expect(result.context.studentState).toBe('default');
  });

  it('should prioritize Chat for first session', () => {
    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: false,
    };

    const result = computeCardOrder(input);
    expect(result.order[0]).toBe('chat');
    expect(result.context.studentState).toBe('first_session');
    expect(result.context.reason).toContain('First session');
  });

  it('should include expiration timestamp', () => {
    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
    };

    const beforeCompute = Date.now();
    const result = computeCardOrder(input);
    const afterCompute = Date.now();

    const expiresAt = new Date(result.expiresAt).getTime();
    const minExpiry = beforeCompute + 10 * 60 * 1000; // 10 minutes
    const maxExpiry = afterCompute + 10 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(minExpiry);
    expect(expiresAt).toBeLessThanOrEqual(maxExpiry);
  });

  it('should include all three cards in order', () => {
    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
    };

    const result = computeCardOrder(input);
    expect(result.order).toHaveLength(3);
    expect(result.order).toContain('practice');
    expect(result.order).toContain('chat');
    expect(result.order).toContain('progress');
  });

  it('should be deterministic (same input = same output)', () => {
    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
    };

    const result1 = computeCardOrder(input);
    const result2 = computeCardOrder(input);

    expect(result1.order).toEqual(result2.order);
    expect(result1.context.studentState).toBe(result2.context.studentState);
  });

  it('should include priorities in context', () => {
    const input: CardOrderInput = {
      recentSessions: [],
      hasCompletedAnySession: true,
    };

    const result = computeCardOrder(input);
    expect(result.context.priorities).toHaveLength(3);
    expect(result.context.priorities[0].score).toBeGreaterThanOrEqual(
      result.context.priorities[1].score
    );
    expect(result.context.priorities[1].score).toBeGreaterThanOrEqual(
      result.context.priorities[2].score
    );
  });
});
