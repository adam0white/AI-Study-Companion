/**
 * SubjectProgressTimeline Component
 * Story 4.4: AC-4.4.3
 * Timeline showing mastery progression over time for a single subject
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressOverTimeChart } from './ProgressOverTimeChart';
import type { ProgressByTime } from '@/lib/rpc/types';

interface SubjectProgressTimelineProps {
  subject: string;
  timeSeriesData: ProgressByTime[];
}

type TimeRange = 7 | 30 | 90 | 'all';

export function SubjectProgressTimeline({ subject, timeSeriesData }: SubjectProgressTimelineProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  // Filter time series data to only include the selected subject
  const subjectTimeSeries = timeSeriesData
    .map((timePoint) => ({
      ...timePoint,
      subjects: timePoint.subjects.filter((s) => s.subject === subject),
    }))
    .filter((timePoint) => timePoint.subjects.length > 0);

  // Filter by time range
  const filteredData = timeRange === 'all'
    ? subjectTimeSeries
    : subjectTimeSeries.filter((timePoint) => {
        const date = new Date(timePoint.date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= timeRange;
      });

  // Calculate trend
  const getTrend = (): { direction: 'up' | 'down' | 'stable'; value: number } => {
    if (filteredData.length < 2) {
      return { direction: 'stable', value: 0 };
    }

    const first = filteredData[0].subjects[0]?.mastery || 0;
    const last = filteredData[filteredData.length - 1].subjects[0]?.mastery || 0;
    const diff = last - first;

    if (diff > 0.05) return { direction: 'up', value: diff };
    if (diff < -0.05) return { direction: 'down', value: Math.abs(diff) };
    return { direction: 'stable', value: 0 };
  };

  const trend = getTrend();

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{subject} Progress Timeline</h2>
            <p className="text-sm text-gray-600 mt-1">
              Track your mastery progression over time
            </p>
          </div>
          {filteredData.length >= 2 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trend:</span>
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  trend.direction === 'up'
                    ? 'bg-green-100 text-green-800'
                    : trend.direction === 'down'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                }`}
              >
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.direction === 'stable' && '→'}
                <span className="font-semibold ml-1">
                  {trend.direction === 'stable'
                    ? 'Stable'
                    : `${(trend.value * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={timeRange === 7 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(7)}
          aria-label="Show last 7 days"
        >
          7 Days
        </Button>
        <Button
          variant={timeRange === 30 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(30)}
          aria-label="Show last 30 days"
        >
          30 Days
        </Button>
        <Button
          variant={timeRange === 90 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(90)}
          aria-label="Show last 90 days"
        >
          90 Days
        </Button>
        <Button
          variant={timeRange === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('all')}
          aria-label="Show all time"
        >
          All Time
        </Button>
      </div>

      {/* Chart */}
      {filteredData.length > 0 ? (
        <div className="mt-4">
          <ProgressOverTimeChart
            timeSeriesData={filteredData}
            viewMode="daily"
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No practice data available for this time range.</p>
          <p className="text-sm text-gray-400 mt-2">
            Start practicing to see your progress over time!
          </p>
        </div>
      )}

      {/* Data Summary */}
      {filteredData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {filteredData.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Data Points</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {filteredData.reduce((sum, d) => sum + d.practiceCount, 0)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Practice Sessions</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {filteredData.length > 0
                ? (
                    (filteredData[filteredData.length - 1].subjects[0]?.mastery || 0) * 100
                  ).toFixed(0)
                : 0}
              %
            </div>
            <div className="text-xs text-gray-600 mt-1">Current Mastery</div>
          </div>
        </div>
      )}
    </Card>
  );
}
