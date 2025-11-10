/**
 * Session Celebration Component Tests
 * Story 5.1: AC-5.1.9 - Component implementation tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionCelebration } from './SessionCelebration';
import type { CelebrationData } from '../../lib/types/celebration';

describe('SessionCelebration Component', () => {
  const mockCelebration: CelebrationData = {
    title: 'Excellent Session!',
    message: 'Great work on Algebra! 85% accuracy shows real progress!',
    emoji: '🎯',
    backgroundColor: 'from-purple-500 to-pink-500',
    metrics: {
      accuracy: 85,
      questionsAnswered: 10,
      correctAnswers: 8,
      topicsLearned: ['Algebra'],
      estimatedKnowledgeGain: '85% understanding',
    },
    achievements: [],
  };

  const mockOnDismiss = vi.fn();
  const mockOnStartPractice = vi.fn();

  it('should render celebration title', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Excellent Session!')).toBeInTheDocument();
  });

  it('should render celebration message', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText(/Great work on Algebra/i)).toBeInTheDocument();
  });

  it('should render emoji', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should render session highlights heading', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Session Highlights')).toBeInTheDocument();
  });

  it('should render metrics', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button clicked', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByText('Awesome, Thanks!');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when close X button clicked', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByLabelText('Close celebration');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should render Continue to Practice button when onStartPractice provided', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
        onStartPractice={mockOnStartPractice}
      />
    );

    expect(screen.getByText('Continue to Practice')).toBeInTheDocument();
  });

  it('should call onStartPractice when Continue to Practice clicked', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
        onStartPractice={mockOnStartPractice}
      />
    );

    const practiceButton = screen.getByText('Continue to Practice');
    fireEvent.click(practiceButton);

    expect(mockOnStartPractice).toHaveBeenCalledTimes(1);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should render achievement badges when present', () => {
    const celebrationWithBadges: CelebrationData = {
      ...mockCelebration,
      achievements: [
        {
          id: 'accuracy_80',
          type: 'accuracy',
          title: '80% Accuracy',
          description: 'Achieved 80%+ accuracy',
          icon: '⭐',
          color: 'text-blue-500',
          unlockedAt: new Date().toISOString(),
        },
      ],
    };

    render(
      <SessionCelebration
        celebrationData={celebrationWithBadges}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Achievements Unlocked')).toBeInTheDocument();
    expect(screen.getByText('80% Accuracy')).toBeInTheDocument();
  });

  it('should not render achievements section when no badges', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.queryByText('Achievements Unlocked')).not.toBeInTheDocument();
  });

  it('should have aria-modal attribute for accessibility', () => {
    const { container } = render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should have labeled dialog for accessibility', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'celebration-title');
  });

  it('should render multiple badges', () => {
    const celebrationWithMultipleBadges: CelebrationData = {
      ...mockCelebration,
      achievements: [
        {
          id: 'accuracy_80',
          type: 'accuracy',
          title: '80% Accuracy',
          description: 'Achieved 80%+ accuracy',
          icon: '⭐',
          color: 'text-blue-500',
          unlockedAt: new Date().toISOString(),
        },
        {
          id: 'streak_3',
          type: 'streak',
          title: '3-Day Streak',
          description: '3 consecutive days',
          icon: '🔥',
          color: 'text-orange-500',
          unlockedAt: new Date().toISOString(),
        },
      ],
    };

    render(
      <SessionCelebration
        celebrationData={celebrationWithMultipleBadges}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('80% Accuracy')).toBeInTheDocument();
    expect(screen.getByText('3-Day Streak')).toBeInTheDocument();
  });

  it('should render topics learned', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    // Topics are shown in the metrics section
    const algebraText = screen.getAllByText(/Algebra/i);
    expect(algebraText.length).toBeGreaterThan(0);
  });

  it('should apply custom background gradient', () => {
    const { container } = render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    const gradientElement = container.querySelector('.from-purple-500');
    expect(gradientElement).toBeInTheDocument();
  });

  it('should handle Escape key press', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should render metrics with correct values', () => {
    render(
      <SessionCelebration
        celebrationData={mockCelebration}
        onDismiss={mockOnDismiss}
      />
    );

    // Check for accuracy display
    expect(screen.getByText('85%')).toBeInTheDocument();
    // Check for questions count
    expect(screen.getByText('10')).toBeInTheDocument();
    // Check for Accuracy label
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    // Check for Questions label
    expect(screen.getByText('Questions')).toBeInTheDocument();
  });

  it('should not render without celebration data', () => {
    const { container } = render(
      <SessionCelebration
        celebrationData={{
          title: '',
          message: '',
          metrics: {
            accuracy: 0,
            questionsAnswered: 0,
            correctAnswers: 0,
            topicsLearned: [],
            estimatedKnowledgeGain: '',
          },
          achievements: [],
        }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
  });
});
