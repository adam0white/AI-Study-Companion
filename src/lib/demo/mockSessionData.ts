/**
 * Mock Session Data for Demo
 * Story 2.5: AC-2.5.6 - Realistic demo data showcasing memory intelligence
 *
 * This file contains realistic session data that demonstrates:
 * - Student progression over time (struggling → improving → mastering)
 * - Consolidation into long-term memory
 * - Personalized responses based on consolidated knowledge
 */

import type { SessionInput } from '@/lib/session/types';

/**
 * Demo Session 1: Initial Struggle with Quadratic Discriminant
 * Date: 3 days ago
 * Student is confused about the discriminant concept
 */
export const DEMO_SESSION_1: SessionInput = {
  date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  subjects: ['Algebra', 'Quadratic Equations'],
  transcript: [
    { speaker: 'tutor', text: "Hi Alex! Today let's work on the quadratic formula. Remember it's x = (-b ± √(b² - 4ac)) / 2a", timestamp: '00:00:00' },
    { speaker: 'student', text: "Yeah, I remember the formula, but I'm really confused about that b² - 4ac part. What is that?", timestamp: '00:01:30' },
    { speaker: 'tutor', text: "That's called the discriminant. It's the part under the square root. It tells us about the nature of the roots.", timestamp: '00:02:15' },
    { speaker: 'student', text: "I don't understand why we need it. Can't we just solve the equation without it?", timestamp: '00:03:45' },
    { speaker: 'tutor', text: "The discriminant helps us know what kind of solutions to expect before we solve. If b² - 4ac is positive, we get two real roots.", timestamp: '00:05:00' },
    { speaker: 'student', text: "Okay... but I'm still not clear on why it matters. This is confusing.", timestamp: '00:06:30' },
    { speaker: 'tutor', text: "Let's try an example: x² + 5x + 6 = 0. Here a=1, b=5, c=6. What's the discriminant?", timestamp: '00:07:15' },
    { speaker: 'student', text: "Um... 5² - 4(1)(6)... I think that's 25 - 24 = 1?", timestamp: '00:09:00' },
    { speaker: 'tutor', text: "Perfect! And since 1 is positive, we know we'll have two real solutions. See how it helps?", timestamp: '00:10:30' },
    { speaker: 'student', text: "I guess so, but I still don't fully get the purpose of checking it first.", timestamp: '00:12:00' }
  ],
  duration: 25,
  tutor: 'Ms. Johnson'
};

/**
 * Demo Session 2: Practice and Improvement
 * Date: 1 day ago
 * Student practices discriminant calculation and begins to understand
 */
export const DEMO_SESSION_2: SessionInput = {
  date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  subjects: ['Algebra', 'Quadratic Equations'],
  transcript: [
    { speaker: 'tutor', text: "Welcome back, Alex! Ready to practice more with discriminants?", timestamp: '00:00:00' },
    { speaker: 'student', text: "Yes! I've been thinking about it and I want to try more examples.", timestamp: '00:01:00' },
    { speaker: 'tutor', text: "Great! Let's try x² + 5x + 6 = 0. Calculate the discriminant.", timestamp: '00:02:00' },
    { speaker: 'student', text: "Okay, so b² - 4ac = 5² - 4(1)(6) = 25 - 24 = 1. That's positive, so two real roots!", timestamp: '00:03:30' },
    { speaker: 'tutor', text: "Excellent! Now try x² + 2x + 5 = 0", timestamp: '00:04:45' },
    { speaker: 'student', text: "Let me see... 2² - 4(1)(5) = 4 - 20 = -16. That's negative!", timestamp: '00:06:15' },
    { speaker: 'tutor', text: "Perfect! What does a negative discriminant tell us?", timestamp: '00:07:00' },
    { speaker: 'student', text: "I think... complex roots? No real solutions?", timestamp: '00:08:00' },
    { speaker: 'tutor', text: "Exactly right! You're really getting this now.", timestamp: '00:09:00' },
    { speaker: 'student', text: "I'm starting to see why checking the discriminant first is useful. It saves time!", timestamp: '00:10:30' }
  ],
  duration: 30,
  tutor: 'Ms. Johnson'
};

/**
 * Demo Session 3: Mastery Demonstrated
 * Date: Current session
 * Student demonstrates mastery and can explain concepts
 */
