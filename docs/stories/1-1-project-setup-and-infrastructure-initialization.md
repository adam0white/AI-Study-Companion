# Story 1.1: Project Setup and Infrastructure Initialization

Status: review

## Story

As a **developer**,
I want **project structure, build system, and deployment pipeline configured**,
so that **all subsequent development work has a solid foundation**.

## Acceptance Criteria

1. **AC-1.1.1:** Cloudflare Workers project structure initialized with TypeScript
   - Project created using `npm create cloudflare@latest` with React + Vite template
   - TypeScript configuration (`tsconfig.json`) with strict mode enabled
   - Project structure follows Cloudflare best practices (src/, public/, etc.)

2. **AC-1.1.2:** Build system configured (Vite for React, Wrangler for Workers)
   - Vite configuration (`vite.config.ts`) for React frontend builds
   - Wrangler configuration (`wrangler.jsonc`) for Workers deployment
   - Build scripts in `package.json` (dev, build, deploy)

3. **AC-1.1.3:** Basic deployment pipeline (wrangler.jsonc configured)
   - Wrangler configuration file with compatibility_date, account_id
   - Durable Objects namespace binding configured
   - D1 database binding configured
   - R2 bucket binding configured (for future session storage)
   - Environment variables configured

4. **AC-1.1.4:** Core dependencies installed (Workers, Durable Objects, D1, Clerk)
   - `@cloudflare/workers-types` for TypeScript types
   - `@clerk/clerk-js` for authentication
   - `@tanstack/react-query` for data fetching
   - `shadcn/ui` initialized with Tailwind CSS
   - `lucide-react` for icons
   - All dependencies listed in `package.json`

5. **AC-1.1.5:** Development environment ready for local testing
   - `wrangler dev` command works for local development
   - Vite dev server can run alongside Wrangler
   - Hot module replacement (HMR) functional
   - Local D1 database can be created and accessed

6. **AC-1.1.6:** Git repository initialized with appropriate .gitignore
   - `.gitignore` includes node_modules/, .wrangler/, dist/, build/
   - Git repository initialized (if not already)
   - Initial commit with project structure

7. **AC-1.1.7:** Project structure follows Cloudflare best practices
   - Directory structure matches Architecture document specification
   - Source files organized in `src/` directory
   - Durable Objects in `src/durable-objects/`
   - Components in `src/components/`
   - Library utilities in `src/lib/`

8. **AC-1.1.8:** Can deploy a basic "Hello World" worker to Cloudflare
   - Worker entry point (`src/worker.ts`) exists and responds to requests
   - `wrangler deploy` command succeeds
   - Worker accessible at deployed URL
   - Basic health check endpoint returns success

## Tasks / Subtasks

- [x] **Task 1: Initialize Cloudflare Workers Project** (AC: 1)
  - [x] Run `npm create cloudflare@latest ai-study-companion -- --type=web-app --framework=react --git=true`
  - [x] Verify project structure created correctly
  - [x] Verify TypeScript configuration (`tsconfig.json`) exists with strict mode
  - [x] Verify `package.json` has correct scripts

- [x] **Task 2: Configure Build System** (AC: 2)
  - [x] Verify `vite.config.ts` configured for React
  - [x] Verify `wrangler.jsonc` exists with basic configuration
  - [x] Add build scripts to `package.json` if missing
  - [x] Test `npm run dev` starts both Vite and Wrangler

- [x] **Task 3: Configure Wrangler Deployment** (AC: 3)
  - [x] Create/update `wrangler.jsonc` with compatibility_date: "2025-02-11"
  - [x] Add Durable Objects namespace binding (COMPANION)
  - [x] Add D1 database binding (DB)
  - [x] Add R2 bucket binding (R2)
  - [x] Configure account_id (or use `wrangler whoami` to get it)
  - [x] Verify configuration syntax is valid

- [x] **Task 4: Install Core Dependencies** (AC: 4)
  - [x] Install `@cloudflare/workers-types` as dev dependency
  - [x] Install `@clerk/clerk-js` for authentication
  - [x] Install `@tanstack/react-query` for data fetching
  - [x] Install `class-variance-authority clsx tailwind-merge` for UI utilities
  - [x] Install `lucide-react` for icons
  - [x] Initialize shadcn/ui: `npx shadcn@latest init`
  - [x] Verify all dependencies in `package.json`

- [x] **Task 5: Set Up Development Environment** (AC: 5)
  - [x] Test `wrangler dev` command works
  - [x] Test Vite dev server runs (`npm run dev`)
  - [x] Verify HMR works for React components
  - [x] D1 database auto-provisioned via Wrangler 4.45+ (no manual creation needed)
  - [x] Database binding auto-configured

- [x] **Task 6: Configure Git Repository** (AC: 6)
  - [x] Verify `.gitignore` includes: node_modules/, .wrangler/, dist/, build/, .env
  - [x] Initialize git repository if not already initialized
  - [x] Create initial commit with project structure

