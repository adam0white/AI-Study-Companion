/**
 * TypingIndicator Component Tests
 * Story 1.5: Chat Modal Interface
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('renders when isTyping is true', () => {
    const { container } = render(<TypingIndicator isTyping={true} />);

    // Should render the typing indicator container
    const indicator = container.querySelector('.bg-gray-100');
    expect(indicator).toBeInTheDocument();

    // Should have 3 animated dots
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('does not render when isTyping is false', () => {
    const { container } = render(<TypingIndicator isTyping={false} />);

    // Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('has correct styling for typing animation', () => {
    const { container } = render(<TypingIndicator isTyping={true} />);

    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);

    // Each dot should have proper styling
    dots.forEach((dot) => {
      expect(dot).toHaveClass('w-2', 'h-2', 'bg-gray-400', 'rounded-full');
    });
  });

  it('aligns indicator to the left (companion side)', () => {
    const { container } = render(<TypingIndicator isTyping={true} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('justify-start');
  });
});

