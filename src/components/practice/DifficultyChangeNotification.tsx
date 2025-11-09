/**
 * Difficulty Change Notification Component
 * Story 3.2: AC-3.2.5, AC-3.2.6 - Visual feedback for difficulty changes
 *
 * Displays a temporary notification when difficulty level changes
 */

import { useEffect, useState } from 'react';

export interface DifficultyChangeNotificationProps {
  previousDifficulty: number;
  newDifficulty: number;
  onDismiss: () => void;
}

export default function DifficultyChangeNotification({
  previousDifficulty,
  newDifficulty,
  onDismiss,
}: DifficultyChangeNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const isIncrease = newDifficulty > previousDifficulty;
  const message = isIncrease
    ? `Difficulty increased to Level ${newDifficulty}! Great job!`
    : `Difficulty adjusted to Level ${newDifficulty}`;

  useEffect(() => {
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2
                  px-6 py-3 rounded-lg shadow-lg
                  transition-opacity duration-300
                  ${isVisible ? 'opacity-100' : 'opacity-0'}
                  ${isIncrease ? 'bg-purple-500' : 'bg-gray-600'} text-white`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {isIncrease ? '⬆' : '⬇'}
        </span>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}
