/**
 * App Component Integration Tests
 * Story 1.4: Card Gallery Home Interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App - Card Gallery Integration', () => {
  it('renders the application header', () => {
    render(<App />);
    expect(screen.getByText('AI Study Companion')).toBeInTheDocument();
    expect(screen.getByText('Your personalized learning assistant')).toBeInTheDocument();
  });

  it('renders the hero card with greeting', () => {
    render(<App />);
    expect(screen.getByText('Welcome back, learner!')).toBeInTheDocument();
  });

  it('renders all three action cards', () => {
    render(<App />);
    
    // Chat card
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText(/Ask questions and get personalized help/)).toBeInTheDocument();
    
    // Practice card
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText(/Practice questions from your sessions/)).toBeInTheDocument();
    
    // Progress card
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText(/View your learning progress/)).toBeInTheDocument();
  });

  it('chat card is clickable and logs to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    
    render(<App />);
    
    const chatCard = screen.getByRole('button', { name: /Chat:/ });
    await user.click(chatCard);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Chat feature clicked - will be implemented in Story 1.5'
    );
    
    consoleSpy.mockRestore();
  });

  it('practice card is clickable and logs to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    
    render(<App />);
    
    const practiceCard = screen.getByRole('button', { name: /Practice:/ });
    await user.click(practiceCard);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Practice feature clicked - will be implemented in future story'
    );
    
    consoleSpy.mockRestore();
  });

  it('progress card is clickable and logs to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    
    render(<App />);
    
    const progressCard = screen.getByRole('button', { name: /Progress:/ });
    await user.click(progressCard);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Progress feature clicked - will be implemented in Story 1.9'
    );
    
    consoleSpy.mockRestore();
  });

  it('all action cards are keyboard accessible', async () => {
    render(<App />);
    
    const cards = screen.getAllByRole('button');
    const actionCards = cards.filter(card => 
      card.getAttribute('aria-label')?.includes(':')
    );
    
    // Should have exactly 3 action cards
    expect(actionCards).toHaveLength(3);
    
    // All should be focusable
    actionCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('renders footer', () => {
    render(<App />);
    expect(screen.getByText(/AI Study Companion • Built on Cloudflare Workers/)).toBeInTheDocument();
  });

  it('has proper responsive container classes', () => {
    const { container } = render(<App />);
    const mainElement = container.querySelector('main');
    
    expect(mainElement).toHaveClass('container');
    expect(mainElement).toHaveClass('mx-auto');
  });

  it('renders lucide-react icons for action cards', () => {
    const { container } = render(<App />);
    
    // lucide-react icons render as SVGs
    const svgs = container.querySelectorAll('svg');
    
    // Should have at least 3 SVGs for the action cards
    expect(svgs.length).toBeGreaterThanOrEqual(3);
  });
});

