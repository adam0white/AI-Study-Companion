/**
 * Celebration Types
 * Type definitions for session celebration display
 * Story 5.1: Session Celebration Display
 */

// ============================================
// Achievement Badge Types
// ============================================

export type BadgeType = 'accuracy' | 'streak' | 'mastery' | 'consistency' | 'focus';

export interface AchievementBadge {
  id: string; // e.g., 'accuracy_90', 'streak_3', 'mastery_algebra'
  type: BadgeType;
  title: string; // e.g., "90% Accuracy"
  description: string; // e.g., "Achieved 90%+ accuracy on quiz"
  icon: string; // Unicode emoji or icon name
  color: string; // Tailwind color class
  unlockedAt: string; // ISO timestamp
}

// ============================================
// Session Metrics Types
// ============================================

export interface SessionMetrics {
  accuracy: number; // 0-100 percentage
  questionsAnswered: number;
  correctAnswers: number;
  topicsLearned: string[];
  estimatedKnowledgeGain: string; // e.g., "10% improvement on Algebra"
  streak?: number; // Days of consecutive learning
  comparisonToPrevious?: {
    accuracyChange: number; // +/- percentage
    speedImprovement: string; // Qualitative
  };
}

// ============================================
// Session Completion Event Types
// ============================================

export interface SessionCompletionEvent {
  newSessionId: string;
  sessionTimestamp: string;
  topics: string[];
  accuracy: number;
  questionsAnswered: number;
  duration: number;
}

// ============================================
// Celebration Data Types
// ============================================

export interface CelebrationData {
  title: string; // e.g., "Awesome session today!"
  message: string; // Specific celebration message
  emoji?: string; // Celebration emoji
  backgroundColor?: string; // Gradient or solid color
  metrics: SessionMetrics;
  achievements: AchievementBadge[];
}

// ============================================
// Celebration State for RPC
// ============================================

export interface CelebrationState {
  hasCelebration: boolean;
  celebration?: CelebrationData;
  sessionId?: string;
}
