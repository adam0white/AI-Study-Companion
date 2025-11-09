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
   * @param message - User message text
   * @returns AI-generated response
   */
  sendMessage(message: string): Promise<AIResponse>;

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

