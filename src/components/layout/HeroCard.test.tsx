/**
 * HeroCard Component Tests
 * Story 1.4: Card Gallery Home Interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroCard } from './HeroCard';

describe('HeroCard', () => {
  it('renders with default placeholder greeting', () => {
    render(<HeroCard />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });

  it('renders with custom greeting', () => {
    render(<HeroCard greeting="Hello, Student!" />);
    expect(screen.getByText('Hello, Student!')).toBeInTheDocument();
  });

  it('has gradient background classes', () => {
    const { container } = render(<HeroCard />);
    const card = container.firstChild as HTMLElement;
    
    expect(card).toHaveClass('bg-gradient-to-r');
    expect(card).toHaveClass('from-primary');
    expect(card).toHaveClass('to-accent');
  });

  it('has proper padding (1.5rem / 24px)', () => {
    const { container } = render(<HeroCard />);
    expect(container.firstChild).toHaveClass('p-6'); // p-6 = 1.5rem
  });

  it('is full-width', () => {
    const { container } = render(<HeroCard />);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('has white text for contrast', () => {
    const { container } = render(<HeroCard />);
    expect(container.firstChild).toHaveClass('text-white');
  });

  it('renders primary CTA button when provided', () => {
    const handleClick = vi.fn();
    render(
      <HeroCard
        primaryCTA={{
          label: 'Get Started',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Get Started' });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when primary CTA is clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(
      <HeroCard
        primaryCTA={{
          label: 'Click Me',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Click Me' });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary CTA button when provided', () => {
    const handleClick = vi.fn();
    render(
      <HeroCard
        secondaryCTA={{
          label: 'Learn More',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Learn More' });
    expect(button).toBeInTheDocument();
  });

  it('renders both CTAs when provided', () => {
    render(
      <HeroCard
        primaryCTA={{
          label: 'Primary',
          onClick: vi.fn(),
        }}
        secondaryCTA={{
          label: 'Secondary',
          onClick: vi.fn(),
        }}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('buttons meet touch target minimum (44x44px)', () => {
    const handleClick = vi.fn();
    render(
      <HeroCard
        primaryCTA={{
          label: 'Test',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Test' });
    expect(button).toHaveClass('min-h-[44px]');
    expect(button).toHaveClass('min-w-[44px]');
  });

  it('applies custom className', () => {
    const { container } = render(<HeroCard className="custom-hero" />);
    expect(container.firstChild).toHaveClass('custom-hero');
  });
});

