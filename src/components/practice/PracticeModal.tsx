import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Responsive modal container for practice sessions
 * - Desktop (>640px): Centered modal with max-width 768px
 * - Mobile (<640px): Full-screen interface
 */
export function PracticeModal({ isOpen, onClose, children }: PracticeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          // Desktop: centered modal with max-width
          'max-w-3xl',
          // Mobile: full-screen
          'sm:w-screen sm:h-screen sm:max-w-full sm:m-0 sm:rounded-none',
          // Common styles
          'p-6 space-y-6 overflow-y-auto'
        )}
        // Prevent closing during active practice by clicking backdrop
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Practice Questions</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
