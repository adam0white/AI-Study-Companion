/**
 * Goal Completion Detection
 * Story 5.3: AC-5.3.1, AC-5.3.5 - Detect goal completion based on subject mastery
 *
 * Detects when students complete learning goals based on accuracy and session count.
 */

import type {
  GoalCompletionEvent,
  GoalAchievementProgress,
  SubjectMastery,
  SubjectPracticeStats,
} from '../rpc/types';
import { LEARNING_GOALS, getGoalBySubject } from './goal-definitions';

/**
 * Detect goal completions based on subject mastery data
 * Story 5.3: AC-5.3.1 - Goal completion detection system
 *
 * @param subjectMastery - Current subject mastery levels
 * @param practiceStats - Practice statistics by subject
 * @param completedGoalIds - Already completed goal IDs
 * @returns Array of newly completed goals
 */
export function detectGoalCompletion(
  subjectMastery: SubjectMastery[],
  practiceStats: Record<string, SubjectPracticeStats>,
  completedGoalIds: string[]
): GoalCompletionEvent[] {
  const newCompletions: GoalCompletionEvent[] = [];

  for (const mastery of subjectMastery) {
    const goal = getGoalBySubject(mastery.subject);
    if (!goal) continue;

    // Skip already completed goals
    if (completedGoalIds.includes(goal.id)) continue;

    // Get practice stats for this subject
    const stats = practiceStats[mastery.subject];
    if (!stats) continue;

    // Check completion criteria
    const meetsAccuracy = stats.averageScore >= goal.completionCriteria.minAccuracy;
    const meetsSessions = stats.totalSessions >= goal.completionCriteria.minSessions;
    const meetsDays = goal.completionCriteria.minConsecutiveDays
      ? stats.currentStreak >= goal.completionCriteria.minConsecutiveDays
      : true;

    if (meetsAccuracy && meetsSessions && meetsDays) {
      newCompletions.push({
        goalId: goal.id,
        goalName: goal.name,
        subject: goal.subject,
        completionTime: new Date().toISOString(),
        previousAccuracy: 0, // Could be tracked from historical data
        newAccuracy: stats.averageScore,
        sessionsToCompletion: stats.totalSessions,
      });
    }
  }

  return newCompletions;
}

/**
 * Calculate progress percentage toward goal completion
 * Story 5.3: AC-5.3.7 - Progress tracking toward goals
 *
 * Progress combines accuracy progress (50%) and session progress (50%)
 *
 * @param currentAccuracy - Current subject accuracy (0-1)
 * @param currentSessions - Current number of sessions
 * @param targetAccuracy - Target accuracy for goal (e.g., 0.80)
 * @param targetSessions - Target number of sessions (e.g., 5)
 * @returns Progress percentage (0-100)
 */
export function calculateGoalProgress(
  currentAccuracy: number,
  currentSessions: number,
  targetAccuracy: number,
  targetSessions: number
): number {
  // Accuracy progress (0-50%)
  const accuracyProgress = Math.min((currentAccuracy / targetAccuracy) * 50, 50);

  // Session progress (0-50%)
  const sessionProgress = Math.min((currentSessions / targetSessions) * 50, 50);

  // Combined progress
  const totalProgress = accuracyProgress + sessionProgress;

  return Math.min(Math.round(totalProgress), 100);
}

/**
 * Build goal progress object from subject data
 * Story 5.3: AC-5.3.6 - Goal state management
 *
 * @param goal - Learning goal definition
 * @param stats - Practice statistics for the subject
 * @param isCompleted - Whether goal has been completed
 * @param completionTime - Completion timestamp if completed
 * @returns Goal progress object
 */
export function buildGoalProgress(
  goal: ReturnType<typeof getGoalBySubject>,
  stats: SubjectPracticeStats | undefined,
  isCompleted: boolean,
  completionTime?: string
): GoalAchievementProgress | null {
  if (!goal) return null;

  const accuracy = stats?.averageScore || 0;
  const sessionsCount = stats?.totalSessions || 0;
  const consecutiveDays = stats?.currentStreak || 0;

  const progressPercent = calculateGoalProgress(
    accuracy,
    sessionsCount,
    goal.completionCriteria.minAccuracy,
    goal.completionCriteria.minSessions
  );

  return {
    goalId: goal.id,
    name: goal.name,
    subject: goal.subject,
    status: isCompleted ? 'completed' : 'active',
    progressPercent,
    completionTime,
    metrics: {
      accuracy,
      sessionsCount,
      consecutiveDays,
    },
  };
}

/**
 * Get all goals with progress data
 * Story 5.3: AC-5.3.4 - Multi-goal perspective display
 *
 * @param subjectMastery - All subject mastery data
 * @param practiceStats - All practice statistics
 * @param completedGoalIds - IDs of completed goals
 * @param completionTimes - Map of goal ID to completion time
 * @returns Array of goal progress objects
 */
export function getAllGoalsProgress(
  _subjectMastery: SubjectMastery[],
  practiceStats: Record<string, SubjectPracticeStats>,
  completedGoalIds: string[],
  completionTimes: Map<string, string>
): GoalAchievementProgress[] {
  const goalsProgress: GoalAchievementProgress[] = [];

  for (const goal of LEARNING_GOALS) {
    const isCompleted = completedGoalIds.includes(goal.id);
    const stats = practiceStats[goal.subject];
    const completionTime = completionTimes.get(goal.id);

    const progress = buildGoalProgress(goal, stats, isCompleted, completionTime);
    if (progress) {
      goalsProgress.push(progress);
    }
  }

  return goalsProgress;
}
