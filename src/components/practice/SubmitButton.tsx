import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  disabled: boolean;
  submitted: boolean;
  isLastQuestion: boolean;
  onSubmit: () => void;
  onNext: () => void;
}

/**
 * Dynamic action button for practice session
 * - "Submit Answer" (before submission, disabled if no selection)
 * - "Next Question" (after submission, if more questions)
 * - "View Results" (after submission, if last question)
 * - Minimum 44px height for touch targets
 * - Purple primary color theme
 */
export function SubmitButton({
  disabled,
  submitted,
  isLastQuestion,
  onSubmit,
  onNext,
}: SubmitButtonProps) {
  const handleClick = () => {
    if (submitted) {
      onNext();
    } else {
      onSubmit();
    }
  };

  const getButtonText = () => {
    if (!submitted) return 'Submit Answer';
    return isLastQuestion ? 'View Results' : 'Next Question';
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className="w-full min-h-[44px] text-base font-semibold"
      size="lg"
    >
      {getButtonText()}
    </Button>
  );
}
