/**
 * Performance Display Component
 * Story 3.2: AC-3.2.6 - Real-time performance metrics during practice
 *
 * Displays:
 * - Running score (X/Y correct)
 * - Current difficulty level (1-5 with visual indicator)
 * - Accuracy percentage
 */

export interface PerformanceDisplayProps {
  correctCount: number;
  totalQuestions: number;
  currentDifficulty: number; // 1-5
  accuracy: number; // 0-100
}

export default function PerformanceDisplay({
  correctCount,
  totalQuestions,
  currentDifficulty,
  accuracy,
}: PerformanceDisplayProps) {
  // Generate difficulty stars (★ for filled, ☆ for empty)
  const difficultyStars = Array.from({ length: 5 }, (_, index) => (
    <span
      key={index}
      className={index < currentDifficulty ? 'text-purple-500' : 'text-gray-300'}
      aria-hidden="true"
    >
      {index < currentDifficulty ? '★' : '☆'}
    </span>
  ));

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
      <div className="flex items-center justify-between gap-6">
        {/* Score */}
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-1">Score</div>
          <div className="text-2xl font-bold text-gray-900">
            {correctCount}/{totalQuestions}
          </div>
        </div>

        {/* Accuracy */}
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-1">Accuracy</div>
          <div className={`text-2xl font-bold ${accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
            {Math.round(accuracy)}%
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-1">Difficulty</div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-gray-900 mr-2">
              Level {currentDifficulty}/5
            </span>
            <div className="flex gap-0.5 text-xl" role="img" aria-label={`Difficulty level ${currentDifficulty} out of 5`}>
              {difficultyStars}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
