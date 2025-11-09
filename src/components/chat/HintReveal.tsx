/**
 * HintReveal Component
 * Story 3.4: AC-3.4.8
 * Progressive disclosure UI for three-tier hints
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lightbulb, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HintRevealProps {
  hints: string[];
  currentLevel: number;
  onRevealNext: () => void;
  maxLevel?: number;
}

export function HintReveal({
  hints,
  currentLevel,
  onRevealNext,
  maxLevel = 3
}: HintRevealProps) {
  const hasMoreHints = currentLevel < maxLevel;
  const allHintsRevealed = currentLevel >= maxLevel;

  return (
    <div className="flex mb-4 justify-start">
      <div className="max-w-[80%] space-y-2">
        {/* Display all revealed hints */}
        {hints.slice(0, currentLevel).map((hint, index) => (
          <Card
            key={index}
            className={cn(
              'px-4 py-3 border-blue-200 bg-blue-50 animate-in slide-in-from-top-1 fade-in duration-300',
              index === currentLevel - 1 && 'shadow-md' // Highlight most recent hint
            )}
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <Badge variant="secondary" className="mb-2 text-xs bg-blue-100 text-blue-700">
                  Hint {index + 1} of {maxLevel}
                  {index === maxLevel - 1 && ' (Final)'}
                </Badge>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {hint}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {/* Show next hint button or completion message */}
        <div className="flex justify-center mt-2">
          {hasMoreHints ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevealNext}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              Show next hint
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : allHintsRevealed ? (
            <p className="text-sm text-blue-700 italic">
              Ready to try again?
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
