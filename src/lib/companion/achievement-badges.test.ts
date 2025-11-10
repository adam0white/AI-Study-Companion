/**
 * Achievement Badge Detection Tests
 * Story 5.1: AC-5.1.4 - Achievement badge unlock tests
 */

import { describe, it, expect } from 'vitest';
import { detectUnlockedBadges, getBadgeGradient } from './achievement-badges';
import type { SessionMetrics } from '../types/celebration';
import type { SubjectMastery } from '../rpc/types';

describe('Achievement Badge Detection', () => {
  describe('detectUnlockedBadges', () => {
    it('should detect 100% accuracy badge (Perfect Score)', () => {
      const metrics: SessionMetrics = {
        accuracy: 100,
        questionsAnswered: 10,
        correctAnswers: 10,
        topicsLearned: ['Algebra'],
        estimatedKnowledgeGain: '100% mastery!',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      expect(badges.length).toBeGreaterThan(0);
      const perfectBadge = badges.find((b) => b.id === 'accuracy_100');
      expect(perfectBadge).toBeDefined();
      expect(perfectBadge?.title).toBe('Perfect Score');
      expect(perfectBadge?.type).toBe('accuracy');
    });

    it('should detect 90% accuracy badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 92,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Geometry'],
        estimatedKnowledgeGain: '92% mastery',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const badge = badges.find((b) => b.id === 'accuracy_90');
      expect(badge).toBeDefined();
      expect(badge?.title).toBe('90% Accuracy');
    });

    it('should detect 80% accuracy badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Calculus'],
        estimatedKnowledgeGain: '85% mastery',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const badge = badges.find((b) => b.id === 'accuracy_80');
      expect(badge).toBeDefined();
    });

    it('should detect 70% accuracy badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 75,
        questionsAnswered: 10,
        correctAnswers: 7,
        topicsLearned: ['Physics'],
        estimatedKnowledgeGain: '75% understanding',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const badge = badges.find((b) => b.id === 'accuracy_70');
      expect(badge).toBeDefined();
    });

    it('should not detect accuracy badge for < 70%', () => {
      const metrics: SessionMetrics = {
        accuracy: 65,
        questionsAnswered: 10,
        correctAnswers: 6,
        topicsLearned: ['Chemistry'],
        estimatedKnowledgeGain: '65% progress',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const accuracyBadges = badges.filter((b) => b.type === 'accuracy');
      expect(accuracyBadges.length).toBe(0);
    });

    it('should detect 3-day streak badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 75,
        questionsAnswered: 10,
        correctAnswers: 7,
        topicsLearned: ['Math'],
        estimatedKnowledgeGain: '75%',
      };

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        consecutiveDays: 3,
      });

      const badge = badges.find((b) => b.id === 'streak_3');
      expect(badge).toBeDefined();
      expect(badge?.title).toBe('3-Day Streak');
    });

    it('should detect 7-day streak badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 80,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Science'],
        estimatedKnowledgeGain: '80%',
      };

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        consecutiveDays: 7,
      });

      const badge = badges.find((b) => b.id === 'streak_7');
      expect(badge).toBeDefined();
    });

    it('should detect 14-day streak badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['History'],
        estimatedKnowledgeGain: '85%',
      };

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        consecutiveDays: 14,
      });

      const badge = badges.find((b) => b.id === 'streak_14');
      expect(badge).toBeDefined();
    });

    it('should detect subject mastery badge', () => {
      const metrics: SessionMetrics = {
        accuracy: 90,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Algebra'],
        estimatedKnowledgeGain: '90%',
      };

      const subjectMastery: SubjectMastery[] = [
        {
          subject: 'Algebra',
          mastery_score: 0.85,
          practice_count: 6,
          last_updated: new Date().toISOString(),
        },
      ];

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        subjectMastery,
      });

      const badge = badges.find((b) => b.id === 'mastery_algebra');
      expect(badge).toBeDefined();
      expect(badge?.title).toBe('Algebra Master');
    });

    it('should not detect mastery badge with < 80% mastery', () => {
      const metrics: SessionMetrics = {
        accuracy: 75,
        questionsAnswered: 10,
        correctAnswers: 7,
        topicsLearned: ['Geometry'],
        estimatedKnowledgeGain: '75%',
      };

      const subjectMastery: SubjectMastery[] = [
        {
          subject: 'Geometry',
          mastery_score: 0.75,
          practice_count: 6,
          last_updated: new Date().toISOString(),
        },
      ];

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        subjectMastery,
      });

      const masteryBadges = badges.filter((b) => b.type === 'mastery');
      expect(masteryBadges.length).toBe(0);
    });

    it('should not detect mastery badge with < 5 sessions', () => {
      const metrics: SessionMetrics = {
        accuracy: 90,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Calculus'],
        estimatedKnowledgeGain: '90%',
      };

      const subjectMastery: SubjectMastery[] = [
        {
          subject: 'Calculus',
          mastery_score: 0.9,
          practice_count: 3,
          last_updated: new Date().toISOString(),
        },
      ];

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        subjectMastery,
      });

      const masteryBadges = badges.filter((b) => b.type === 'mastery');
      expect(masteryBadges.length).toBe(0);
    });

    it('should detect Deep Focus badge for single topic', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Trigonometry'],
        estimatedKnowledgeGain: '85%',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const badge = badges.find((b) => b.id === 'focus_deep');
      expect(badge).toBeDefined();
      expect(badge?.title).toBe('Deep Focus');
    });

    it('should not detect Deep Focus badge for multiple topics', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Algebra', 'Geometry'],
        estimatedKnowledgeGain: '85%',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const badge = badges.find((b) => b.id === 'focus_deep');
      expect(badge).toBeUndefined();
    });

    it('should detect Rapid Progress badge for 20%+ improvement', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Physics'],
        estimatedKnowledgeGain: '20% improvement',
        comparisonToPrevious: {
          accuracyChange: 25,
          speedImprovement: 'Much faster',
        },
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      const badge = badges.find((b) => b.id === 'focus_rapid');
      expect(badge).toBeDefined();
      expect(badge?.title).toBe('Rapid Progress');
    });

    it('should detect multiple badges in single session', () => {
      const metrics: SessionMetrics = {
        accuracy: 95,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Math'],
        estimatedKnowledgeGain: '95%',
        comparisonToPrevious: {
          accuracyChange: 22,
          speedImprovement: 'Much faster',
        },
      };

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        consecutiveDays: 7,
      });

      expect(badges.length).toBeGreaterThan(2);
      expect(badges.some((b) => b.type === 'accuracy')).toBe(true);
      expect(badges.some((b) => b.type === 'streak')).toBe(true);
      expect(badges.some((b) => b.type === 'focus')).toBe(true);
    });

    it('should detect consistency badges', () => {
      const metrics: SessionMetrics = {
        accuracy: 80,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['English'],
        estimatedKnowledgeGain: '80%',
      };

      const badges = detectUnlockedBadges({
        sessionMetrics: metrics,
        consecutiveDays: 7,
      });

      const consistencyBadge = badges.find((b) => b.type === 'consistency');
      expect(consistencyBadge).toBeDefined();
    });

    it('should return empty array for no unlocked badges', () => {
      const metrics: SessionMetrics = {
        accuracy: 50,
        questionsAnswered: 10,
        correctAnswers: 5,
        topicsLearned: ['Math', 'Science'],
        estimatedKnowledgeGain: '50%',
      };

      const badges = detectUnlockedBadges({ sessionMetrics: metrics });

      expect(badges.length).toBe(0);
    });
  });

  describe('getBadgeGradient', () => {
    it('should return correct gradient for accuracy badge', () => {
      const gradient = getBadgeGradient('accuracy');
      expect(gradient).toBe('from-purple-500 to-pink-500');
    });

    it('should return correct gradient for streak badge', () => {
      const gradient = getBadgeGradient('streak');
      expect(gradient).toBe('from-red-500 to-orange-500');
    });

    it('should return correct gradient for mastery badge', () => {
      const gradient = getBadgeGradient('mastery');
      expect(gradient).toBe('from-indigo-500 to-purple-600');
    });

    it('should return correct gradient for consistency badge', () => {
      const gradient = getBadgeGradient('consistency');
      expect(gradient).toBe('from-blue-500 to-indigo-600');
    });

    it('should return correct gradient for focus badge', () => {
      const gradient = getBadgeGradient('focus');
      expect(gradient).toBe('from-cyan-500 to-blue-600');
    });
  });
});
