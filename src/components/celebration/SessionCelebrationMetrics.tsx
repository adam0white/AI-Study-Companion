/**
 * Session Celebration Metrics Component
 * Displays progress metrics with visual indicators
 * Story 5.1: AC-5.1.3, AC-5.1.7 - Progress highlights visualization
 */

import { useState, useEffect } from 'react';
import type { SessionMetrics } from '../../lib/types/celebration';
import { TrendingUp, Target, BookOpen, Zap } from 'lucide-react';

interface SessionCelebrationMetricsProps {
  metrics: SessionMetrics;
  animationDelay?: number; // milliseconds
  reduceMotion?: boolean;
}

export function SessionCelebrationMetrics({
  metrics,
  animationDelay = 300,
  reduceMotion = false,
}: SessionCelebrationMetricsProps) {
  const [isVisible, setIsVisible] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay, reduceMotion]);

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return 'text-purple-500';
    if (accuracy >= 80) return 'text-blue-500';
    if (accuracy >= 70) return 'text-green-500';
    return 'text-gray-500';
  };

  const getAccuracyBgColor = (accuracy: number): string => {
    if (accuracy >= 90) return 'bg-purple-100';
    if (accuracy >= 80) return 'bg-blue-100';
    if (accuracy >= 70) return 'bg-green-100';
    return 'bg-gray-100';
  };

  return (
    <div
      className={`
        grid grid-cols-1 md:grid-cols-2 gap-4
        transition-all duration-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Accuracy Metric */}
      <MetricCard
        icon={<Target className="w-6 h-6" />}
        label="Accuracy"
        value={`${Math.round(metrics.accuracy)}%`}
        description={`${metrics.correctAnswers}/${metrics.questionsAnswered} correct`}
        color={getAccuracyColor(metrics.accuracy)}
        bgColor={getAccuracyBgColor(metrics.accuracy)}
        animationDelay={animationDelay}
        reduceMotion={reduceMotion}
      />

      {/* Questions Answered Metric */}
      <MetricCard
        icon={<BookOpen className="w-6 h-6" />}
        label="Questions"
        value={metrics.questionsAnswered.toString()}
        description="questions answered"
        color="text-indigo-500"
        bgColor="bg-indigo-100"
        animationDelay={animationDelay + 200}
        reduceMotion={reduceMotion}
      />

      {/* Topics Learned Metric */}
      <MetricCard
        icon={<Zap className="w-6 h-6" />}
        label="Topics"
        value={metrics.topicsLearned.length.toString()}
        description={metrics.topicsLearned.join(', ')}
        color="text-cyan-500"
        bgColor="bg-cyan-100"
        animationDelay={animationDelay + 400}
        reduceMotion={reduceMotion}
      />

      {/* Knowledge Gain / Improvement Metric */}
      {metrics.comparisonToPrevious && metrics.comparisonToPrevious.accuracyChange > 0 ? (
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Improvement"
          value={`+${Math.round(metrics.comparisonToPrevious.accuracyChange)}%`}
          description={metrics.comparisonToPrevious.speedImprovement}
          color="text-green-500"
          bgColor="bg-green-100"
          animationDelay={animationDelay + 600}
          reduceMotion={reduceMotion}
        />
      ) : (
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Knowledge Gain"
          value="📚"
          description={metrics.estimatedKnowledgeGain}
          color="text-pink-500"
          bgColor="bg-pink-100"
          animationDelay={animationDelay + 600}
          reduceMotion={reduceMotion}
        />
      )}

      {/* Streak Metric (if applicable) */}
      {metrics.streak && metrics.streak > 1 && (
        <div className="col-span-1 md:col-span-2">
          <MetricCard
            icon={<span className="text-2xl">🔥</span>}
            label="Streak"
            value={`${metrics.streak} days`}
            description="Keep that momentum going!"
            color="text-orange-500"
            bgColor="bg-orange-100"
            animationDelay={animationDelay + 800}
            reduceMotion={reduceMotion}
          />
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  color: string;
  bgColor: string;
  animationDelay: number;
  reduceMotion: boolean;
}

function MetricCard({
  icon,
  label,
  value,
  description,
  color,
  bgColor,
  animationDelay,
  reduceMotion,
}: MetricCardProps) {
  const [isVisible, setIsVisible] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay, reduceMotion]);

  return (
    <div
      className={`
        flex items-center gap-4 p-4 rounded-lg ${bgColor}
        transition-all duration-500
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
    >
      <div className={`${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-600 font-medium">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-gray-500 truncate">{description}</div>
      </div>
    </div>
  );
}
