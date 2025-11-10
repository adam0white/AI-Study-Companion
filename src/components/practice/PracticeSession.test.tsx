import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PracticeSession } from './PracticeSession';

// Mock Clerk's useAuth hook
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('test-token'),
  }),
}));

// Mock RPCClient
vi.mock('@/lib/rpc/client', () => {
  return {
    RPCClient: vi.fn().mockImplementation(() => ({
      startPractice: vi.fn().mockResolvedValue({
        id: 'session-123',
        subject: 'General',
        questions: [
          {
            id: 'q1',
            text: 'What is the quadratic formula?',
            options: [
              'x = (-b ± √(b² - 4ac)) / 2a',
              'x = b² - 4ac',
              'x = (a + b) / c',
              'x = √(b² + 4ac) / 2a',
            ],
            correctAnswer: 'x = (-b ± √(b² - 4ac)) / 2a',
            explanation: 'The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a',
            metadata: {
              difficulty: 3,
              topic: 'Quadratic Equations',
              sessionReference: 'Based on your Algebra sessions',
            },
          },
          {
            id: 'q2',
            text: 'Which of the following is NOT a programming paradigm?',
            options: ['Object-Oriented', 'Functional', 'Procedural', 'Sequential'],
            correctAnswer: 'Sequential',
            explanation: 'Sequential is not a programming paradigm',
            metadata: {
              difficulty: 3,
              topic: 'Programming',
              sessionReference: 'Based on your General sessions',
            },
          },
          {
            id: 'q3',
            text: 'What does HTTP stand for?',
            options: [
              'HyperText Transfer Protocol',
              'High Transfer Text Protocol',
              'HyperText Transmission Process',
              'High-Level Transfer Protocol',
            ],
            correctAnswer: 'HyperText Transfer Protocol',
            explanation: 'HTTP stands for HyperText Transfer Protocol',
            metadata: {
              difficulty: 3,
              topic: 'Web Protocols',
              sessionReference: 'Based on your General sessions',
            },
          },
          {
            id: 'q4',
            text: 'In React, what hook is used for managing component state?',
            options: ['useEffect', 'useState', 'useContext', 'useReducer'],
            correctAnswer: 'useState',
            explanation: 'useState is the primary hook for managing local component state',
            metadata: {
              difficulty: 3,
              topic: 'React Hooks',
              sessionReference: 'Based on your General sessions',
            },
          },
          {
            id: 'q5',
            text: 'What is the time complexity of binary search?',
            options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
            correctAnswer: 'O(log n)',
            explanation: 'Binary search has O(log n) time complexity',
            metadata: {
              difficulty: 3,
              topic: 'Algorithms',
              sessionReference: 'Based on your General sessions',
            },
          },
        ],
        startedAt: '2025-11-09T12:00:00Z',
        difficulty: 3,
      }),
    })),
  };
});

describe('PracticeSession', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('displays first question after loading', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Wait for questions to load and display
    await waitFor(() => {
      const questionIndicators = screen.getAllByText('Question 1 of 5');
      expect(questionIndicators.length).toBeGreaterThan(0);
    });
  });

  it('displays all answer options', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getAllByText('Question 1 of 5').length).toBeGreaterThan(0);
    });

    // Should display 4 options (A, B, C, D)
    const buttons = screen.getAllByRole('button');
    // Filter for option buttons (not Submit button)
    const optionButtons = buttons.filter((btn) => btn.textContent?.includes('.'));
    expect(optionButtons.length).toBe(4);
  });

  it('enables submit button when answer is selected', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getAllByText('Question 1 of 5').length).toBeGreaterThan(0);
    });

    // Initially submit button should be disabled
    const submitButton = screen.getByText('Submit Answer');
    expect(submitButton).toBeDisabled();

    // Select first option
    const optionButtons = screen.getAllByRole('button');
    const firstOption = optionButtons.find((btn) => btn.textContent?.includes('A.'));
    if (firstOption) {
      fireEvent.click(firstOption);
    }

    // Submit button should now be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows feedback after submitting answer', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getAllByText('Question 1 of 5').length).toBeGreaterThan(0);
    });

    // Select first option (correct answer for question 1)
    const optionButtons = screen.getAllByRole('button');
    const firstOption = optionButtons.find((btn) => btn.textContent?.includes('A.'));
    if (firstOption) {
      fireEvent.click(firstOption);
    }

    // Submit answer
    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    // Feedback should appear
    await waitFor(() => {
      expect(
        screen.getByText('Correct!') || screen.getByText('Incorrect')
      ).toBeInTheDocument();
    });
  });

  it('advances to next question when Next is clicked', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Select and submit first question
    const optionButtons = screen.getAllByRole('button');
    const firstOption = optionButtons.find((btn) => btn.textContent?.includes('A.'));
    if (firstOption) {
      fireEvent.click(firstOption);
    }

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    // Wait for Next Question button
    await waitFor(() => {
      expect(screen.getByText('Next Question')).toBeInTheDocument();
    });

    // Click Next Question
    const nextButton = screen.getByText('Next Question');
    fireEvent.click(nextButton);

    // Should advance to question 2
    await waitFor(() => {
      expect(screen.getAllByText('Question 2 of 5').length).toBeGreaterThan(0);
    });
  });

  it('shows results screen after last question', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Go through all 5 questions
    for (let i = 0; i < 5; i++) {
      // Select an option
      const optionButtons = screen.getAllByRole('button');
      const option = optionButtons.find((btn) => btn.textContent?.includes('A.'));
      if (option) {
        fireEvent.click(option);
      }

      // Submit
      const submitButton = screen.getByText(/Submit Answer/);
      fireEvent.click(submitButton);

      // If not last question, click Next
      if (i < 4) {
        await waitFor(() => {
          const nextButton = screen.getByText('Next Question');
          fireEvent.click(nextButton);
        });
      } else {
        // On last question, click View Results
        await waitFor(() => {
          const viewResultsButton = screen.getByText('View Results');
          fireEvent.click(viewResultsButton);
        });
      }
    }

    // Should show results screen
    await waitFor(
      () => {
        expect(screen.getByText('Practice Complete!')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('updates progress indicator as questions advance', async () => {
    render(<PracticeSession isOpen={true} onClose={mockOnClose} />);

    // Initially at question 1
    expect(screen.getAllByText('Question 1 of 5').length).toBeGreaterThan(0);

    // Complete first question
    const optionButtons = screen.getAllByRole('button');
    const option = optionButtons.find((btn) => btn.textContent?.includes('A.'));
    if (option) {
      fireEvent.click(option);
    }

    fireEvent.click(screen.getByText('Submit Answer'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Next Question'));
    });

    // Should be at question 2
    await waitFor(() => {
      expect(screen.getAllByText('Question 2 of 5').length).toBeGreaterThan(0);
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<PracticeSession isOpen={false} onClose={mockOnClose} />);

    // Dialog should not be visible
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
