import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Trophy } from 'lucide-react';

interface PracticeResultsProps {
  results: boolean[];
  totalQuestions: number;
  onRestart: () => void;
  onClose: () => void;
}

/**
 * Display practice session results summary
 * - Shows score and percentage
 * - Lists correct/incorrect answers
 * - Options to restart or close
 */
export function PracticeResults({ results, totalQuestions, onRestart, onClose }: PracticeResultsProps) {
  const correctCount = results.filter((r) => r).length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = percentage >= 70;

  return (
    <div className="space-y-6">
      {/* Header with trophy icon */}
      <div className="text-center space-y-3">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
            passed ? 'bg-green-100' : 'bg-orange-100'
          }`}
        >
          <Trophy className={`w-8 h-8 ${passed ? 'text-green-600' : 'text-orange-600'}`} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Practice Complete!</h2>
      </div>

      {/* Score Card */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="text-center text-xl">Your Score</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <div className="text-5xl font-bold text-purple-600">
            {correctCount}/{totalQuestions}
          </div>
          <div className="text-xl text-gray-600">{percentage}%</div>
          {passed ? (
            <p className="text-green-600 font-medium">Great job! Keep it up!</p>
          ) : (
            <p className="text-orange-600 font-medium">Good effort! Practice makes perfect!</p>
          )}
        </CardContent>
      </Card>

      {/* Results Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.map((isCorrect, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-700">Question {index + 1}</span>
                <span
                  className={`ml-auto text-sm font-medium ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onRestart} variant="default" className="flex-1 min-h-[44px]">
          Practice Again
        </Button>
        <Button onClick={onClose} variant="outline" className="flex-1 min-h-[44px]">
          Close
        </Button>
      </div>
    </div>
  );
}
