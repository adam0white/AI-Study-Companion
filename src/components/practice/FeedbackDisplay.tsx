import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackDisplayProps {
  isCorrect: boolean;
  explanation: string;
}

/**
 * Display answer feedback with explanation
 * - Green theme for correct answers (#10B981)
 * - Red theme for incorrect answers (#EF4444)
 * - Shows "Correct!" or "Incorrect" heading with icon
 * - Displays explanation text
 * - Fade-in animation
 */
export function FeedbackDisplay({ isCorrect, explanation }: FeedbackDisplayProps) {
  return (
    <Card
      className={cn(
        'border-2 animate-in fade-in duration-300',
        isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle
          className={cn(
            'flex items-center gap-2 text-lg',
            isCorrect ? 'text-green-700' : 'text-red-700'
          )}
        >
          {isCorrect ? (
            <>
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              Correct!
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" aria-hidden="true" />
              Incorrect
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-900 leading-relaxed">{explanation}</p>
      </CardContent>
    </Card>
  );
}
