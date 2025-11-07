/**
 * Hero Card - Greeting card with gradient background
 * Story 1.4: Card Gallery Home Interface
 */

import { cn } from '@/lib/utils';

export interface HeroCardProps {
  greeting?: string;
  primaryCTA?: {
    label: string;
    onClick: () => void;
  };
  secondaryCTA?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * HeroCard displays a prominent greeting with gradient background
 * Features:
 * - Purple to pink gradient background (#8B5CF6 to #EC4899)
 * - Full-width on all breakpoints
 * - Comfortable padding (1.5rem / 24px)
 * - WCAG AA compliant text contrast
 */
export function HeroCard({ 
  greeting = "Welcome back!", 
  primaryCTA,
  secondaryCTA,
  className 
}: HeroCardProps) {
  return (
    <div 
      className={cn(
        'w-full rounded-lg p-6',
        'bg-gradient-to-r from-primary to-accent',
        'text-white',
        'mb-8',
        className
      )}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold mb-4">
          {greeting}
        </h2>
        <p className="text-lg opacity-90 mb-6">
          Your personalized AI study companion is ready to help you learn and grow.
        </p>
        
        {(primaryCTA || secondaryCTA) && (
          <div className="flex flex-wrap gap-4">
            {primaryCTA && (
              <button
                onClick={primaryCTA.onClick}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium',
                  'bg-white text-primary',
                  'hover:bg-gray-50',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary',
                  'min-h-[44px] min-w-[44px]' // Touch target minimum
                )}
                aria-label={primaryCTA.label}
              >
                {primaryCTA.label}
              </button>
            )}
            {secondaryCTA && (
              <button
                onClick={secondaryCTA.onClick}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium',
                  'bg-transparent border-2 border-white text-white',
                  'hover:bg-white hover:bg-opacity-10',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary',
                  'min-h-[44px] min-w-[44px]' // Touch target minimum
                )}
                aria-label={secondaryCTA.label}
              >
                {secondaryCTA.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

