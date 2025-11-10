/**
 * Integration Tests for useCardOrder Hook
 * Story 5.0b: AC-5.0b.7 - Card ordering React hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCardOrder } from './useCardOrder';
import { RPCClient } from '../rpc/client';
import type { CardOrder } from '../rpc/types';

// Mock Clerk authentication
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// Mock RPC Client
vi.mock('../rpc/client');

describe('useCardOrder Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default order and loading true', () => {
    // Mock getCardOrder to never resolve (pending state)
    vi.spyOn(RPCClient.prototype, 'getCardOrder').mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useCardOrder());

    expect(result.current.cardOrder).toEqual(['practice', 'chat', 'progress']);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should fetch card order successfully', async () => {
    const mockCardOrder: CardOrder = {
      order: ['chat', 'practice', 'progress'],
      context: {
        studentState: 're_engagement',
        reason: 'Re-engagement needed',
        priorities: [
          { card: 'chat', score: 60, factors: { baseScore: 20, inactivityBonus: 40 } },
          { card: 'practice', score: 30, factors: { baseScore: 30 } },
          { card: 'progress', score: 10, factors: { baseScore: 10 } },
        ],
        computedAt: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    vi.spyOn(RPCClient.prototype, 'getCardOrder').mockResolvedValue(mockCardOrder);

    const { result } = renderHook(() => useCardOrder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cardOrder).toEqual(['chat', 'practice', 'progress']);
    expect(result.current.context).toEqual(mockCardOrder.context);
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Network error');
    vi.spyOn(RPCClient.prototype, 'getCardOrder').mockRejectedValue(mockError);

    const { result } = renderHook(() => useCardOrder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.cardOrder).toEqual(['practice', 'chat', 'progress']); // Fallback order
  });

  it('should not fetch when disabled', async () => {
    vi.spyOn(RPCClient.prototype, 'getCardOrder');

    const { result } = renderHook(() => useCardOrder({ enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(RPCClient.prototype.getCardOrder).not.toHaveBeenCalled();
  });

  it('should allow manual refetch', async () => {
    const mockCardOrder: CardOrder = {
      order: ['practice', 'chat', 'progress'],
      context: {
        studentState: 'default',
        reason: 'Default ordering',
        priorities: [],
        computedAt: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    const getCardOrderSpy = vi
      .spyOn(RPCClient.prototype, 'getCardOrder')
      .mockResolvedValue(mockCardOrder);

    const { result } = renderHook(() => useCardOrder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getCardOrderSpy).toHaveBeenCalledTimes(1);

    // Trigger manual refetch
    result.current.refetch();

    await waitFor(() => {
      expect(getCardOrderSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('should update card order after refetch', async () => {
    const firstOrder: CardOrder = {
      order: ['practice', 'chat', 'progress'],
      context: {
        studentState: 'default',
        reason: 'Default ordering',
        priorities: [],
        computedAt: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    const secondOrder: CardOrder = {
      order: ['chat', 'practice', 'progress'],
      context: {
        studentState: 're_engagement',
        reason: 'Re-engagement needed',
        priorities: [],
        computedAt: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    vi
      .spyOn(RPCClient.prototype, 'getCardOrder')
      .mockResolvedValueOnce(firstOrder)
      .mockResolvedValueOnce(secondOrder);

    const { result } = renderHook(() => useCardOrder());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cardOrder).toEqual(['practice', 'chat', 'progress']);

    // Refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.cardOrder).toEqual(['chat', 'practice', 'progress']);
    });
  });

  it('should include context information', async () => {
    const mockContext = {
      studentState: 'celebration' as const,
      reason: 'Post-session celebration',
      priorities: [
        { card: 'practice' as const, score: 60, factors: { baseScore: 30, sessionRecency: 30 } },
        { card: 'chat' as const, score: 5, factors: { baseScore: 20, sessionRecency: -15 } },
        { card: 'progress' as const, score: 10, factors: { baseScore: 10 } },
      ],
      computedAt: new Date().toISOString(),
    };

    const mockCardOrder: CardOrder = {
      order: ['practice', 'chat', 'progress'],
      context: mockContext,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    vi.spyOn(RPCClient.prototype, 'getCardOrder').mockResolvedValue(mockCardOrder);

    const { result } = renderHook(() => useCardOrder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.context).toEqual(mockContext);
    expect(result.current.context?.studentState).toBe('celebration');
    expect(result.current.context?.reason).toContain('Post-session celebration');
  });

  it('should clear error on successful refetch', async () => {
    const mockError = new Error('Network error');
    const mockCardOrder: CardOrder = {
      order: ['practice', 'chat', 'progress'],
      context: {
        studentState: 'default',
        reason: 'Default ordering',
        priorities: [],
        computedAt: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    vi
      .spyOn(RPCClient.prototype, 'getCardOrder')
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockCardOrder);

    const { result } = renderHook(() => useCardOrder());

    // Wait for initial fetch error
    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    // Refetch successfully
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.error).toBe(null);
      expect(result.current.cardOrder).toEqual(['practice', 'chat', 'progress']);
    });
  });
});
