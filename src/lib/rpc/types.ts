/**
 * RPC Type Definitions
 * Type-safe interface for Durable Object communication
 */

// Import celebration types from celebration module
import type {
  CelebrationState as ImportedCelebrationState,
  CelebrationData as ImportedCelebrationData,
  SessionMetrics as ImportedSessionMetrics,
  AchievementBadge as ImportedAchievementBadge,
} from '../types/celebration';

// Re-export celebration types
export type CelebrationState = ImportedCelebrationState;
export type CelebrationData = ImportedCelebrationData;
export type SessionMetrics = ImportedSessionMetrics;
export type AchievementBadge = ImportedAchievementBadge;

// ============================================
// Student Profile Types
// ============================================

export interface StudentProfile {
  studentId: string;
  clerkUserId: string;
  displayName: string;
  createdAt: string;
  lastActiveAt: string;
}

// ============================================
// AI Response Types
// ============================================

export interface AIResponse {
  message: string;
  timestamp: string;
  conversationId?: string;
  type?: 'chat' | 'socratic' | 'escalation';
  messageId?: string; // ID of the message in chat_history (for hint requests)
  metadata?: {
    confidence?: number;
    sources?: string[];
    hints?: string[];
    socraticDepth?: number;
  };
}

// ============================================
// Progress Data Types
// ============================================

export interface ProgressData {
  sessionCount: number;
  recentTopics: string[];
  lastSessionDate: string; // ISO 8601
  daysActive: number;
  totalMinutesStudied?: number;
}

// ============================================
// RPC Interface for StudentCompanion
// ============================================

export interface StudentCompanionRPC {
  /**
   * Initialize a new student companion instance
   * @param clerkUserId - Clerk authentication user ID
   * @returns Student profile with ID and metadata
   */
  initialize(clerkUserId: string): Promise<StudentProfile>;

  /**
   * Send a message to the companion and get AI response
   * Story 3.4: Updated to support Socratic mode
   * @param message - User message text
   * @param options - Optional configuration (mode: 'socratic' | 'direct')
   * @returns AI-generated response
   */
  sendMessage(message: string, options?: SendMessageOptions): Promise<AIResponse>;

  /**
   * Request hints for a Socratic question
   * Story 3.4: AC-3.4.8 - Three-tier hint system
   * @param messageId - ID of the Socratic question message
   * @returns Hints with progressive specificity
   */
  requestHint(messageId: string): Promise<HintResponse>;

  /**
   * Get current progress data for the student
   * @returns Progress statistics and metrics
   */
  getProgress(): Promise<ProgressData>;

  /**
   * Manually trigger memory consolidation
   * Story 2.1: AC-2.1.6 - Manual consolidation trigger for testing
   * @returns Consolidation result with statistics
   */
  triggerConsolidation(): Promise<ConsolidationResult>;

  /**
   * Get consolidation history for the student
   * Story 2.1: AC-2.1.3 - Consolidation tracking
   * @param limit - Maximum number of records to return (default: 10)
   * @returns Array of consolidation history records
   */
  getConsolidationHistory(limit?: number): Promise<ConsolidationHistory[]>;

  /**
   * Retrieve long-term memory by category
   * Story 2.3: AC-2.3.1, AC-2.3.7 - Public memory retrieval for UI display
   * @param category - Optional category filter
   * @returns Array of long-term memory items with formatted content
   */
  getLongTermMemory(category?: string): Promise<LongTermMemoryItem[]>;

  /**
   * Retrieve recent short-term memory
   * Story 2.3: AC-2.3.2, AC-2.3.7 - Public memory retrieval for UI display
   * @param limit - Maximum number of memories to return (default: 10)
   * @returns Array of active short-term memory items
   */
  getShortTermMemory(limit?: number): Promise<ShortTermMemoryItem[]>;

  /**
   * Get memory system consolidation status
   * Story 2.5: AC-2.5.4 - Memory status visibility
   * @returns Memory status including last consolidation and pending memories
   */
  getMemoryStatus(): Promise<MemoryStatus>;

