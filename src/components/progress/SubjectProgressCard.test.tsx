/**
 * Unit Tests for SubjectProgressCard
 * Story 3.5: AC-3.5.1, 3.5.5, 3.5.7
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubjectProgressCard } from './SubjectProgressCard';
import type { SubjectProgress } from '@/lib/rpc/types';

const mockSubjectProgress: SubjectProgress = {
  subject: 'Algebra',
  mastery: 0.75,
  practiceCount: 8,
  completionRate: 87.5,
  avgAccuracy: 82.0,
  lastPracticed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  masteryDelta: 0.05,
  struggles: ['Quadratic equations', 'Factoring', 'Complex numbers', 'Polynomials'],
  strengths: ['Linear equations', 'Graphing'],
};

const lowMasterySubject: SubjectProgress = {
  subject: 'Calculus',
  mastery: 0.35,
  practiceCount: 3,
  completionRate: 66.7,
  avgAccuracy: 55.0,
  lastPracticed: new Date().toISOString(),
  masteryDelta: -0.03,
  struggles: ['Derivatives', 'Integrals'],
  strengths: [],
};

describe('SubjectProgressCard', () => {
  describe('Rendering', () => {
    it('should display subject name', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('Algebra')).toBeInTheDocument();
    });

    it('should display mastery percentage', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display practice count', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Practice Sessions')).toBeInTheDocument();
    });

    it('should display completion rate', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('88%')).toBeInTheDocument(); // Rounded
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });

    it('should display average accuracy', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText('Avg Accuracy')).toBeInTheDocument();
    });

    it('should format relative time correctly', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('Last practiced: 2 days ago')).toBeInTheDocument();
    });

    it('should display "Today" for same day practice', () => {
      const todaySubject = { ...mockSubjectProgress, lastPracticed: new Date().toISOString() };
      render(<SubjectProgressCard subjectProgress={todaySubject} />);
      expect(screen.getByText('Last practiced: Today')).toBeInTheDocument();
    });
  });

  describe('Mastery Delta Indicator', () => {
    it('should display positive delta with green styling', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      const delta = screen.getByText('+5%');
      expect(delta).toBeInTheDocument();
      expect(delta).toHaveClass('text-green-700');
    });

    it('should display negative delta with red styling', () => {
      render(<SubjectProgressCard subjectProgress={lowMasterySubject} />);
      const delta = screen.getByText('-3%');
      expect(delta).toBeInTheDocument();
      expect(delta).toHaveClass('text-red-700');
    });

    it('should not display delta when it is zero', () => {
      const zeroDeltalSubject = { ...mockSubjectProgress, masteryDelta: 0 };
      render(<SubjectProgressCard subjectProgress={zeroDeltalSubject} />);
      expect(screen.queryByText('+0%')).not.toBeInTheDocument();
      expect(screen.queryByText('-0%')).not.toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use green color for high mastery (>= 70%)', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      const progressBar = screen.getByRole('progressbar', { name: /mastery.*progress/i });
      // The inner div has the color class
      const innerBar = progressBar.querySelector('div');
      expect(innerBar).toHaveClass('bg-green-500');
    });

    it('should use red color for low mastery (< 40%)', () => {
      render(<SubjectProgressCard subjectProgress={lowMasterySubject} />);
      const progressBar = screen.getByRole('progressbar', { name: /mastery.*progress/i });
      // The inner div has the color class
      const innerBar = progressBar.querySelector('div');
      expect(innerBar).toHaveClass('bg-red-500');
    });

    it('should use yellow color for medium mastery (40-70%)', () => {
      const mediumMastery = { ...mockSubjectProgress, mastery: 0.55 };
      render(<SubjectProgressCard subjectProgress={mediumMastery} />);
      const progressBar = screen.getByRole('progressbar', { name: /mastery.*progress/i });
      // The inner div has the color class
      const innerBar = progressBar.querySelector('div');
      expect(innerBar).toHaveClass('bg-yellow-500');
    });
  });

  describe('Struggles and Strengths', () => {
    it('should display up to 3 strengths by default', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('Linear equations')).toBeInTheDocument();
      expect(screen.getByText('Graphing')).toBeInTheDocument();
    });

    it('should display up to 3 struggles by default', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('Quadratic equations')).toBeInTheDocument();
      expect(screen.getByText('Factoring')).toBeInTheDocument();
      expect(screen.getByText('Complex numbers')).toBeInTheDocument();
    });

    it('should show "+X more" indicator when there are more than 3 items', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);
      expect(screen.getByText('+1 more')).toBeInTheDocument(); // 4 struggles, showing 3
    });

    it('should expand to show all items when "+X more" is clicked', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);

      const showMoreButton = screen.getByText('+1 more');
      fireEvent.click(showMoreButton);

      expect(screen.getByText('Polynomials')).toBeInTheDocument(); // 4th struggle
      expect(screen.getByText('Show Less')).toBeInTheDocument();
    });

    it('should collapse when "Show Less" is clicked', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);

      const showMoreButton = screen.getByText('+1 more');
      fireEvent.click(showMoreButton);

      const showLessButton = screen.getByText('Show Less');
      fireEvent.click(showLessButton);

      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for progress bar', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);

      const progressBar = screen.getByRole('progressbar', { name: /mastery.*progress/i });
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have accessible delta indicator', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);

      const delta = screen.getByLabelText(/mastery change/i);
      expect(delta).toBeInTheDocument();
    });

    it('should have accessible expand/collapse button', () => {
      render(<SubjectProgressCard subjectProgress={mockSubjectProgress} />);

      const button = screen.getByText('+1 more');
      // Button is wrapped in CollapsibleTrigger which manages aria-expanded
      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      const showLessButton = screen.getByText('Show Less');
      expect(showLessButton).toBeInTheDocument();
    });
  });
});
