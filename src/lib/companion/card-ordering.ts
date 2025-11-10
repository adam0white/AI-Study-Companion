/**
 * Card Ordering Algorithm
 * Story 5.0b: AC-5.0b.1 - Dynamic card ordering based on student state and context
 *
 * This module computes priority scores for each action card (Chat, Practice, Progress)
 * and produces an ordered list based on student context and recent activity.
 */

import type {
  StudentStateType,
  RecentSessionData,
  StudentAchievement,
  SubjectPracticeStats,
} from '../rpc/types';
import { detectStudentState } from './state-detection';
import type { DetectStateInput } from './state-detection';

/**
 * Card types that can be reordered
 */
export type CardType = 'chat' | 'practice' | 'progress';

/**
 * Priority factors breakdown for a card
 */
export interface CardPriorityFactors {
  baseScore: number;
  sessionRecency: number;
  inactivityBonus: number;
  inactivityPenalty: number;
  milestoneBonus: number;
  goalCompletion: number;
  knowledgeMilestone: number;
  streakBonus: number;
  streakContinuation: number;
  struggleFocus: number;
  reengagementNeed: number;
}

/**
 * Card priority with computed score and factors
 */
export interface CardPriority {
  card: CardType;
  score: number;
  factors: Partial<CardPriorityFactors>;
}

/**
 * Context information for card ordering decision
 */
export interface CardOrderContext {
  studentState: StudentStateType;
  reason: string;
  priorities: CardPriority[];
  computedAt: string;
}

/**
 * Card ordering result with metadata
 */
export interface CardOrder {
  order: CardType[];
  context: CardOrderContext;
  expiresAt: string;
}

/**
 * Input data for card ordering computation
 */
export interface CardOrderInput {
  lastAppAccess?: string;
  lastSessionTime?: string;
  recentSessions: RecentSessionData[];
  hasCompletedAnySession: boolean;
  achievementToday?: boolean;
  recentAchievements?: StudentAchievement[];
  practiceStats?: Record<string, SubjectPracticeStats>;
  currentStreak?: number;
}

/**
 * Base priority scores for each card type
 */
const BASE_SCORES = {
  practice: 30,
  chat: 20,
  progress: 10,
} as const;

/**
 * Cache expiration time (10 minutes as specified)
 */
const CACHE_DURATION_MS = 10 * 60 * 1000;

/**
 * Compute session recency score
 * Full score (30 points) within 1 hour, decays over time
 *
 * @param lastSessionTime - ISO timestamp of last session
 * @returns Score 0-30
 */
export function computeSessionRecencyScore(
  lastSessionTime: string | undefined
): number {
  if (!lastSessionTime) return 0;

  const minutesAgo = (Date.now() - new Date(lastSessionTime).getTime()) / 60000;

  if (minutesAgo <= 60) return 30; // Within 1 hour: full score
  if (minutesAgo <= 120) return 20; // 1-2 hours: 20 points
  if (minutesAgo <= 240) return 10; // 2-4 hours: 10 points
  if (minutesAgo <= 1440) return 5; // 4-24 hours: 5 points
  return 0; // > 24 hours: no bonus
}

/**
 * Compute inactivity bonus for Chat card
 * Full bonus (40 points) after 3+ days of inactivity
 *
 * @param lastAppAccess - ISO timestamp of last app access
 * @returns Score 0-40
 */
export function computeInactivityBonus(
  lastAppAccess: string | undefined
): number {
  if (!lastAppAccess) return 0;

  const daysInactive =
    (Date.now() - new Date(lastAppAccess).getTime()) / (24 * 60 * 60 * 1000);

  if (daysInactive >= 7) return 40; // 7+ days: full bonus
  if (daysInactive >= 3) return 40; // 3-7 days: full bonus
  if (daysInactive >= 1) return 20; // 1-3 days: partial bonus
  return 0; // < 1 day: no bonus
}

/**
 * Compute inactivity penalty for Practice card
 * Penalize practice card when student hasn't been active
 *
 * @param lastAppAccess - ISO timestamp of last app access
 * @returns Penalty 0-10
 */
export function computeInactivityPenalty(
  lastAppAccess: string | undefined
): number {
  if (!lastAppAccess) return 0;

  const daysInactive =
    (Date.now() - new Date(lastAppAccess).getTime()) / (24 * 60 * 60 * 1000);

  if (daysInactive >= 7) return 10; // 7+ days: full penalty
  if (daysInactive >= 3) return 10; // 3-7 days: full penalty
  if (daysInactive >= 1) return 5; // 1-3 days: partial penalty
  return 0; // < 1 day: no penalty
}

/**
 * Compute milestone bonus for Progress card
 * Awards bonus when achievements detected today
 *
 * @param achievementToday - Whether student achieved milestone today
 * @param recentAchievements - Recent achievement records
 * @returns Score 0-40
 */