  /**
   * Start a practice session with questions generated from session content
   * Story 3.1: AC-3.1.6 - Practice question generation
   * @param options - Practice configuration (subject, difficulty, questionCount, focusAreas)
   * @returns Practice session with generated questions
   */
  startPractice(options: PracticeOptions): Promise<PracticeSession>;

  /**
   * Submit an answer to a practice question
   * Story 3.1: AC-3.1.7 - Answer submission and tracking
   * @param questionId - ID of the question being answered
   * @param answer - Student's selected answer
   * @returns Answer feedback with correctness and explanation
   */
  submitAnswer(questionId: string, answer: string): Promise<AnswerFeedback>;

  /**
   * Complete a practice session
   * Story 3.1: AC-3.1.7 - Session completion
   * @param sessionId - ID of the practice session
   * @returns Practice result summary with score and stats
   */
  completePractice(sessionId: string): Promise<PracticeResult>;

  /**
   * Get multi-dimensional progress data
   * Story 3.5: AC-3.5.1-3.5.8 - Multi-dimensional progress tracking
   * @returns Comprehensive progress data across subjects, time, and goals
   */
  getMultiDimensionalProgress(): Promise<MultiDimensionalProgressData>;

  /**
   * Get subject mastery data
   * Story 4.3: AC-4.3.5 - RPC method to retrieve subject mastery
   * @param subject - Optional subject filter; if not provided, returns all subjects
   * @returns Array of subject mastery data with mastery level, practice count, and last updated date
   */
  getSubjectMastery(subject?: string): Promise<SubjectMastery[]>;

  /**
   * Get practice statistics for a subject
   * Story 4.4: AC-4.4.5 - RPC method to retrieve subject practice stats
   * @param subject - Subject name to get statistics for
   * @returns Practice statistics including session count, average score, and streaks
   */
  getSubjectPracticeStats(subject: string): Promise<SubjectPracticeStats>;

  /**
   * Ingest mock tutoring session for testing
   * Creates a fake session with sample Q&A about quadratic equations
   * @returns Session metadata
   */
  ingestMockSession(): Promise<SessionMetadata>;

  /**
   * Get hero card state with dynamic greeting and personalized content
   * Story 5.0: AC-5.0.7 - Backend RPC method returns hero card state
   * @returns Hero card state with greeting, state type, CTAs, and styling
   */
  getHeroCardState(): Promise<HeroCardState>;

  /**
   * Get card ordering based on student state and context
   * Story 5.0b: AC-5.0b.7, AC-5.0b.8 - Backend RPC method returns card order
   * @returns Card order with priorities and context
   */
  getCardOrder(): Promise<CardOrder>;

  /**
   * Get session celebration state for display
   * Story 5.1: AC-5.1.10 - RPC method returns celebration data
   * @returns Celebration state with session data, metrics, and badges
   */
  getSessionCelebration(): Promise<CelebrationState>;

  /**
   * Get goal progress for all learning goals
   * Story 5.3: AC-5.3.6 - RPC method returns goal progress
   * @returns Goal progress snapshot with completed, in-progress, and available goals
   */
  getGoalProgress(): Promise<GoalProgressSnapshot>;

  /**
   * Get goal celebration data if goal completed
   * Story 5.3: AC-5.3.2 - RPC method detects and returns goal completion celebration
   * @returns Goal celebration data if goal newly completed, null otherwise
   */
  getGoalCelebration(): Promise<GoalCelebrationData | null>;

  /**
   * Get pending retention nudge if applicable
   * Story 5.4: AC-5.4.7 - RPC method returns pending nudge
   * @returns Retention nudge data if pending, null otherwise
   */
  getNudgeIfPending(): Promise<RetentionNudgeData | null>;

  /**
   * Dismiss retention nudge permanently
   * Story 5.4: AC-5.4.7 - Mark nudge as displayed/dismissed
   */
  dismissNudge(): Promise<void>;

