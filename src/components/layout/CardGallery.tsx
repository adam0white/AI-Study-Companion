/**
 * Card Gallery - Main card-based layout component
 * Story 1.4: Card Gallery Home Interface
 * Story 5.0b: Dynamic Card Ordering Intelligence
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CardType } from '@/lib/rpc/types';

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
  cardOrder?: CardType[];
}

/**
 * ActionCardsGrid provides responsive grid for action cards
 * Story 5.0b: AC-5.0b.6 - Smooth card reordering with CSS transitions
 *
 * Uses Tailwind breakpoints for responsive behavior
 * Supports dynamic card ordering with smooth transitions
 */
export function ActionCardsGrid({ className, children, cardOrder }: ActionCardsGridProps) {
  // Convert children to array for reordering
  const childArray = useMemo(() => {
    return Array.isArray(children) ? children : [children];
  }, [children]);

  // Map card types to child indices (based on original order)
  // Original order: Chat (0), Practice (1), Progress (2)
  const cardTypeToIndex: Record<CardType, number> = {
    chat: 0,
    practice: 1,
    progress: 2,
  };

  // Reorder children based on cardOrder prop
  const orderedChildren = useMemo(() => {
    if (!cardOrder || cardOrder.length !== 3) {
      return childArray;
    }

    // Map card types to their corresponding children
    return cardOrder.map((cardType) => {
      const index = cardTypeToIndex[cardType];
      return childArray[index];
    });
  }, [cardOrder, childArray]);

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
      {orderedChildren.map((child, index) => (
        <div
          key={cardOrder ? cardOrder[index] : index}
          className={cn(
            'card-container',
            // Story 5.0b: AC-5.0b.6 - Smooth CSS transitions
            'transition-all duration-300 ease-out',
            // Respect prefers-reduced-motion for accessibility
            'motion-reduce:transition-none'
          )}
          style={{
            // Use grid order for smooth repositioning
            order: index,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

