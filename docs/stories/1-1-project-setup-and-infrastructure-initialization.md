# Story 1.1: Project Setup and Infrastructure Initialization

Status: ready-for-dev

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

- [ ] **Task 1: Initialize Cloudflare Workers Project** (AC: 1)
  - [ ] Run `npm create cloudflare@latest ai-study-companion -- --type=web-app --framework=react --git=true`
  - [ ] Verify project structure created correctly
  - [ ] Verify TypeScript configuration (`tsconfig.json`) exists with strict mode
  - [ ] Verify `package.json` has correct scripts

- [ ] **Task 2: Configure Build System** (AC: 2)
  - [ ] Verify `vite.config.ts` configured for React
  - [ ] Verify `wrangler.jsonc` exists with basic configuration
  - [ ] Add build scripts to `package.json` if missing
  - [ ] Test `npm run dev` starts both Vite and Wrangler

- [ ] **Task 3: Configure Wrangler Deployment** (AC: 3)
  - [ ] Create/update `wrangler.jsonc` with compatibility_date: "2025-02-11"
  - [ ] Add Durable Objects namespace binding (COMPANION)
  - [ ] Add D1 database binding (DB)
  - [ ] Add R2 bucket binding (R2)
  - [ ] Configure account_id (or use `wrangler whoami` to get it)
  - [ ] Verify configuration syntax is valid

- [ ] **Task 4: Install Core Dependencies** (AC: 4)
  - [ ] Install `@cloudflare/workers-types` as dev dependency
  - [ ] Install `@clerk/clerk-js` for authentication
  - [ ] Install `@tanstack/react-query` for data fetching
  - [ ] Install `class-variance-authority clsx tailwind-merge` for UI utilities
  - [ ] Install `lucide-react` for icons
  - [ ] Initialize shadcn/ui: `npx shadcn@latest init`
  - [ ] Verify all dependencies in `package.json`

- [ ] **Task 5: Set Up Development Environment** (AC: 5)
  - [ ] Test `wrangler dev` command works
  - [ ] Test Vite dev server runs (`npm run dev`)
  - [ ] Verify HMR works for React components
  - [ ] Create local D1 database: `wrangler d1 create ai-study-companion-db`
  - [ ] Add local database binding to `wrangler.jsonc` for dev environment

- [ ] **Task 6: Configure Git Repository** (AC: 6)
  - [ ] Verify `.gitignore` includes: node_modules/, .wrangler/, dist/, build/, .env
  - [ ] Initialize git repository if not already initialized
  - [ ] Create initial commit with project structure

- [ ] **Task 7: Organize Project Structure** (AC: 7)
  - [ ] Create `src/durable-objects/` directory
  - [ ] Create `src/components/` directory structure (ui/, chat/, practice/, progress/, layout/)
  - [ ] Create `src/lib/` directory structure (rpc/, auth.ts, db/, ai/, utils.ts)
  - [ ] Create `src/types/` directory
  - [ ] Create `src/hooks/` directory
  - [ ] Verify structure matches Architecture document

- [ ] **Task 8: Create Basic Worker Entry Point** (AC: 8)
  - [ ] Create `src/worker.ts` with basic fetch handler
  - [ ] Add route to serve React app (index.html)
  - [ ] Add route to serve static assets
  - [ ] Add basic health check endpoint (`/health`)
  - [ ] Test `wrangler deploy` succeeds
  - [ ] Verify deployed worker responds at URL
  - [ ] Test health check endpoint returns success

- [ ] **Task 9: Configure Clerk Authentication** (AC: 4 - subset)
  - [ ] Set up Clerk account and application
  - [ ] Store Clerk secret key: `wrangler secret put CLERK_SECRET_KEY`
  - [ ] Add Clerk publishable key to `wrangler.jsonc` environment variables
  - [ ] Create basic JWT validation middleware structure in `src/lib/auth.ts`
  - [ ] Verify Clerk SDK can be imported in React components

- [ ] **Task 10: Testing Setup** (All ACs)
  - [ ] Verify project builds without errors: `npm run build`
  - [ ] Verify TypeScript compilation passes: `npx tsc --noEmit`
  - [ ] Test local development server starts: `npm run dev`
  - [ ] Test deployment: `wrangler deploy`
  - [ ] Verify deployed worker is accessible

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

