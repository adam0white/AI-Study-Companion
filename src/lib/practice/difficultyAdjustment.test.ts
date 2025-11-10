import { describe, it, expect } from 'vitest';
import {
  calculateNewDifficulty,
  mapMasteryToDifficulty,
  calculateNewMastery
} from './difficultyAdjustment';

describe('calculateNewDifficulty', () => {
  it('should increase difficulty after 2 consecutive correct answers', () => {
    expect(calculateNewDifficulty(3, [true, true])).toBe(4);
    expect(calculateNewDifficulty(1, [true, true])).toBe(2);
    expect(calculateNewDifficulty(4, [true, true])).toBe(5);
  });

  it('should decrease difficulty after 2 consecutive incorrect answers', () => {
    expect(calculateNewDifficulty(3, [false, false])).toBe(2);
    expect(calculateNewDifficulty(5, [false, false])).toBe(4);
    expect(calculateNewDifficulty(2, [false, false])).toBe(1);
  });

  it('should not change difficulty with mixed answers', () => {
    expect(calculateNewDifficulty(3, [true, false])).toBe(3);
    expect(calculateNewDifficulty(3, [false, true])).toBe(3);
    expect(calculateNewDifficulty(3, [true, false, true])).toBe(3);
  });

  it('should not change difficulty with single answer', () => {
    expect(calculateNewDifficulty(3, [true])).toBe(3);
    expect(calculateNewDifficulty(3, [false])).toBe(3);
    expect(calculateNewDifficulty(2, [true])).toBe(2);
  });

  it('should not change difficulty with empty answer history', () => {
    expect(calculateNewDifficulty(3, [])).toBe(3);
    expect(calculateNewDifficulty(1, [])).toBe(1);
  });

  it('should clamp difficulty to minimum of 1', () => {
    expect(calculateNewDifficulty(1, [false, false])).toBe(1);
    expect(calculateNewDifficulty(2, [false, false])).toBe(1);
  });

  it('should clamp difficulty to maximum of 5', () => {
    expect(calculateNewDifficulty(5, [true, true])).toBe(5);
    expect(calculateNewDifficulty(4, [true, true])).toBe(5);
  });

  it('should only consider last 2 answers', () => {
    // Even with older incorrect answers, last 2 correct should increase
    expect(calculateNewDifficulty(3, [true, true, false, false])).toBe(4);
    // Even with older correct answers, last 2 incorrect should decrease
    expect(calculateNewDifficulty(3, [false, false, true, true])).toBe(2);
  });

  it('should handle edge case of difficulty boundaries', () => {
    expect(calculateNewDifficulty(1, [true, true])).toBe(2);
    expect(calculateNewDifficulty(5, [false, false])).toBe(4);
  });
});

describe('mapMasteryToDifficulty', () => {
  it('should map mastery 0.0-0.2 to difficulty 1', () => {
    expect(mapMasteryToDifficulty(0.0)).toBe(1);
    expect(mapMasteryToDifficulty(0.1)).toBe(1);
    expect(mapMasteryToDifficulty(0.19)).toBe(1);
  });

  it('should map mastery 0.2-0.4 to difficulty 2', () => {
    expect(mapMasteryToDifficulty(0.2)).toBe(2);
    expect(mapMasteryToDifficulty(0.3)).toBe(2);
    expect(mapMasteryToDifficulty(0.39)).toBe(2);
  });

  it('should map mastery 0.4-0.6 to difficulty 3', () => {
    expect(mapMasteryToDifficulty(0.4)).toBe(3);
    expect(mapMasteryToDifficulty(0.5)).toBe(3);
    expect(mapMasteryToDifficulty(0.59)).toBe(3);
  });

  it('should map mastery 0.6-0.8 to difficulty 4', () => {
    expect(mapMasteryToDifficulty(0.6)).toBe(4);
    expect(mapMasteryToDifficulty(0.7)).toBe(4);
    expect(mapMasteryToDifficulty(0.79)).toBe(4);
  });

  it('should map mastery 0.8-1.0 to difficulty 5', () => {
    expect(mapMasteryToDifficulty(0.8)).toBe(5);
    expect(mapMasteryToDifficulty(0.9)).toBe(5);
    expect(mapMasteryToDifficulty(1.0)).toBe(5);
  });

  it('should clamp mastery values outside 0-1 range', () => {
    expect(mapMasteryToDifficulty(-0.1)).toBe(1);
    expect(mapMasteryToDifficulty(1.5)).toBe(5);
  });
});

