/**
 * SocraticMessageBubble Component
 * Story 3.4: AC-3.4.1, AC-3.4.8
 * Displays Socratic questions with distinct styling and hint button
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, HelpCircle } from 'lucide-react';

export interface SocraticMessageBubbleProps {
  content: string;
  timestamp?: string;
  onRequestHint?: () => void;
  showHintButton?: boolean;
}

export function SocraticMessageBubble({
  content,
  timestamp,
  onRequestHint,
  showHintButton = true
}: SocraticMessageBubbleProps) {
  return (
    <div className="flex mb-4 justify-start animate-in fade-in duration-300">
      <div className="max-w-[80%] rounded-2xl px-4 py-3 shadow-md bg-purple-50 text-gray-900 rounded-bl-sm border border-purple-200">
        {/* Socratic badge indicator */}
        <Badge variant="secondary" className="mb-2 text-xs bg-purple-100 text-purple-700 border-purple-300">
          <HelpCircle className="h-3 w-3 mr-1" />
          Socratic Question
        </Badge>

        {/* Question content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>

        {/* Timestamp */}
        {timestamp && (
          <p className="text-xs mt-1 text-gray-500">
            {timestamp}
          </p>
        )}

        {/* Hint button */}
        {showHintButton && onRequestHint && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestHint}
              className="text-purple-700 border-purple-300 hover:bg-purple-100"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Need a hint?
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
