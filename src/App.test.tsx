/**
 * App Component Integration Tests
 * Story 1.4: Card Gallery Home Interface
 * Story 1.9: Progress Card Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock fetch for RPC calls
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        sessionCount: 0,
        recentTopics: [],
        lastSessionDate: '',
        daysActive: 0,
      }),
    } as Response)
  );
});

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

  it('renders all three action cards', async () => {
    render(<App />);

    // Chat card
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText(/Ask questions and get personalized help/)).toBeInTheDocument();

    // Practice card
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText(/Practice questions from your sessions/)).toBeInTheDocument();

    // Progress card (Story 1.9 - now ProgressCard component, shows after loading)
    await waitFor(() => {
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });
  });

  it('chat card is clickable and opens chat modal', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    const chatCard = screen.getByRole('button', { name: /Chat:/ });
    await user.click(chatCard);
    
    // Chat modal should now be visible (Story 1.5)
    expect(screen.getByText('Chat with your AI Study Companion')).toBeInTheDocument();
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

    // Wait for ProgressCard to load
    await waitFor(() => {
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });

    const progressCard = screen.getByLabelText(/Your Progress/);
    await user.click(progressCard);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Progress card clicked - detailed view to be implemented in future story'
    );

    consoleSpy.mockRestore();
  });

  it('all action cards are keyboard accessible', async () => {
    render(<App />);

    // Wait for ProgressCard to load
    await waitFor(() => {
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });

    const cards = screen.getAllByRole('button');
    const actionCards = cards.filter(card =>
      card.getAttribute('aria-label')?.includes(':')
    );

    // Should have exactly 3 action cards (Chat, Practice, Progress)
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

  it('renders lucide-react icons for action cards', async () => {
    const { container } = render(<App />);

    // Wait for ProgressCard to load (has multiple SVG icons)
    await waitFor(() => {
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });

    // lucide-react icons render as SVGs
    const svgs = container.querySelectorAll('svg');

    // Should have several SVGs (Chat icon, Practice icon, Progress card icons)
    expect(svgs.length).toBeGreaterThan(2);
  });
});

