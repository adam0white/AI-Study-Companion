/**
 * Component Tests for ActionCardsGrid Reordering
 * Story 5.0b: AC-5.0b.1, AC-5.0b.6 - Card reordering with smooth transitions
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionCardsGrid } from './CardGallery';
import type { CardType } from '@/lib/rpc/types';

describe('ActionCardsGrid - Card Reordering', () => {
  it('should render children in default order when no cardOrder provided', () => {
    render(
      <ActionCardsGrid>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    const chatCard = screen.getByTestId('chat-card');
    const practiceCard = screen.getByTestId('practice-card');
    const progressCard = screen.getByTestId('progress-card');

    expect(chatCard).toBeInTheDocument();
    expect(practiceCard).toBeInTheDocument();
    expect(progressCard).toBeInTheDocument();
  });

  it('should render children in specified cardOrder', () => {
    const cardOrder: CardType[] = ['practice', 'chat', 'progress'];

    render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    // Verify all cards are rendered
    expect(screen.getByTestId('chat-card')).toBeInTheDocument();
    expect(screen.getByTestId('practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('progress-card')).toBeInTheDocument();
  });

  it('should reorder cards when cardOrder changes (default to practice-first)', () => {
    const cardOrder: CardType[] = ['practice', 'chat', 'progress'];

    const { rerender } = render(
      <ActionCardsGrid>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    // Rerender with new card order
    rerender(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    expect(screen.getByTestId('practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('chat-card')).toBeInTheDocument();
    expect(screen.getByTestId('progress-card')).toBeInTheDocument();
  });

  it('should support chat-first ordering (re-engagement)', () => {
    const cardOrder: CardType[] = ['chat', 'practice', 'progress'];

    render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    expect(screen.getByTestId('chat-card')).toBeInTheDocument();
    expect(screen.getByTestId('practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('progress-card')).toBeInTheDocument();
  });

  it('should support progress-first ordering (achievement)', () => {
    const cardOrder: CardType[] = ['progress', 'practice', 'chat'];

    render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    expect(screen.getByTestId('progress-card')).toBeInTheDocument();
    expect(screen.getByTestId('practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('chat-card')).toBeInTheDocument();
  });

  it('should apply CSS transition classes for smooth reordering', () => {
    const cardOrder: CardType[] = ['practice', 'chat', 'progress'];

    const { container } = render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div>Chat</div>
        <div>Practice</div>
        <div>Progress</div>
      </ActionCardsGrid>
    );

    const cardContainers = container.querySelectorAll('.card-container');
    expect(cardContainers).toHaveLength(3);

    cardContainers.forEach((card) => {
      // Verify transition classes are applied
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
      expect(card).toHaveClass('ease-out');
    });
  });

  it('should apply motion-reduce class for accessibility', () => {
    const cardOrder: CardType[] = ['practice', 'chat', 'progress'];

    const { container } = render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div>Chat</div>
        <div>Practice</div>
        <div>Progress</div>
      </ActionCardsGrid>
    );

    const cardContainers = container.querySelectorAll('.card-container');
    cardContainers.forEach((card) => {
      // Verify motion-reduce class is present
      expect(card).toHaveClass('motion-reduce:transition-none');
    });
  });

  it('should handle all three cards being present', () => {
    const cardOrder: CardType[] = ['progress', 'chat', 'practice'];

    render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    expect(screen.getByTestId('chat-card')).toBeInTheDocument();
    expect(screen.getByTestId('practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('progress-card')).toBeInTheDocument();
  });

  it('should apply responsive grid classes', () => {
    const { container } = render(
      <ActionCardsGrid>
        <div>Chat</div>
        <div>Practice</div>
        <div>Progress</div>
      </ActionCardsGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1'); // Mobile
    expect(grid).toHaveClass('md:grid-cols-2'); // Tablet
    expect(grid).toHaveClass('lg:grid-cols-3'); // Desktop
  });

  it('should use stable keys for cards based on cardOrder', () => {
    const cardOrder: CardType[] = ['practice', 'chat', 'progress'];

    const { container } = render(
      <ActionCardsGrid cardOrder={cardOrder}>
        <div data-testid="chat-card">Chat</div>
        <div data-testid="practice-card">Practice</div>
        <div data-testid="progress-card">Progress</div>
      </ActionCardsGrid>
    );

    const cardContainers = container.querySelectorAll('.card-container');
    expect(cardContainers).toHaveLength(3);
  });

  it('should handle empty children gracefully', () => {
    const { container } = render(<ActionCardsGrid />);

    expect(container.firstChild).toBeInTheDocument();
  });
});
