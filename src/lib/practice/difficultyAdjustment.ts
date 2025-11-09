/**
 * Difficulty Adjustment Algorithm for Adaptive Practice
 *
 * Adjusts practice question difficulty based on student performance.
 * Implements a conservative algorithm that requires 2 consecutive correct/incorrect
 * answers before making adjustments to prevent rapid oscillation.
 *
 * Difficulty Scale: 1 (foundational) to 5 (advanced)
 */

/**
 * Calculates the new difficulty level based on recent answer history
 *
 * @param currentDifficulty - Current difficulty level (1-5)
 * @param recentAnswers - Array of recent answers, most recent first (true = correct, false = incorrect)
 * @returns New difficulty level (1-5)
 *
 * Algorithm:
 * - +1 difficulty after 2 consecutive correct answers (max: 5)
 * - -1 difficulty after 2 consecutive incorrect answers (min: 1)
 * - No change for mixed results or single answers
 */
export function calculateNewDifficulty(
  currentDifficulty: number,
  recentAnswers: boolean[]
): number {
  // Require at least 2 answers for adjustment
  if (recentAnswers.length < 2) {
    return currentDifficulty;
  }

  // Check last 2 answers (consecutive)
  const lastTwo = recentAnswers.slice(0, 2);
  const allCorrect = lastTwo.every(answer => answer === true);
  const allIncorrect = lastTwo.every(answer => answer === false);

  let newDifficulty = currentDifficulty;

  // Increase difficulty if last 2 correct
  if (allCorrect && currentDifficulty < 5) {
    newDifficulty = currentDifficulty + 1;
  }

  // Decrease difficulty if last 2 incorrect
  if (allIncorrect && currentDifficulty > 1) {
    newDifficulty = currentDifficulty - 1;
  }

  // Clamp to [1, 5] (defensive programming)
  return Math.max(1, Math.min(5, newDifficulty));
}

/**
 * Maps mastery level (0.0-1.0) to starting difficulty (1-5)
 * Used when starting a new practice session based on previous performance
 *
 * @param masteryLevel - Student's mastery level for the subject (0.0-1.0)
 * @returns Starting difficulty level (1-5)
 *
 * Mapping:
 * - 0.0-0.2 → Level 1 (foundational)
 * - 0.2-0.4 → Level 2 (basic)
 * - 0.4-0.6 → Level 3 (moderate)
 * - 0.6-0.8 → Level 4 (challenging)
 * - 0.8-1.0 → Level 5 (advanced)
 */
export function mapMasteryToDifficulty(masteryLevel: number): number {
  // Clamp mastery level to valid range
  const clampedMastery = Math.max(0, Math.min(1, masteryLevel));

  if (clampedMastery < 0.2) return 1;
  if (clampedMastery < 0.4) return 2;
  if (clampedMastery < 0.6) return 3;
  if (clampedMastery < 0.8) return 4;
  return 5;
}

/**
 * Calculates new mastery level based on practice session performance
 * Uses weighted average: 70% existing mastery + 30% new session accuracy
 * This prevents single sessions from drastically changing mastery
 *
 * @param currentMastery - Current mastery level (0.0-1.0)
 * @param sessionAccuracy - Accuracy in this session (0.0-1.0)
 * @returns Updated mastery level (0.0-1.0)
 */
export function calculateNewMastery(
  currentMastery: number,
  sessionAccuracy: number
): number {
  const clampedMastery = Math.max(0, Math.min(1, currentMastery));
  const clampedAccuracy = Math.max(0, Math.min(1, sessionAccuracy));

  // Weight: 70% existing + 30% new session
  const newMastery = (clampedMastery * 0.7) + (clampedAccuracy * 0.3);

  return Math.max(0, Math.min(1, newMastery));
}
