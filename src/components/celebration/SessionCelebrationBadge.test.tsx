/**
 * Session Celebration Badge Component Tests
 * Story 5.1: AC-5.1.4, AC-5.1.5 - Badge component tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionCelebrationBadge } from './SessionCelebrationBadge';
import type { AchievementBadge } from '../../lib/types/celebration';

describe('SessionCelebrationBadge Component', () => {
  const mockBadge: AchievementBadge = {
    id: 'accuracy_90',
    type: 'accuracy',
    title: '90% Accuracy',
    description: 'Achieved 90%+ accuracy on quiz',
    icon: '🎯',
    color: 'text-purple-500',
    unlockedAt: new Date().toISOString(),
  };

  it('should render badge title', () => {
    render(<SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />);

    expect(screen.getByText('90% Accuracy')).toBeInTheDocument();
  });

  it('should render badge icon', () => {
    render(<SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />);

    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should show tooltip on hover', async () => {
    render(<SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />);

    const badgeElement = screen.getByText('90% Accuracy').closest('div');
    if (badgeElement && badgeElement.parentElement) {
      fireEvent.mouseEnter(badgeElement.parentElement);

      await waitFor(() => {
        expect(screen.getByText('Achieved 90%+ accuracy on quiz')).toBeInTheDocument();
      });
    }
  });

  it('should hide tooltip on mouse leave', async () => {
    render(<SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />);

    const badgeElement = screen.getByText('90% Accuracy').closest('div');
    if (badgeElement && badgeElement.parentElement) {
      fireEvent.mouseEnter(badgeElement.parentElement);
      fireEvent.mouseLeave(badgeElement.parentElement);

      await waitFor(() => {
        expect(screen.queryByText('Achieved 90%+ accuracy on quiz')).not.toBeInTheDocument();
      });
    }
  });

  it('should apply custom color class', () => {
    const { container } = render(
      <SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />
    );

    const colorElement = container.querySelector('.text-purple-500');
    expect(colorElement).toBeInTheDocument();
  });

  it('should be visible immediately with reduceMotion', () => {
    const { container } = render(
      <SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />
    );

    const badgeElement = container.querySelector('.opacity-100');
    expect(badgeElement).toBeInTheDocument();
  });

  it('should render streak badge correctly', () => {
    const streakBadge: AchievementBadge = {
      id: 'streak_7',
      type: 'streak',
      title: '7-Day Streak',
      description: '7 consecutive days of learning',
      icon: '🔥',
      color: 'text-red-500',
      unlockedAt: new Date().toISOString(),
    };

    render(<SessionCelebrationBadge badge={streakBadge} reduceMotion={true} />);

    expect(screen.getByText('7-Day Streak')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('should render mastery badge correctly', () => {
    const masteryBadge: AchievementBadge = {
      id: 'mastery_algebra',
      type: 'mastery',
      title: 'Algebra Master',
      description: '80%+ mastery in Algebra over 5+ sessions',
      icon: '🎓',
      color: 'text-indigo-600',
      unlockedAt: new Date().toISOString(),
    };

    render(<SessionCelebrationBadge badge={masteryBadge} reduceMotion={true} />);

    expect(screen.getByText('Algebra Master')).toBeInTheDocument();
    expect(screen.getByText('🎓')).toBeInTheDocument();
  });

  it('should have hover effect classes', () => {
    const { container } = render(
      <SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />
    );

    const badgeElement = container.querySelector('.hover\\:scale-105');
    expect(badgeElement).toBeInTheDocument();
  });

  it('should be clickable', () => {
    const { container } = render(
      <SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />
    );

    const badgeElement = container.querySelector('.cursor-pointer');
    expect(badgeElement).toBeInTheDocument();
  });

  it('should have minimum dimensions', () => {
    const { container } = render(
      <SessionCelebrationBadge badge={mockBadge} reduceMotion={true} />
    );

    // Check that the badge has inline styles
    const badgeElement = container.querySelector('[style]');
    expect(badgeElement).toBeInTheDocument();
  });
});
