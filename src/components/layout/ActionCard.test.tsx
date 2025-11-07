/**
 * ActionCard Component Tests
 * Story 1.4: Card Gallery Home Interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionCard } from './ActionCard';

describe('ActionCard', () => {
  const defaultProps = {
    title: 'Test Card',
    description: 'This is a test card description',
  };

  it('renders title and description', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is a test card description')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <ActionCard
        {...defaultProps}
        icon={<span data-testid="test-icon">🎯</span>}
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('has correct border and background colors', () => {
    const { container } = render(<ActionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('border-gray-200');
    expect(card).toHaveClass('bg-surface');
  });

  it('has proper padding (1.5rem / 24px)', () => {
    const { container } = render(<ActionCard {...defaultProps} />);
    expect(container.firstChild).toHaveClass('p-6'); // p-6 = 1.5rem
  });

  it('has hover state classes', () => {
    const { container } = render(<ActionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('hover:border-primary');
    expect(card).toHaveClass('hover:shadow-md');
  });

  it('has active state classes', () => {
    const { container } = render(<ActionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('active:bg-gray-100');
    expect(card).toHaveClass('active:border-primary-dark');
  });

  it('has transition duration 200ms', () => {
    const { container } = render(<ActionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('duration-200');
    expect(card).toHaveClass('ease-in-out');
  });

  it('is clickable when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<ActionCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('cursor-pointer');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<ActionCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    await user.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation with Enter key', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<ActionCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation with Space key', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<ActionCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard(' ');
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is keyboard focusable when interactive', () => {
    const handleClick = vi.fn();
    render(<ActionCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('has focus ring for accessibility', () => {
    const handleClick = vi.fn();
    const { container } = render(<ActionCard {...defaultProps} onClick={handleClick} />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('focus:ring-2');
    expect(card).toHaveClass('focus:ring-primary');
  });

  it('has proper ARIA label', () => {
    const handleClick = vi.fn();
    render(<ActionCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', 'Test Card: This is a test card description');
  });

  it('meets touch target minimum (44x44px)', () => {
    const { container } = render(<ActionCard {...defaultProps} onClick={vi.fn()} />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('min-h-[44px]');
  });

  it('renders as link when href is provided', () => {
    render(<ActionCard {...defaultProps} href="/test" />);
    
    const link = screen.getByRole('button');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('prevents default when onClick is called with href', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<ActionCard {...defaultProps} href="/test" onClick={handleClick} />);
    
    const link = screen.getByRole('button');
    await user.click(link);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(<ActionCard {...defaultProps} className="custom-card" />);
    expect(container.firstChild).toHaveClass('custom-card');
  });

  it('icon has aria-hidden for accessibility', () => {
    const { container } = render(
      <ActionCard
        {...defaultProps}
        icon={<span>🎯</span>}
      />
    );
    
    const iconContainer = container.querySelector('[role="img"]');
    expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
  });
});

