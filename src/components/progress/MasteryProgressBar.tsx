/**
 * MasteryProgressBar Component
 * Story 3.6: AC-3.6.1, 3.6.2, 3.6.4, 3.6.5
 * Progress bar with color coding and delta indicators for mastery levels
 */

import { cn } from '@/lib/utils';

interface MasteryProgressBarProps {
  subject: string;
  mastery: number; // 0.0 to 1.0
  masteryDelta?: number;
  showDelta?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MasteryProgressBar({
  subject,
  mastery,
  masteryDelta,
  showDelta = false,
  size = 'md',
}: MasteryProgressBarProps) {
  const percentage = Math.round(mastery * 100);
  const deltaPercentage = masteryDelta ? Math.round(masteryDelta * 100) : 0;

  // Color coding based on mastery level
  const getMasteryColor = (): string => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMasteryTextColor = (): string => {
    if (percentage >= 70) return 'text-green-700';
    if (percentage >= 40) return 'text-yellow-700';
    return 'text-red-700';
  };

  // Size variants
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{subject}</span>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', getMasteryTextColor())}>
            {percentage}%
          </span>
          {showDelta && masteryDelta !== undefined && deltaPercentage !== 0 && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded',
                deltaPercentage > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              )}
              aria-label={`Mastery change: ${deltaPercentage > 0 ? '+' : ''}${deltaPercentage}%`}
            >
              {deltaPercentage > 0 ? '+' : ''}{deltaPercentage}%
            </span>
          )}
        </div>
      </div>
      <div
        className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${subject} mastery progress: ${percentage}%`}
      >
        <div
          className={cn(getMasteryColor(), 'h-full transition-all duration-300 ease-in-out')}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
