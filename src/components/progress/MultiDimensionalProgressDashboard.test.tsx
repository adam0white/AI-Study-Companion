/**
 * Integration Tests for Multi-Dimensional Progress Dashboard
 * Story 3.5: AC-3.5.5, 3.5.7, 3.5.8
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiDimensionalProgressDashboard } from './MultiDimensionalProgressDashboard';
import type { MultiDimensionalProgressData } from '@/lib/rpc/types';

// Mock progress data
const mockProgressData: MultiDimensionalProgressData = {
  overall: {
    practiceSessionsCompleted: 15,
    practiceSessionsStarted: 18,
    completionRate: 83.3,
    averageAccuracy: 78.5,
    totalSubjects: 3,
    averageMastery: 0.72,
  },
  bySubject: [
    {
      subject: 'Algebra',
      mastery: 0.75,
      practiceCount: 8,
      completionRate: 87.5,
      avgAccuracy: 82.0,
      lastPracticed: '2025-01-25T14:30:00Z',
      masteryDelta: 0.05,
      struggles: ['Quadratic equations', 'Factoring'],
      strengths: ['Linear equations', 'Graphing'],
    },
    {
      subject: 'Geometry',
      mastery: 0.68,
      practiceCount: 5,
      completionRate: 80.0,
      avgAccuracy: 75.0,
      lastPracticed: '2025-01-24T10:00:00Z',
      masteryDelta: -0.02,
      struggles: ['Proofs', 'Trigonometry'],
      strengths: ['Shapes', 'Area calculations'],
    },
    {
      subject: 'Calculus',
      mastery: 0.73,
      practiceCount: 2,
      completionRate: 100.0,
      avgAccuracy: 80.0,
      lastPracticed: '2025-01-26T16:00:00Z',
      masteryDelta: 0.0,
      struggles: [],
      strengths: ['Derivatives'],
    },
  ],
  byTime: [
    {
      date: '2025-01-20',
      subjects: [{ subject: 'Algebra', mastery: 0.70 }],
      practiceCount: 2,
    },
    {
      date: '2025-01-22',
      subjects: [
        { subject: 'Algebra', mastery: 0.72 },
        { subject: 'Geometry', mastery: 0.65 },
      ],
      practiceCount: 3,
    },
    {
      date: '2025-01-25',
      subjects: [
        { subject: 'Algebra', mastery: 0.75 },
        { subject: 'Geometry', mastery: 0.68 },
        { subject: 'Calculus', mastery: 0.73 },
      ],
      practiceCount: 5,
    },
  ],
  byGoal: [],
};

const emptyProgressData: MultiDimensionalProgressData = {
  overall: {
    practiceSessionsCompleted: 0,
    practiceSessionsStarted: 0,
    completionRate: 0,
    averageAccuracy: 0,
    totalSubjects: 0,
    averageMastery: 0,
  },
  bySubject: [],
  byTime: [],
  byGoal: [],
};

describe('MultiDimensionalProgressDashboard', () => {
  describe('Empty State', () => {
    it('should display empty state when no practice sessions completed', () => {
      render(<MultiDimensionalProgressDashboard progressData={emptyProgressData} />);

      expect(screen.getByText('Start Your Learning Journey!')).toBeInTheDocument();
      expect(
        screen.getByText(/Complete your first practice session/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Start Practice')).toBeInTheDocument();
    });
  });

  describe('Dashboard with Data', () => {
    it('should render dashboard with all tabs', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      expect(screen.getByText('Your Progress')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /overall/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /by subject/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /over time/i })).toBeInTheDocument();
    });

    it('should show Overall tab by default', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      const overallTab = screen.getByRole('tab', { name: /overall/i });
      expect(overallTab).toHaveAttribute('aria-selected', 'true');

      // Overall metrics should be visible
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('Sessions Completed')).toBeInTheDocument();
    });

    it('should switch to By Subject tab when clicked', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      const bySubjectTab = screen.getByRole('tab', { name: /by subject/i });
      fireEvent.click(bySubjectTab);

      expect(bySubjectTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Progress by Subject')).toBeInTheDocument();
      expect(screen.getByText('Algebra')).toBeInTheDocument();
      expect(screen.getByText('Geometry')).toBeInTheDocument();
      expect(screen.getByText('Calculus')).toBeInTheDocument();
    });

    it('should switch to Over Time tab when clicked', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      const overTimeTab = screen.getByRole('tab', { name: /over time/i });
      fireEvent.click(overTimeTab);

      expect(overTimeTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Progress Over Time')).toBeInTheDocument();
    });

    it('should support keyboard navigation between tabs', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      const overallTab = screen.getByRole('tab', { name: /overall/i });
      overallTab.focus();

      // ArrowRight should move to next tab
      fireEvent.keyDown(overallTab, { key: 'ArrowRight' });
      const bySubjectTab = screen.getByRole('tab', { name: /by subject/i });
      expect(bySubjectTab).toHaveAttribute('aria-selected', 'true');

      // ArrowLeft should move to previous tab
      fireEvent.keyDown(bySubjectTab, { key: 'ArrowLeft' });
      expect(overallTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Progress views');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
      });
    });

    it('should have proper tabindex for keyboard navigation', () => {
      render(<MultiDimensionalProgressDashboard progressData={mockProgressData} />);

      const overallTab = screen.getByRole('tab', { name: /overall/i });
      expect(overallTab).toHaveAttribute('tabIndex', '0');

      const otherTabs = [
        screen.getByRole('tab', { name: /by subject/i }),
        screen.getByRole('tab', { name: /over time/i }),
      ];
      otherTabs.forEach((tab) => {
        expect(tab).toHaveAttribute('tabIndex', '-1');
      });
    });
  });
});
