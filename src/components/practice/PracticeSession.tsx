import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { PracticeModal } from './PracticeModal';
import { QuestionCard } from './QuestionCard';
import { AnswerOptions } from './AnswerOptions';
import { ProgressIndicator } from './ProgressIndicator';
import { SubmitButton } from './SubmitButton';
import { FeedbackDisplay } from './FeedbackDisplay';
import { PracticeResults } from './PracticeResults';
import { PracticeCompletionSummary } from './PracticeCompletionSummary';
import PerformanceDisplay from './PerformanceDisplay';
import DifficultyChangeNotification from './DifficultyChangeNotification';
import { RPCClient } from '@/lib/rpc/client';
import type { PracticeResult } from '@/lib/rpc/types';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // index of correct option (0-3)
  explanation: string;
  topic?: string;
  sessionReference?: string;
}

interface PracticeSessionProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void; // Callback when practice completes successfully
  subject?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  questionCount?: number;
}

/**
 * Main container component for practice sessions
 * - Manages session state: questions, current question, selection, submission
 * - Composes all practice UI components
 * - Handles answer validation and navigation
 * - Shows results screen on completion
 * Story 3.1: AC-3.1.6 - Loads questions from API
 */
export function PracticeSession({
  isOpen,
  onClose,
  onComplete,
  subject = 'General',
  difficulty = 3,
  questionCount = 5
}: PracticeSessionProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSubject, setSessionSubject] = useState<string>('');

  // Story 3.2: Adaptive Practice tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(difficulty);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [difficultyChange, setDifficultyChange] = useState<{ previous: number; new: number } | null>(null);

  // Story 3.3: Practice completion tracking
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);

  // Load questions when modal opens
  useEffect(() => {
    if (isOpen && questions.length === 0) {
      loadPracticeQuestions();
    }
  }, [isOpen]);

  const loadPracticeQuestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const rpcClient = new RPCClient(getToken);
      const practiceSession = await rpcClient.startPractice({
        subject,
        difficulty,
        questionCount,
      });

      // Convert API questions to component format
      const convertedQuestions: Question[] = practiceSession.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswer: q.options.findIndex((opt) => opt === q.correctAnswer),
        explanation: q.explanation,
        topic: q.metadata.topic,
        sessionReference: q.metadata.sessionReference,
      }));

      setQuestions(convertedQuestions);
      setSessionSubject(practiceSession.subject);
      setSessionId(practiceSession.id);
      setCurrentDifficulty(practiceSession.difficulty);
    } catch (err) {
      console.error('Failed to load practice questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load questions. Using mock questions instead.');

      // Fallback to mock questions
      setQuestions(MOCK_QUESTIONS);
      setSessionSubject(subject);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = submitted && currentQuestion && selectedAnswer === currentQuestion.correctAnswer;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleSubmit = async () => {
    if (selectedAnswer !== null && currentQuestion) {
      setSubmitted(true);
      const isAnswerCorrect = selectedAnswer === currentQuestion.correctAnswer;

      // Record result locally
      setResults((prev) => [...prev, isAnswerCorrect]);

      // Update correct count
      if (isAnswerCorrect) {
        setCorrectCount((prev) => prev + 1);
      }

      // Submit answer to backend if we have a sessionId
      if (sessionId) {
        try {
          const rpcClient = new RPCClient(getToken);
          const selectedOption = currentQuestion.options[selectedAnswer];

          const feedback = await rpcClient.submitAnswer(currentQuestion.id, selectedOption);

          // Check if difficulty changed
          if (feedback.metadata?.difficultyChanged) {
            setDifficultyChange({
              previous: feedback.metadata.previousDifficulty!,
              new: feedback.metadata.newDifficulty!,
            });
            setCurrentDifficulty(feedback.metadata.newDifficulty!);
          }
        } catch (err) {
          console.error('Failed to submit answer:', err);
          // Continue with local tracking even if RPC fails
        }
      }
    }
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Complete the practice session (Story 3.3: AC-3.3.4)
      if (sessionId) {
        try {
          const rpcClient = new RPCClient(getToken);
          const result = await rpcClient.completePractice(sessionId);
          setPracticeResult(result);
          setShowResults(true);

          // Story 4.4: AC-4.4.7 - Invalidate React Query caches for real-time updates
          await queryClient.invalidateQueries({ queryKey: ['subjectMastery'] });
          await queryClient.invalidateQueries({ queryKey: ['multiDimensionalProgress'] });

          // Notify parent that practice completed successfully
          onComplete?.();
        } catch (err) {
          console.error('Failed to complete practice session:', err);
          // Fallback to basic results if RPC fails
          setShowResults(true);
        }
      } else {
        // No sessionId, show basic results
        setShowResults(true);
      }
    } else {
      // Advance to next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setResults([]);
    setShowResults(false);
    setCorrectCount(0);
    setDifficultyChange(null);
    setPracticeResult(null);
    setQuestions([]); // Clear questions to trigger reload
    loadPracticeQuestions(); // Load new practice session
  };

  const handleClose = () => {
    handleRestart();
    onClose();
  };

  // Show loading state
  if (loading) {
    return (
      <PracticeModal isOpen={isOpen} onClose={handleClose}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Generating practice questions from your sessions...</p>
        </div>
      </PracticeModal>
    );
  }

  // Show error state
  if (error && questions.length === 0) {
    return (
      <PracticeModal isOpen={isOpen} onClose={handleClose}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Unable to Load Questions</h3>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadPracticeQuestions}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </PracticeModal>
    );
  }

  // Show results screen (Story 3.3: AC-3.3.4 - Completion summary)
  if (showResults) {
    // Show completion summary with full metrics if available
    if (practiceResult) {
      return (
        <PracticeModal isOpen={isOpen} onClose={handleClose}>
          <PracticeCompletionSummary
            practiceResult={practiceResult}
            onReviewAnswers={() => {
              // TODO: Implement answer review in future story
              console.log('Review answers feature coming soon');
            }}
            onStartNewPractice={handleRestart}
          />
        </PracticeModal>
      );
    }

    // Fallback to basic results if completePractice failed
    return (
      <PracticeModal isOpen={isOpen} onClose={handleClose}>
        <PracticeResults
          results={results}
          totalQuestions={questions.length}
          onRestart={handleRestart}
          onClose={handleClose}
        />
      </PracticeModal>
    );
  }

  // Don't render if no questions loaded yet
  if (questions.length === 0) {
    return null;
  }

  // Calculate current accuracy
  const answeredCount = currentQuestionIndex + (submitted ? 1 : 0);
  const accuracy = answeredCount > 0 ? (correctCount / answeredCount) * 100 : 0;

  // Show practice questions with metadata (Story 3.1: AC-3.1.4)
  // Story 3.2: AC-3.2.6 - Performance Display
  return (
    <PracticeModal isOpen={isOpen} onClose={handleClose}>
      {/* Subject display */}
      {sessionSubject && (
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Practicing: {sessionSubject}
          </h2>
          {currentQuestion.sessionReference && (
            <p className="text-sm text-gray-500 mt-1">{currentQuestion.sessionReference}</p>
          )}
        </div>
      )}

      {/* Story 3.2: AC-3.2.6 - Performance Display */}
      <PerformanceDisplay
        correctCount={correctCount}
        totalQuestions={questions.length}
        currentDifficulty={currentDifficulty}
        accuracy={accuracy}
      />

      <ProgressIndicator current={currentQuestionIndex + 1} total={questions.length} />

      {/* Topic display (Story 3.1: AC-3.1.4) */}
      {currentQuestion.topic && (
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium">Topic:</span> {currentQuestion.topic}
        </div>
      )}

      <QuestionCard
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        questionText={currentQuestion.text}
      />

      <AnswerOptions
        options={currentQuestion.options}
        selectedIndex={selectedAnswer}
        onSelect={setSelectedAnswer}
        submitted={submitted}
        correctIndex={currentQuestion.correctAnswer}
      />

      {submitted && <FeedbackDisplay isCorrect={isCorrect} explanation={currentQuestion.explanation} />}

      <SubmitButton
        disabled={selectedAnswer === null && !submitted}
        submitted={submitted}
        isLastQuestion={isLastQuestion}
        onSubmit={handleSubmit}
        onNext={handleNext}
      />

      {/* Story 3.2: AC-3.2.5, AC-3.2.6 - Difficulty Change Notification */}
      {difficultyChange && (
        <DifficultyChangeNotification
          previousDifficulty={difficultyChange.previous}
          newDifficulty={difficultyChange.new}
          onDismiss={() => setDifficultyChange(null)}
        />
      )}
    </PracticeModal>
  );
}

