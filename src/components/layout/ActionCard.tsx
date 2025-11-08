/**
 * Action Card - Interactive card for feature navigation
 * Story 1.4: Card Gallery Home Interface
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ActionCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

/**
 * ActionCard provides an interactive card for navigating to features
 * Features:
 * - Subtle borders (#E5E7EB) and light backgrounds (#F9FAFB)
 * - Comfortable padding (1.5rem / 24px)
 * - Hover state: purple border (#8B5CF6), subtle shadow
 * - Active state: lightened background, prominent border
 * - Keyboard accessible (Enter/Space key support)
 * - Touch targets meet 44x44px minimum
 * - WCAG 2.1 AA compliant
 */
export function ActionCard({
  icon,
  title,
  description,
  onClick,
  href,
  className
}: ActionCardProps) {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Keyboard accessibility: Enter or Space key
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const cardClasses = cn(
    // Base styles
    'rounded-lg border border-gray-200 bg-surface p-6',
    'cursor-pointer',
    'transition-all duration-200 ease-in-out',
    // Hover state
    'hover:border-primary hover:shadow-md',
    // Active/pressed state
    'active:bg-gray-100 active:border-primary-dark',
    // Focus state (keyboard navigation)
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    // Touch target minimum
    'min-h-[44px]',
    className
  );

  const commonProps = {
    className: cardClasses,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    role: (onClick || href ? 'button' : undefined) as 'button' | undefined,
    tabIndex: onClick || href ? 0 : undefined,
    'aria-label': `${title}: ${description}`,
  };

  const cardContent = (
    <div className="flex flex-col items-center text-center space-y-3">
      {/* Icon */}
      {icon && (
        <div 
          className="text-4xl" 
          role="img" 
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-sm text-foreground-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );

  // Split render paths to avoid TypeScript error with href on div
  if (href) {
    return (
      <a {...commonProps} href={href}>
        {cardContent}
      </a>
    );
  }

  return (
    <div {...commonProps}>
      {cardContent}
    </div>
  );
}

