/**
 * Hero Card - Greeting card with gradient background
 * Story 1.4: Card Gallery Home Interface
 * Story 5.0: Dynamic Hero Card & Proactive Greetings
 */

import { cn } from '@/lib/utils';
import type { StudentStateType } from '@/lib/rpc/types';

export interface HeroCardProps {
  greeting?: string;
  state?: StudentStateType;
  primaryCTA?: {
    label: string;
    onClick: () => void;
  };
  secondaryCTA?: {
    label: string;
    onClick: () => void;
  };
  emoticon?: string;
  gradientColors?: [string, string];
  className?: string;
}

/**
 * HeroCard displays a prominent greeting with gradient background
 * Features:
 * - Dynamic gradient background based on state
 * - Multiple state variants (celebration, re_engagement, achievement, first_session, default)
 * - Full-width on all breakpoints
 * - Comfortable padding (1.5rem / 24px)
 * - WCAG AA compliant text contrast
 * - Context-aware CTAs
 *
 * Story 5.0: AC-5.0.2, AC-5.0.4, AC-5.0.6
 */
export function HeroCard({
  greeting = "Welcome back!",
  state = 'default',
  primaryCTA,
  secondaryCTA,
  emoticon,
  gradientColors,
  className
}: HeroCardProps) {
  // Determine background styling based on state
  const backgroundClass = getBackgroundClass(state, gradientColors);

  return (
    <div
      className={cn(
        'w-full rounded-lg p-6',
        backgroundClass,
        'text-white',
        'mb-8',
        className
      )}
      style={gradientColors ? {
        backgroundImage: `linear-gradient(to right, ${gradientColors[0]}, ${gradientColors[1]})`
      } : undefined}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold mb-2 flex items-center gap-2">
          {emoticon && <span className="text-3xl" role="img" aria-label="state-icon">{emoticon}</span>}
          <span>{greeting}</span>
        </h2>

        {(primaryCTA || secondaryCTA) && (
          <div className="flex flex-wrap gap-4 mt-6">
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

/**
 * Get background class based on state
 * Story 5.0: AC-5.0.4 - Gradient backgrounds for special celebration moments
 */
function getBackgroundClass(state: StudentStateType, gradientColors?: [string, string]): string {
  // If custom gradient colors provided, don't add default classes
  if (gradientColors) {
    return '';
  }

  // Default solid background for default and first_session states
  switch (state) {
    case 'default':
    case 'first_session':
      return 'bg-gradient-to-r from-primary to-accent'; // Default purple-pink gradient
    case 'celebration':
    case 'achievement':
      return 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]'; // Purple to pink
    case 're_engagement':
      return 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]'; // Purple to cyan
    default:
      return 'bg-gradient-to-r from-primary to-accent';
  }
}

