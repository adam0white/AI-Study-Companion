/**
 * SubjectProgressOverview Component Tests
 * Story 4.4: AC-4.4.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { SubjectProgressOverview } from './SubjectProgressOverview';

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
    async getMultiDimensionalProgress() {
      return {
        overall: {},
        bySubject: [],
        byTime: [],
      };
    }
  },
}));

describe('SubjectProgressOverview', () => {
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

  it('renders sort buttons', async () => {
    render(<SubjectProgressOverview />, { wrapper: createWrapper() });

    // Wait for loading to complete and buttons to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sort by mastery level/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /sort alphabetically/i })).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<SubjectProgressOverview />, { wrapper: createWrapper() });

    // Skeleton loaders should be present
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