/**
 * Mock practice questions for testing
 */
const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What is the quadratic formula?',
    options: [
      'x = (-b ± √(b² - 4ac)) / 2a',
      'x = b² - 4ac',
      'x = (a + b) / c',
      'x = √(b² + 4ac) / 2a',
    ],
    correctAnswer: 0,
    explanation:
      'The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a, which solves equations of the form ax² + bx + c = 0.',
  },
  {
    id: 'q2',
    text: 'Which of the following is NOT a programming paradigm?',
    options: ['Object-Oriented', 'Functional', 'Procedural', 'Sequential'],
    correctAnswer: 3,
    explanation:
      'Sequential is not a programming paradigm. The main paradigms are Object-Oriented, Functional, Procedural, Logic, and Event-Driven.',
  },
  {
    id: 'q3',
    text: 'What does HTTP stand for?',
    options: [
      'HyperText Transfer Protocol',
      'High Transfer Text Protocol',
      'HyperText Transmission Process',
      'High-Level Transfer Protocol',
    ],
    correctAnswer: 0,
    explanation:
      'HTTP stands for HyperText Transfer Protocol, the foundation of data communication for the World Wide Web.',
  },
  {
    id: 'q4',
    text: 'In React, what hook is used for managing component state?',
    options: ['useEffect', 'useState', 'useContext', 'useReducer'],
    correctAnswer: 1,
    explanation:
      'useState is the primary hook for managing local component state in React functional components.',
  },
  {
    id: 'q5',
    text: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctAnswer: 1,
    explanation:
      'Binary search has O(log n) time complexity because it halves the search space with each iteration.',
  },
];
