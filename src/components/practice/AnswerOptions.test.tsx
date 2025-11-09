import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerOptions } from './AnswerOptions';

describe('AnswerOptions', () => {
  const mockOptions = ['Option A', 'Option B', 'Option C', 'Option D'];

  it('renders all 4 options', () => {
    render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={null}
        onSelect={vi.fn()}
        submitted={false}
        correctIndex={0}
      />
    );

    mockOptions.forEach((option) => {
      expect(screen.getByText(option, { exact: false })).toBeInTheDocument();
    });
  });

  it('calls onSelect when option is clicked', () => {
    const onSelect = vi.fn();
    render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={null}
        onSelect={onSelect}
        submitted={false}
        correctIndex={0}
      />
    );

    const firstOption = screen.getByText('Option A', { exact: false });
    fireEvent.click(firstOption);

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('shows selected state when option is selected', () => {
    const { container } = render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={1}
        onSelect={vi.fn()}
        submitted={false}
        correctIndex={0}
      />
    );

    // Check for purple border on selected option
    const selectedButtons = container.querySelectorAll('.border-primary');
    expect(selectedButtons.length).toBeGreaterThan(0);
  });

  it('displays correct feedback state with green color', () => {
    const { container } = render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={0}
        onSelect={vi.fn()}
        submitted={true}
        correctIndex={0}
      />
    );

    // Check for green border on correct answer
    const correctButtons = container.querySelectorAll('.border-green-500');
    expect(correctButtons.length).toBe(1);
  });

  it('displays incorrect feedback state with red color', () => {
    const { container } = render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={1}
        onSelect={vi.fn()}
        submitted={true}
        correctIndex={0}
      />
    );

    // Check for red border on incorrect answer
    const incorrectButtons = container.querySelectorAll('.border-red-500');
    expect(incorrectButtons.length).toBe(1);

    // Check for green border on correct answer
    const correctButtons = container.querySelectorAll('.border-green-500');
    expect(correctButtons.length).toBe(1);
  });

  it('shows checkmark icon for correct answer', () => {
    render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={0}
        onSelect={vi.fn()}
        submitted={true}
        correctIndex={0}
      />
    );

    // Check for Check icon (lucide-react renders as svg)
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows X icon for incorrect answer', () => {
    render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={1}
        onSelect={vi.fn()}
        submitted={true}
        correctIndex={0}
      />
    );

    // Check for multiple svgs (X for incorrect, Check for correct)
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('disables selection after submission', () => {
    const onSelect = vi.fn();
    render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={0}
        onSelect={onSelect}
        submitted={true}
        correctIndex={0}
      />
    );

    const optionButton = screen.getByText('Option B', { exact: false });
    fireEvent.click(optionButton);

    // Should not call onSelect when already submitted
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('has minimum 44px touch targets', () => {
    const { container } = render(
      <AnswerOptions
        options={mockOptions}
        selectedIndex={null}
        onSelect={vi.fn()}
        submitted={false}
        correctIndex={0}
      />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      expect(button.classList.contains('min-h-[44px]')).toBe(true);
    });
  });
});
