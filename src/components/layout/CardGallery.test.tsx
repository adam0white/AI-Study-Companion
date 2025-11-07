/**
 * CardGallery Component Tests
 * Story 1.4: Card Gallery Home Interface
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardGallery, ActionCardsGrid } from './CardGallery';

describe('CardGallery', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardGallery />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <CardGallery>
        <div data-testid="test-child">Test Content</div>
      </CardGallery>
    );
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardGallery className="custom-class">
        <div>Content</div>
      </CardGallery>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has full width', () => {
    const { container } = render(<CardGallery />);
    expect(container.firstChild).toHaveClass('w-full');
  });
});

describe('ActionCardsGrid', () => {
  it('renders without crashing', () => {
    const { container } = render(<ActionCardsGrid />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <ActionCardsGrid>
        <div data-testid="card-1">Card 1</div>
        <div data-testid="card-2">Card 2</div>
        <div data-testid="card-3">Card 3</div>
      </ActionCardsGrid>
    );
    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
    expect(screen.getByTestId('card-3')).toBeInTheDocument();
  });

  it('has responsive grid layout classes', () => {
    const { container } = render(
      <ActionCardsGrid>
        <div>Card</div>
      </ActionCardsGrid>
    );
    const grid = container.firstChild as HTMLElement;
    
    // Mobile: 1 column
    expect(grid).toHaveClass('grid-cols-1');
    // Tablet: 2 columns
    expect(grid).toHaveClass('md:grid-cols-2');
    // Desktop: 3 columns
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('has proper gap spacing (1rem / 16px)', () => {
    const { container } = render(
      <ActionCardsGrid>
        <div>Card</div>
      </ActionCardsGrid>
    );
    expect(container.firstChild).toHaveClass('gap-4'); // gap-4 = 1rem
  });

  it('applies custom className', () => {
    const { container } = render(
      <ActionCardsGrid className="custom-grid">
        <div>Card</div>
      </ActionCardsGrid>
    );
    expect(container.firstChild).toHaveClass('custom-grid');
  });
});

