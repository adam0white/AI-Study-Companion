import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

/**
 * Visual progress tracker for practice session
 * - Text display: "Question X of Y"
 * - Progress bar fills based on completion percentage
 * - Purple gradient theme
 */
export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          Question {current} of {total}
        </span>
        <span className="text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
