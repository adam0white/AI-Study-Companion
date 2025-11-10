/**
 * SubjectComparisonChart Component
 * Story 4.4: AC-4.4.4
 * Bar chart comparing all 8 subjects with mastery levels
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { RPCClient } from '@/lib/rpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SUBJECTS } from '@/lib/constants';
import type { SubjectMastery } from '@/lib/rpc/types';

interface SubjectComparisonChartProps {
  onSubjectClick?: (subject: string) => void;
}

type SortOption = 'mastery' | 'alphabetical';

export function SubjectComparisonChart({ onSubjectClick }: SubjectComparisonChartProps) {
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

  // Convert to chart data format
  let chartData = Array.from(subjectMap.values()).map(item => ({
    subject: item.subject,
    mastery: Math.round(item.mastery_score * 100),
    practiceCount: item.practice_count,
  }));

  // Sort based on selection
  if (sortBy === 'mastery') {
    chartData = chartData.sort((a, b) => b.mastery - a.mastery);
  } else {
    chartData = chartData.sort((a, b) => a.subject.localeCompare(b.subject));
  }

  // Get bar color based on mastery level
  const getBarColor = (mastery: number): string => {
    if (mastery >= 70) return '#10b981'; // green
    if (mastery >= 30) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900">{data.subject}</p>
          <p className="text-sm text-gray-600">Mastery: {data.mastery}%</p>
          <p className="text-sm text-gray-600">Practice Sessions: {data.practiceCount}</p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <Card className="p-6">
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load subject comparison data.</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subject Comparison</h2>
          <p className="text-sm text-gray-600 mt-1">Compare mastery levels across all subjects</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'mastery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('mastery')}
            aria-label="Sort by mastery level"
          >
            By Mastery
          </Button>
          <Button
            variant={sortBy === 'alphabetical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('alphabetical')}
            aria-label="Sort alphabetically"
          >
            Alphabetical
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Strong (70-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">Building (30-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600">Needs Work (0-30%)</span>
        </div>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="subject"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{ value: 'Mastery (%)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="mastery"
            radius={[8, 8, 0, 0]}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.mastery)}
                onClick={() => onSubjectClick?.(entry.subject)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Accessibility note */}
      <div className="sr-only" role="region" aria-label="Subject mastery data">
        {chartData.map((item) => (
          <div key={item.subject}>
            {item.subject}: {item.mastery}% mastery with {item.practiceCount} practice sessions
          </div>
        ))}
      </div>
    </Card>
  );
}
