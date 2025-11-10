/**
 * Celebration Message Generator
 * Generates personalized celebration content based on session data
 * Story 5.1: AC-5.1.2, AC-5.1.6 - Personalized celebration messages
 */

import type { CelebrationData, SessionMetrics, AchievementBadge } from '../types/celebration';

// ============================================
// Message Templates
// ============================================

interface MessageTemplate {
  condition: (metrics: SessionMetrics) => boolean;
  templates: string[];
}

const HIGH_ACCURACY_TEMPLATES: MessageTemplate = {
  condition: (metrics) => metrics.accuracy >= 90,
  templates: [
    'Incredible accuracy! You nailed {topic}! 🎯',
    'Wow, {accuracy}% accuracy on {topic}! That\'s mastery-level performance! 🌟',
    'Outstanding! You\'ve clearly understood {topic}! 🏆',
    'Amazing work! {accuracy}% on {topic} shows true mastery! ✨',
  ],
};

const GOOD_ACCURACY_TEMPLATES: MessageTemplate = {
  condition: (metrics) => metrics.accuracy >= 70 && metrics.accuracy < 90,
  templates: [
    'Great work on {topic}! {accuracy}% accuracy shows real progress! 💪',
    'You\'re getting it! {accuracy}% on {topic} is solid progress! 📈',
    'Nice improvement! {accuracy}% accuracy means you\'re mastering {topic}! ✨',
    'Well done! {accuracy}% on {topic} is excellent progress! 🎯',
  ],
};

const STREAK_TEMPLATES: MessageTemplate = {
  condition: (metrics) => (metrics.streak || 0) >= 3,
  templates: [
    'That\'s {streak} sessions in a row! You\'re on fire! 🔥',
    'Awesome consistency! {streak} days of learning is impressive! 💪',
    '{streak} session streak! Your dedication is paying off! 🚀',
    'Incredible! {streak} days straight! Keep that momentum going! ⚡',
  ],
};

const MULTIPLE_TOPICS_TEMPLATES: MessageTemplate = {
  condition: (metrics) => metrics.topicsLearned.length > 1,
  templates: [
    'You covered {topicCount} different topics today! What a productive session! 📚',
    'Multi-tasking champion! Covered {topics} in one session! 🎓',
    'Impressive range! {topicCount} topics mastered today! 🌟',
    'You\'re a learning machine! {topicCount} topics in one session! 💡',
  ],
};

const IMPROVEMENT_TEMPLATES: MessageTemplate = {
  condition: (metrics) =>
    !!(metrics.comparisonToPrevious && metrics.comparisonToPrevious.accuracyChange > 0),
  templates: [
    'You improved by {improvement}% since last session! Keep it up! 📊',
    'Better than last time! +{improvement}% accuracy! 🎉',
    'Look at that progress! {improvement}% improvement! 📈',
    'Rising star! +{improvement}% accuracy since last time! ⭐',
  ],
};

/**
 * Generate celebration data with personalized message and metrics
 * Story 5.1: AC-5.1.2 - Specific session content references
 */
export function generateCelebrationData(
  sessionMetrics: SessionMetrics,
  achievements: AchievementBadge[]
): CelebrationData {
  const message = generateCelebrationMessage(sessionMetrics);
  const title = generateCelebrationTitle(sessionMetrics);
  const emoji = selectCelebrationEmoji(sessionMetrics);
  const backgroundColor = selectBackgroundColor(sessionMetrics);

  return {
    title,
    message,
    emoji,
    backgroundColor,
    metrics: sessionMetrics,
    achievements,
  };
}

/**
 * Generate personalized celebration title
 */
function generateCelebrationTitle(metrics: SessionMetrics): string {
  if (metrics.accuracy >= 95) {
    return 'Phenomenal Work!';
  } else if (metrics.accuracy >= 90) {
    return 'Excellent Session!';
  } else if (metrics.accuracy >= 80) {
    return 'Great Job!';
  } else if (metrics.accuracy >= 70) {
    return 'Nice Progress!';
  } else {
    return 'Keep Going!';
  }
}

/**
 * Generate personalized celebration message with specific references
 * Story 5.1: AC-5.1.2 - Message references actual session data
 */
