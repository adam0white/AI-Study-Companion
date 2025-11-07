/**
 * Card Gallery - Main card-based layout component
 * Story 1.4: Card Gallery Home Interface
 */

import { cn } from '@/lib/utils';

export interface CardGalleryProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * CardGallery provides a responsive card-based layout
 * - Mobile (< 640px): Single column, stacked cards
 * - Tablet (640px - 1024px): 2-column grid for action cards
 * - Desktop (> 1024px): 3-column grid for action cards
 * 
 * Hero card always spans full width on all breakpoints
 */
export function CardGallery({ className, children }: CardGalleryProps) {
  return (
    <div className={cn('w-full', className)}>
      {children}
    </div>
  );
}

export interface ActionCardsGridProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * ActionCardsGrid provides responsive grid for action cards
 * Uses Tailwind breakpoints for responsive behavior
 */
export function ActionCardsGrid({ className, children }: ActionCardsGridProps) {
  return (
    <div 
      className={cn(
        'grid gap-4',
        'grid-cols-1',         // Mobile: 1 column
        'md:grid-cols-2',      // Tablet: 2 columns
        'lg:grid-cols-3',      // Desktop: 3 columns
        className
      )}
    >
      {children}
    </div>
  );
}

