/**
 * RPC Type Definitions
 * Type-safe interface for Durable Object communication
 */

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

