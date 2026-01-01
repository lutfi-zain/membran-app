# Implementation Plan: Navigation, Routing, and Onboarding Orchestration

**Branch**: `005-navigation-routing` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-navigation-routing/spec.md`

---

## Summary

Implement the navigation backbone for membran.app: a public landing page with clear CTAs, an authenticated dashboard hub, orchestrated onboarding flow with progress tracking, and complete route registration. This feature ties together the authentication (001), bot connection (003), and pricing tier (004) features into a cohesive user journey from visitor to active server owner.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Bun 1.x
**Primary Dependencies**: React 18, TanStack Router (v7), TanStack Query, Hono (for API state checks)
**Storage**: Cloudflare D1 (SQLite) - onboarding_state table
**Testing**: Playwright (E2E), Bun test (unit/integration)
**Target Platform**: Vite dev server (local), Cloudflare Pages (production web)
**Project Type**: Web application (Monorepo - apps/web, apps/api, packages/db, packages/shared)
**Performance Goals**: Landing page <2s load, Dashboard <2s load, Route transitions <100ms
**Constraints**: Client-side routing (TanStack Router), Auth state from Feature 001, Bot status from Feature 003, Pricing state from Feature 004
**Scale/Scope**: ~1000 server owners, 3 onboarding steps, 8 primary routes

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Required Constitution Compliance

- [x] **Testing Discipline (NON-NEGOTIABLE)**: E2E tests planned for each implementation phase
  - [x] Frontend: Playwright tests for navigation flows, landing page CTAs, onboarding progression
  - [x] Backend: Playwright tests for onboarding state API, auth state checks
  - [x] Integration: Tests covering auth state → route protection, onboarding completion → dashboard redirect
- [x] **Security First**: Protected route guards (redirect to /login), input validation on return URLs
- [x] **Type Safety**: TypeScript strict mode, route type safety via TanStack Router, Zod for onboarding state validation
- [x] **API-First Design**: RESTful onboarding state endpoints (/api/onboarding/state), consistent error formats
- [x] **User-Centric Development**: Clear navigation CTAs, progress indicators, accessible routing

### E2E Testing Gate

Each implementation phase MUST include:
- [x] Test file creation (tests/navigation.spec.ts for E2E)
- [x] Tests written and passing before phase completion
- [x] Coverage for: happy path (visitor → signup → onboarding → dashboard), error cases (unauthenticated access, incomplete onboarding), edge cases (return URL handling, session expiry)
- [x] Full test suite passes with no regressions

### Architecture & Scope Review

- [x] Technology stack compliance (Bun, React, TanStack Router, Cloudflare Workers, D1, Drizzle)
- [x] Monorepo structure within limits (apps/web for frontend, apps/api for state endpoints, packages/db for schema)
- [x] Dependencies: TanStack Router for routing (new to this feature), reuses existing auth/bot/pricing dependencies
- [x] Performance constraints met (<2s page loads, <100ms route transitions)

**Status**: ✅ All gates passed. No violations. Proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-navigation-routing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── navigation.md    # Navigation flow contracts, onboarding state API
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/web (React + Vite)
├── src/
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── LandingPage.tsx        # NEW: Public landing with CTAs
│   │   │   ├── Dashboard.tsx          # NEW: Authenticated dashboard hub
│   │   │   ├── OnboardingProgress.tsx # NEW: Progress indicator component
│   │   │   └── BackLink.tsx           # NEW: Breadcrumb/Back to Dashboard link
│   │   └── [existing auth, bot, pricing components]
│   ├── pages/
│   │   ├── index.tsx                  # UPDATE: Auth-aware root route
│   │   ├── dashboard/
│   │   │   └── index.tsx              # NEW: Dashboard page route
│   │   ├── onboarding/
│   │   │   └── index.tsx              # UPDATE: Add progress indicator, step logic
│   │   └── settings/
│   │       ├── index.tsx              # UPDATE: Redirect to /settings/bot
│   │       └── pricing.tsx            # NEW: Pricing settings page
│   ├── hooks/
│   │   ├── useAuth.ts                 # EXISTING: Reuse for auth state
│   │   ├── useOnboarding.ts           # NEW: Onboarding state & progress
│   │   └── useNavigationGuard.ts      # NEW: Protected route logic
│   ├── lib/
│   │   └── navigation.ts              # NEW: Route utilities, return URL handling
│   └── main.tsx                       # UPDATE: Add new routes to router tree
│   └── tests/
│       └── e2e/
│           └── navigation.spec.ts     # NEW: E2E tests for navigation flows

apps/api (Hono)
├── src/
│   ├── routes/
│   │   └── onboarding.ts              # NEW: Onboarding state CRUD endpoints
│   └── lib/
│       └── onboarding-state.ts        # NEW: Business logic for onboarding progress
│   └── tests/
│       └── integration/
│           └── onboarding.test.ts     # NEW: API integration tests

packages/db (Drizzle + D1)
└── src/schema/
    └── onboarding-state.ts            # NEW: Onboarding progress tracking table

packages/shared (Zod schemas)
└── src/
    └── navigation.ts                  # NEW: Onboarding state, navigation types
```

