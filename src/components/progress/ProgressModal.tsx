/**
 * ProgressModal Component
 * Story 3.5: AC-3.5.8 - Modal wrapper for Multi-Dimensional Progress Dashboard
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { X } from 'lucide-react';
import { RPCClient } from '@/lib/rpc/client';
import type { MultiDimensionalProgressData } from '@/lib/rpc/types';
import { MultiDimensionalProgressDashboard } from './MultiDimensionalProgressDashboard';

interface ProgressModalProps {
  open: boolean;
  onClose: () => void;
  onStartPractice?: () => void;
}

export function ProgressModal({ open, onClose, onStartPractice }: ProgressModalProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [progressData, setProgressData] = useState<MultiDimensionalProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isLoaded || !isSignedIn) {
      return;
    }

    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);

        const getAuthToken = async () => {
          if (!isLoaded || !isSignedIn) {
            throw new Error('User not authenticated');
          }
          const token = await getToken();
          if (!token) {
            throw new Error('Failed to get authentication token');
          }
          return token;
        };

        const client = new RPCClient(getAuthToken);
        const data = await client.getMultiDimensionalProgress();
        setProgressData(data);
      } catch (err) {
        console.error('Failed to fetch multi-dimensional progress:', err);
        setError(err instanceof Error ? err.message : 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [open, isLoaded, isSignedIn, getToken]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="progress-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 id="progress-modal-title" className="text-2xl font-bold text-gray-900">
            Your Progress Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close progress dashboard"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600">Loading your progress...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Progress
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && progressData && (
            <MultiDimensionalProgressDashboard
              progressData={progressData}
              onStartPractice={() => {
                onClose(); // Close progress modal
                onStartPractice?.(); // Open practice modal
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
