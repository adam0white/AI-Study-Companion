import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DifficultyChangeNotification from './DifficultyChangeNotification';

describe('DifficultyChangeNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display increase message for difficulty increase', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={3}
        newDifficulty={4}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Difficulty increased to Level 4! Great job!')).toBeInTheDocument();
  });

  it('should display adjusted message for difficulty decrease', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={3}
        newDifficulty={2}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Difficulty adjusted to Level 2')).toBeInTheDocument();
  });

  it('should use purple background for increase', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={2}
        newDifficulty={3}
        onDismiss={onDismiss}
      />
    );

    const notification = screen.getByRole('status');
    expect(notification).toHaveClass('bg-purple-500');
  });

  it('should use gray background for decrease', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={3}
        newDifficulty={2}
        onDismiss={onDismiss}
      />
    );

    const notification = screen.getByRole('status');
    expect(notification).toHaveClass('bg-gray-600');
  });

  it('should call onDismiss after 3 seconds', async () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={3}
        newDifficulty={4}
        onDismiss={onDismiss}
      />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    // Fast-forward 3000ms for fade-out to start
    await vi.advanceTimersByTimeAsync(3000);

    // Wait for fade-out animation (300ms) and callback
    await vi.advanceTimersByTimeAsync(300);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show up arrow for increase', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={2}
        newDifficulty={3}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('⬆')).toBeInTheDocument();
  });

  it('should show down arrow for decrease', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={3}
        newDifficulty={2}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('⬇')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const onDismiss = vi.fn();
    render(
      <DifficultyChangeNotification
        previousDifficulty={3}
        newDifficulty={4}
        onDismiss={onDismiss}
      />
    );

    const notification = screen.getByRole('status');
    expect(notification).toHaveAttribute('aria-live', 'polite');
  });
});
