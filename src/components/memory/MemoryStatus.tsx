/**
 * MemoryStatus Component
 * Story 2.5: AC-2.5.4 - Display consolidation status
 *
 * Shows last consolidation timestamp, pending memories count, and next scheduled consolidation.
 */

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import type { MemoryStatus as MemoryStatusType } from '@/lib/rpc/types';
import { Clock, Database, Calendar, AlertCircle } from 'lucide-react';

interface MemoryStatusProps {
  className?: string;
}

/**
 * Format date to readable string
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // For recent dates, show relative time
  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes <= 1) return 'Just now';
      return `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // For older dates, show formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format future date for next consolidation
 */
function formatNextConsolidation(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  // If in the past, show "Pending"
  if (diffMs < 0) {
    return 'Pending';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return diffDays === 1 ? 'In 1 day' : `In ${diffDays} days`;
  }

  if (diffHours > 0) {
    return diffHours === 1 ? 'In 1 hour' : `In ${diffHours} hours`;
  }

  if (diffMinutes > 0) {
    return diffMinutes === 1 ? 'In 1 minute' : `In ${diffMinutes} minutes`;
  }

  return 'Shortly';
}

/**
 * StatusItem displays a single status metric
 */
function StatusItem({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  variant?: 'default' | 'warning';
}) {
  const colorClass = variant === 'warning' ? 'text-amber-600' : 'text-primary';

  return (
    <div className="flex items-center gap-3">
      <div className={`${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

/**
 * MemoryStatus displays memory system consolidation status
 */
export function MemoryStatus({ className }: MemoryStatusProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [status, setStatus] = useState<MemoryStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create RPC client with Clerk token
        const getAuthToken = async () => {
          if (!isLoaded || !isSignedIn) {
            throw new Error('User not authenticated');
          }
          const token = await getToken();
          if (!token) {
            throw new Error('Failed to get authentication token');
          }
          return token;
        };

        const client = new RPCClient(getAuthToken);

        // Fetch memory status
        const statusData = await client.call('getMemoryStatus', {}) as MemoryStatusType;

        setStatus(statusData);
      } catch (err) {
        console.error('Failed to fetch memory status:', err);
        setError(err instanceof Error ? err.message : 'Failed to load status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30 * 1000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken]);

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Memory System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Memory System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-foreground-secondary">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Status display
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Memory System</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <StatusItem
            icon={Clock}
            label="Last Consolidation"
            value={status?.lastConsolidation ? formatDateTime(status.lastConsolidation) : 'Never'}
          />

          <StatusItem
            icon={Database}
            label="Pending Memories"
            value={`${status?.pendingMemories || 0} session${status?.pendingMemories === 1 ? '' : 's'}`}
            variant={status && status.pendingMemories > 0 ? 'warning' : 'default'}
          />

          <StatusItem
            icon={Calendar}
            label="Next Consolidation"
            value={status?.nextConsolidation ? formatNextConsolidation(status.nextConsolidation) : 'Not scheduled'}
          />
        </div>

        {status && status.pendingMemories > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Your companion will automatically consolidate pending memories into your learning profile.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
