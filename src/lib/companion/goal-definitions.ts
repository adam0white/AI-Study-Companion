/**
 * Learning Goal Definitions
 * Story 5.3: AC-5.3.1 - Hardcoded subject-based learning goals
 *
 * Defines available learning goals with completion criteria and subject progression map.
 */

import type { LearningGoal } from '../rpc/types';

/**
 * Hardcoded list of learning goals
 * Story 5.3: AC-5.3.1 - Goal completion criteria
 */
export const LEARNING_GOALS: LearningGoal[] = [
  {
    id: 'algebra-mastery',
    name: 'Master Algebra',
    subject: 'Algebra',
    description: 'Achieve 80%+ accuracy on Algebra across 5+ practice sessions',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
      minConsecutiveDays: 0,
    },
  },
  {
    id: 'geometry-mastery',
    name: 'Master Geometry',
    subject: 'Geometry',
    description: 'Achieve 80%+ accuracy on Geometry with solid understanding',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
    },
  },
  {
    id: 'trigonometry-mastery',
    name: 'Master Trigonometry',
    subject: 'Trigonometry',
    description: 'Comprehensive understanding of trigonometric functions',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
    },
  },
  {
    id: 'calculus-foundations',
    name: 'Calculus Foundations',
    subject: 'Calculus',
    description: 'Build strong foundation in calculus concepts',
    completionCriteria: {
      minAccuracy: 0.75,
      minSessions: 4,
    },
  },
  {
    id: 'linear-algebra-mastery',
    name: 'Master Linear Algebra',
    subject: 'Linear Algebra',
    description: 'Master vectors, matrices, and linear transformations',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
    },
  },
  {
    id: 'statistics-mastery',
    name: 'Master Statistics',
    subject: 'Statistics',
    description: 'Understand probability and statistical analysis',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
    },
  },
  {
    id: 'physics-mastery',
    name: 'Master Physics',
    subject: 'Physics',
    description: 'Master classical mechanics and physics principles',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
    },
  },
  {
    id: 'chemistry-mastery',
    name: 'Master Chemistry',
    subject: 'Chemistry',
    description: 'Understand chemical reactions and molecular structures',
    completionCriteria: {
      minAccuracy: 0.80,
      minSessions: 5,
    },
  },
];

/**
 * Subject progression mapping - suggests next learning steps after goal completion
 * Story 5.3: AC-5.3.3 - Related subject suggestions
 */
export const SUBJECT_PROGRESSION: Record<string, string[]> = {
  'Algebra': ['Trigonometry', 'Calculus', 'Linear Algebra'],
  'Geometry': ['Trigonometry', 'Calculus'],
  'Trigonometry': ['Calculus', 'Physics'],
  'Calculus': ['Linear Algebra', 'Physics', 'Statistics'],
  'Linear Algebra': ['Statistics', 'Physics'],
  'Statistics': ['Calculus', 'Data Science'],
  'Physics': ['Calculus', 'Chemistry'],
  'Chemistry': ['Physics', 'Biochemistry'],
};

/**
 * Get goal by ID
 */
export function getGoalById(goalId: string): LearningGoal | undefined {
  return LEARNING_GOALS.find((goal) => goal.id === goalId);
}

/**
 * Get goal by subject
 */
export function getGoalBySubject(subject: string): LearningGoal | undefined {
  return LEARNING_GOALS.find((goal) => goal.subject === subject);
}

/**
 * Get all goals for a list of subjects
 */
export function getGoalsForSubjects(subjects: string[]): LearningGoal[] {
  return LEARNING_GOALS.filter((goal) =>
    subjects.some((subject) => subject.toLowerCase() === goal.subject.toLowerCase())
  );
}

/**
 * Get related subjects after completing a goal
 * Story 5.3: AC-5.3.3 - Logical learning progression
 */
export function getRelatedSubjects(subject: string): string[] {
  return SUBJECT_PROGRESSION[subject] || [];
}

/**
 * Achievement celebration messages by subject
 * Story 5.3: AC-5.3.2 - Goal achievement celebration
 */
export const GOAL_CELEBRATION_MESSAGES: Record<string, string[]> = {
  'Algebra': [
    'You\'ve mastered Algebra! 🎓',
    'Algebra Expert! Your mathematical foundation is solid! 📐',
    'Congratulations! Algebra is now yours to command! 🏆',
  ],
  'Geometry': [
    'Geometry Master! You understand shapes in perfect perspective! 🎨',
    'You\'ve achieved geometry mastery! Ready for trigonometry? 📏',
    'Outstanding! Geometry is now part of your mathematical toolkit! 🧰',
  ],
  'Trigonometry': [
    'Trigonometry Mastered! The angles are in your control! 📐',
    'You\'ve conquered trigonometry! Advanced topics await! 🚀',
    'Trigonometry Master! Angles, sines, cosines - all mastered! 🎯',
  ],
  'Calculus': [
    'Calculus Foundations Complete! You\'re ready for advanced math! 🚀',
    'Amazing! You\'ve built a solid calculus foundation! 📈',
    'Calculus achieved! The language of change is yours! 🌟',
  ],
  'Linear Algebra': [
    'Linear Algebra Mastered! Vectors and matrices are your tools now! 🧮',
    'Outstanding! Linear algebra is a powerful skill you\'ve acquired! 💪',
    'Matrix Master! Linear transformations unlocked! 🔓',
  ],
  'Statistics': [
    'Statistics Mastery! You can now analyze data with confidence! 📊',
    'Data wizard! Statistics is your new superpower! 🎲',
    'Congratulations! Statistical thinking achieved! 📈',
  ],
  'Physics': [
    'Physics Master! The laws of the universe are yours! ⚛️',
    'Outstanding! You\'ve mastered classical mechanics! 🌍',
    'Physics achieved! You see the world through equations now! 🔬',
  ],
  'Chemistry': [
    'Chemistry Master! Molecular understanding unlocked! ⚗️',
    'Amazing! You\'ve mastered chemical reactions! 🧪',
    'Chemistry achieved! Elements and compounds are your domain! 🔬',
  ],
};

/**
 * Get random celebration message for subject
 */
export function getCelebrationMessage(subject: string): string {
  const messages = GOAL_CELEBRATION_MESSAGES[subject] || [
    `Amazing progress! You've achieved ${subject} mastery! 🌟`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
