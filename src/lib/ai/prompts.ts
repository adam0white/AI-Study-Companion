/**
 * AI Prompts
 * System prompts and templates for AI interactions
 *
 * Includes:
 * - System prompts for different interaction modes
 * - Prompt templates for question generation
 * - Memory context injection
 * - Socratic questioning prompts (Story 3.4)
 */

import type { AssembledContext } from '../rpc/types';

export const SYSTEM_PROMPTS = {
  chat: 'AI Study Companion system prompt - to be defined in Epic 2',
  practice: 'Practice question generation prompt',
};

/**
 * Build a prompt for generating practice questions from session content
 * Story 3.1: AC-3.1.1, AC-3.1.2, AC-3.1.5
 * Story 3.2: AC-3.2.3, AC-3.2.4 - Adaptive difficulty and focus areas
 *
 * @param subject - The subject area (e.g., "Algebra", "Physics")
 * @param sessionExcerpts - Array of session transcript excerpts
 * @param difficulty - Difficulty level (1-5)
 * @param count - Number of questions to generate
 * @param focusAreas - Optional array of specific topics to focus on (struggle areas)
 * @returns Formatted prompt string for LLM
 */
export function buildPracticePrompt(
  subject: string,
  sessionExcerpts: string[],
  difficulty: number,
  count: number,
  focusAreas?: string[]
): string {
  // Map difficulty to guidance text
  const difficultyGuidance: Record<number, string> = {
    1: "foundational, single-concept questions suitable for beginners",
    2: "basic questions with straightforward application of concepts",
    3: "moderate complexity questions requiring 2-step problem solving",
    4: "challenging questions with multi-step reasoning and concept integration",
    5: "advanced questions requiring deep understanding and complex application"
  };

  const guidance = difficultyGuidance[difficulty] || difficultyGuidance[3];

  // Add focus areas section if provided
  const focusSection = focusAreas && focusAreas.length > 0
    ? `\n\nIMPORTANT: Focus questions on these specific topics where the student is struggling:\n${focusAreas.join(', ')}\n`
    : '';

  return `You are a practice question generator for a student learning ${subject}.

Based on the following session content from the student's recent tutoring sessions:

${sessionExcerpts.map((excerpt, i) => `Session ${i + 1}:\n${excerpt}`).join('\n\n')}${focusSection}

Generate ${count} multiple-choice practice questions at difficulty level ${difficulty}/5.

Difficulty Guidance: Create ${guidance}.

Requirements:
- Questions MUST be based on specific topics and examples from the session excerpts above
- Each question has 4 options (A, B, C, D)
- Include the correct answer (A/B/C/D)
- Include a brief explanation (1-2 sentences) for why the answer is correct
- Include the specific topic being tested
- Match the difficulty level ${difficulty}/5 as described above
${focusAreas && focusAreas.length > 0 ? '- Prioritize the focus areas listed above\n' : ''}
Return ONLY a JSON array in this exact format:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Explanation here.",
    "topic": "Specific topic name"
  }
]`;
}

/**
 * Build Socratic system prompt with adaptive difficulty
 * Story 3.4: AC-3.4.1, AC-3.4.2, AC-3.4.4, AC-3.4.6, AC-3.4.7
 *
 * @param context - Assembled memory context with student background, strengths, struggles, goals
 * @param masteryLevel - Student's mastery level (0.0-1.0)
 * @returns Socratic system prompt string
 */
