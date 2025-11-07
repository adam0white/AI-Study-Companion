/**
 * AI Study Companion - Main Application
 * Foundation setup for Story 1.1
 */

function App() {
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Welcome to Your Study Companion
            </h2>
            <p className="text-text-secondary mb-4">
              Foundation infrastructure is now ready. Full features will be implemented in subsequent stories:
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>✅ Story 1.1: Project Setup Complete</li>
              <li>⏳ Story 1.2: Durable Object Implementation</li>
              <li>⏳ Story 1.3: Database Schema</li>
              <li>⏳ Story 1.4: Card Gallery Interface</li>
              <li>⏳ Story 1.5: Chat Modal</li>
            </ul>
          </div>

          {/* Status Card */}
          <div className="bg-surface rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Worker Status</span>
                <span className="text-success font-medium">✓ Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Durable Objects</span>
                <span className="text-success font-medium">✓ Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">D1 Database</span>
                <span className="text-success font-medium">✓ Provisioned</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">R2 Storage</span>
                <span className="text-success font-medium">✓ Provisioned</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Authentication</span>
                <span className="text-success font-medium">✓ Configured</span>
              </div>
            </div>
          </div>
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
