/**
 * OverallProgressMetrics Component
 * Story 3.5: AC-3.5.3, 3.5.5, 3.5.7
 * Displays aggregate progress metrics in a card grid
 */


interface OverallProgressData {
  practiceSessionsCompleted: number;
  practiceSessionsStarted: number;
  completionRate: number;
  averageAccuracy: number;
  totalSubjects: number;
  averageMastery: number;
}

interface OverallProgressMetricsProps {
  overallData: OverallProgressData;
}

export function OverallProgressMetrics({ overallData }: OverallProgressMetricsProps) {
  const {
    practiceSessionsCompleted,
    completionRate,
    averageAccuracy,
    totalSubjects,
    averageMastery,
  } = overallData;

  // Color coding function
  const getPerformanceColor = (percentage: number): string => {
    if (percentage >= 70) return 'text-green-600 bg-green-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const metrics = [
    {
      label: 'Sessions Completed',
      value: practiceSessionsCompleted,
      unit: '',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-purple-600 bg-purple-50',
      ariaLabel: `${practiceSessionsCompleted} practice sessions completed`,
    },
    {
      label: 'Completion Rate',
      value: Math.round(completionRate),
      unit: '%',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: getPerformanceColor(completionRate),
      ariaLabel: `Completion rate: ${Math.round(completionRate)} percent`,
      showProgressBar: true,
      percentage: Math.round(completionRate),
    },
    {
      label: 'Average Accuracy',
      value: Math.round(averageAccuracy),
      unit: '%',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: getPerformanceColor(averageAccuracy),
      ariaLabel: `Average accuracy: ${Math.round(averageAccuracy)} percent`,
      showProgressBar: true,
      percentage: Math.round(averageAccuracy),
    },
    {
      label: 'Subjects Studied',
      value: totalSubjects,
      unit: '',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-50',
      ariaLabel: `${totalSubjects} subjects studied`,
    },
    {
      label: 'Average Mastery',
      value: Math.round(averageMastery * 100),
      unit: '%',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
      color: getPerformanceColor(averageMastery * 100),
      ariaLabel: `Average mastery across subjects: ${Math.round(averageMastery * 100)} percent`,
      showProgressBar: true,
      percentage: Math.round(averageMastery * 100),
    },
  ];

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            role="region"
            aria-label={metric.ariaLabel}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${metric.color}`}>
                {metric.icon}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  <span className="text-sm font-normal text-gray-600">{metric.unit}</span>
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700 mb-2">{metric.label}</div>
            {metric.showProgressBar && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    metric.percentage >= 70
                      ? 'bg-green-500'
                      : metric.percentage >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${metric.percentage}%` }}
                  role="progressbar"
                  aria-valuenow={metric.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progress: ${metric.percentage}%`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
