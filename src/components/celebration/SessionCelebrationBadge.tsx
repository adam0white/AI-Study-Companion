/**
 * Session Celebration Badge Component
 * Displays individual achievement badge with unlock animation
 * Story 5.1: AC-5.1.4, AC-5.1.5 - Badge display with animations
 */

import { useState, useEffect } from 'react';
import type { AchievementBadge } from '../../lib/types/celebration';
import { getBadgeGradient } from '../../lib/companion/achievement-badges';

interface SessionCelebrationBadgeProps {
  badge: AchievementBadge;
  animationDelay?: number; // milliseconds
  reduceMotion?: boolean;
}

export function SessionCelebrationBadge({
  badge,
  animationDelay = 0,
  reduceMotion = false,
}: SessionCelebrationBadgeProps) {
  const [isVisible, setIsVisible] = useState(!!reduceMotion);
  const [showTooltip, setShowTooltip] = useState(false);

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

  const gradient = getBadgeGradient(badge.type);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          flex flex-col items-center justify-center gap-2 p-4
          rounded-lg border-2 ${badge.color} border-opacity-50
          bg-gradient-to-br ${gradient} bg-opacity-10
          transition-all duration-500
          ${
            isVisible
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-0'
          }
          ${!reduceMotion && isVisible ? 'animate-badge-unlock' : ''}
          hover:scale-105 hover:shadow-lg
          cursor-pointer
        `}
        style={{
          minWidth: '80px',
          minHeight: '80px',
        }}
      >
        {/* Badge Icon */}
        <div className="text-4xl" aria-hidden="true">
          {badge.icon}
        </div>

        {/* Badge Title */}
        <div className={`text-xs font-semibold text-center ${badge.color}`}>
          {badge.title}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-2
                     bg-gray-900 text-white text-xs rounded-lg px-3 py-2
                     shadow-xl max-w-xs whitespace-normal"
          role="tooltip"
        >
          <div className="font-semibold mb-1">{badge.title}</div>
          <div className="text-gray-300">{badge.description}</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2
                        border-4 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
}

// Add custom animation keyframes to your global CSS or Tailwind config:
// @keyframes badge-unlock {
//   0% { transform: scale(0); opacity: 0; }
//   50% { transform: scale(1.2); opacity: 1; }
//   100% { transform: scale(1); opacity: 1; }
// }
