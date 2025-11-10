import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnswerOptionsProps {
  options: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  submitted: boolean;
  correctIndex: number;
}

/**
 * Display and manage answer option selection with visual feedback
 * - 4 options (A, B, C, D) as individual clickable buttons
 * - Minimum 44x44px touch targets
 * - Visual states: unselected (gray), selected (purple), correct (green), incorrect (red)
 * - Icons for feedback: checkmark (correct), X (incorrect)
 */
export function AnswerOptions({
  options,
  selectedIndex,
  onSelect,
  submitted,
  correctIndex,
}: AnswerOptionsProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isCorrect = index === correctIndex;
        const isIncorrect = submitted && isSelected && !isCorrect;
        const showCorrect = submitted && isCorrect;

        return (
          <button
            key={index}
            onClick={() => !submitted && onSelect(index)}
            disabled={submitted}
            className={cn(
              // Base styles with minimum touch target
              'w-full min-h-[44px] p-4 rounded-lg border-2 text-left',
              'transition-all duration-200',
              'flex items-center justify-between gap-3',
              // Default state
              !submitted &&
                !isSelected &&
                'border-gray-200 bg-gray-50 hover:border-primary hover:shadow-md hover:bg-white',
              // Selected state (before submission)
              !submitted && isSelected && 'border-primary bg-purple-50 shadow-md',
              // Correct answer state
              showCorrect && 'border-green-500 bg-green-50 shadow-md',
              // Incorrect answer state
              isIncorrect && 'border-red-500 bg-red-50 shadow-md',
              // Disabled cursor
              submitted && 'cursor-not-allowed'
            )}
            aria-label={`Option ${String.fromCharCode(65 + index)}`}
          >
            <span className="text-base font-medium flex-1">
              <span className="text-gray-500 mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
            </span>
            {showCorrect && (
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
            )}
            {isIncorrect && (
              <X className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
