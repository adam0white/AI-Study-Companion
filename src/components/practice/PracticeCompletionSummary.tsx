import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PracticeResult } from '@/lib/rpc/types';

interface PracticeCompletionSummaryProps {
  practiceResult: PracticeResult;
  onReviewAnswers: () => void;
  onStartNewPractice: () => void;
}

/**
 * Display practice session completion summary
 * Story 3.3: AC-3.3.4
 *
 * Features:
 * - Shows final score with accuracy percentage
 * - Displays duration (minutes and seconds)
 * - Shows subject mastery change with color coding
 * - Options to review answers or start new practice
 * - Color-coded accuracy (green >= 80%, yellow 60-79%, red < 60%)
 */
export function PracticeCompletionSummary({
  practiceResult,
  onReviewAnswers,
  onStartNewPractice,
}: PracticeCompletionSummaryProps) {
  const {
    questionsCorrect,
    questionsTotal,
    accuracy,
    durationSeconds,
    subject,
    subjectMasteryDelta,
    newMasteryLevel,
    averageTimePerQuestion,
  } = practiceResult;

  // Calculate duration in minutes and seconds
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  // Determine accuracy color coding
  const accuracyColor = accuracy >= 80
    ? 'text-green-600'
    : accuracy >= 60
    ? 'text-yellow-600'
    : 'text-red-600';

  const accuracyBg = accuracy >= 80
    ? 'bg-green-100 border-green-200'
    : accuracy >= 60
    ? 'bg-yellow-100 border-yellow-200'
    : 'bg-red-100 border-red-200';

  // Determine mastery change display
  const masteryChangeColor = subjectMasteryDelta > 0
    ? 'text-green-600'
    : subjectMasteryDelta < 0
    ? 'text-red-600'
    : 'text-gray-600';

  const MasteryIcon = subjectMasteryDelta > 0
    ? TrendingUp
    : subjectMasteryDelta < 0
    ? TrendingDown
    : Minus;

  const masteryChangeSign = subjectMasteryDelta > 0 ? '+' : '';
  const masteryPercentage = Math.round(newMasteryLevel * 100);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header with celebration */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100">
          <Trophy className="w-10 h-10 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Practice Complete!</h2>
        <p className="text-lg text-gray-600">{subject}</p>
      </div>

      {/* Score Card */}
      <Card className={`border-2 ${accuracyBg}`}>
        <CardHeader>
          <CardTitle className="text-center text-xl">Your Score</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <div className="text-6xl font-bold text-gray-900">
            {questionsCorrect}/{questionsTotal}
          </div>
          <div className={`text-3xl font-semibold ${accuracyColor}`}>
            {accuracy}% Correct
          </div>
          {accuracy >= 80 && (
            <p className="text-green-600 font-medium text-lg">Excellent work! You're mastering this!</p>
          )}
          {accuracy >= 60 && accuracy < 80 && (
            <p className="text-yellow-600 font-medium text-lg">Good effort! Keep practicing!</p>
          )}
          {accuracy < 60 && (
            <p className="text-red-600 font-medium text-lg">Keep going! Practice makes perfect!</p>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Duration */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-600 mt-1">Time Taken</p>
          </CardContent>
        </Card>

        {/* Average Time per Question */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {averageTimePerQuestion}s
            </div>
            <p className="text-sm text-gray-600 mt-1">Avg per Question</p>
          </CardContent>
        </Card>

        {/* Mastery Change */}
        <Card>
          <CardContent className="pt-6 text-center">
            <MasteryIcon className={`w-8 h-8 ${masteryChangeColor} mx-auto mb-2`} />
            <div className={`text-2xl font-bold ${masteryChangeColor}`}>
              {masteryChangeSign}{(subjectMasteryDelta * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Mastery Change</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Mastery Progress */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="text-center text-lg">{subject} Mastery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-purple-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600">
            Current Level: <span className="font-semibold text-purple-600">{masteryPercentage}%</span>
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={onReviewAnswers}
          variant="outline"
          className="flex-1 min-h-[48px] text-base"
        >
          Review Answers
        </Button>
        <Button
          onClick={onStartNewPractice}
          variant="default"
          className="flex-1 min-h-[48px] text-base bg-purple-600 hover:bg-purple-700"
        >
          Start New Practice
        </Button>
      </div>
    </div>
  );
}
