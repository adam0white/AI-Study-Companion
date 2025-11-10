import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
}

/**
 * Displays the current practice question with progress indicator
 * - Prominent question text with proper contrast
 * - Progress indicator: "Question X of Y"
 * - Modern & Playful theme colors (purple/pink palette)
 */
export function QuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
}: QuestionCardProps) {
  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <div className="text-sm font-medium text-purple-600">
          Question {questionNumber} of {totalQuestions}
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 leading-relaxed">
          {questionText}
        </h2>
      </CardContent>
    </Card>
  );
}