export function computeMilestoneBonus(
  achievementToday?: boolean,
  recentAchievements?: StudentAchievement[]
): number {
  if (achievementToday) return 40;

  // Check for achievements in last 24 hours
  if (recentAchievements && recentAchievements.length > 0) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const hasRecentAchievement = recentAchievements.some(
      (achievement) => new Date(achievement.timestamp).getTime() > oneDayAgo
    );
    if (hasRecentAchievement) return 40;
  }

  return 0;
}

/**
 * Compute goal completion bonus for Progress card
 *
 * @param recentAchievements - Recent achievement records
 * @returns Score 0-20
 */
export function computeGoalCompletionBonus(
  recentAchievements?: StudentAchievement[]
): number {
  if (!recentAchievements) return 0;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const goalCompletionsToday = recentAchievements.filter(
    (a) =>
      a.type === 'goal_completion' &&
      new Date(a.timestamp).getTime() > oneDayAgo
  );

  return goalCompletionsToday.length > 0 ? 20 : 0;
}

/**
 * Compute knowledge milestone bonus for Progress card
 * Awards bonus when student reaches mastery level
 *
 * @param recentAchievements - Recent achievement records
 * @returns Score 0-15
 */
export function computeKnowledgeMilestoneBonus(
  recentAchievements?: StudentAchievement[]
): number {
  if (!recentAchievements) return 0;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const masteryAchievements = recentAchievements.filter(
    (a) =>
      a.type === 'mastery_level' &&
      new Date(a.timestamp).getTime() > oneDayAgo
  );

  return masteryAchievements.length > 0 ? 15 : 0;
}

/**
 * Compute streak bonus for Progress card
 * Awards bonus for active learning streaks
 *
 * @param currentStreak - Current streak in days
 * @returns Score 0-10
 */
export function computeStreakBonus(currentStreak?: number): number {
  if (!currentStreak || currentStreak < 3) return 0;
  if (currentStreak >= 7) return 10; // 7+ day streak
  if (currentStreak >= 3) return 5; // 3-6 day streak
  return 0;
}

/**
 * Compute streak continuation bonus for Practice card
 * Encourages continuing/maintaining streaks
 *
 * @param currentStreak - Current streak in days
 * @param lastSessionTime - ISO timestamp of last session
 * @returns Score 0-10
 */
export function computeStreakContinuationBonus(
  currentStreak?: number,
  lastSessionTime?: string
): number {
  if (!currentStreak || currentStreak < 2) return 0;

  // Only award if student hasn't practiced today
  if (lastSessionTime) {
    const hoursSinceSession =
      (Date.now() - new Date(lastSessionTime).getTime()) / (60 * 60 * 1000);
    if (hoursSinceSession < 12) return 0; // Already practiced recently
  }

  // Encourage streak continuation
  return 10;
}

/**
 * Compute struggle focus bonus for Practice card
 * Awards bonus when student is struggling with specific subjects
 *
 * @param practiceStats - Practice statistics by subject
 * @returns Score 0-20
 */
export function computeStruggleFocusBonus(
  practiceStats?: Record<string, SubjectPracticeStats>
): number {
  if (!practiceStats) return 0;

  // Check for subjects with low accuracy (< 70%)
  const strugglingSubjects = Object.values(practiceStats).filter(
    (stats) => stats.averageScore < 0.7 && stats.totalSessions >= 2
  );

  return strugglingSubjects.length > 0 ? 20 : 0;
}

/**
 * Compute re-engagement need bonus for Chat card
 * Awards bonus when student shows signs of disengagement
 *
 * @param _lastAppAccess - ISO timestamp of last app access (reserved for future use)
 * @param recentSessions - Recent session data
 * @returns Score 0-20
 */
export function computeReengagementNeedBonus(
  _lastAppAccess?: string,
  recentSessions?: RecentSessionData[]
): number {
  // Check for declining engagement patterns
  if (!recentSessions || recentSessions.length === 0) return 0;

  // Check if sessions are declining
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSessionCount = recentSessions.filter((session) => {
    return new Date(session.timestamp).getTime() > sevenDaysAgo;
  }).length;

  if (recentSessionCount < 2) return 20; // Low recent activity

  return 0;
}

/**
 * Compute priority score for Practice card
 *
 * @param input - Card ordering input data
 * @returns Card priority with factors
 */
export function computePracticePriority(input: CardOrderInput): CardPriority {
  const factors: Partial<CardPriorityFactors> = {
    baseScore: BASE_SCORES.practice,
    sessionRecency: computeSessionRecencyScore(input.lastSessionTime),
    struggleFocus: computeStruggleFocusBonus(input.practiceStats),
    streakContinuation: computeStreakContinuationBonus(
      input.currentStreak,
      input.lastSessionTime
    ),
    inactivityPenalty: computeInactivityPenalty(input.lastAppAccess),
  };

  const score =
    factors.baseScore! +
    factors.sessionRecency! +
    factors.struggleFocus! +
    factors.streakContinuation! -
    factors.inactivityPenalty!;

  return {
    card: 'practice',
    score,
    factors,
  };
}