function generateCelebrationMessage(metrics: SessionMetrics): string {
  // Select applicable templates
  const applicableTemplates: MessageTemplate[] = [
    HIGH_ACCURACY_TEMPLATES,
    GOOD_ACCURACY_TEMPLATES,
    STREAK_TEMPLATES,
    MULTIPLE_TOPICS_TEMPLATES,
    IMPROVEMENT_TEMPLATES,
  ].filter((template) => template.condition(metrics));

  // If no templates match, use default
  if (applicableTemplates.length === 0) {
    return generateDefaultMessage(metrics);
  }

  // Select random template from applicable ones
  const selectedTemplate =
    applicableTemplates[Math.floor(Math.random() * applicableTemplates.length)];
  const template =
    selectedTemplate.templates[
      Math.floor(Math.random() * selectedTemplate.templates.length)
    ];

  // Replace placeholders with actual data
  return replacePlaceholders(template, metrics);
}

/**
 * Generate default celebration message
 */
function generateDefaultMessage(metrics: SessionMetrics): string {
  const topic = metrics.topicsLearned[0] || 'your studies';
  const questions = metrics.questionsAnswered;
  return `Great session! You answered ${questions} questions on ${topic}! 🎓`;
}

/**
 * Replace placeholders in message templates with actual data
 */
function replacePlaceholders(template: string, metrics: SessionMetrics): string {
  let message = template;

  // Replace {topic} with first topic or list of topics
  if (message.includes('{topic}')) {
    const topic = metrics.topicsLearned[0] || 'your studies';
    message = message.replace(/{topic}/g, topic);
  }

  // Replace {topics} with formatted list
  if (message.includes('{topics}')) {
    const topics = formatTopicsList(metrics.topicsLearned);
    message = message.replace(/{topics}/g, topics);
  }

  // Replace {topicCount}
  if (message.includes('{topicCount}')) {
    message = message.replace(/{topicCount}/g, metrics.topicsLearned.length.toString());
  }

  // Replace {accuracy}
  if (message.includes('{accuracy}')) {
    message = message.replace(/{accuracy}/g, Math.round(metrics.accuracy).toString());
  }

  // Replace {streak}
  if (message.includes('{streak}')) {
    message = message.replace(/{streak}/g, (metrics.streak || 0).toString());
  }

  // Replace {improvement}
  if (message.includes('{improvement}')) {
    const improvement = metrics.comparisonToPrevious?.accuracyChange || 0;
    message = message.replace(/{improvement}/g, Math.round(improvement).toString());
  }

  return message;
}

/**
 * Format topics list for message display
 */
function formatTopicsList(topics: string[]): string {
  if (topics.length === 0) return 'various topics';
  if (topics.length === 1) return topics[0];
  if (topics.length === 2) return `${topics[0]} and ${topics[1]}`;
  return `${topics.slice(0, -1).join(', ')}, and ${topics[topics.length - 1]}`;
}

/**
 * Select appropriate emoji for celebration
 */
function selectCelebrationEmoji(metrics: SessionMetrics): string {
  if (metrics.accuracy >= 95) return '🏆';
  if (metrics.accuracy >= 90) return '🎯';
  if (metrics.accuracy >= 80) return '⭐';
  if (metrics.accuracy >= 70) return '✨';
  if (metrics.streak && metrics.streak >= 7) return '🔥';
  return '🎉';
}

/**
 * Select background color/gradient based on performance
 */
function selectBackgroundColor(metrics: SessionMetrics): string {
  if (metrics.accuracy >= 90) {
    return 'from-purple-500 to-pink-500'; // Excellent
  } else if (metrics.accuracy >= 80) {
    return 'from-blue-500 to-purple-500'; // Great
  } else if (metrics.accuracy >= 70) {
    return 'from-green-500 to-blue-500'; // Good
  } else {
    return 'from-indigo-500 to-purple-500'; // Encouraging
  }
}

/**
 * Calculate estimated knowledge gain description
 */
export function calculateKnowledgeGain(
  accuracy: number,
  previousAccuracy?: number
): string {
  if (!previousAccuracy) {
    return `${Math.round(accuracy)}% understanding achieved`;
  }

  const improvement = accuracy - previousAccuracy;
  if (improvement >= 20) {
    return `${Math.round(improvement)}% major improvement!`;
  } else if (improvement >= 10) {
    return `${Math.round(improvement)}% significant progress`;
  } else if (improvement > 0) {
    return `${Math.round(improvement)}% steady improvement`;
  } else if (improvement === 0) {
    return 'Maintaining strong performance';
  } else {
    return 'Room for growth - keep practicing!';
  }
}
