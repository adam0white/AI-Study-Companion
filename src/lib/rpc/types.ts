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
  totalSessions: number;
  practiceQuestionsCompleted: number;
  topicsStudied: string[];
  currentStreak: number;
  lastUpdated: string;
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

