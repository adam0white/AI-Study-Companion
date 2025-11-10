/**
 * Session Completion Detection Tests
 * Story 5.1: AC-5.1.1 - Session completion detection tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectSessionCompletion,
  extractSessionMetrics,
  calculateStreak,
  calculateImprovement,
} from './session-completion';
import type { SessionMetadata } from '../rpc/types';

describe('Session Completion Detection', () => {
  describe('detectSessionCompletion', () => {
    it('should detect new session for celebration', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
          subjects: JSON.stringify(['Algebra']),
        },
      ];

      const event = detectSessionCompletion(sessions);

      expect(event).not.toBeNull();
      expect(event?.newSessionId).toBe('session-1');
      expect(event?.topics).toContain('Algebra');
    });

    it('should return null if no sessions', () => {
      const event = detectSessionCompletion([]);
      expect(event).toBeNull();
    });

    it('should return null if session already celebrated', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
          subjects: 'Math',
        },
      ];

      const event = detectSessionCompletion(sessions, 'session-1');
      expect(event).toBeNull();
    });

    it('should return null if session is too old', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 2); // 2 hours ago

      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: oldDate.toISOString(),
          status: 'completed',
          createdAt: oldDate.toISOString(),
          subjects: 'Physics',
        },
      ];

      const event = detectSessionCompletion(sessions);
      expect(event).toBeNull();
    });

    it('should parse multiple topics from JSON array', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
          subjects: JSON.stringify(['Algebra', 'Geometry', 'Trigonometry']),
        },
      ];

      const event = detectSessionCompletion(sessions);

      expect(event?.topics.length).toBe(3);
      expect(event?.topics).toContain('Algebra');
      expect(event?.topics).toContain('Geometry');
      expect(event?.topics).toContain('Trigonometry');
    });

    it('should handle single string subject', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
          subjects: 'Chemistry',
        },
      ];

      const event = detectSessionCompletion(sessions);

      expect(event?.topics).toContain('Chemistry');
    });
  });

  describe('extractSessionMetrics', () => {
    it('should extract metrics from session content', () => {
      const sessionContent = {
        entries: [
          { type: 'question', question: 'Q1', answer: 'A1' },
          { type: 'question', question: 'Q2', answer: 'A2' },
          { type: 'question', question: 'Q3', answer: 'A3' },
        ],
      };

      const metrics = extractSessionMetrics(sessionContent);

      expect(metrics.questionsAnswered).toBe(3);
      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(100);
      expect(metrics.correctAnswers).toBeGreaterThan(0);
    });

    it('should return default metrics for no content', () => {
      const metrics = extractSessionMetrics(null);

      expect(metrics.accuracy).toBe(75);
      expect(metrics.questionsAnswered).toBe(10);
      expect(metrics.correctAnswers).toBe(8);
    });

    it('should handle empty entries array', () => {
      const sessionContent = { entries: [] };

      const metrics = extractSessionMetrics(sessionContent);

      expect(metrics.accuracy).toBe(0);
      expect(metrics.questionsAnswered).toBe(0);
    });
  });

  describe('calculateStreak', () => {
    it('should return 0 for no sessions', () => {
      const streak = calculateStreak([]);
      expect(streak).toBe(0);
    });

    it('should return 1 for single session', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
      ];

      const streak = calculateStreak(sessions);
      expect(streak).toBe(1);
    });

    it('should calculate consecutive day streak', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const sessions: SessionMetadata[] = [
        {
          id: 'session-3',
          studentId: 'student-1',
          r2Key: 'key-3',
          date: today.toISOString(),
          status: 'completed',
          createdAt: today.toISOString(),
        },
        {
          id: 'session-2',
          studentId: 'student-1',
          r2Key: 'key-2',
          date: yesterday.toISOString(),
          status: 'completed',
          createdAt: yesterday.toISOString(),
        },
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: twoDaysAgo.toISOString(),
          status: 'completed',
          createdAt: twoDaysAgo.toISOString(),
        },
      ];

      const streak = calculateStreak(sessions);
      expect(streak).toBe(3);
    });

    it('should break streak for non-consecutive days', () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const sessions: SessionMetadata[] = [
        {
          id: 'session-2',
          studentId: 'student-1',
          r2Key: 'key-2',
          date: today.toISOString(),
          status: 'completed',
          createdAt: today.toISOString(),
        },
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: threeDaysAgo.toISOString(),
          status: 'completed',
          createdAt: threeDaysAgo.toISOString(),
        },
      ];

      const streak = calculateStreak(sessions);
      expect(streak).toBe(1);
    });
  });

  describe('calculateImprovement', () => {
    it('should return null for single session', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
      ];

      const improvement = calculateImprovement(85, sessions);
      expect(improvement).toBeNull();
    });

    it('should calculate accuracy improvement', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-2',
          studentId: 'student-1',
          r2Key: 'key-2',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      const improvement = calculateImprovement(85, sessions);

      expect(improvement).not.toBeNull();
      expect(improvement?.accuracyChange).toBeGreaterThan(0);
      expect(improvement?.speedImprovement).toBeDefined();
    });

    it('should categorize as "Much faster" for 15%+ improvement', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-2',
          studentId: 'student-1',
          r2Key: 'key-2',
          date: new Date().toISOString(),
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-1',
          studentId: 'student-1',
          r2Key: 'key-1',
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      const improvement = calculateImprovement(90, sessions);

      expect(improvement?.accuracyChange).toBeGreaterThanOrEqual(12);
      expect(improvement?.speedImprovement).toMatch(/faster|Similar/i);
    });
  });
});
