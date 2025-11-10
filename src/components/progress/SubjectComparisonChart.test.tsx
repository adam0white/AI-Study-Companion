/**
 * SubjectComparisonChart Component Tests
 * Story 4.4: AC-4.4.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { SubjectComparisonChart } from './SubjectComparisonChart';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  }),
}));

// Mock RPC Client
vi.mock('@/lib/rpc/client', () => ({
  RPCClient: class {
    async call() {
      // Return mock subject mastery data
      return [
        { subject: 'Math', mastery_score: 0.75, practice_count: 10, last_updated: new Date().toISOString() },
        { subject: 'Science', mastery_score: 0.60, practice_count: 8, last_updated: new Date().toISOString() },
      ];
    }
  },
}));

describe('SubjectComparisonChart', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey="test">{children}</ClerkProvider>
      </QueryClientProvider>
    );
  };

  it('renders chart title', async () => {
    render(<SubjectComparisonChart />, { wrapper: createWrapper() });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Subject Comparison')).toBeInTheDocument();
    });
  });

  it('renders sort buttons', async () => {
    render(<SubjectComparisonChart />, { wrapper: createWrapper() });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /by mastery/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /alphabetical/i })).toBeInTheDocument();
  });

  it('renders legend', async () => {
    render(<SubjectComparisonChart />, { wrapper: createWrapper() });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/strong \(70-100%\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/building \(30-70%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/needs work \(0-30%\)/i)).toBeInTheDocument();
  });
});
