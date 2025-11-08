/**
 * Progress Card Component
 * Story 1.9: Progress Card Component
 *
 * Displays student progress metrics including:
 * - Session count
 * - Recent topics studied
 * - Last session date
 * - Days active
 * - Total minutes studied (optional)
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Calendar, BookOpen, Clock } from 'lucide-react';

export interface ProgressCardProps {
  sessionCount: number;
  recentTopics: string[];
  lastSessionDate: string; // ISO 8601 format
  daysActive: number;
  totalMinutesStudied?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * ProgressCard displays learning progress metrics
 * Features:
 * - Gradient background (purple theme matching Hero card)
 * - Session count and recent topics
 * - Last session date and days active
 * - Responsive layout (mobile/tablet/desktop)
 * - Keyboard accessible
 * - WCAG 2.1 AA compliant
 */
export function ProgressCard({
  sessionCount,
  recentTopics,
  lastSessionDate,
  daysActive,
  totalMinutesStudied,
  onClick,
  className
}: ProgressCardProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard accessibility: Enter or Space key
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  // Format last session date
  const formatLastSession = (isoDate: string): string => {
    if (!isoDate) return 'No sessions yet';

    const date = new Date(isoDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format minutes to hours/minutes
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const cardClasses = cn(
    // Base styles
    'rounded-lg p-6',
    'bg-gradient-to-br from-primary/90 to-accent/90',
    'text-white',
    'transition-all duration-200 ease-in-out',
    // Clickable states
    onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
    onClick && 'active:scale-[0.98]',
    // Focus state (keyboard navigation)
    onClick && 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    // Touch target minimum
    'min-h-[44px]',
    className
  );

  const hasData = sessionCount > 0;

  return (
    <div
      className={cardClasses}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Your Progress: View learning statistics and session history"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" aria-hidden="true" />
          Your Progress
        </h3>
      </div>

      {/* Zero State */}
      {!hasData && (
        <div className="py-8 text-center">
          <p className="text-lg opacity-90 mb-2">No sessions yet</p>
          <p className="text-sm opacity-75">
            Start your first session to track your progress!
          </p>
        </div>
      )}

      {/* Progress Metrics */}
      {hasData && (
        <div className="space-y-4">
          {/* Session Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 opacity-90">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Sessions</span>
            </div>
            <div className="text-2xl font-bold" aria-label={`${sessionCount} sessions completed`}>
              {sessionCount}
            </div>
          </div>

          {/* Days Active */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 opacity-90">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Days Active</span>
            </div>
            <div className="text-2xl font-bold" aria-label={`${daysActive} days active`}>
              {daysActive}
            </div>
          </div>

          {/* Total Time Studied (optional) */}
          {totalMinutesStudied !== undefined && totalMinutesStudied > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 opacity-90">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">Time Studied</span>
              </div>
              <div className="text-2xl font-bold" aria-label={`${formatDuration(totalMinutesStudied)} studied`}>
                {formatDuration(totalMinutesStudied)}
              </div>
            </div>
          )}

          {/* Recent Topics */}
          {recentTopics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm opacity-90 mb-2">Recent Topics</p>
              <div className="flex flex-wrap gap-2">
                {recentTopics.slice(0, 6).map((topic, index) => (
                  <span
                    key={`${topic}-${index}`}
                    className="px-3 py-1 rounded-full bg-white/20 text-xs font-medium"
                    aria-label={`Topic: ${topic}`}
                  >
                    {topic}
                  </span>
                ))}
                {recentTopics.length > 6 && (
                  <span
                    className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium opacity-75"
                    aria-label={`And ${recentTopics.length - 6} more topics`}
                  >
                    +{recentTopics.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Last Session */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm opacity-75" aria-label={`Last session: ${formatLastSession(lastSessionDate)}`}>
              Last session: {formatLastSession(lastSessionDate)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
