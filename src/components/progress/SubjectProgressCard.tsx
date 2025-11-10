/**
 * SubjectProgressCard Component
 * Story 3.6: AC-3.6.1, 3.6.2, 3.6.4, 3.6.5, 3.6.7
 * Displays detailed progress for a single subject with drill-down capability
 */

import { useState } from 'react';
import type { SubjectProgress } from '../../lib/rpc/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MasteryProgressBar } from './MasteryProgressBar';

interface SubjectProgressCardProps {
  subjectProgress: SubjectProgress;
  onDetailClick?: () => void;
}

export function SubjectProgressCard({ subjectProgress, onDetailClick }: SubjectProgressCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const {
    subject,
    mastery,
    practiceCount,
    completionRate,
    avgAccuracy,
    lastPracticed,
    masteryDelta,
    struggles,
    strengths,
  } = subjectProgress;

  // Format relative time
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow"
      aria-label={`Progress card for ${subject}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{subject}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Last practiced: {formatRelativeTime(lastPracticed)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mastery Progress Bar */}
        <MasteryProgressBar
          subject="Mastery"
          mastery={mastery}
          masteryDelta={masteryDelta}
          showDelta={true}
          size="md"
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{practiceCount}</div>
            <div className="text-xs text-gray-600 mt-1">Practice Sessions</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{Math.round(completionRate)}%</div>
            <div className="text-xs text-gray-600 mt-1">Completion Rate</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{Math.round(avgAccuracy)}%</div>
            <div className="text-xs text-gray-600 mt-1">Avg Accuracy</div>
          </div>
        </div>

        {/* Struggles and Strengths */}
        {(struggles.length > 0 || strengths.length > 0) && (
          <div className="space-y-3">
            {strengths.length > 0 && (
              <Collapsible open={showDetails || strengths.length <= 3}>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-green-700">Strengths</div>
                  <div className="flex flex-wrap gap-2">
                    {strengths.slice(0, 3).map((strength, idx) => (
                      <Badge key={idx} variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                        {strength}
                      </Badge>
                    ))}
                    {strengths.length > 3 && (
                      <CollapsibleContent>
                        {strengths.slice(3).map((strength, idx) => (
                          <Badge key={idx + 3} variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                            {strength}
                          </Badge>
                        ))}
                      </CollapsibleContent>
                    )}
                  </div>
                  {strengths.length > 3 && (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-purple-600 h-auto p-0"
                      >
                        {showDetails ? `Show Less` : `+${strengths.length - 3} more`}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </Collapsible>
            )}

            {struggles.length > 0 && (
              <Collapsible open={showDetails || struggles.length <= 3}>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-red-700">Struggles</div>
                  <div className="flex flex-wrap gap-2">
                    {struggles.slice(0, 3).map((struggle, idx) => (
                      <Badge key={idx} variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
                        {struggle}
                      </Badge>
                    ))}
                    {struggles.length > 3 && (
                      <CollapsibleContent>
                        {struggles.slice(3).map((struggle, idx) => (
                          <Badge key={idx + 3} variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
                            {struggle}
                          </Badge>
                        ))}
                      </CollapsibleContent>
                    )}
                  </div>
                  {struggles.length > 3 && (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-purple-600 h-auto p-0"
                      >
                        {showDetails ? `Show Less` : `+${struggles.length - 3} more`}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>

      {onDetailClick && (
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={onDetailClick}
          >
            See Details
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