- [x] **Task 7: Organize Project Structure** (AC: 7)
  - [x] Create `src/durable-objects/` directory
  - [x] Create `src/components/` directory structure (ui/, chat/, practice/, progress/, layout/)
  - [x] Create `src/lib/` directory structure (rpc/, auth.ts, db/, ai/, utils.ts)
  - [x] Create `src/types/` directory
  - [x] Create `src/hooks/` directory
  - [x] Verify structure matches Architecture document

- [x] **Task 8: Create Basic Worker Entry Point** (AC: 8)
  - [x] Create `src/worker.ts` with basic fetch handler
  - [x] Add route to serve React app (index.html)
  - [x] Add route to serve static assets
  - [x] Add basic health check endpoint (`/health`)
  - [x] Test `wrangler deploy` succeeds
  - [x] Verify deployed worker responds at URL (study.adamwhite.work)
  - [x] Test health check endpoint returns success

- [x] **Task 9: Configure Clerk Authentication** (AC: 4 - subset)
  - [x] Set up Clerk account and application
  - [x] Store Clerk secret key: `wrangler secret put CLERK_SECRET_KEY`
  - [x] Add Clerk publishable key to `wrangler.jsonc` environment variables
  - [x] Create basic JWT validation middleware structure in `src/lib/auth.ts`
  - [x] Verify Clerk SDK can be imported in React components

- [x] **Task 10: Testing Setup** (All ACs)
  - [x] Verify project builds without errors: `npm run build`
  - [x] Verify TypeScript compilation passes: `npx tsc --noEmit`
  - [x] Test local development server starts: `npm run dev`
  - [x] Test deployment: `wrangler deploy`
  - [x] Verify deployed worker is accessible at study.adamwhite.work

## Dev Notes

### Architecture Patterns and Constraints

**Project Initialization Pattern:**
- Follow the exact command sequence from Architecture document "Project Initialization" section
- Use `npm create cloudflare@latest` with `--type=web-app --framework=react` flags
- This creates the base structure with React + Vite + Workers integration

**Technology Stack Constraints:**
- Must use Cloudflare Workers runtime (no alternative)
- Must use TypeScript with strict mode (Architecture requirement)
- Must use React + Vite for frontend (Architecture decision)
- Must use Durable Objects for stateful instances (Pattern 1 requirement)
- Must use D1 for structured data storage (Architecture decision)
- Must use Clerk for authentication (Architecture decision)
- Must use shadcn/ui + Tailwind CSS for UI components (UX Design requirement)

**Project Structure Requirements:**
- Follow the exact directory structure from Architecture "Project Structure" section
- Durable Objects must be in `src/durable-objects/StudentCompanion.ts`
- RPC client must be in `src/lib/rpc/client.ts` with shared types in `src/lib/rpc/types.ts`
- Components organized by feature: chat/, practice/, progress/, layout/

**Wrangler Configuration:**
- Use `wrangler.jsonc` (JSON with comments) for configuration
- Set `compatibility_date: "2025-02-11"` as specified in Architecture
- Configure Durable Objects namespace: `COMPANION` binding
- Configure D1 database: `DB` binding
- Configure R2 bucket: `R2` binding (for session transcript storage)
- Enable `nodejs_compat` flag for Node.js API compatibility

**Clerk Authentication Setup:**
- Install `@clerk/clerk-js` client SDK
- Store Clerk secret key in Cloudflare secrets (not in code)
- Configure Clerk publishable key in `wrangler.jsonc` environment variables
- Create JWT validation middleware structure (full implementation in Story 1.2)
- See Architecture "Authentication Flow" section for complete integration pattern

**Database Setup:**
- Create D1 database via `wrangler d1 create` command
- Add database binding to `wrangler.jsonc`
- Schema initialization deferred to Story 1.3 (isolated database per companion)

### Project Structure Notes

**Alignment with Unified Project Structure:**
- Project root: `ai-study-companion/`
- Source code: `src/` directory
- Worker entry: `src/worker.ts` (routes requests, serves React app)
- Durable Objects: `src/durable-objects/StudentCompanion.ts`
- Frontend entry: `src/main.tsx` (React app entry point)
- Components: `src/components/` with subdirectories (ui/, chat/, practice/, progress/, layout/)
- Library utilities: `src/lib/` with subdirectories (rpc/, db/, ai/)
- Types: `src/types/` (shared TypeScript interfaces)
- Hooks: `src/hooks/` (React hooks for RPC, WebSocket, auth)
- Static assets: `public/assets/`
- Configuration: `wrangler.jsonc`, `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`

**No Conflicts Detected:**
- Structure aligns perfectly with Architecture document specification
- All required directories can be created without conflicts

### Learnings from Previous Story

**First story in epic - no predecessor context**

This is the foundation story that establishes the project structure and development environment. All subsequent stories will build upon this foundation.

### References

