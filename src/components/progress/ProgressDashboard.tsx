/**
 * ProgressDashboard Component
 * Story 3.6: AC-All
 * Main dashboard displaying multi-dimensional progress with visualizations
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SubjectProgressCard } from './SubjectProgressCard';
import { ProgressOverTimeChart } from './ProgressOverTimeChart';
import { ProgressChart } from './ProgressChart';
import { SubjectDetailView } from './SubjectDetailView';
import { Trophy, TrendingUp } from 'lucide-react';
import type { SubjectProgress } from '@/lib/rpc/types';

export function ProgressDashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [timeScale, setTimeScale] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Fetch multi-dimensional progress data
  const { data: progressData, isLoading, error } = useQuery({
    queryKey: ['multiDimensionalProgress'],
    queryFn: async () => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('User not authenticated');
      }
      // Pass getToken directly so it gets fresh tokens on each RPC call
      const rpcClient = new RPCClient(getToken);
      return await rpcClient.getMultiDimensionalProgress();
    },
    enabled: isLoaded && isSignedIn,
  });

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !progressData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load progress. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If a subject is selected, show detail view
  if (selectedSubject) {
    return (
      <SubjectDetailView
        subject={selectedSubject}
        onBack={() => setSelectedSubject(null)}
      />
    );
  }

  // Check for achievements
  const hasAchievement = progressData.bySubject.some((s: SubjectProgress) => s.masteryDelta > 0.1);
  const highCompletionRate = progressData.overall.completionRate > 80;
  const highAccuracy = progressData.overall.averageAccuracy > 90;

  return (
    <div className="p-6 max-w-7xl mx-auto" role="main">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Learning Progress</h1>
        <p className="text-gray-600">Track your growth across subjects</p>
      </div>

      {/* Celebration Banner */}
      {(hasAchievement || highCompletionRate || highAccuracy) && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Trophy className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800">
            {hasAchievement && (
              <span>
                Wow! You improved{' '}
                {progressData.bySubject.find((s: SubjectProgress) => s.masteryDelta > 0.1)?.subject} by{' '}
                {Math.round(
                  (progressData.bySubject.find((s: SubjectProgress) => s.masteryDelta > 0.1)?.masteryDelta || 0) * 100
                )}
                %!
              </span>
            )}
            {highCompletionRate && !hasAchievement && (
              <span>You're on fire! {progressData.overall.completionRate.toFixed(0)}% completion rate!</span>
            )}
            {highAccuracy && !hasAchievement && !highCompletionRate && (
              <span>Amazing accuracy! {progressData.overall.averageAccuracy.toFixed(0)}% on average!</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Metrics */}
      <section className="mb-8" role="region" aria-labelledby="overall-metrics">
        <h2 id="overall-metrics" className="sr-only">Overall Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {progressData.overall.completionRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {progressData.overall.practiceSessionsCompleted} of{' '}
              {progressData.overall.practiceSessionsStarted} sessions
            </div>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {progressData.overall.averageAccuracy.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Average Accuracy</div>
            <div className="text-xs text-gray-500 mt-1">Across all practice sessions</div>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {progressData.overall.totalSubjects}
            </div>
            <div className="text-sm text-gray-600">Subjects Practiced</div>
            <div className="text-xs text-gray-500 mt-1">
              Avg mastery: {(progressData.overall.averageMastery * 100).toFixed(0)}%
            </div>
          </Card>
        </div>
      </section>

      {/* Tabs for different views */}
      <Tabs defaultValue="bySubject" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="bySubject">By Subject</TabsTrigger>
          <TabsTrigger value="overTime">Over Time</TabsTrigger>
          <TabsTrigger value="overall">Overall</TabsTrigger>
        </TabsList>

        {/* By Subject Tab */}
        <TabsContent value="bySubject">
          <section role="region" aria-labelledby="subject-breakdown">
            <h2 id="subject-breakdown" className="text-2xl font-semibold text-gray-900 mb-4">
              Subject Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {progressData.bySubject.map((subjectProgress: SubjectProgress) => (
                <SubjectProgressCard
                  key={subjectProgress.subject}
                  subjectProgress={subjectProgress}
                  onDetailClick={() => setSelectedSubject(subjectProgress.subject)}
                />
              ))}
            </div>

            {progressData.bySubject.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No subject data yet. Start practicing to see progress!</p>
              </div>
            )}
          </section>
        </TabsContent>

        {/* Over Time Tab */}
        <TabsContent value="overTime">
          <section role="region" aria-labelledby="progress-over-time">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="progress-over-time" className="text-2xl font-semibold text-gray-900">
                Progress Over Time
              </h2>
              <RadioGroup
                value={timeScale}
                onValueChange={(value: string) => setTimeScale(value as 'daily' | 'weekly' | 'monthly')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <label htmlFor="daily" className="text-sm cursor-pointer">
                    Daily
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <label htmlFor="weekly" className="text-sm cursor-pointer">
                    Weekly
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <label htmlFor="monthly" className="text-sm cursor-pointer">
                    Monthly
                  </label>
                </div>
              </RadioGroup>
            </div>
            <Card className="p-6">
              <ProgressOverTimeChart
                timeSeriesData={progressData.byTime}
                viewMode={timeScale}
              />
            </Card>
          </section>
        </TabsContent>

        {/* Overall Tab */}
        <TabsContent value="overall">
          <section role="region" aria-labelledby="overall-summary">
            <h2 id="overall-summary" className="text-2xl font-semibold text-gray-900 mb-4">
              Overall Summary
            </h2>
            <div className="space-y-6">
              {/* Practice Completion Trends */}
              <Card className="p-6">
                <ProgressChart
                  type="bar"
                  data={progressData.bySubject.map((s: SubjectProgress) => ({
                    label: s.subject,
                    value: s.practiceCount,
                  }))}
                  title="Practice Sessions by Subject"
                  xLabel="Subject"
                  yLabel="Sessions"
                  colorScheme="practice"
                />
              </Card>

              {/* Mastery Levels */}
              <Card className="p-6">
                <ProgressChart
                  type="bar"
                  data={progressData.bySubject.map((s: SubjectProgress) => ({
                    label: s.subject,
                    value: Math.round(s.mastery * 100),
                  }))}
                  title="Mastery Levels by Subject"
                  xLabel="Subject"
                  yLabel="Mastery (%)"
                  colorScheme="mastery"
                />
              </Card>

              {/* Encouragement Messages */}
              <Card className="p-6 bg-purple-50">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-6 w-6 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Keep Going!</h3>
                    <p className="text-gray-700">
                      {progressData.overall.practiceSessionsCompleted < 3 && (
                        <span>Keep practicing to build momentum!</span>
                      )}
                      {progressData.overall.completionRate < 50 && progressData.overall.practiceSessionsCompleted >= 3 && (
                        <span>Finish your practice sessions to see more progress!</span>
                      )}
                      {progressData.overall.completionRate >= 50 && progressData.overall.averageMastery < 0.7 && (
                        <span>You're on the right track! Keep practicing to improve mastery.</span>
                      )}
                      {progressData.overall.averageMastery >= 0.7 && (
                        <span>Excellent work! You're mastering the material.</span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
