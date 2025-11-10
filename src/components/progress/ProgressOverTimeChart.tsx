/**
 * ProgressOverTimeChart Component
 * Story 3.5: AC-3.5.2, 3.5.5, 3.5.7
 * Line chart showing mastery progress over time across subjects
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProgressByTime } from '../../lib/rpc/types';

interface ProgressOverTimeChartProps {
  timeSeriesData: ProgressByTime[];
  viewMode?: 'daily' | 'weekly' | 'monthly';
}

// Color palette for different subjects
const SUBJECT_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function ProgressOverTimeChart({ timeSeriesData, viewMode = 'weekly' }: ProgressOverTimeChartProps) {
  // Empty state
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data Yet</h3>
        <p className="text-gray-600 text-center max-w-md px-4">
          Complete more practice sessions to see your progress over time. Historical data will
          appear here as you continue learning.
        </p>
      </div>
    );
  }

  // Extract all unique subjects from the time series data
  const allSubjects = new Set<string>();
  timeSeriesData.forEach((dataPoint) => {
    dataPoint.subjects.forEach((subj) => allSubjects.add(subj.subject));
  });
  const subjects = Array.from(allSubjects);

  // Transform data for Recharts (one object per date with all subject mastery values)
  const chartData = timeSeriesData.map((dataPoint) => {
    const point: Record<string, any> = {
      date: formatDate(dataPoint.date),
      fullDate: dataPoint.date, // for tooltip
    };

    dataPoint.subjects.forEach((subj) => {
      // Convert mastery to percentage
      point[subj.subject] = Math.round(subj.mastery * 100);
    });

    return point;
  });

  // Format date for X-axis based on view mode
  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();

    if (viewMode === 'daily') {
      return `${month} ${day}`;
    } else if (viewMode === 'weekly') {
      return `${month} ${day}`;
    } else {
      // monthly
      return `${month} ${year}`;
    }
  }

  // Custom tooltip to show full date and values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const fullDate = payload[0]?.payload?.fullDate;
      const date = fullDate ? new Date(fullDate).toLocaleDateString() : label;

      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{date}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.name}:</span>
              <span className="font-semibold">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: 'Mastery (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
            iconType="line"
          />
          {subjects.map((subject, index) => (
            <Line
              key={subject}
              type="monotone"
              dataKey={subject}
              name={subject}
              stroke={SUBJECT_COLORS[index % SUBJECT_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