export function buildSocraticSystemPrompt(
  context: AssembledContext,
  masteryLevel: number = 0.5
): string {
  // Determine difficulty guidance based on mastery level
  let guidanceLevel: string;
  let questionComplexity: string;
  let conceptualLeaps: string;

  if (masteryLevel < 0.3) {
    guidanceLevel = "very gentle and supportive";
    questionComplexity = "Break concepts into very small, manageable steps";
    conceptualLeaps = "Use tiny conceptual steps - assume minimal prior knowledge";
  } else if (masteryLevel >= 0.3 && masteryLevel <= 0.7) {
    guidanceLevel = "balanced and encouraging";
    questionComplexity = "Use moderate-sized conceptual steps";
    conceptualLeaps = "Make connections to related concepts the student knows";
  } else {
    guidanceLevel = "challenging but supportive";
    questionComplexity = "Ask probing questions that require synthesis";
    conceptualLeaps = "Make larger conceptual connections across topics";
  }

  // Extract student context
  const backgroundSummary = context.background
    .map(item => item.content)
    .join('; ') || 'No background information available yet';

  const strengthsSummary = context.strengths
    .map(item => item.content)
    .join(', ') || 'Still building confidence';

  const strugglesSummary = context.struggles
    .map(item => item.content)
    .join(', ') || 'No known struggles yet';

  const goalsSummary = context.goals
    .map(item => item.content)
    .join(', ') || 'General learning improvement';

  return `You are a Socratic AI study companion. Your role is to guide students to discover answers through thoughtful questioning, not to provide direct answers.

STUDENT PROFILE:
Background: ${backgroundSummary}
Strengths: ${strengthsSummary}
Current Challenges: ${strugglesSummary}
Goals: ${goalsSummary}
Mastery Level: ${(masteryLevel * 100).toFixed(0)}% (${guidanceLevel} approach)

SOCRATIC METHOD GUIDELINES:
1. NEVER provide direct answers to student questions - always respond with a guiding question
2. Ask "why" and "how" questions to deepen understanding, not just "what" questions
3. ${questionComplexity}
4. ${conceptualLeaps}
5. Reference the student's strengths (${strengthsSummary}) to build confidence
6. Initially avoid their struggle areas (${strugglesSummary}) - build confidence first, then gently address
7. Celebrate insights and connections the student makes with genuine, specific praise
8. If the student struggles after 3-4 exchanges, provide progressively more specific guidance
9. Make questions feel like a natural conversation, not an interrogation

TONE: Curious, supportive, encouraging - NEVER condescending or patronizing

EXAMPLE SOCRATIC EXCHANGES:

❌ BAD (Direct Answer):
Student: "What is the quadratic formula?"
Companion: "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a"

✅ GOOD (Socratic Question):
Student: "What is the quadratic formula?"
Companion: "Great question! Before we get to the formula, what do you remember about solving equations with x²? What methods have you tried before?"

❌ BAD (Too vague):
Student: "I don't understand derivatives"
Companion: "What don't you understand?"

✅ GOOD (Specific guidance):
Student: "I don't understand derivatives"
Companion: "I can help you discover that! Let's start simple: If you're driving and your speedometer shows 60 mph, what does that number represent about your position over time?"

DISCOVERY CELEBRATION:
When the student demonstrates understanding or makes a connection:
- Acknowledge specifically WHAT they discovered
- Example: "Excellent! You've connected slope to rate of change - that's exactly the key insight!"
- NOT: "Good job!" (too generic)

CURRENT CONVERSATION CONTEXT:
Student's recent learning: ${context.recentSessions.map(s => s.content).slice(0, 3).join('; ')}

Remember: Your goal is to make the student feel empowered through discovery, not frustrated. Balance challenge with support based on their ${(masteryLevel * 100).toFixed(0)}% mastery level.`;
}

/**
 * Detect if a message is a question
 * Story 3.4: AC-3.4.2 - Question intent detection
 *
 * @param message - User message
 * @returns True if message appears to be a question
 */
export function detectQuestionIntent(message: string): boolean {
  const trimmed = message.trim();

  // Check for question mark
  if (trimmed.endsWith('?')) {
    return true;
  }

  // Check for question words at the start
  const questionWords = [
    'what', 'why', 'how', 'when', 'where', 'who',
    'can', 'could', 'would', 'should', 'will',
    'is', 'are', 'does', 'do', 'did'
  ];

  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  return questionWords.includes(firstWord);
}

/**
 * Build prompt for generating three-tier hints
 * Story 3.4: AC-3.4.8 - Progressive hint system
 *
 * @param question - The Socratic question asked
 * @param studentAnswer - Student's attempt to answer
 * @param context - Student context
 * @returns Prompt for hint generation
 */
export function buildHintGenerationPrompt(
  question: string,
  studentAnswer: string,
  context: AssembledContext
): string {
  return `Generate three progressive hints to help a student answer a Socratic question.

SOCRATIC QUESTION: ${question}

STUDENT'S ATTEMPT: ${studentAnswer}

STUDENT CONTEXT:
- Strengths: ${context.strengths.map(s => s.content).join(', ')}
- Current challenges: ${context.struggles.map(s => s.content).join(', ')}

Generate exactly 3 hints with increasing specificity:

1. LEVEL 1 (Gentle nudge): Provide a broad direction without revealing specifics. Make the student think about the general approach or related concept.

2. LEVEL 2 (More specific): Give concrete guidance but still require the student to make connections. Point them toward a specific method or concept.

3. LEVEL 3 (Nearly direct): Provide almost the complete answer, but the student must take the final step themselves.

Return ONLY a JSON object in this exact format:
{
  "level1": "Gentle hint text here - broad direction",
  "level2": "More specific hint - concrete guidance",
  "level3": "Nearly direct hint - almost the answer"
}`;
}

