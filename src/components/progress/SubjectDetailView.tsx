/**
 * SubjectDetailView Component
 * Story 3.6: AC-3.6.7
 * Detailed drill-down view for a specific subject
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MasteryProgressBar } from './MasteryProgressBar';
import { ProgressOverTimeChart } from './ProgressOverTimeChart';
import { ArrowLeft } from 'lucide-react';
import type { SubjectProgress } from '@/lib/rpc/types';

interface SubjectDetailViewProps {
  subject: string;
  onBack: () => void;
}

export function SubjectDetailView({ subject, onBack }: SubjectDetailViewProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Fetch multi-dimensional progress to get subject data
  const { data: progressData, isLoading, error } = useQuery({
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

  if (isLoading || !isLoaded) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !progressData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Failed to load subject details.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Find the subject data
  const subjectData = progressData.bySubject.find((s: SubjectProgress) => s.subject === subject);

  if (!subjectData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Subject not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Filter time series data for this subject only
  const subjectTimeSeries = progressData.byTime
    .map((timePoint: any) => ({
      ...timePoint,
      subjects: timePoint.subjects.filter((s: any) => s.subject === subject),
    }))
    .filter((timePoint: any) => timePoint.subjects.length > 0);

  // Format relative time
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Subject Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{subject}</h1>
        <Card className="p-6">
          <MasteryProgressBar
            subject="Current Mastery Level"
            mastery={subjectData.mastery}
            masteryDelta={subjectData.masteryDelta}
            showDelta={true}
            size="lg"
          />
        </Card>
      </div>

      {/* Detailed Metrics */}
      <section className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Detailed Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Practice Sessions:</span>
                <span className="font-semibold">{subjectData.practiceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion Rate:</span>
                <span className="font-semibold">{subjectData.completionRate.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Accuracy:</span>
                <span className="font-semibold">{subjectData.avgAccuracy.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Practiced:</span>
                <span className="font-semibold">{formatRelativeTime(subjectData.lastPracticed)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mastery Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Mastery:</span>
                <span className="font-semibold">{(subjectData.mastery * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recent Change:</span>
                <span
                  className={`font-semibold ${
                    subjectData.masteryDelta > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {subjectData.masteryDelta > 0 ? '+' : ''}
                  {(subjectData.masteryDelta * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mastery Level:</span>
                <Badge
                  variant={subjectData.mastery >= 0.7 ? 'default' : 'secondary'}
                  className={
                    subjectData.mastery >= 0.9
                      ? 'bg-green-500'
                      : subjectData.mastery >= 0.7
                        ? 'bg-blue-500'
                        : ''
                  }
                >
                  {subjectData.mastery >= 0.9
                    ? 'Expert'
                    : subjectData.mastery >= 0.7
                      ? 'Proficient'
                      : 'Learning'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Full Struggles List */}
      {subjectData.struggles.length > 0 && (
        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Areas for Improvement</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-2">
              {subjectData.struggles.map((struggle: string, idx: number) => (
                <Badge
                  key={idx}
                  variant="destructive"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                >
                  {struggle}
                </Badge>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Full Strengths List */}
      {subjectData.strengths.length > 0 && (
        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Strengths</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-2">
              {subjectData.strengths.map((strength: string, idx: number) => (
                <Badge
                  key={idx}
                  variant="default"
                  className="bg-green-100 text-green-800 hover:bg-green-200"
                >
                  {strength}
                </Badge>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Mastery Trend Chart */}
      {subjectTimeSeries.length > 0 && (
        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mastery Over Time</h2>
          <Card className="p-6">
            <ProgressOverTimeChart timeSeriesData={subjectTimeSeries} viewMode="daily" />
          </Card>
        </section>
      )}

      {/* Practice History Section */}
      <section className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Practice History</h2>
        <Card className="p-6">
          <p className="text-gray-600 text-sm">
            Detailed practice session history is not yet available. This feature will display
            individual practice sessions with dates, questions answered, accuracy, and duration.
          </p>
        </Card>
      </section>
    </div>
  );
}
