/**
 * ProfileCard Component
 * Story 2.5: AC-2.5.1 - Display student profile from long-term memory
 *
 * Displays student background, goals, strengths, and areas for improvement
 * from consolidated long-term memory.
 */

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import type { LongTermMemoryItem } from '@/lib/rpc/types';
import { User, Target, TrendingUp, AlertCircle } from 'lucide-react';

interface ProfileCardProps {
  className?: string;
}

interface ProfileData {
  background: LongTermMemoryItem[];
  goals: LongTermMemoryItem[];
  strengths: LongTermMemoryItem[];
  struggles: LongTermMemoryItem[];
}

/**
 * Section component for displaying categorized memory items
 */
function ProfileSection({
  title,
  items,
  icon: Icon,
  emptyMessage,
}: {
  title: string;
  items: LongTermMemoryItem[];
  icon: React.ElementType;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-foreground-secondary">
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="flex-1">{item.content}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ProfileCard displays student learning profile from long-term memory
 */
export function ProfileCard({ className }: ProfileCardProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
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

        // Fetch long-term memory
        const memory = await client.call('getLongTermMemory', {}) as LongTermMemoryItem[];

        // Categorize memory items
        const profileData: ProfileData = {
          background: memory.filter(m => m.category === 'background'),
          goals: memory.filter(m => m.category === 'goals'),
          strengths: memory.filter(m => m.category === 'strengths'),
          struggles: memory.filter(m => m.category === 'struggles'),
        };

        setProfile(profileData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Refresh profile every 5 minutes (to catch new consolidations)
    const interval = setInterval(fetchProfile, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken]);

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Your Learning Profile</CardTitle>
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
          <CardTitle>Your Learning Profile</CardTitle>
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

  // Empty state (no profile yet)
  if (!profile || (profile.background.length === 0 && profile.goals.length === 0 &&
      profile.strengths.length === 0 && profile.struggles.length === 0)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Your Learning Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground-secondary mb-2">
              Your profile is being built
            </p>
            <p className="text-xs text-muted-foreground">
              Chat with your companion to start building your personalized learning profile
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Profile display
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Your Learning Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfileSection
          title="Background"
          items={profile.background}
          icon={User}
          emptyMessage="No background information yet"
        />
        <ProfileSection
          title="Learning Goals"
          items={profile.goals}
          icon={Target}
          emptyMessage="No learning goals set yet"
        />
        <ProfileSection
          title="Strengths"
          items={profile.strengths}
          icon={TrendingUp}
          emptyMessage="No strengths identified yet"
        />
        <ProfileSection
          title="Areas for Growth"
          items={profile.struggles}
          icon={AlertCircle}
          emptyMessage="No areas for growth identified yet"
        />
      </CardContent>
    </Card>
  );
}
