/**
 * AI Study Companion - Main Application
 * Story 1.4: Card Gallery Home Interface
 * Story 1.9: Progress Card Component
 * Story 1.11: Integrate Real Clerk Authentication
 * Story 3.0: Practice Question Interface Component
 */

import { useState, useEffect } from 'react';
import { SignIn, SignUp, SignedIn, SignedOut, useAuth, useClerk } from '@clerk/clerk-react';
import { MessageCircle, BookOpen, LogOut } from 'lucide-react';
import { CardGallery, ActionCardsGrid } from '@/components/layout/CardGallery';
import { HeroCard } from '@/components/layout/HeroCard';
import { ActionCard } from '@/components/layout/ActionCard';
import { ChatModal } from '@/components/chat/ChatModal';
import { ProgressCard } from '@/components/progress/ProgressCard';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { PracticeSession } from '@/components/practice/PracticeSession';
import { RPCClient } from '@/lib/rpc/client';
import type { ProgressData } from '@/lib/rpc/types';

function App() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [progressRefreshTrigger, setProgressRefreshTrigger] = useState(0);

  // Fetch progress data on mount (only when authenticated)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setProgressLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setProgressLoading(true);
        setProgressError(null);

        // Real Clerk token getter (Story 1.11)
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
  }, [isLoaded, isSignedIn, getToken, progressRefreshTrigger]);

  // Handler to refresh progress after practice completion
  const handlePracticeComplete = () => {
    setProgressRefreshTrigger((prev) => prev + 1);
  };

  // Chat handler - opens chat modal (Story 1.5)
  const handleChatClick = () => {
    setIsChatOpen(true);
  };

  const handlePracticeClick = () => {
    setIsPracticeOpen(true);
  };

  const handleProgressClick = () => {
    setIsProgressOpen(true);
  };

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Show Sign-In/Sign-Up when not authenticated */}
      <SignedOut>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">
                AI Study Companion
              </h1>
              <p className="text-foreground-secondary">
                Your personalized learning assistant
              </p>
            </div>
            <div className="flex flex-col items-center">
              {showSignUp ? (
                <>
                  <SignUp
                    routing="virtual"
                    appearance={{
                      elements: {
                        footerAction: { display: 'none' }, // Hide built-in "Already have an account?" link
                      },
                    }}
                  />
                  <p className="text-center mt-4 text-sm text-foreground-secondary">
                    Already have an account?{' '}
                    <button
                      onClick={() => setShowSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <SignIn
                    routing="virtual"
                    appearance={{
                      elements: {
                        footerAction: { display: 'none' }, // Hide built-in "Don't have an account?" link
                      },
                    }}
                  />
                  <p className="text-center mt-4 text-sm text-foreground-secondary">
                    Don't have an account?{' '}
                    <button
                      onClick={() => setShowSignUp(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </SignedOut>

      {/* Show Main App when authenticated */}
      <SignedIn>
        <div className="min-h-screen bg-background text-foreground">
          {/* Header */}
          <header className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  AI Study Companion
                </h1>
                <p className="text-sm text-foreground-secondary">
                  Your personalized learning assistant
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-secondary hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
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
            <div className="container mx-auto px-4 py-6 text-center text-sm text-foreground-secondary">
              <p>AI Study Companion • Built on Cloudflare Workers</p>
            </div>
          </footer>

          {/* Chat Modal - Story 1.5 */}
          <ChatModal open={isChatOpen} onClose={() => setIsChatOpen(false)} />

          {/* Practice Modal - Story 3.0 */}
          <PracticeSession
            isOpen={isPracticeOpen}
            onClose={() => setIsPracticeOpen(false)}
            onComplete={handlePracticeComplete}
          />

          {/* Progress Modal - Story 3.5 */}
          <ProgressModal
            open={isProgressOpen}
            onClose={() => setIsProgressOpen(false)}
            onStartPractice={() => setIsPracticeOpen(true)}
          />
        </div>
      </SignedIn>
    </>
  );
}

export default App;
