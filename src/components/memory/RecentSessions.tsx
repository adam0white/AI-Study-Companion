/**
 * RecentSessions Component
 * Story 2.5: AC-2.5.2 - Display recent session history from short-term memory
 *
 * Shows list of recent sessions with topics, dates, and consolidation status.
 */

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import type { ShortTermMemoryItem } from '@/lib/rpc/types';
import { Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface RecentSessionsProps {
  className?: string;
  limit?: number;
}

interface SessionData {
  id: string;
  topics: string[];
  date: string;
  summary: string;
  consolidated: boolean;
}

/**
 * Parse session content from short-term memory
 */
function parseSessionContent(content: string): { topics: string[]; summary: string } {
  try {
    const data = JSON.parse(content);
    return {
      topics: data.topics || [],
      summary: data.summary || 'Session details',
    };
  } catch {
    // Fallback if content is not JSON
    return {
      topics: [],
      summary: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    };
  }
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  const months = Math.floor(diffDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

/**
 * SessionItem displays a single session with consolidation status
 */
function SessionItem({ session }: { session: SessionData }) {
  return (
    <div className="border-l-2 border-muted pl-3 pb-3 last:pb-0">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(session.date)}
          </span>
        </div>
        {session.consolidated ? (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>Consolidated</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </div>
        )}
      </div>

      {session.topics.length > 0 && (
        <div className="mb-1">
          <div className="flex flex-wrap gap-1">
            {session.topics.map((topic, idx) => (
              <span
                key={idx}
                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-foreground-secondary mt-1">{session.summary}</p>
    </div>
  );
}

/**
 * RecentSessions displays recent session history from short-term memory
 */
export function RecentSessions({ className, limit = 10 }: RecentSessionsProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
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

        // Fetch short-term memory
        const memory = await client.call('getShortTermMemory', { limit }) as ShortTermMemoryItem[];

        // Transform memory items to session data
        const sessionData: SessionData[] = memory.map(item => {
          const { topics, summary } = parseSessionContent(item.content);
          return {
            id: item.id,
            topics,
            date: item.createdAt,
            summary,
            consolidated: false, // Short-term memories with expiresAt are pending
          };
        });

        setSessions(sessionData);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    // Refresh sessions every 1 minute (to see consolidation status updates)
    const interval = setInterval(fetchSessions, 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken, limit]);

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
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
          <CardTitle>Recent Sessions</CardTitle>
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

  // Empty state
  if (sessions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground-secondary mb-2">
              No sessions yet
            </p>
            <p className="text-xs text-muted-foreground">
              Your recent learning sessions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sessions display
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
