/**
 * AI Study Companion - Main Application
 * Story 1.4: Card Gallery Home Interface
 */

import { MessageCircle, BookOpen, TrendingUp } from 'lucide-react';
import { CardGallery, ActionCardsGrid } from '@/components/layout/CardGallery';
import { HeroCard } from '@/components/layout/HeroCard';
import { ActionCard } from '@/components/layout/ActionCard';

function App() {
  // Placeholder click handlers (will be connected to routes in future stories)
  const handleChatClick = () => {
    console.log('Chat feature clicked - will be implemented in Story 1.5');
  };

  const handlePracticeClick = () => {
    console.log('Practice feature clicked - will be implemented in future story');
  };

  const handleProgressClick = () => {
    console.log('Progress feature clicked - will be implemented in Story 1.9');
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

              {/* Progress Card */}
              <ActionCard
                icon={<TrendingUp className="w-12 h-12 text-primary" />}
                title="Progress"
                description="View your learning progress and track your achievements"
                onClick={handleProgressClick}
              />
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
    </div>
  );
}

export default App;
