/**
 * Application Constants
 * Story 4.3: Subject Knowledge Tracking
 */

/**
 * Hardcoded subjects tracked by the system
 * Story 4.3: AC-4.3.1 - 8 subjects tracked consistently throughout application
 */
export const SUBJECTS = [
  'Math',
  'Science',
  'English',
  'History',
  'Chemistry',
  'Biology',
  'Physics',
  'Spanish'
] as const;

/**
 * Type-safe subject type derived from SUBJECTS array
 */
export type Subject = typeof SUBJECTS[number];