/**
 * Compute priority score for Chat card
 *
 * @param input - Card ordering input data
 * @returns Card priority with factors
 */
export function computeChatPriority(input: CardOrderInput): CardPriority {
  const sessionRecency = computeSessionRecencyScore(input.lastSessionTime);

  // First session bonus: boost Chat for new students
  const firstSessionBonus =
    !input.hasCompletedAnySession && input.recentSessions.length === 0 ? 30 : 0;

  const factors: Partial<CardPriorityFactors> = {
    baseScore: BASE_SCORES.chat,
    inactivityBonus: computeInactivityBonus(input.lastAppAccess),
    reengagementNeed: computeReengagementNeedBonus(
      input.lastAppAccess,
      input.recentSessions
    ),
    sessionRecency: -Math.floor(sessionRecency / 2), // Penalty for recent session
  };

  const score =
    factors.baseScore! +
    factors.inactivityBonus! +
    factors.reengagementNeed! +
    factors.sessionRecency! +
    firstSessionBonus;

  return {
    card: 'chat',
    score,
    factors,
  };
}

/**
 * Compute priority score for Progress card
 *
 * @param input - Card ordering input data
 * @returns Card priority with factors
 */
export function computeProgressPriority(input: CardOrderInput): CardPriority {
  const factors: Partial<CardPriorityFactors> = {
    baseScore: BASE_SCORES.progress,
    milestoneBonus: computeMilestoneBonus(
      input.achievementToday,
      input.recentAchievements
    ),
    goalCompletion: computeGoalCompletionBonus(input.recentAchievements),
    knowledgeMilestone: computeKnowledgeMilestoneBonus(
      input.recentAchievements
    ),
    streakBonus: computeStreakBonus(input.currentStreak),
  };

  const score =
    factors.baseScore! +
    factors.milestoneBonus! +
    factors.goalCompletion! +
    factors.knowledgeMilestone! +
    factors.streakBonus!;

  return {
    card: 'progress',
    score,
    factors,
  };
}

/**
 * Generate human-readable reason for card ordering
 *
 * @param state - Student state type
 * @param priorities - Computed card priorities
 * @returns Reason string
 */
function generateOrderingReason(
  state: StudentStateType,
  priorities: CardPriority[]
): string {
  const topCard = priorities[0].card;
  const topFactors = priorities[0].factors;

  switch (state) {
    case 'celebration':
      return 'Post-session celebration: Practice card promoted to encourage momentum';
    case 're_engagement':
      return 'Re-engagement needed: Chat card promoted to reconnect with student';
    case 'achievement':
      return 'Achievement milestone: Progress card promoted to celebrate success';
    case 'first_session':
      return 'First session: Chat card promoted to welcome student';
    default:
      // Generate reason based on top scoring factors
      if (topCard === 'practice' && topFactors.sessionRecency) {
        return 'Recent session detected: Practice card promoted';
      }
      if (topCard === 'practice' && topFactors.struggleFocus) {
        return 'Struggling subject detected: Practice card promoted for focused help';
      }
      if (topCard === 'chat' && topFactors.inactivityBonus) {
        return 'Inactivity detected: Chat card promoted for re-engagement';
      }
      if (topCard === 'progress' && topFactors.milestoneBonus) {
        return 'Milestone achieved: Progress card promoted to celebrate';
      }
      return 'Default ordering: Practice prioritized for continued learning';
  }
}

/**
 * Compute card order based on student state and context
 * Main entry point for card ordering algorithm
 *
 * Story 5.0b: AC-5.0b.1 - Dynamic card ordering with priority scoring
 *
 * @param input - Card ordering input data
 * @returns Card order with context and expiration
 */
export function computeCardOrder(input: CardOrderInput): CardOrder {
  // Detect student state using existing state detection logic
  const stateInput: DetectStateInput = {
    lastAppAccess: input.lastAppAccess,
    lastSessionTime: input.lastSessionTime,
    recentSessions: input.recentSessions,
    hasCompletedAnySession: input.hasCompletedAnySession,
    achievementToday: input.achievementToday,
  };
  const studentState = detectStudentState(stateInput);

  // Compute priority scores for each card
  const practicePriority = computePracticePriority(input);
  const chatPriority = computeChatPriority(input);
  const progressPriority = computeProgressPriority(input);

  // Sort cards by priority score (descending)
  const priorities = [practicePriority, chatPriority, progressPriority].sort(
    (a, b) => b.score - a.score
  );

  // Extract ordered card list
  const order = priorities.map((p) => p.card);

  // Compute expiration time (10 minutes from now)
  const expiresAt = new Date(Date.now() + CACHE_DURATION_MS).toISOString();

  // Generate context
  const context: CardOrderContext = {
    studentState,
    reason: generateOrderingReason(studentState, priorities),
    priorities,
    computedAt: new Date().toISOString(),
  };

  return {
    order,
    context,
    expiresAt,
  };
}
