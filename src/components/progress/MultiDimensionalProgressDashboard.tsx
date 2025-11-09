/**
 * MultiDimensionalProgressDashboard Component
 * Story 3.5: AC-3.5.5, 3.5.7, 3.5.8
 * Main dashboard displaying multi-dimensional progress with tabbed interface
 */

import { useState } from 'react';
import type { MultiDimensionalProgressData } from '../../lib/rpc/types';
import { SubjectProgressCard } from './SubjectProgressCard';
import { ProgressOverTimeChart } from './ProgressOverTimeChart';
import { OverallProgressMetrics } from './OverallProgressMetrics';

interface MultiDimensionalProgressDashboardProps {
  progressData: MultiDimensionalProgressData;
}

type TabType = 'overall' | 'bySubject' | 'overTime';

export function MultiDimensionalProgressDashboard({
  progressData,
}: MultiDimensionalProgressDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overall');

  const tabs = [
    { id: 'overall' as TabType, label: 'Overall', icon: '📊' },
    { id: 'bySubject' as TabType, label: 'By Subject', icon: '📚' },
    { id: 'overTime' as TabType, label: 'Over Time', icon: '📈' },
  ];

  // Empty state check
  const hasData = progressData.overall.practiceSessionsCompleted > 0;

  if (!hasData) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>
        <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Start Your Learning Journey!
          </h3>
          <p className="text-gray-600 text-center max-w-md mb-6 px-4">
            Complete your first practice session to see your progress here. Track your mastery,
            completion rates, and growth over time.
          </p>
          <button
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            onClick={() => {
              // Navigate to practice - this will be implemented in integration
              console.log('Navigate to practice');
            }}
          >
            Start Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6" role="tablist" aria-label="Progress views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                const nextIndex = (tabs.findIndex((t) => t.id === activeTab) + 1) % tabs.length;
                setActiveTab(tabs[nextIndex].id);
              } else if (e.key === 'ArrowLeft') {
                const prevIndex =
                  (tabs.findIndex((t) => t.id === activeTab) - 1 + tabs.length) % tabs.length;
                setActiveTab(tabs[prevIndex].id);
              }
            }}
          >
            <span className="text-lg" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-96">
        {/* Overall Tab */}
        {activeTab === 'overall' && (
          <div
            role="tabpanel"
            id="panel-overall"
            aria-labelledby="tab-overall"
            className="animate-fadeIn"
          >
            <OverallProgressMetrics overallData={progressData.overall} />
          </div>
        )}

        {/* By Subject Tab */}
        {activeTab === 'bySubject' && (
          <div
            role="tabpanel"
            id="panel-bySubject"
            aria-labelledby="tab-bySubject"
            className="animate-fadeIn"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Subject</h3>
            {progressData.bySubject.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>No subjects tracked yet. Complete practice sessions to see subject progress.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {progressData.bySubject.map((subject) => (
                  <SubjectProgressCard key={subject.subject} subjectProgress={subject} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Over Time Tab */}
        {activeTab === 'overTime' && (
          <div
            role="tabpanel"
            id="panel-overTime"
            aria-labelledby="tab-overTime"
            className="animate-fadeIn"
          >
            <ProgressOverTimeChart timeSeriesData={progressData.byTime} />
          </div>
        )}
      </div>
    </div>
  );
}
