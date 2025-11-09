/**
 * ProgressChart Component
 * Story 3.6: AC-3.6.1, 3.6.3, 3.6.4, 3.6.5
 * Reusable chart component for visualizing progress data with line or bar charts
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

interface ProgressChartProps {
  type: 'line' | 'bar';
  data: ChartDataPoint[];
  title: string;
  xLabel?: string;
  yLabel?: string;
  colorScheme?: 'mastery' | 'practice';
}

export function ProgressChart({
  type,
  data,
  title,
  xLabel,
  yLabel,
  colorScheme = 'mastery',
}: ProgressChartProps) {
  // Color schemes based on purpose
  const colors = {
    mastery: '#8B5CF6', // purple
    practice: '#EC4899', // pink
  };

  const color = colors[colorScheme];

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-lg border border-gray-200"
        role="region"
        aria-label={`${title} chart`}
      >
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-gray-600 text-sm">No data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 text-sm mb-1">
            {payload[0].payload.label}
          </p>
          <p className="text-purple-600 font-semibold text-sm">
            {typeof payload[0].value === 'number'
              ? payload[0].value.toFixed(1)
              : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" role="region" aria-label={`${title} chart`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
