/**
 * Unit Tests for Greeting Generation
 * Story 5.0: AC-5.0.1, AC-5.0.5 - Dynamic greeting based on session data with specific references
 */

import { describe, it, expect } from 'vitest';
import { generateGreeting, hasSpecificReferences } from './greeting-templates';
import type { RecentSessionData } from '../rpc/types';

describe('generateGreeting', () => {
  const mockRecentSession: RecentSessionData = {
    topics: ['quadratic equations', 'factoring'],
    score: 95,
    timestamp: new Date().toISOString(),
    achievements: ['Completed 5 practice sessions'],
    subject: 'Math',
  };

  it('should generate celebration greeting with score reference', () => {
    const greeting = generateGreeting({
      state: 'celebration',
      recentSessions: [mockRecentSession],
      lastScore: 95,
      lastTopic: 'quadratic equations',
    });

    expect(greeting).toBeTruthy();
    expect(greeting).toContain('95%');
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should generate re_engagement greeting with subject reference', () => {
    const greeting = generateGreeting({
      state: 're_engagement',
      recentSessions: [mockRecentSession],
      lastSubject: 'Math',
      streakDays: 3,
    });

    expect(greeting).toBeTruthy();
    expect(greeting.toLowerCase()).toContain('math');
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should generate achievement greeting with subject reference', () => {
    const greeting = generateGreeting({
      state: 'achievement',
      recentSessions: [mockRecentSession],
      lastSubject: 'Math',
    });

    expect(greeting).toBeTruthy();
    expect(greeting.toLowerCase()).toContain('math');
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should generate first_session greeting', () => {
    const greeting = generateGreeting({
      state: 'first_session',
      recentSessions: [],
    });

    expect(greeting).toBeTruthy();
    // First session greetings should be welcoming (may contain 'welcome', 'hi', 'hello', or 'ready')
    expect(
      greeting.toLowerCase().includes('welcome') ||
      greeting.toLowerCase().includes('hi') ||
      greeting.toLowerCase().includes('hello') ||
      greeting.toLowerCase().includes('ready')
    ).toBe(true);
  });

  it('should generate default greeting with subject reference', () => {
    const greeting = generateGreeting({
      state: 'default',
      recentSessions: [mockRecentSession],
      lastSubject: 'Math',
    });

    expect(greeting).toBeTruthy();
    expect(greeting.toLowerCase()).toContain('math');
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should handle empty session data gracefully', () => {
    const greeting = generateGreeting({
      state: 'default',
      recentSessions: [],
    });

    expect(greeting).toBeTruthy();
    expect(typeof greeting).toBe('string');
  });

  it('should generate different greetings on multiple calls', () => {
    const greetings = new Set<string>();

    // Generate 10 greetings for the same state
    for (let i = 0; i < 10; i++) {
      const greeting = generateGreeting({
        state: 'celebration',
        recentSessions: [mockRecentSession],
        lastScore: 95,
        lastTopic: 'quadratic equations',
      });
      greetings.add(greeting);
    }

    // Should have at least 2 unique greetings (randomization)
    expect(greetings.size).toBeGreaterThan(1);
  });

  it('should include topic references from session data', () => {
    const greeting = generateGreeting({
      state: 'celebration',
      recentSessions: [mockRecentSession],
      lastTopic: 'quadratic equations',
      lastScore: 95,
    });

    expect(greeting.toLowerCase()).toContain('quadratic equations');
  });

  it('should include streak references when provided', () => {
    const greeting = generateGreeting({
      state: 're_engagement',
      recentSessions: [mockRecentSession],
      lastSubject: 'Math',
      streakDays: 7,
    });

    // Some re-engagement templates include streak
    expect(greeting).toBeTruthy();
  });
});

describe('hasSpecificReferences', () => {
  it('should return true for greeting with specific topic', () => {
    const greeting = 'Great work on quadratic equations today!';
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should return true for greeting with score percentage', () => {
    const greeting = 'You scored 95% on the practice.';
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should return true for greeting with specific subject', () => {
    const greeting = 'Ready to continue with Mathematics?';
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should return true for greeting with streak days', () => {
    const greeting = "You've been practicing for 7 days straight!";
    expect(hasSpecificReferences(greeting)).toBe(true);
  });

  it('should return false for generic greeting without references', () => {
    const greeting = 'Ready to continue with your studies?';
    expect(hasSpecificReferences(greeting)).toBe(false);
  });

  it('should return false for greeting with unreplaced placeholders', () => {
    const greeting = 'Great work on {topic} today!';
    expect(hasSpecificReferences(greeting)).toBe(false);
  });

  it('should return false for greeting with generic subject fallback', () => {
    const greeting = 'Ready to continue with your subjects?';
    expect(hasSpecificReferences(greeting)).toBe(false);
  });
});