- [Source: docs/epics.md#Story-1.1-Project-Setup-and-Infrastructure-Initialization] - Story requirements and acceptance criteria
- [Source: docs/tech-spec-epic-1.md#AC-1.1-Project-Setup-Complete] - Detailed acceptance criteria from tech spec
- [Source: docs/architecture.md#Project-Initialization] - Exact initialization commands and setup process
- [Source: docs/architecture.md#Decision-Summary] - Technology stack decisions and versions
- [Source: docs/architecture.md#Project-Structure] - Complete directory structure specification
- [Source: docs/architecture.md#Technology-Stack-Details] - Detailed technology versions and configuration
- [Source: docs/architecture.md#Integration-Points] - Authentication flow and integration patterns
- [Source: docs/PRD.md#Project-Classification] - Web application requirements and platform constraints

## Dev Agent Record

### Context Reference

- docs/stories/1-1-project-setup-and-infrastructure-initialization.context.xml

### Agent Model Used

Claude Sonnet 4.5 (via Cursor)

### Debug Log References

None required - straightforward implementation following architecture specification.

### Completion Notes List

**Implementation Approach:**
- Initialized React + Vite project structure manually since `create-cloudflare` requires empty directory
- Installed all core dependencies including Cloudflare Workers types, Clerk, React Query, Tailwind CSS, and shadcn/ui
- Configured TypeScript with strict mode and Cloudflare Workers types
- Created worker entry point with health check endpoint and asset serving
- Set up complete project directory structure per architecture specification
- Created placeholder Durable Object and auth middleware (full implementation in subsequent stories)
- Configured wrangler.jsonc with all required bindings (Durable Objects, D1, R2)
- Configured Tailwind CSS v4 with shadcn/ui integration

**Completed with User:**
- Cloudflare authentication via `wrangler login`
- D1 database auto-provisioned via Wrangler 4.45+ (Oct 2024 feature)
- R2 bucket auto-provisioned automatically
- Clerk account setup and API keys configured
- Successfully deployed to production at study.adamwhite.work

**Key Learnings:**
- Wrangler 4.45+ (Oct 2024) introduced automatic resource provisioning - no manual `d1 create` or `r2 bucket create` needed
- Durable Objects must extend `DurableObject` base class from `cloudflare:workers`
- Durable Objects require `migrations` section in wrangler.jsonc for new classes
- When DO is in same script, omit `script_name` from bindings
- Custom domain routes require boolean `true` not string `"true"`

**Verifications Completed:**
- ✅ TypeScript compilation passes (`npx tsc --noEmit`)
- ✅ Project builds successfully (`npm run build`)
- ✅ Git repository initialized with proper .gitignore
- ✅ All dependencies installed and verified in package.json
- ✅ Directory structure matches Architecture document
- ✅ Local development server working (`npm run dev`)
- ✅ Production deployment successful to study.adamwhite.work
- ✅ Health check endpoint responding correctly
- ✅ All Cloudflare bindings configured (DO, D1, R2, Assets)

### File List

**Created Files:**
- `.gitignore` - Git ignore patterns for Node.js, Cloudflare, and build artifacts
- `.dev.vars.example` - Example environment variables file for Clerk keys
- `package.json` - Project dependencies and scripts
- `package-lock.json` - Dependency lock file
- `tsconfig.json` - TypeScript configuration root
- `tsconfig.app.json` - TypeScript configuration for application code
- `tsconfig.node.json` - TypeScript configuration for Node.js tools
- `vite.config.ts` - Vite build configuration with path aliases
- `tailwind.config.js` - Tailwind CSS configuration with UX design theme
- `postcss.config.js` - PostCSS configuration for Tailwind
- `components.json` - shadcn/ui configuration
- `wrangler.jsonc` - Cloudflare Workers configuration with DO migrations
- `index.html` - HTML entry point for React app
- `README.md` - Project documentation and setup guide
- `src/worker.ts` - Cloudflare Worker entry point with health check
- `src/main.tsx` - React application entry point
- `src/App.tsx` - React root component (Vite template)
- `src/App.css` - Component styles (Vite template)
- `src/index.css` - Global styles with Tailwind directives
- `src/durable-objects/StudentCompanion.ts` - Durable Object class extending cloudflare:workers base
- `src/lib/auth.ts` - Clerk JWT validation structure (placeholder)
- `src/lib/utils.ts` - Utility functions (cn helper for Tailwind)
- `public/vite.svg` - Vite logo asset

**Created Directories:**
- `src/components/ui/` - shadcn/ui components
- `src/components/chat/` - Chat interface components
- `src/components/practice/` - Practice question components
- `src/components/progress/` - Progress tracking components
- `src/components/layout/` - Layout components
- `src/lib/rpc/` - RPC client directory
- `src/lib/db/` - Database utilities directory
- `src/lib/ai/` - AI integration directory
- `src/types/` - TypeScript type definitions
- `src/hooks/` - React custom hooks
- `src/assets/` - Static assets
- `public/` - Public static files
- `dist/` - Build output directory (created by build process)

