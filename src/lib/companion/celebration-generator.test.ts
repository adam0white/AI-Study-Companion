/**
 * Celebration Message Generator Tests
 * Story 5.1: AC-5.1.2, AC-5.1.6 - Personalized celebration message tests
 */

import { describe, it, expect } from 'vitest';
import { generateCelebrationData, calculateKnowledgeGain } from './celebration-generator';
import type { SessionMetrics, AchievementBadge } from '../types/celebration';

describe('Celebration Generator', () => {
  describe('generateCelebrationData', () => {
    it('should generate celebration with high accuracy (90%+)', () => {
      const metrics: SessionMetrics = {
        accuracy: 92,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Algebra'],
        estimatedKnowledgeGain: '92%',
      };

      const data = generateCelebrationData(metrics, []);

      expect(data.title).toContain('Excellent');
      expect(data.message).toBeTruthy();
      expect(data.metrics).toEqual(metrics);
      expect(data.emoji).toBe('🎯');
    });

    it('should generate celebration with perfect score', () => {
      const metrics: SessionMetrics = {
        accuracy: 100,
        questionsAnswered: 10,
        correctAnswers: 10,
        topicsLearned: ['Geometry'],
        estimatedKnowledgeGain: '100%',
      };

      const data = generateCelebrationData(metrics, []);

      expect(data.title).toBe('Phenomenal Work!');
      expect(data.emoji).toBe('🏆');
    });

    it('should reference specific topics in message', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Quadratic Equations'],
        estimatedKnowledgeGain: '85%',
      };

      const data = generateCelebrationData(metrics, []);

      // Message should contain the topic
      expect(data.message.toLowerCase()).toMatch(/quadratic/i);
    });

    it('should include achievement badges in celebration', () => {
      const metrics: SessionMetrics = {
        accuracy: 90,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Physics'],
        estimatedKnowledgeGain: '90%',
      };

      const badges: AchievementBadge[] = [
        {
          id: 'accuracy_90',
          type: 'accuracy',
          title: '90% Accuracy',
          description: '90%+ accuracy',
          icon: '🎯',
          color: 'text-purple-500',
          unlockedAt: new Date().toISOString(),
        },
      ];

      const data = generateCelebrationData(metrics, badges);

      expect(data.achievements).toEqual(badges);
      expect(data.achievements.length).toBe(1);
    });

    it('should generate different messages for similar scores', () => {
      const metrics: SessionMetrics = {
        accuracy: 85,
        questionsAnswered: 10,
        correctAnswers: 8,
        topicsLearned: ['Math'],
        estimatedKnowledgeGain: '85%',
      };

      const messages = new Set();
      for (let i = 0; i < 10; i++) {
        const data = generateCelebrationData(metrics, []);
        messages.add(data.message);
      }

      // Should have multiple variations
      expect(messages.size).toBeGreaterThan(1);
    });

    it('should use gradient background based on accuracy', () => {
      const highAccuracy: SessionMetrics = {
        accuracy: 92,
        questionsAnswered: 10,
        correctAnswers: 9,
        topicsLearned: ['Science'],
        estimatedKnowledgeGain: '92%',
      };

      const data = generateCelebrationData(highAccuracy, []);

      expect(data.backgroundColor).toContain('purple');
      expect(data.backgroundColor).toContain('pink');
    });
  });

  describe('calculateKnowledgeGain', () => {
    it('should format knowledge gain without previous accuracy', () => {
      const result = calculateKnowledgeGain(85);

      expect(result).toContain('85%');
      expect(result).toContain('understanding');
    });

    it('should show major improvement for 20%+ gain', () => {
      const result = calculateKnowledgeGain(90, 65);

      expect(result).toContain('25%');
      expect(result).toContain('major improvement');
    });

    it('should show significant progress for 10-19% gain', () => {
      const result = calculateKnowledgeGain(85, 72);

      expect(result).toContain('13%');
      expect(result).toContain('significant');
    });

    it('should show steady improvement for 1-9% gain', () => {
      const result = calculateKnowledgeGain(83, 78);

      expect(result).toContain('5%');
      expect(result).toContain('steady');
    });

    it('should show maintaining message for no change', () => {
      const result = calculateKnowledgeGain(80, 80);

      expect(result).toContain('Maintaining');
    });

    it('should show growth message for negative change', () => {
      const result = calculateKnowledgeGain(75, 82);

      expect(result).toContain('Room for growth');
    });
  });
});