export const DEMO_SESSION_3: SessionInput = {
  date: new Date().toISOString(), // Now
  subjects: ['Algebra', 'Quadratic Equations'],
  transcript: [
    { speaker: 'tutor', text: "Hi Alex! Let's see how much you've learned. Can you explain what the discriminant tells us?", timestamp: '00:00:00' },
    { speaker: 'student', text: "Sure! The discriminant b² - 4ac tells us what kind of roots we'll get. If it's positive, two real roots. If it's zero, one repeated root. If it's negative, complex roots with no real solutions.", timestamp: '00:01:30' },
    { speaker: 'tutor', text: "Wow, that's a perfect explanation! Let's try a challenging one: 2x² - 3x + 5 = 0", timestamp: '00:03:00' },
    { speaker: 'student', text: "Okay! b² - 4ac = (-3)² - 4(2)(5) = 9 - 40 = -31. So we'll have complex roots!", timestamp: '00:04:45' },
    { speaker: 'tutor', text: "Excellent! You've really mastered this concept. What about x² - 6x + 9?", timestamp: '00:06:00' },
    { speaker: 'student', text: "Let me check... (-6)² - 4(1)(9) = 36 - 36 = 0. That means one repeated root, right?", timestamp: '00:07:30' },
    { speaker: 'tutor', text: "Perfect! You can solve these in your sleep now. I'm really proud of your progress.", timestamp: '00:08:45' },
    { speaker: 'student', text: "Thanks! It makes so much more sense now. I can't believe I was struggling with this just a few days ago!", timestamp: '00:10:00' }
  ],
  duration: 20,
  tutor: 'Ms. Johnson'
};

/**
 * All demo sessions in chronological order
 */
export const DEMO_SESSIONS = [
  DEMO_SESSION_1,
  DEMO_SESSION_2,
  DEMO_SESSION_3,
];

/**
 * Expected consolidated long-term memory after processing all sessions
 * This shows what the consolidation process should produce
 */
export const EXPECTED_CONSOLIDATED_MEMORY = {
  background: [
    "Currently studying Algebra with focus on quadratic equations. Working with Ms. Johnson as tutor.",
    "Has completed 3 tutoring sessions over the past 3 days, showing consistent engagement.",
  ],
  struggles: [
    "Initially struggled with understanding the discriminant concept and its purpose (Session 1, 3 days ago). Had difficulty grasping why checking the discriminant before solving was useful. This struggle has been overcome through practice.",
  ],
  strengths: [
    "Demonstrated strong progression in discriminant mastery over 3 sessions. Went from confusion to complete mastery.",
    "Excellent calculation skills - correctly computes discriminants for various equation types.",
    "Shows metacognitive awareness, recognizing own learning progress and improvement.",
    "Can now explain discriminant concept clearly and identify all root types (positive, zero, negative discriminants).",
  ],
  goals: [
    "Continue building confidence with quadratic equations and formula applications.",
    "Master advanced algebra concepts with the same progression pattern.",
  ],
};

/**
 * Demo personalized chat responses that reference the consolidated memory
 * These show how the companion should respond after consolidation
 */
export const DEMO_PERSONALIZED_RESPONSES = {
  questionAboutDiscriminant: {
    userMessage: "Can you help me with discriminants again?",
    companionResponse: "I remember discriminants were confusing for you at first, but you made incredible progress! You went from struggling with the basic concept to mastering all three types of roots in just a few days. What specific aspect would you like to review?",
    isPersonalized: true,
    referencesMemory: ['struggles', 'strengths']
  },
  questionAboutQuadratics: {
    userMessage: "I have a test on quadratic equations tomorrow.",
    companionResponse: "You've been working really well with Ms. Johnson on quadratics! I know you've mastered the discriminant concept - you can now identify root types perfectly and handle complex calculations with negative coefficients. Would you like to practice a few more problems to boost your confidence for the test?",
    isPersonalized: true,
    referencesMemory: ['background', 'strengths']
  },
  newTopic: {
    userMessage: "Can we start working on functions?",
    companionResponse: "Absolutely! You've shown great metacognitive awareness and strong progression in your recent algebra work. I've noticed you learn well through practice and build mastery quickly once concepts click. Let's apply that same approach to functions!",
    isPersonalized: true,
    referencesMemory: ['strengths']
  }
};
