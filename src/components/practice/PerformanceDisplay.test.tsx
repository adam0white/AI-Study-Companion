import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PerformanceDisplay from './PerformanceDisplay';

describe('PerformanceDisplay', () => {
  it('should display correct score', () => {
    render(
      <PerformanceDisplay
        correctCount={3}
        totalQuestions={5}
        currentDifficulty={3}
        accuracy={60}
      />
    );

    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('should display accuracy percentage', () => {
    render(
      <PerformanceDisplay
        correctCount={4}
        totalQuestions={5}
        currentDifficulty={3}
        accuracy={80}
      />
    );

    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should display current difficulty level', () => {
    render(
      <PerformanceDisplay
        correctCount={3}
        totalQuestions={5}
        currentDifficulty={4}
        accuracy={60}
      />
    );

    expect(screen.getByText('Level 4/5')).toBeInTheDocument();
  });

  it('should show difficulty stars matching level', () => {
    render(
      <PerformanceDisplay
        correctCount={3}
        totalQuestions={5}
        currentDifficulty={3}
        accuracy={60}
      />
    );

    const difficultyContainer = screen.getByLabelText('Difficulty level 3 out of 5');
    expect(difficultyContainer).toBeInTheDocument();
  });

  it('should color accuracy green when >= 80%', () => {
    render(
      <PerformanceDisplay
        correctCount={4}
        totalQuestions={5}
        currentDifficulty={3}
        accuracy={80}
      />
    );

    const accuracyElement = screen.getByText('80%');
    expect(accuracyElement).toHaveClass('text-green-600');
  });

  it('should color accuracy yellow when 60-79%', () => {
    render(
      <PerformanceDisplay
        correctCount={3}
        totalQuestions={5}
        currentDifficulty={3}
        accuracy={60}
      />
    );

    const accuracyElement = screen.getByText('60%');
    expect(accuracyElement).toHaveClass('text-yellow-600');
  });

  it('should color accuracy red when < 60%', () => {
    render(
      <PerformanceDisplay
        correctCount={2}
        totalQuestions={5}
        currentDifficulty={3}
        accuracy={40}
      />
    );

    const accuracyElement = screen.getByText('40%');
    expect(accuracyElement).toHaveClass('text-red-600');
  });

  it('should handle 0 questions answered', () => {
    render(
      <PerformanceDisplay
        correctCount={0}
        totalQuestions={5}
        currentDifficulty={2}
        accuracy={0}
      />
    );

    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should handle minimum difficulty (1)', () => {
    render(
      <PerformanceDisplay
        correctCount={1}
        totalQuestions={5}
        currentDifficulty={1}
        accuracy={20}
      />
    );

    expect(screen.getByText('Level 1/5')).toBeInTheDocument();
  });

  it('should handle maximum difficulty (5)', () => {
    render(
      <PerformanceDisplay
        correctCount={5}
        totalQuestions={5}
        currentDifficulty={5}
        accuracy={100}
      />
    );

    expect(screen.getByText('Level 5/5')).toBeInTheDocument();
  });

  it('should round accuracy to nearest integer', () => {
    render(
      <PerformanceDisplay
        correctCount={2}
        totalQuestions={3}
        currentDifficulty={3}
        accuracy={66.666}
      />
    );

    expect(screen.getByText('67%')).toBeInTheDocument();
  });
});