  /**
   * Snooze retention nudge temporarily
   * Story 5.4: AC-5.4.7 - Temporarily dismiss nudge
   * @param hours - Number of hours to snooze
   */
  snoozeNudge(hours: number): Promise<void>;
}

// ============================================
// Memory Types
// ============================================

export interface MemoryItem {
  id: string;
  studentId: string;
  content: string;
  createdAt: string;
  [key: string]: any; // Allow additional properties
}

export interface ShortTermMemory {
  id: string;
  studentId: string;
  content: string;
  sessionId?: string;
  importanceScore: number;
  createdAt: string;
  expiresAt?: string;
}

export interface LongTermMemory {
  id: string;
  studentId: string;
  content: string;
  category: string;
  tags: string; // JSON array of strings
  createdAt: string;
  lastAccessedAt: string;
}

// Input types for creating memories
export interface CreateShortTermMemoryInput {
  content: string;
  sessionId?: string;
  importanceScore?: number; // defaults to 0.5
  expiresAt?: string;
}

export interface CreateLongTermMemoryInput {
  content: string;
  category: string;
  tags?: string[]; // will be serialized to JSON
}

export interface SessionMetadata {
  id: string;
  studentId: string;
  r2Key: string;
  date: string;
  durationMinutes?: number;
  subjects?: string;
  tutorName?: string;
  status: string;
  createdAt: string;
}

// ============================================
// Memory Consolidation Types (Story 2.1)
// ============================================

export interface ConsolidatedInsight {
  category: 'background' | 'strengths' | 'struggles' | 'goals';
  content: string;
  confidenceScore: number;
  sourceSessionIds: string[];
}

export interface ConsolidationResult {
  success: boolean;
  shortTermItemsProcessed: number;
  longTermItemsCreated: number;
  longTermItemsUpdated: number;
  insights?: ConsolidatedInsight[];
  error?: string;
}

export interface ConsolidationHistory {
  id: string;
  studentId: string;
  consolidatedAt: string;
  shortTermItemsProcessed: number;
  longTermItemsUpdated: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

// ============================================
// Story 2.3: Memory Retrieval Types
// ============================================

export interface LongTermMemoryItem {
  id: string;
  category: 'background' | 'strengths' | 'struggles' | 'goals';
  content: string;
  confidenceScore: number;
  lastUpdated: string;
  sourceSessionsCount: number;
}

export interface ShortTermMemoryItem {
  id: string;
  content: string;
  sessionId?: string;
  importanceScore: number;
  createdAt: string;
}

export interface AssembledContext {
  background: LongTermMemoryItem[];
  strengths: LongTermMemoryItem[];
  struggles: LongTermMemoryItem[];
  goals: LongTermMemoryItem[];
  recentSessions: ShortTermMemoryItem[];
  practiceProgress?: {
    totalSessions: number;
    completedSessions: number;
    averageAccuracy: number;
    recentSubjects: string[];
  };
  userPrompt: string;
}

// ============================================
// Story 2.5: Memory Status Types
// ============================================

export interface MemoryStatus {
  lastConsolidation: string | null;
  pendingMemories: number;
  nextConsolidation: string | null;
}

// ============================================
// Generic RPC Types (for future expansion)
// ============================================

export interface RPCRequest {
  method: string;
  params: unknown;
}

export interface RPCResponse {
  result?: unknown;
  error?: string;
}

// ============================================
// Story 3.1: Practice Question Generation Types
// ============================================

export interface PracticeOptions {
  subject?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  questionCount?: number;
  focusAreas?: string[];
}

export interface PracticeSession {
  id: string;
  subject: string;
  questions: PracticeQuestion[];
  startedAt: string;
  difficulty: number;
}

export interface PracticeQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string; // The actual answer text, not index
  explanation: string;
  metadata: {
    difficulty: number;
    topic: string;
    sessionReference?: string;
  };
}

export interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  metadata?: {
    difficultyChanged?: boolean;
    newDifficulty?: number;
    previousDifficulty?: number;
  };
}

