/**
 * SubjectProgressTimeline Component Tests
 * Story 4.4: AC-4.4.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubjectProgressTimeline } from './SubjectProgressTimeline';

describe('SubjectProgressTimeline', () => {
  const mockTimeSeriesData = [
    {
      date: '2025-01-01',
      subjects: [{ subject: 'Math', mastery: 0.5 }],
      practiceCount: 2,
    },
    {
      date: '2025-01-02',
      subjects: [{ subject: 'Math', mastery: 0.6 }],
      practiceCount: 3,
    },
  ];

  it('renders timeline title with subject name', () => {
    render(<SubjectProgressTimeline subject="Math" timeSeriesData={mockTimeSeriesData} />);

    expect(screen.getByText('Math Progress Timeline')).toBeInTheDocument();
  });

  it('renders time range buttons', () => {
    render(<SubjectProgressTimeline subject="Math" timeSeriesData={mockTimeSeriesData} />);

    expect(screen.getByRole('button', { name: /show last 7 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show last 30 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show last 90 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show all time/i })).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<SubjectProgressTimeline subject="Math" timeSeriesData={[]} />);

    expect(screen.getByText(/no practice data available/i)).toBeInTheDocument();
  });

  it('shows data summary when data exists', () => {
    const data = [
      {
        date: new Date().toISOString().split('T')[0], // Today
        subjects: [{ subject: 'Math', mastery: 0.6 }],
        practiceCount: 3,
      },
    ];
    render(<SubjectProgressTimeline subject="Math" timeSeriesData={data} />);

    // Check for summary metrics
    expect(screen.getByText(/data points/i)).toBeInTheDocument();
    expect(screen.getByText(/practice sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/current mastery/i)).toBeInTheDocument();
  });
});
