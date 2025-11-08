/**
 * ProgressCard Component Tests
 * Story 1.9: Progress Card Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ProgressCard } from './ProgressCard';
import type { ProgressCardProps } from './ProgressCard';

describe('ProgressCard', () => {
  const mockProgressData: ProgressCardProps = {
    sessionCount: 5,
    recentTopics: ['math', 'algebra', 'geometry'],
    lastSessionDate: '2025-11-05T14:00:00Z',
    daysActive: 7,
    totalMinutesStudied: 180,
  };

  describe('Rendering with data (AC-1.9.2, AC-1.9.3, AC-1.9.4)', () => {
    it('renders progress card with session count', () => {
      render(<ProgressCard {...mockProgressData} />);

      expect(screen.getByText('Your Progress')).toBeInTheDocument();
      expect(screen.getByLabelText('5 sessions completed')).toBeInTheDocument();
    });

    it('renders days active', () => {
      render(<ProgressCard {...mockProgressData} />);

      expect(screen.getByLabelText('7 days active')).toBeInTheDocument();
    });

    it('renders total time studied when provided', () => {
      render(<ProgressCard {...mockProgressData} />);

      // 180 minutes = 3 hours
      expect(screen.getByLabelText('3h studied')).toBeInTheDocument();
    });

    it('renders recent topics as pills', () => {
      render(<ProgressCard {...mockProgressData} />);

      expect(screen.getByLabelText('Topic: math')).toBeInTheDocument();
      expect(screen.getByLabelText('Topic: algebra')).toBeInTheDocument();
      expect(screen.getByLabelText('Topic: geometry')).toBeInTheDocument();
    });

    it('limits topics display to 6 and shows "more" indicator', () => {
      const manyTopics: ProgressCardProps = {
        ...mockProgressData,
        recentTopics: ['math', 'algebra', 'geometry', 'calculus', 'trig', 'stats', 'physics', 'chemistry'],
      };

      render(<ProgressCard {...manyTopics} />);

      // Should show first 6 topics
      expect(screen.getByLabelText('Topic: math')).toBeInTheDocument();
      expect(screen.getByLabelText('Topic: stats')).toBeInTheDocument();

      // Should show "+2 more" indicator
      expect(screen.getByLabelText('And 2 more topics')).toBeInTheDocument();
    });

    it('formats last session date correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      render(<ProgressCard {...mockProgressData} lastSessionDate={yesterday.toISOString()} />);

      expect(screen.getByLabelText(/Last session: Yesterday/i)).toBeInTheDocument();
    });

    it('formats total minutes to hours and minutes', () => {
      // 90 minutes = 1h 30m
      render(<ProgressCard {...mockProgressData} totalMinutesStudied={90} />);

      expect(screen.getByLabelText('1h 30m studied')).toBeInTheDocument();
    });

    it('formats total minutes to minutes only when less than 60', () => {
      render(<ProgressCard {...mockProgressData} totalMinutesStudied={45} />);

      expect(screen.getByLabelText('45m studied')).toBeInTheDocument();
    });
  });

  describe('Zero state (AC-1.9.2)', () => {
    it('renders zero state when no sessions', () => {
      render(
        <ProgressCard
          sessionCount={0}
          recentTopics={[]}
          lastSessionDate=""
          daysActive={0}
        />
      );

      expect(screen.getByText('No sessions yet')).toBeInTheDocument();
      expect(screen.getByText(/Start your first session/i)).toBeInTheDocument();
    });

    it('does not render metrics in zero state', () => {
      render(
        <ProgressCard
          sessionCount={0}
          recentTopics={[]}
          lastSessionDate=""
          daysActive={0}
        />
      );

      expect(screen.queryByText('Sessions')).not.toBeInTheDocument();
      expect(screen.queryByText('Days Active')).not.toBeInTheDocument();
    });
  });

  describe('Click handling (AC-1.9.7)', () => {
    it('calls onClick handler when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ProgressCard {...mockProgressData} onClick={onClick} />);

      const card = screen.getByLabelText(/Your Progress/i);
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation with Enter key', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ProgressCard {...mockProgressData} onClick={onClick} />);

      const card = screen.getByLabelText(/Your Progress/i);
      card.focus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation with Space key', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ProgressCard {...mockProgressData} onClick={onClick} />);

      const card = screen.getByLabelText(/Your Progress/i);
      card.focus();
      await user.keyboard(' ');

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not have interactive styles when onClick is not provided', () => {
      render(<ProgressCard {...mockProgressData} />);

      const card = screen.getByLabelText(/Your Progress/i);
      expect(card).not.toHaveAttribute('role', 'button');
      expect(card).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Accessibility (AC-1.9.5)', () => {
    it('has proper ARIA labels', () => {
      render(<ProgressCard {...mockProgressData} />);

      expect(screen.getByLabelText('Your Progress: View learning statistics and session history')).toBeInTheDocument();
      expect(screen.getByLabelText('5 sessions completed')).toBeInTheDocument();
      expect(screen.getByLabelText('7 days active')).toBeInTheDocument();
    });

    it('sets role="button" when clickable', () => {
      render(<ProgressCard {...mockProgressData} onClick={() => {}} />);

      const card = screen.getByLabelText(/Your Progress/i);
      expect(card).toHaveAttribute('role', 'button');
    });

    it('is keyboard focusable when clickable', () => {
      render(<ProgressCard {...mockProgressData} onClick={() => {}} />);

      const card = screen.getByLabelText(/Your Progress/i);
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('icons have aria-hidden attribute', () => {
      const { container } = render(<ProgressCard {...mockProgressData} />);

      // Check that SVG icons have aria-hidden
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Visual design (AC-1.9.3, AC-1.9.4)', () => {
    it('applies gradient background classes', () => {
      render(<ProgressCard {...mockProgressData} />);

      const card = screen.getByLabelText(/Your Progress/i);
      expect(card.className).toContain('bg-gradient');
      expect(card.className).toContain('text-white');
    });

    it('applies custom className', () => {
      render(<ProgressCard {...mockProgressData} className="custom-class" />);

      const card = screen.getByLabelText(/Your Progress/i);
      expect(card.className).toContain('custom-class');
    });

    it('applies hover styles when clickable', () => {
      render(<ProgressCard {...mockProgressData} onClick={() => {}} />);

      const card = screen.getByLabelText(/Your Progress/i);
      expect(card.className).toContain('cursor-pointer');
      expect(card.className).toContain('hover:shadow-lg');
    });
  });

  describe('Edge cases', () => {
    it('handles empty topics array', () => {
      render(
        <ProgressCard
          sessionCount={3}
          recentTopics={[]}
          lastSessionDate="2025-11-05T14:00:00Z"
          daysActive={5}
        />
      );

      expect(screen.queryByText('Recent Topics')).not.toBeInTheDocument();
    });

    it('handles missing total minutes studied', () => {
      const { sessionCount, recentTopics, lastSessionDate, daysActive } = mockProgressData;

      render(
        <ProgressCard
          sessionCount={sessionCount}
          recentTopics={recentTopics}
          lastSessionDate={lastSessionDate}
          daysActive={daysActive}
        />
      );

      expect(screen.queryByText(/Time Studied/i)).not.toBeInTheDocument();
    });

    it('handles invalid last session date gracefully', () => {
      render(<ProgressCard {...mockProgressData} lastSessionDate="" />);

      expect(screen.getByLabelText(/Last session: No sessions yet/i)).toBeInTheDocument();
    });

    it('handles zero days active', () => {
      render(<ProgressCard {...mockProgressData} daysActive={0} />);

      expect(screen.getByLabelText('0 days active')).toBeInTheDocument();
    });
  });
});
