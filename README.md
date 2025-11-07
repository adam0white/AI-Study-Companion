# AI Study Companion

An intelligent AI-powered study companion built on Cloudflare's Developer Platform.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Durable Objects
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Authentication**: Clerk

## Project Status

✅ **Story 1.1 Complete** - Foundation setup ready  
🚀 **Deployed**: https://study.adamwhite.work  
⏳ **Next**: Story 1.2 - Durable Object Implementation

## ⚠️ Security Notice

**The current Clerk JWT validation is INSECURE and for development only.**

`src/lib/auth.ts` contains a placeholder implementation that does NOT verify JWT signatures. This means tokens can be forged. **DO NOT use with real data or deploy to production** until Story 1.2 implements proper JWKS-based verification.

See [SECURITY.md](./SECURITY.md) for details on secret management.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Cloudflare account (free tier available)
- Clerk account (free tier available)

### Initial Setup (Completed)

The following has been set up:

- ✅ Project structure with TypeScript
- ✅ Build system (Vite + Wrangler)
- ✅ All dependencies installed
- ✅ Tailwind CSS + shadcn/ui configured
- ✅ Git repository initialized
- ✅ Worker entry point with health check
- ✅ Durable Objects structure

### Manual Steps Required

#### 1. Cloudflare Authentication

```bash
# Login to Cloudflare
npx wrangler login

# Verify authentication
npx wrangler whoami
```

#### 2. Cloudflare Resources (Auto-Provisioned)

**Good news!** If you're using Wrangler v4.45+ (which this project uses), D1 and R2 resources are **automatically provisioned** on your first deploy. No manual creation needed!

The first time you run `npm run deploy`, Wrangler will:
- ✨ Automatically create the D1 database: `ai-study-companion-db`
- ✨ Automatically create the R2 bucket: `ai-study-companion-storage`
- ✨ Write the resource IDs back to your `wrangler.jsonc`

**Manual Creation (Optional):**

If you prefer to create resources manually first, you can:

```bash
# Optional: Create D1 database manually
npx wrangler d1 create ai-study-companion-db
# Copy the database_id from output and update wrangler.jsonc

# Optional: Create R2 bucket manually
npx wrangler r2 bucket create ai-study-companion-storage
```

**Learn more:** [Automatic Resource Provisioning (Cloudflare, Oct 2024)](https://developers.cloudflare.com/changelog/2025-10-24-automatic-resource-provisioning/)

#### 3. Set Up Clerk Authentication

1. Create account at [clerk.com](https://clerk.com)
2. Create new application
3. Copy your keys to `.dev.vars`:

```bash
# Copy example file
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your Clerk keys
CLERK_SECRET_KEY=sk_test_YOUR_KEY
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
```

4. Store production secret in Cloudflare:

```bash
npx wrangler secret put CLERK_SECRET_KEY
# Paste your production secret key
```

5. Update `wrangler.jsonc` with your publishable key in the `vars` section

#### 4. Local Development

```bash
# Install dependencies (if not already done)
npm install

# Start local development server
npm run dev
```

The dev server will start on `http://localhost:8787`

#### 5. Deploy to Cloudflare

```bash
# Build the project
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Project Structure

```
src/
├── worker.ts                    # Cloudflare Worker entry point
├── durable-objects/            # Durable Object classes
│   └── StudentCompanion.ts
├── components/                 # React components
│   ├── ui/                    # shadcn/ui components
│   ├── chat/                  # Chat interface
│   ├── practice/              # Practice questions
│   ├── progress/              # Progress tracking
│   └── layout/                # Layout components
├── lib/                       # Utility libraries
│   ├── rpc/                   # RPC client
│   ├── db/                    # Database utilities
│   ├── ai/                    # AI integration
│   ├── auth.ts                # Authentication utilities
│   └── utils.ts               # General utilities
├── types/                     # TypeScript type definitions
└── hooks/                     # React hooks
```

## Available Scripts

- `npm run dev` - Start local development server with Wrangler
- `npm run build` - Build for production
- `npm run deploy` - Deploy to Cloudflare
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Health Check

Once deployed, verify the worker is running:

```bash
curl https://your-worker-url.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T...",
  "service": "ai-study-companion"
}
```

## Next Steps

After completing the setup:

1. Implement full Durable Objects functionality (Story 1.2)
2. Set up database schema (Story 1.3)
3. Build UI components (Stories 1.4-1.6)
4. Integrate memory system (Story 1.7)

## Documentation

- [Product Requirements](./docs/PRD.md)
- [Architecture](./docs/architecture.md)
- [UX Design](./docs/ux-design-specification.md)
- [Epic Breakdown](./docs/epics.md)

## License

Private project