**Structure Decision**: Web application (Option 2) - follows existing monorepo pattern from Features 001-004. Frontend in apps/web using React + TanStack Router, backend state management via Hono in apps/api, database schema in packages/db, shared types in packages/shared.

---

## Complexity Tracking

> No violations - this section is empty as all Constitution Checks passed.

---

## Phase 0: Research & Technical Decisions

**Status**: ✅ Complete (see [research.md](./research.md))

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| TanStack Router for navigation | Already in project (apps/web/src/main.tsx), provides type-safe routing, excellent loader support for auth checks |
| Onboarding state in D1 database | Enables cross-session persistence, supports multi-tab sync, integrates with existing Drizzle ORM pattern |
| Client-side route guards with server verification | TanStack Router `beforeLoad` for client-side protection, API middleware for server-side security |
| Progress indicator as shared component | Reusable across onboarding pages, consistent UX, centralized step logic |
| Return URL via query parameter | Standard pattern, works with TanStack Router's `search` params, preserved across auth flow |

### Technology Choices

| Component | Technology | Alternative Considered | Why Selected |
|-----------|------------|----------------------|--------------|
| Router | TanStack Router (v7) | React Router, TanStack Router v6 | Already in project, superior type safety, built-in data loading |
| State Management | TanStack Query + D1 | React Context, Zustand | Already in project, server state sync, caching for onboarding state |
| Onboarding persistence | D1 table | Cloudflare KV, Session storage | D1 integrates with existing user data, persistent across devices |
| Route protection | `beforeLoad` + API | HOCs, wrapper components | TanStack Router native pattern, cleaner code |
| Progress tracking | Step enum in DB | Boolean flags per step | Single source of truth, extensible for future steps |

### Integration Points

| Feature | Integration | Notes |
|---------|-------------|-------|
| 001 - Auth | Auth state check on protected routes | Reuse `useAuth` hook, session middleware from Feature 001 |
| 003 - Bot Connection | Bot status → onboarding step 2 completion | Query `/api/bot/status` for `bot_connected` state |
| 004 - Pricing Tiers | Pricing count → onboarding step 3 completion | Query `/api/pricing/tiers` for `pricing_configured` state |

---

## Phase 1: Design Artifacts

**Status**: ✅ Complete

### Data Model

**File**: [data-model.md](./data-model.md)

**New Table**: `onboarding_states`
- 5 columns tracking user progress through 3-step onboarding flow
- One-to-one relationship with `users` table
- State machine: none → bot_connected → pricing_configured → completed

### API Contracts

