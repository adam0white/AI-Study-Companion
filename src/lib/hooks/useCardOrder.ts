/**
 * useCardOrder Hook
 * Story 5.0b: AC-5.0b.7 - Frontend hook for card ordering
 *
 * Fetches and manages card ordering state from the StudentCompanion backend.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '../rpc/client';
import type { CardOrder, CardType } from '../rpc/types';

/**
 * Hook state interface
 */
export interface UseCardOrderResult {
  /** Ordered list of card types */
  cardOrder: CardType[];
  /** Whether the order is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Full card order context (for debugging/understanding) */
  context?: CardOrder['context'];
  /** Refetch card order (e.g., after session completion) */
  refetch: () => Promise<void>;
}

/**
 * Hook options
 */
export interface UseCardOrderOptions {
  /** Whether to fetch immediately on mount (default: true) */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: undefined, no polling) */
  pollingInterval?: number;
}

/**
 * Custom hook to fetch and manage card ordering
 *
 * Story 5.0b: AC-5.0b.7 - Card ordering React hook
 *
 * @param options - Hook configuration options
 * @returns Card order state and controls
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { cardOrder, loading, error, refetch } = useCardOrder();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return <ActionCardsGrid cardOrder={cardOrder} />;
 * }
 * ```
 */
export function useCardOrder(options: UseCardOrderOptions = {}): UseCardOrderResult {
  const { enabled = true, pollingInterval } = options;
  const { getToken } = useAuth();

  const [cardOrder, setCardOrder] = useState<CardType[]>(['practice', 'chat', 'progress']); // Default order
  const [context, setContext] = useState<CardOrder['context'] | undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch card order from backend
   */
  const fetchCardOrder = async () => {
    try {
      setError(null);

      // Create RPC client
      const client = new RPCClient(getToken);

      // Fetch card order
      const result = await client.getCardOrder();

      // Update state
      setCardOrder(result.order);
      setContext(result.context);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching card order:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch card order');
      setLoading(false);

      // Keep default order on error
      setCardOrder(['practice', 'chat', 'progress']);
    }
  };

  /**
   * Public refetch function
   */
  const refetch = async () => {
    setLoading(true);
    await fetchCardOrder();
  };

  // Fetch on mount if enabled
  useEffect(() => {
    if (enabled) {
      fetchCardOrder();
    } else {
      setLoading(false);
    }
  }, [enabled]);

  // Set up polling if interval provided
  useEffect(() => {
    if (pollingInterval && enabled) {
      const interval = setInterval(fetchCardOrder, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [pollingInterval, enabled]);

  return {
    cardOrder,
    loading,
    error,
    context,
    refetch,
  };
}