export interface PracticeResult {
  sessionId: string;
  subject: string;
  questionsTotal: number;
  questionsCorrect: number;
  accuracy: number; // Percentage (0-100)
  durationSeconds: number;
  completedAt: string;
  subjectMasteryDelta: number;
  newMasteryLevel: number; // Updated mastery (0.0-1.0)
  averageTimePerQuestion: number; // seconds
  achievements?: string[];
}

// ============================================
// Story 3.4: Socratic Q&A Types
// ============================================

export interface SendMessageOptions {
  mode?: 'socratic' | 'direct';
}

export interface HintResponse {
  hints: string[];
  currentLevel: number;
  maxLevel: number; // Always 3
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  messageType?: 'user' | 'assistant' | 'socratic_question';
  metadata?: {
    hints?: string[];
    socraticDepth?: number;
    studentDiscovered?: boolean;
  };
  conversationId?: string;
  createdAt: string;
}

// ============================================
// Story 3.5: Multi-Dimensional Progress Types
// ============================================

export interface MultiDimensionalProgressData {
  overall: {
    practiceSessionsCompleted: number;
    practiceSessionsStarted: number;
    completionRate: number; // percentage
    averageAccuracy: number; // percentage
    totalSubjects: number;
    averageMastery: number; // 0.0 to 1.0
  };
  bySubject: SubjectProgress[];
  byTime: ProgressByTime[];
  byGoal?: GoalProgress[];
}

export interface SubjectProgress {
  subject: string;
  mastery: number; // 0.0 to 1.0
  practiceCount: number;
  completionRate: number; // percentage for subject
  avgAccuracy: number; // percentage for subject
  lastPracticed: string; // ISO 8601
  masteryDelta: number; // change from previous
  struggles: string[]; // JSON parsed
  strengths: string[]; // JSON parsed
}

export interface ProgressByTime {
  date: string; // ISO 8601 date (day granularity)
  subjects: {
    subject: string;
    mastery: number;
  }[];
  practiceCount: number; // practices completed on this day
}

export interface GoalProgress {
  goal: string;
  progress: number; // 0.0 to 1.0
  sessionsCompleted: number;
  targetSessions?: number;
}

// ============================================
// Story 4.3: Subject Knowledge Tracking Types
// ============================================

export interface SubjectMastery {
  subject: string;
  mastery_score: number; // 0.0 to 1.0
  practice_count: number;
  last_updated: string; // ISO 8601
}

// ============================================
// Story 4.4: Subject Practice Statistics Types
// ============================================

export interface SubjectPracticeStats {
  totalSessions: number;
  averageScore: number; // 0.0 - 1.0
  longestStreak: number; // days
  currentStreak: number; // days
  lastPracticeDate?: string; // ISO 8601
  lastPracticeScore?: number; // 0.0 - 1.0
}

// ============================================
// Story 5.0: Dynamic Hero Card & Proactive Greetings Types
// ============================================

export type StudentStateType =
  | 'default'
  | 'celebration'
  | 're_engagement'
  | 'achievement'
  | 'first_session';

export interface StudentState {
  type: StudentStateType;
  lastAppAccess?: string; // ISO timestamp
  lastSessionTime?: string; // ISO timestamp
  streakDays?: number;
  milestoneAchievedToday?: boolean;
}

export interface CTAConfig {
  label: string;
  action?: 'practice' | 'chat' | 'progress' | 're_engagement' | 'tour';
}

export interface HeroCardState {
  greeting: string;
  state: StudentStateType;
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
  gradientColors?: [string, string];
  emoticon?: string;
}

export interface RecentSessionData {
  topics: string[];
  score?: number;
  timestamp: string;
  achievements: string[];
  subject?: string;
}

export interface StudentAchievement {
  type: string; // 'milestone', 'badge', 'streak', etc.
  description: string;
  timestamp: string;
  value?: number | string;
}