**File**: [contracts/navigation.md](./contracts/navigation.md)

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/onboarding/state` | GET | Fetch current onboarding state for authenticated user |
| `/api/onboarding/state` | PUT | Update onboarding progress (bot_connected, pricing_configured) |
| `/api/onboarding/complete` | POST | Mark onboarding as completed |

**Frontend Routes**:
| Route | Auth Required | Onboarding Required | Description |
|-------|---------------|---------------------|-------------|
| `/` | No | No | Landing page (redirects to /dashboard if authenticated) |
| `/dashboard` | Yes | Yes | Authenticated dashboard hub |
| `/onboarding` | Yes | No | Onboarding flow entry (redirects to correct step) |
| `/onboarding/bot` | Yes | No | Step 2: Connect bot |
| `/onboarding/pricing` | Yes | No | Step 3: Configure pricing |
| `/settings` | Yes | Yes | Redirects to /settings/bot |
| `/settings/bot` | Yes | Yes | Bot connection settings |
| `/settings/pricing` | Yes | Yes | Pricing tier settings |

### Quickstart Guide

**File**: [quickstart.md](./quickstart.md)

**Setup Steps**:
1. Install dependencies (TanStack Router already present)
2. Generate and apply D1 migration for onboarding_states table
3. Add new routes to apps/web/src/main.tsx
4. Implement useOnboarding hook and useNavigationGuard utility
5. Create landing page and dashboard components
6. Configure route loaders for auth/onboarding state checks
7. Test navigation flows end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Database Schema** (onboarding_states table) → BLOCKS API endpoints and frontend hooks
2. **API Endpoints** (/api/onboarding/*) → BLOCKS frontend state fetching
3. **Frontend Components** (LandingPage, Dashboard) → Can develop in parallel with API
4. **Route Registration** (main.tsx updates) → BLOCKS E2E testing
5. **Route Guards** (useNavigationGuard) → Depends on auth state (Feature 001) and onboarding state API

### Parallel Opportunities

- LandingPage component development (independent of backend)
- Dashboard component development (independent of backend)
- OnboardingProgress component (independent of backend)
- Database schema design (parallel with component development)
- API endpoint development (parallel with component development after schema is ready)

---

## Migration Plan

### Database Changes

**New Migration**: `0005_create_onboarding_states.sql` (assuming previous migrations go up to 0004)

```sql
CREATE TABLE onboarding_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bot_connected INTEGER NOT NULL DEFAULT 0, -- Boolean as integer
  pricing_configured INTEGER NOT NULL DEFAULT 0, -- Boolean as integer
  completed_at INTEGER, -- Timestamp or NULL
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_onboarding_states_user_id ON onboarding_states(user_id);
```

### Application Changes

**Breaking Changes**: None. All changes are additive.

**Route Updates** in apps/web/src/main.tsx:
- Add `dashboardRoute` (path: `/dashboard`)
- Add `settingsPricingRoute` (path: `/settings/pricing`)
- Update `indexRoute` to check auth state and redirect
- Update `settingsRoute` to redirect to `/settings/bot`

**New Components**:
- `apps/web/src/components/navigation/LandingPage.tsx`
- `apps/web/src/components/navigation/Dashboard.tsx`
- `apps/web/src/components/navigation/OnboardingProgress.tsx`
- `apps/web/src/components/navigation/BackLink.tsx`

**New Hooks**:
- `apps/web/src/hooks/useOnboarding.ts`
- `apps/web/src/hooks/useNavigationGuard.ts`

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Onboarding state desync (bot connected but state not updated) | API middleware to auto-sync state on bot connection success |
| Multiple tabs with different onboarding states | TanStack Query revalidation on window focus, optimistic updates with rollback |
| Return URL open redirect vulnerabilities | Validate return URLs against whitelist of allowed routes |
| Dashboard accessed before onboarding complete | Route loader checks onboarding state, redirects to correct step |
| Landing page load time >2s | Minimal component bundle size, lazy load non-critical assets, CDN caching |

---

## Next Steps

1. **Review this plan** and ensure all technical decisions align with project goals
2. **Run `/speckit.tasks`** to generate the implementation task breakdown
3. **Implement database schema** first (onboarding_states table)
4. **Create API endpoints** for onboarding state management
5. **Build frontend components** (LandingPage, Dashboard, OnboardingProgress)
6. **Update route configuration** in main.tsx
7. **Write E2E tests** for all navigation flows
8. **Deploy and test** with real user journeys

---

**Status**: Phase 1 (Design & Contracts) complete. Ready for `/speckit.tasks` to generate implementation tasks.
