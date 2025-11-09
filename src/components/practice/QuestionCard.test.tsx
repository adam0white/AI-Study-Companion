import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionCard } from './QuestionCard';

describe('QuestionCard', () => {
  it('renders question text correctly', () => {
    render(
      <QuestionCard questionNumber={1} totalQuestions={5} questionText="What is 2 + 2?" />
    );

    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('displays progress indicator with correct values', () => {
    render(
      <QuestionCard questionNumber={3} totalQuestions={10} questionText="Sample question" />
    );

    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });

  it('applies proper theme styling', () => {
    const { container } = render(
      <QuestionCard questionNumber={1} totalQuestions={5} questionText="Test question" />
    );

    // Check for theme classes
    const card = container.querySelector('.border-purple-200');
    expect(card).toBeInTheDocument();
  });

  it('displays question with proper heading hierarchy', () => {
    render(
      <QuestionCard questionNumber={1} totalQuestions={5} questionText="Important question" />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Important question');
  });
});