// ============================================
// Story 5.0b: Dynamic Card Ordering Types
// ============================================

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

// ============================================
// Story 5.3: Goal Achievement Detection Types
// ============================================

/**
 * Learning goal definition
 */
export interface LearningGoal {
  id: string;
  name: string;
  subject: string;
  description: string;
  completionCriteria: {
    minAccuracy: number;    // e.g., 0.80 for 80%
    minSessions: number;    // e.g., 5 sessions
    minConsecutiveDays?: number;
  };
}

/**
 * Goal achievement progress tracking
 * Story 5.3: Goal progress with detailed metrics
 */
export interface GoalAchievementProgress {
  goalId: string;
  name: string;
  subject: string;
  status: 'active' | 'completed';
  progressPercent: number;  // 0-100
  completionTime?: string;  // ISO timestamp when completed
  metrics: {
    accuracy: number;
    sessionsCount: number;
    consecutiveDays: number;
  };
}

/**
 * Goal progress snapshot
 */
export interface GoalProgressSnapshot {
  completed: GoalAchievementProgress[];
  inProgress: GoalAchievementProgress[];
  available: GoalAchievementProgress[];  // Not yet eligible
}

/**
 * Goal completion event
 */
export interface GoalCompletionEvent {
  goalId: string;
  goalName: string;
  subject: string;
  completionTime: string;
  previousAccuracy: number;
  newAccuracy: number;
  sessionsToCompletion: number;
}

/**
 * Subject suggestion for next learning step
 */
export interface SubjectSuggestion {
  subject: string;
  name: string;
  description: string;
  reason: string;  // e.g., "Natural progression after Algebra"
  prerequisites: string[];
  relatedGoals: LearningGoal[];
}

/**
 * Goal celebration data
 */
export interface GoalCelebrationData {
  completedGoal: LearningGoal;
  celebrationMessage: string;
  achievementBadge: AchievementBadge;
  relatedSubjects: SubjectSuggestion[];
  progressSnapshot: GoalProgressSnapshot;
}

// ============================================
// Story 5.4: Retention Nudges Types
// ============================================

/**
 * Engagement metrics for nudge detection
 */
export interface EngagementMetrics {
  totalSessions: number;
  sessionsInLast7Days: number;
  lastAppAccess: string;  // ISO timestamp
  lastSessionTime: string;  // ISO timestamp
  currentStreak: number;  // Consecutive days with sessions
  totalLearningMinutes: number;
  topicsLearned: string[];
}

/**
 * Nudge trigger criteria
 */
export interface NudgeCriteria {
  minDaysSinceAccess: number;  // 7 days
  maxSessionsForTrigger: number;  // < 3 sessions
  nudgeFrequencyDays: number;  // Max once per 7 days
}

/**
 * Retention nudge data
 */
export interface RetentionNudgeData {
  id: string;
  message: string;  // Personalized message
  variant: 'super-low' | 'low' | 'moderate';  // Based on session count
  emoji: string;
  metrics: {
    sessionsCompleted: number;
    topicsLearned: string[];
    minutesInvested: number;
    streakDays?: number;
  };
  primaryCTA: {
    label: 'Book Session';
    action: 'navigate-booking';
  };
  secondaryCTA: {
    label: 'Maybe later';
    action: 'snooze-nudge';
  };
  generatedAt: string;  // ISO timestamp
  shouldExpireAt: string;  // 7 days from generation
}

/**
 * Nudge event for history tracking
 */
export interface NudgeEvent {
  nudgeId: string;
  triggeredAt: string;
  displayedAt: string;
  action: 'booked' | 'dismissed' | 'snoozed' | 'ignored';
  actionAt?: string;
  variant: string;
}

/**
 * Nudge state in StudentCompanion
 */
export interface StudentNudgeState {
  nudgePending: boolean;
  pendingNudgeData?: RetentionNudgeData;
  lastNudgeTime?: string;
  nudgeHistory: NudgeEvent[];
  nextNudgeEligibleAt?: string;
}

