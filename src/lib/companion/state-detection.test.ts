/**
 * Unit Tests for Student State Detection
 * Story 5.0: AC-5.0.2 - Hero card state variants based on student activity
 */

import { describe, it, expect } from 'vitest';
import { detectStudentState, getGradientColors, getEmoticon, getCTAConfig } from './state-detection';
import type { DetectStateInput } from './state-detection';

describe('detectStudentState', () => {
  const baseInput: DetectStateInput = {
    recentSessions: [],
    hasCompletedAnySession: true,
  };

  it('should return first_session when student has no completed sessions', () => {
    const input: DetectStateInput = {
      ...baseInput,
      hasCompletedAnySession: false,
      recentSessions: [],
    };

    const state = detectStudentState(input);
    expect(state).toBe('first_session');
  });

  it('should return celebration when session completed within 1 hour', () => {
    const now = new Date();
    const halfHourAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const input: DetectStateInput = {
      ...baseInput,
      lastSessionTime: halfHourAgo.toISOString(),
    };

    const state = detectStudentState(input);
    expect(state).toBe('celebration');
  });

  it('should return achievement when milestone achieved today', () => {
    const input: DetectStateInput = {
      ...baseInput,
      achievementToday: true,
    };

    const state = detectStudentState(input);
    expect(state).toBe('achievement');
  });

  it('should return re_engagement when 3+ days inactive', () => {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const input: DetectStateInput = {
      ...baseInput,
      lastAppAccess: fourDaysAgo.toISOString(),
    };

    const state = detectStudentState(input);
    expect(state).toBe('re_engagement');
  });

  it('should return default for routine check-in', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const input: DetectStateInput = {
      ...baseInput,
      lastAppAccess: oneDayAgo.toISOString(),
    };

    const state = detectStudentState(input);
    expect(state).toBe('default');
  });

  it('should prioritize celebration over achievement', () => {
    const now = new Date();
    const halfHourAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const input: DetectStateInput = {
      ...baseInput,
      lastSessionTime: halfHourAgo.toISOString(),
      achievementToday: true,
    };

    const state = detectStudentState(input);
    expect(state).toBe('celebration');
  });

  it('should prioritize achievement over re_engagement', () => {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const input: DetectStateInput = {
      ...baseInput,
      lastAppAccess: fourDaysAgo.toISOString(),
      achievementToday: true,
    };

    const state = detectStudentState(input);
    expect(state).toBe('achievement');
  });
});

describe('getGradientColors', () => {
  it('should return purple-to-pink for celebration state', () => {
    const colors = getGradientColors('celebration');
    expect(colors).toEqual(['#8B5CF6', '#EC4899']);
  });

  it('should return purple-to-pink for achievement state', () => {
    const colors = getGradientColors('achievement');
    expect(colors).toEqual(['#8B5CF6', '#EC4899']);
  });

  it('should return purple-to-cyan for re_engagement state', () => {
    const colors = getGradientColors('re_engagement');
    expect(colors).toEqual(['#8B5CF6', '#06B6D4']);
  });

  it('should return undefined for default state', () => {
    const colors = getGradientColors('default');
    expect(colors).toBeUndefined();
  });

  it('should return undefined for first_session state', () => {
    const colors = getGradientColors('first_session');
    expect(colors).toBeUndefined();
  });
});

describe('getEmoticon', () => {
  it('should return celebration emoji for celebration state', () => {
    expect(getEmoticon('celebration')).toBe('🎉');
  });

  it('should return star emoji for achievement state', () => {
    expect(getEmoticon('achievement')).toBe('⭐');
  });

  it('should return muscle emoji for re_engagement state', () => {
    expect(getEmoticon('re_engagement')).toBe('💪');
  });

  it('should return wave emoji for first_session state', () => {
    expect(getEmoticon('first_session')).toBe('👋');
  });

  it('should return wave emoji for default state', () => {
    expect(getEmoticon('default')).toBe('👋');
  });
});

describe('getCTAConfig', () => {
  it('should return correct CTAs for celebration state', () => {
    const config = getCTAConfig('celebration');
    expect(config.primaryCTA.label).toBe('Start Practice');
    expect(config.secondaryCTA.label).toBe('View Progress');
  });

  it('should return correct CTAs for re_engagement state', () => {
    const config = getCTAConfig('re_engagement');
    expect(config.primaryCTA.label).toBe("Let's Get Back to It");
    expect(config.secondaryCTA.label).toBe('View Progress');
  });

  it('should return correct CTAs for achievement state', () => {
    const config = getCTAConfig('achievement');
    expect(config.primaryCTA.label).toBe('Continue Learning');
    expect(config.secondaryCTA.label).toBe('Start Practice');
  });

  it('should return correct CTAs for first_session state', () => {
    const config = getCTAConfig('first_session');
    expect(config.primaryCTA.label).toBe('Get Started');
    expect(config.secondaryCTA.label).toBe('Take Tour');
  });

  it('should return correct CTAs for default state', () => {
    const config = getCTAConfig('default');
    expect(config.primaryCTA.label).toBe('Start Practice');
    expect(config.secondaryCTA.label).toBe('Ask Question');
  });
});
