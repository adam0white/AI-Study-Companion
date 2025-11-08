/**
 * AI Study Companion - Main Application
 * Story 1.4: Card Gallery Home Interface
 * Story 1.9: Progress Card Component
 */

import { useState, useEffect } from 'react';
import { MessageCircle, BookOpen } from 'lucide-react';
import { CardGallery, ActionCardsGrid } from '@/components/layout/CardGallery';
import { HeroCard } from '@/components/layout/HeroCard';
import { ActionCard } from '@/components/layout/ActionCard';
import { ChatModal } from '@/components/chat/ChatModal';
import { ProgressCard } from '@/components/progress/ProgressCard';
import { RPCClient } from '@/lib/rpc/client';
import type { ProgressData } from '@/lib/rpc/types';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Mock token getter for now (will be replaced with real Clerk auth)
  const getToken = async () => {
    // In development, return a mock token
    // In production, this would call Clerk's getToken()
    return 'mock-token-for-dev';
  };

  // Fetch progress data on mount
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setProgressLoading(true);
        setProgressError(null);

        const client = new RPCClient(getToken);
        const data = await client.call('getProgress', {}) as ProgressData;

        setProgressData(data);
      } catch (error) {
        console.error('Failed to fetch progress:', error);
        setProgressError(error instanceof Error ? error.message : 'Failed to load progress');
        // Set fallback data for zero state
        setProgressData({
          sessionCount: 0,
          recentTopics: [],
          lastSessionDate: '',
          daysActive: 0,
        });
      } finally {
        setProgressLoading(false);
      }
    };

    fetchProgress();
  }, []);

  // Chat handler - opens chat modal (Story 1.5)
  const handleChatClick = () => {
    setIsChatOpen(true);
  };

  const handlePracticeClick = () => {
    console.log('Practice feature clicked - will be implemented in future story');
  };

  const handleProgressClick = () => {
    console.log('Progress card clicked - detailed view to be implemented in future story');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">
            AI Study Companion
          </h1>
          <p className="text-sm text-text-secondary">
            Your personalized learning assistant
          </p>
        </div>
      </header>

      {/* Main Content - Card Gallery */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <CardGallery>
            {/* Hero Card - Full-width greeting */}
            <HeroCard 
              greeting="Welcome back, learner!"
            />

            {/* Action Cards Grid - Responsive 1/2/3 column layout */}
            <ActionCardsGrid>
              {/* Chat Card */}
              <ActionCard
                icon={<MessageCircle className="w-12 h-12 text-primary" />}
                title="Chat"
                description="Ask questions and get personalized help from your AI study companion"
                onClick={handleChatClick}
              />

              {/* Practice Card */}
              <ActionCard
                icon={<BookOpen className="w-12 h-12 text-primary" />}
                title="Practice"
                description="Practice questions from your sessions and reinforce your learning"
                onClick={handlePracticeClick}
              />

              {/* Progress Card - Story 1.9 */}
              {progressLoading ? (
                <ActionCard
                  title="Progress"
                  description="Loading your progress..."
                  className="animate-pulse"
                />
              ) : progressData ? (
                <ProgressCard
                  sessionCount={progressData.sessionCount}
                  recentTopics={progressData.recentTopics}
                  lastSessionDate={progressData.lastSessionDate}
                  daysActive={progressData.daysActive}
                  totalMinutesStudied={progressData.totalMinutesStudied}
                  onClick={handleProgressClick}
                />
              ) : (
                <ActionCard
                  title="Progress"
                  description={progressError || "Unable to load progress"}
                />
              )}
            </ActionCardsGrid>
          </CardGallery>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-text-secondary">
          <p>AI Study Companion • Built on Cloudflare Workers</p>
        </div>
      </footer>

      {/* Chat Modal - Story 1.5 */}
      <ChatModal open={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default App;
