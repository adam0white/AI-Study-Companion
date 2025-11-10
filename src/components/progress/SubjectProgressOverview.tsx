/**
 * SubjectProgressOverview Component
 * Story 4.4: AC-4.4.1
 * Grid of all 8 subject cards with mastery at a glance
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SubjectProgressCard } from './SubjectProgressCard';
import { SUBJECTS } from '@/lib/constants';
import type { SubjectMastery } from '@/lib/rpc/types';

interface SubjectProgressOverviewProps {
  onSubjectClick?: (subject: string) => void;
}

type SortOption = 'mastery' | 'name';

export function SubjectProgressOverview({ onSubjectClick }: SubjectProgressOverviewProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>('mastery');

  // Fetch subject mastery data
  const { data: masteryData, isLoading, error } = useQuery({
    queryKey: ['subjectMastery'],
    queryFn: async () => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('User not authenticated');
      }
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      const rpcClient = new RPCClient(async () => token);
      return await rpcClient.call('getSubjectMastery', {}) as SubjectMastery[];
    },
    enabled: isLoaded && isSignedIn,
  });

  // Fetch multi-dimensional progress for subject details
  const { data: progressData } = useQuery({
    queryKey: ['multiDimensionalProgress'],
    queryFn: async () => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('User not authenticated');
      }
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      const rpcClient = new RPCClient(async () => token);
      return await rpcClient.getMultiDimensionalProgress();
    },
    enabled: isLoaded && isSignedIn,
  });

  // Create a map of all subjects with default values
  const subjectMap = new Map<string, SubjectMastery>();
  SUBJECTS.forEach(subject => {
    subjectMap.set(subject, {
      subject,
      mastery_score: 0,
      practice_count: 0,
      last_updated: new Date().toISOString(),
    });
  });

  // Update map with actual data
  masteryData?.forEach(item => {
    subjectMap.set(item.subject, item);
  });

  // Convert map to array
  const allSubjects = Array.from(subjectMap.values());

  // Sort subjects based on selected option
  const sortedSubjects = [...allSubjects].sort((a, b) => {
    if (sortBy === 'mastery') {
      return b.mastery_score - a.mastery_score; // Descending
    } else {
      return a.subject.localeCompare(b.subject); // Alphabetical
    }
  });

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-64 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load subject progress data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state (shouldn't happen since we show all 8 subjects)
  if (sortedSubjects.length === 0) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>No subject data available yet. Start practicing to see your progress!</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Sort Controls */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={sortBy === 'mastery' ? 'default' : 'outline'}
          onClick={() => setSortBy('mastery')}
          aria-label="Sort by mastery level"
        >
          Sort by Mastery
        </Button>
        <Button
          variant={sortBy === 'name' ? 'default' : 'outline'}
          onClick={() => setSortBy('name')}
          aria-label="Sort alphabetically"
        >
          Sort A-Z
        </Button>
      </div>

      {/* Subject Cards Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        role="list"
        aria-label="Subject progress cards"
      >
        {sortedSubjects.map((masteryItem) => {
          // Find corresponding progress data
          const subjectProgress = progressData?.bySubject.find(
            s => s.subject === masteryItem.subject
          );

          // If we have full progress data, use SubjectProgressCard
          if (subjectProgress) {
            return (
              <SubjectProgressCard
                key={masteryItem.subject}
                subjectProgress={subjectProgress}
                onDetailClick={onSubjectClick ? () => onSubjectClick(masteryItem.subject) : undefined}
              />
            );
          }

          // Fallback: Simple card with just mastery data
          return (
            <Card
              key={masteryItem.subject}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={onSubjectClick ? () => onSubjectClick(masteryItem.subject) : undefined}
              role="listitem"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">{masteryItem.subject}</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Mastery</span>
                    <span className="font-semibold">
                      {(masteryItem.mastery_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        masteryItem.mastery_score >= 0.7
                          ? 'bg-green-500'
                          : masteryItem.mastery_score >= 0.3
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${masteryItem.mastery_score * 100}%` }}
                      role="progressbar"
                      aria-valuenow={masteryItem.mastery_score * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${masteryItem.subject} mastery level`}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Practice Sessions:</span>
                  <span className="font-semibold">{masteryItem.practice_count}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
