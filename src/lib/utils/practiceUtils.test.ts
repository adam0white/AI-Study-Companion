/**
 * Practice Utilities Tests
 * Story 3.3: Practice Session Completion Tracking
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePracticeStreak,
  formatDuration,
  formatAccuracy,
  getAccuracyColor,
  formatMasteryLevel,
  formatMasteryDelta,
  type EngagementEvent,
} from './practiceUtils';

describe('practiceUtils', () => {
  describe('calculatePracticeStreak', () => {
    it('should return 0 streak for empty events', () => {
      const result = calculatePracticeStreak([]);
      expect(result).toEqual({ currentStreak: 0, longestStreak: 0 });
    });

    it('should return streak of 1 for single event', () => {
      const events: EngagementEvent[] = [
        {
          id: '1',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T10:00:00Z',
        },
      ];

      const result = calculatePracticeStreak(events);
      expect(result).toEqual({ currentStreak: 1, longestStreak: 1 });
    });

    it('should count consecutive days correctly', () => {
      const events: EngagementEvent[] = [
        {
          id: '1',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T10:00:00Z',
        },
        {
          id: '2',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-08T15:30:00Z',
        },
        {
          id: '3',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-07T09:00:00Z',
        },
      ];

      const result = calculatePracticeStreak(events);
      expect(result).toEqual({ currentStreak: 3, longestStreak: 3 });
    });

    it('should reset streak on gap day', () => {
      const events: EngagementEvent[] = [
        {
          id: '1',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T10:00:00Z',
        },
        {
          id: '2',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-08T15:00:00Z',
        },
        // Gap: Nov 7 missing
        {
          id: '3',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-06T10:00:00Z',
        },
        {
          id: '4',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-05T12:00:00Z',
        },
      ];

      const result = calculatePracticeStreak(events);
      expect(result.currentStreak).toBe(2); // Nov 9 and Nov 8
      expect(result.longestStreak).toBe(2); // Longest is also 2
    });

    it('should track longest streak separately from current', () => {
      const events: EngagementEvent[] = [
        {
          id: '1',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T10:00:00Z',
        },
        // Gap
        {
          id: '2',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-07T10:00:00Z',
        },
        {
          id: '3',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-06T10:00:00Z',
        },
        {
          id: '4',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-05T10:00:00Z',
        },
        {
          id: '5',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-04T10:00:00Z',
        },
      ];

      const result = calculatePracticeStreak(events);
      expect(result.currentStreak).toBe(1); // Only Nov 9
      expect(result.longestStreak).toBe(4); // Nov 4-7
    });

    it('should only count unique calendar days', () => {
      const events: EngagementEvent[] = [
        {
          id: '1',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T10:00:00Z',
        },
        {
          id: '2',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T15:30:00Z', // Same day
        },
        {
          id: '3',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-09T20:00:00Z', // Same day
        },
        {
          id: '4',
          student_id: 'test-student',
          event_type: 'practice_complete',
          event_data: '{}',
          created_at: '2025-11-08T10:00:00Z',
        },
      ];

      const result = calculatePracticeStreak(events);
      expect(result).toEqual({ currentStreak: 2, longestStreak: 2 });
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(30)).toBe('30 seconds');
      expect(formatDuration(1)).toBe('1 second');
      expect(formatDuration(45)).toBe('45 seconds');
    });

    it('should format minutes only', () => {
      expect(formatDuration(60)).toBe('1 minute');
      expect(formatDuration(120)).toBe('2 minutes');
      expect(formatDuration(300)).toBe('5 minutes');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1 minute 30 seconds');
      expect(formatDuration(125)).toBe('2 minutes 5 seconds');
      expect(formatDuration(323)).toBe('5 minutes 23 seconds');
      expect(formatDuration(61)).toBe('1 minute 1 second');
    });
  });

  describe('formatAccuracy', () => {
    it('should calculate percentage correctly', () => {
      expect(formatAccuracy(8, 10)).toBe(80);
      expect(formatAccuracy(5, 10)).toBe(50);
      expect(formatAccuracy(10, 10)).toBe(100);
      expect(formatAccuracy(0, 10)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(formatAccuracy(7, 9)).toBe(78); // 77.777... rounds to 78
      expect(formatAccuracy(2, 3)).toBe(67); // 66.666... rounds to 67
    });

    it('should handle zero total', () => {
      expect(formatAccuracy(0, 0)).toBe(0);
    });
  });

  describe('getAccuracyColor', () => {
    it('should return green for high accuracy', () => {
      expect(getAccuracyColor(100)).toBe('text-green-600');
      expect(getAccuracyColor(90)).toBe('text-green-600');
      expect(getAccuracyColor(80)).toBe('text-green-600');
    });

    it('should return yellow for medium accuracy', () => {
      expect(getAccuracyColor(79)).toBe('text-yellow-600');
      expect(getAccuracyColor(70)).toBe('text-yellow-600');
      expect(getAccuracyColor(60)).toBe('text-yellow-600');
    });

    it('should return red for low accuracy', () => {
      expect(getAccuracyColor(59)).toBe('text-red-600');
      expect(getAccuracyColor(50)).toBe('text-red-600');
      expect(getAccuracyColor(0)).toBe('text-red-600');
    });
  });

  describe('formatMasteryLevel', () => {
    it('should format mastery level as percentage', () => {
      expect(formatMasteryLevel(0.75)).toBe('75%');
      expect(formatMasteryLevel(0.5)).toBe('50%');
      expect(formatMasteryLevel(1.0)).toBe('100%');
      expect(formatMasteryLevel(0.0)).toBe('0%');
    });

    it('should round to nearest integer', () => {
      expect(formatMasteryLevel(0.678)).toBe('68%');
      expect(formatMasteryLevel(0.345)).toBe('35%');
    });
  });

  describe('formatMasteryDelta', () => {
    it('should format positive delta with plus sign', () => {
      expect(formatMasteryDelta(0.05)).toBe('+5.0%');
      expect(formatMasteryDelta(0.123)).toBe('+12.3%');
    });

    it('should format negative delta with minus sign', () => {
      expect(formatMasteryDelta(-0.03)).toBe('-3.0%');
      expect(formatMasteryDelta(-0.087)).toBe('-8.7%');
    });

    it('should format zero delta', () => {
      expect(formatMasteryDelta(0)).toBe('0.0%');
    });

    it('should show one decimal place', () => {
      expect(formatMasteryDelta(0.0567)).toBe('+5.7%');
      expect(formatMasteryDelta(-0.0234)).toBe('-2.3%');
    });
  });
});