describe('calculateNewMastery', () => {
  it('should calculate mastery using Story 4.3 formula: new = old + (1-old) * success * 0.1', () => {
    // 0.5 old mastery, 1.0 session accuracy
    // Expected: 0.5 + (1 - 0.5) * 1.0 * 0.1 = 0.5 + 0.05 = 0.55
    expect(calculateNewMastery(0.5, 1.0)).toBeCloseTo(0.55, 5);

    // 0.8 old mastery, 0.6 session accuracy
    // Expected: 0.8 + (1 - 0.8) * 0.6 * 0.1 = 0.8 + 0.012 = 0.812
    expect(calculateNewMastery(0.8, 0.6)).toBeCloseTo(0.812, 5);

    // 0.3 old mastery, 0.0 session accuracy
    // Expected: 0.3 + (1 - 0.3) * 0.0 * 0.1 = 0.3 + 0.0 = 0.3
    expect(calculateNewMastery(0.3, 0.0)).toBeCloseTo(0.3, 5);
  });

  it('should handle zero mastery', () => {
    // 0.0 old mastery, 0.8 session accuracy
    // Expected: 0.0 + (1 - 0.0) * 0.8 * 0.1 = 0.0 + 0.08 = 0.08
    expect(calculateNewMastery(0.0, 0.8)).toBeCloseTo(0.08, 5);
  });

  it('should handle perfect mastery', () => {
    // 1.0 old mastery, 1.0 session accuracy
    // Expected: 1.0 + (1 - 1.0) * 1.0 * 0.1 = 1.0 + 0.0 = 1.0
    expect(calculateNewMastery(1.0, 1.0)).toBe(1.0);
  });

  it('should clamp result to [0, 1] range', () => {
    // Should never exceed 1.0
    expect(calculateNewMastery(1.0, 1.0)).toBeLessThanOrEqual(1.0);
    // Should never be below 0.0
    expect(calculateNewMastery(0.0, 0.0)).toBeGreaterThanOrEqual(0.0);
  });

  it('should clamp input values to valid ranges', () => {
    // Negative mastery should be treated as 0
    const result1 = calculateNewMastery(-0.5, 0.8);
    expect(result1).toBeGreaterThanOrEqual(0);
    expect(result1).toBeLessThanOrEqual(1);

    // Mastery > 1 should be treated as 1
    const result2 = calculateNewMastery(1.5, 0.5);
    expect(result2).toBeGreaterThanOrEqual(0);
    expect(result2).toBeLessThanOrEqual(1);
  });

  it('should have diminishing returns as mastery increases', () => {
    // Starting at 0.0, perfect session adds more
    // Expected: 0.0 + (1 - 0.0) * 1.0 * 0.1 = 0.1
    expect(calculateNewMastery(0.0, 1.0)).toBeCloseTo(0.1, 5);

    // Starting at 0.9, perfect session adds less
    // Expected: 0.9 + (1 - 0.9) * 1.0 * 0.1 = 0.9 + 0.01 = 0.91
    expect(calculateNewMastery(0.9, 1.0)).toBeCloseTo(0.91, 5);
  });

  it('should not decrease mastery on failed session (0.0 accuracy)', () => {
    // Starting at 0.8, failing session (0.0) should stay at 0.8
    // Expected: 0.8 + (1 - 0.8) * 0.0 * 0.1 = 0.8
    expect(calculateNewMastery(0.8, 0.0)).toBeCloseTo(0.8, 5);

    // Starting at 0.2, failing session (0.0) should stay at 0.2
    // Expected: 0.2 + (1 - 0.2) * 0.0 * 0.1 = 0.2
    expect(calculateNewMastery(0.2, 0.0)).toBeCloseTo(0.2, 5);
  });
});
