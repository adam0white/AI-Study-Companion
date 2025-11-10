/**
 * Goal Achievement Celebration Generator
 * Story 5.3: AC-5.3.2, AC-5.3.3 - Generate celebration data and subject suggestions
 *
 * Generates personalized celebration content when goals are completed.
 */

import type {
  GoalCelebrationData,
  GoalCompletionEvent,
  SubjectSuggestion,
  AchievementBadge,
  GoalProgressSnapshot,
} from '../rpc/types';
import {
  SUBJECT_PROGRESSION,
  getCelebrationMessage,
  getGoalById,
  getGoalBySubject,
} from './goal-definitions';

/**
 * Generate celebration data for goal completion
 * Story 5.3: AC-5.3.2 - Goal achievement celebration display
 *
 * @param completion - Goal completion event
 * @param progressSnapshot - Current goal progress snapshot
 * @returns Celebration data with message, badge, and suggestions
 */
export function generateGoalCelebration(
  completion: GoalCompletionEvent,
  progressSnapshot: GoalProgressSnapshot
): GoalCelebrationData | null {
  const goal = getGoalById(completion.goalId);
  if (!goal) return null;

  const celebrationMessage = getCelebrationMessage(goal.subject);

  const achievementBadge: AchievementBadge = {
    id: `${goal.id}-badge`,
    type: 'mastery',
    title: `${goal.subject} Master`,
    description: `Achieved mastery in ${goal.subject}`,
    icon: '🏆',
    color: 'gold',
    unlockedAt: completion.completionTime,
  };

  const relatedSubjects = generateSubjectSuggestions(goal.subject);

  return {
    completedGoal: goal,
    celebrationMessage,
    achievementBadge,
    relatedSubjects,
    progressSnapshot,
  };
}

/**
 * Generate subject suggestions based on completed goal
 * Story 5.3: AC-5.3.3 - Related subject suggestions
 *
 * @param completedSubject - Subject that was just mastered
 * @returns Array of suggested next subjects
 */
export function generateSubjectSuggestions(
  completedSubject: string
): SubjectSuggestion[] {
  const nextSubjects = SUBJECT_PROGRESSION[completedSubject] || [];

  return nextSubjects.map((subject) => {
    const goal = getGoalBySubject(subject);
    const relatedGoals = goal ? [goal] : [];

    return {
      subject,
      name: subject,
      description: generateSubjectDescription(subject, completedSubject),
      reason: generateProgressionReason(subject, completedSubject),
      prerequisites: [completedSubject],
      relatedGoals,
    };
  });
}

/**
 * Generate description for suggested subject
 */
function generateSubjectDescription(
  subject: string,
  _prerequisite: string
): string {
  const descriptions: Record<string, string> = {
    'Trigonometry': 'Master angles, triangles, and trigonometric functions',
    'Calculus': 'Learn rates of change and continuous mathematics',
    'Linear Algebra': 'Explore vectors, matrices, and linear systems',
    'Statistics': 'Understand data analysis and probability',
    'Physics': 'Apply mathematics to understand the physical world',
    'Chemistry': 'Study matter, reactions, and molecular structures',
    'Data Science': 'Analyze data and build predictive models',
    'Biochemistry': 'Explore the chemistry of living organisms',
  };

  return descriptions[subject] || `Continue your learning journey with ${subject}`;
}

/**
 * Generate progression reason
 * Story 5.3: AC-5.3.3 - Logical learning progression
 */
function generateProgressionReason(
  subject: string,
  completedSubject: string
): string {
  const reasons: Record<string, Record<string, string>> = {
    'Algebra': {
      'Trigonometry': 'Natural next step - applies algebraic thinking to angles',
      'Calculus': 'Builds on algebraic foundations for advanced math',
      'Linear Algebra': 'Extends algebra to multi-dimensional systems',
    },
    'Geometry': {
      'Trigonometry': 'Perfect progression - connects geometry with angles',
      'Calculus': 'Applies geometric thinking to continuous change',
    },
    'Trigonometry': {
      'Calculus': 'Essential for understanding derivatives and integrals',
      'Physics': 'Critical for mechanics and wave analysis',
    },
    'Calculus': {
      'Linear Algebra': 'Powerful combination for advanced mathematics',
      'Physics': 'Calculus is the language of physics',
      'Statistics': 'Foundation for statistical theory and analysis',
    },
  };

  return (
    reasons[completedSubject]?.[subject] ||
    `Natural progression after mastering ${completedSubject}`
  );
}

/**
 * Get estimated time to complete suggested subject
 */
export function getEstimatedTimeToComplete(subject: string): string {
  // Estimated based on typical progression (could be personalized)
  const estimates: Record<string, string> = {
    'Trigonometry': '3-4 weeks of consistent practice',
    'Calculus': '4-6 weeks of focused learning',
    'Linear Algebra': '3-5 weeks with regular sessions',
    'Statistics': '3-4 weeks of practice',
    'Physics': '5-6 weeks with strong fundamentals',
    'Chemistry': '4-5 weeks of study',
  };

  return estimates[subject] || '4-5 weeks of consistent practice';
}
