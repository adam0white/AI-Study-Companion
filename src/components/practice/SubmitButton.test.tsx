import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmitButton } from './SubmitButton';

describe('SubmitButton', () => {
  it('is disabled when no answer is selected', () => {
    render(
      <SubmitButton
        disabled={true}
        submitted={false}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is enabled when answer is selected', () => {
    render(
      <SubmitButton
        disabled={false}
        submitted={false}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('displays "Submit Answer" before submission', () => {
    render(
      <SubmitButton
        disabled={false}
        submitted={false}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText('Submit Answer')).toBeInTheDocument();
  });

  it('displays "Next Question" after submission (not last question)', () => {
    render(
      <SubmitButton
        disabled={false}
        submitted={true}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText('Next Question')).toBeInTheDocument();
  });

  it('displays "View Results" after submission (last question)', () => {
    render(
      <SubmitButton
        disabled={false}
        submitted={true}
        isLastQuestion={true}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText('View Results')).toBeInTheDocument();
  });

  it('calls onSubmit when clicked before submission', () => {
    const onSubmit = vi.fn();
    render(
      <SubmitButton
        disabled={false}
        submitted={false}
        isLastQuestion={false}
        onSubmit={onSubmit}
        onNext={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when clicked after submission', () => {
    const onNext = vi.fn();
    render(
      <SubmitButton
        disabled={false}
        submitted={true}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={onNext}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('has minimum 44px height for touch targets', () => {
    const { container } = render(
      <SubmitButton
        disabled={false}
        submitted={false}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    const button = container.querySelector('button');
    expect(button?.classList.contains('min-h-[44px]')).toBe(true);
  });

  it('is full width', () => {
    const { container } = render(
      <SubmitButton
        disabled={false}
        submitted={false}
        isLastQuestion={false}
        onSubmit={vi.fn()}
        onNext={vi.fn()}
      />
    );

    const button = container.querySelector('button');
    expect(button?.classList.contains('w-full')).toBe(true);
  });
});
