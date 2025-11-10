/**
 * Session Celebration Modal Component
 * Main celebration display after session completion
 * Story 5.1: AC-5.1.1, AC-5.1.5, AC-5.1.8, AC-5.1.9 - Full celebration experience
 */

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { CelebrationData } from '../../lib/types/celebration';
import { SessionCelebrationBadge } from './SessionCelebrationBadge';
import { SessionCelebrationMetrics } from './SessionCelebrationMetrics';

interface SessionCelebrationProps {
  celebrationData: CelebrationData;
  onDismiss: () => void;
  onStartPractice?: () => void;
}

export function SessionCelebration({
  celebrationData,
  onDismiss,
  onStartPractice,
}: SessionCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    // Listener for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => {
      clearTimeout(timer);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    // Handle Escape key to dismiss
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onDismiss]);

  const gradientClass = celebrationData.backgroundColor || 'from-purple-500 to-pink-500';

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black bg-opacity-50 backdrop-blur-sm
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <div
        className={`
          relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
          bg-white rounded-2xl shadow-2xl
          transform transition-all duration-300
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className={`relative bg-gradient-to-r ${gradientClass} p-8 rounded-t-2xl text-white`}>
          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            aria-label="Close celebration"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Celebration Icon/Emoji */}
          {celebrationData.emoji && (
            <div className="text-6xl mb-4 animate-bounce" aria-hidden="true">
              {celebrationData.emoji}
            </div>
          )}

          {/* Title */}
          <h2
            id="celebration-title"
            className="text-3xl font-bold mb-2 flex items-center gap-2"
          >
            <Sparkles className="w-8 h-8" />
            {celebrationData.title}
          </h2>

          {/* Message */}
          <p className="text-lg opacity-95">{celebrationData.message}</p>
        </div>

        {/* Content Area */}
        <div className="p-8 space-y-8">
          {/* Metrics Section */}
          <section aria-labelledby="metrics-heading">
            <h3 id="metrics-heading" className="text-xl font-semibold mb-4 text-gray-900">
              Session Highlights
            </h3>
            <SessionCelebrationMetrics
              metrics={celebrationData.metrics}
              animationDelay={300}
              reduceMotion={reduceMotion}
            />
          </section>

          {/* Achievement Badges Section */}
          {celebrationData.achievements.length > 0 && (
            <section aria-labelledby="badges-heading">
              <h3 id="badges-heading" className="text-xl font-semibold mb-4 text-gray-900">
                Achievements Unlocked
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {celebrationData.achievements.map((badge, index) => (
                  <SessionCelebrationBadge
                    key={badge.id}
                    badge={badge}
                    animationDelay={600 + index * 200}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {onStartPractice && (
              <button
                onClick={() => {
                  onStartPractice();
                  onDismiss();
                }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white
                         px-6 py-3 rounded-lg font-semibold
                         hover:from-purple-600 hover:to-pink-600
                         transition-all duration-200 transform hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Continue to Practice
              </button>
            )}
            <button
              onClick={onDismiss}
              className="flex-1 bg-gray-100 text-gray-700
                       px-6 py-3 rounded-lg font-semibold
                       hover:bg-gray-200
                       transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Awesome, Thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
