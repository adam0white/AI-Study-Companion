/**
 * Greeting Generation Templates
 * Story 5.0: AC-5.0.1, AC-5.0.5 - Dynamic greeting based on session data with specific references
 */

import type { StudentStateType, RecentSessionData } from '../rpc/types';

interface GreetingContext {
  state: StudentStateType;
  recentSessions: RecentSessionData[];
  studentName?: string;
  streakDays?: number;
  lastTopic?: string;
  lastScore?: number;
  lastSubject?: string;
}

/**
 * Greeting templates for each state
 * Each template has placeholders for dynamic content:
 * {name}, {topic}, {subject}, {score}, {streak}, {achievement}
 */
const GREETING_TEMPLATES: Record<StudentStateType, string[]> = {
  celebration: [
    "Great work on {topic} today! 🎉 You scored {score}% on the practice.",
    "Awesome session! You've mastered {topic} with a {score}% score.",
    "Outstanding job with {topic}! Your {score}% score shows real progress.",
    "You crushed it! {score}% on {topic} is fantastic work.",
    "Excellent work today on {topic}! That {score}% score is impressive.",
    "You're on fire! {topic} practice complete with {score}% accuracy.",
  ],
  re_engagement: [
    "Welcome back! You've been learning {subject} for {streak} days. Let's keep the momentum going.",
    "Good to see you again! Your {subject} progress is waiting - let's dive back in.",
    "Hey there! You've made great progress in {subject}. Ready to continue?",
    "Welcome back! Time to pick up where you left off with {subject}.",
    "You're back! Let's continue building on your {subject} skills.",
  ],
  achievement: [
    "Congratulations! You've reached a new milestone in {subject}! ⭐",
    "Amazing achievement! Your dedication to {subject} is paying off.",
    "You did it! New personal best in {subject}. Keep up the great work!",
    "Milestone unlocked! Your {subject} mastery is growing stronger.",
    "Incredible progress! You've leveled up your {subject} skills.",
  ],
  first_session: [
    "Welcome to your AI Study Companion! I'm here to help you learn and grow.",
    "Hi there! Ready to start your learning journey? Let's make it amazing.",
    "Welcome! I'm excited to be your study companion. Let's get started!",
    "Hello! Your personalized learning experience starts now.",
    "Welcome aboard! Let's begin your path to academic success together.",
  ],
  default: [
    "Ready to continue with {subject}? You're making steady progress!",
    "Welcome back! Let's work on {subject} together today.",
    "Great to see you! Your {subject} skills are developing nicely.",
    "Hello! Ready for another productive {subject} session?",
    "Welcome! Let's keep building your {subject} knowledge.",
    "Good to see you! Time to strengthen your {subject} understanding.",
  ],
};

/**
 * Generate a personalized greeting based on student state and context
 * Story 5.0: AC-5.0.1 - Dynamic greeting with specific references
 *
 * @param context - Greeting context with state and session data
 * @returns Personalized greeting string
 */
export function generateGreeting(context: GreetingContext): string {
  const templates = GREETING_TEMPLATES[context.state];

  // Randomly select a template to prevent repetition
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Extract context data
  const topic = extractTopic(context);
  const subject = extractSubject(context);
  const score = extractScore(context);
  const streak = context.streakDays || 0;
  const achievement = extractAchievement(context);

  // Replace placeholders
  let greeting = template
    .replace('{name}', context.studentName || 'there')
    .replace('{topic}', topic)
    .replace('{subject}', subject)
    .replace('{score}', score.toString())
    .replace('{streak}', streak.toString())
    .replace('{achievement}', achievement);

  return greeting;
}

/**
 * Extract the most recent topic from sessions
 */
function extractTopic(context: GreetingContext): string {
  if (context.lastTopic) {
    return context.lastTopic;
  }

  if (context.recentSessions.length > 0) {
    const latestSession = context.recentSessions[0];
    if (latestSession.topics && latestSession.topics.length > 0) {
      return latestSession.topics[0];
    }
  }

  return 'your studies';
}

/**
 * Extract the most recent subject from sessions
 */
function extractSubject(context: GreetingContext): string {
  if (context.lastSubject) {
    return context.lastSubject;
  }

  if (context.recentSessions.length > 0) {
    const latestSession = context.recentSessions[0];
    if (latestSession.subject) {
      return latestSession.subject;
    }
  }

  return 'your subjects';
}

/**
 * Extract the most recent score from sessions
 */
function extractScore(context: GreetingContext): number {
  if (context.lastScore !== undefined) {
    return Math.round(context.lastScore);
  }

  if (context.recentSessions.length > 0) {
    const latestSession = context.recentSessions[0];
    if (latestSession.score !== undefined) {
      return Math.round(latestSession.score);
    }
  }

  return 85; // Default fallback score
}

/**
 * Extract the most notable achievement from recent sessions
 */
function extractAchievement(context: GreetingContext): string {
  if (context.recentSessions.length > 0) {
    const latestSession = context.recentSessions[0];
    if (latestSession.achievements && latestSession.achievements.length > 0) {
      return latestSession.achievements[0];
    }
  }

  return 'consistent practice';
}

/**
 * Validate that a greeting has specific references (not generic)
 * Story 5.0: AC-5.0.1 - No generic greetings
 *
 * @param greeting - Generated greeting text
 * @returns True if greeting has specific references
 */
export function hasSpecificReferences(greeting: string): boolean {
  // Check for generic placeholders that weren't replaced
  if (greeting.includes('{') || greeting.includes('}')) {
    return false;
  }

  // Check for generic fallback phrases that indicate no personalization
  const genericPhrases = ['your studies', 'your subjects'];
  for (const phrase of genericPhrases) {
    if (greeting.includes(phrase)) {
      return false;
    }
  }

  // Greeting is considered personalized if it doesn't contain generic phrases
  // This means it has specific topics, subjects, scores, or other references
  return true;
}
