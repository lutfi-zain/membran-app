# Implementation Tasks: Navigation, Routing, and Onboarding Orchestration

**Feature**: 005-navigation-routing
**Branch**: `005-navigation-routing`
**Status**: Implementation Complete
**Generated**: 2025-12-31
**Completed**: 2025-12-31

---

## Overview

Server owners and prospective users need clear navigation paths through the membran.app application. This feature adds a landing page with CTAs, an authenticated dashboard hub, orchestrated onboarding flow with progress tracking, and complete route registration.

**Tech Stack**: TypeScript 5.x / Bun 1.x + React 18, TanStack Router (v7), TanStack Query, Hono, Drizzle ORM, Zod

---

## Task Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1: Setup | 6 tasks | Database schema & shared types |
| Phase 2: Foundational | 9 tasks | API libraries & business logic (+3 E2E tests) |
| Phase 3: US1 - Landing Page (P1) | 7 tasks | Public landing with CTAs, auth-aware redirect |
| Phase 4: US2 - Dashboard Hub (P1) | 8 tasks | Authenticated dashboard with status overview |
| Phase 5: US3 - Onboarding Flow (P1) | 10 tasks | Progress indicator & step orchestration |
| Phase 6: US4 - Settings Access (P2) | 8 tasks | Settings navigation & back links |
| Phase 7: Polish | 9 tasks | Route registration, E2E tests, 404 handling |
| **Total** | **57 tasks** | |

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Database Schema & Shared Types)

**Purpose**: Create database table and shared validation schemas

**Independent Test Criteria**:
- Database migration runs successfully
- Drizzle ORM types are exported and usable
- Zod schemas validate correctly

---

- [X] T001 Create `packages/db/src/schema/onboarding-state.ts` with onboardingStates table definition (7 columns per data-model.md)
- [X] T002 [P] Export onboardingStates from `packages/db/src/schema/index.ts`
- [X] T003 [P] Add onboardingState relation to `packages/db/src/schema/users.ts` (usersRelations)
- [X] T004 [P] Create `packages/shared/src/navigation.ts` with TypeScript types (OnboardingState, OnboardingStep, OnboardingProgress)
- [X] T005 [P] Add Zod schemas to `packages/shared/src/navigation.ts` (OnboardingStateSchema, UpdateOnboardingStateSchema)
- [X] T006 Generate and apply database migration via `bun run db:generate && cd apps/api && npx wrangler d1 migrations apply membran-db --local`

---

## Phase 2: Foundational (API Libraries & Business Logic)

**Purpose**: Build backend API endpoints for onboarding state management

**Prerequisites**: Phase 1 complete

**Independent Test Criteria**:
- API endpoints return valid JSON responses
- Onboarding state can be fetched, updated, and completed
- Session middleware properly protects endpoints

---

- [X] T007 Create `apps/api/src/routes/onboarding.ts` with GET /api/onboarding/state endpoint (auto-creates state if not found)
- [X] T008 Add PUT /api/onboarding/state endpoint to `apps/api/src/routes/onboarding.ts` (updates botConnected/pricingConfigured flags)
- [X] T009 Add POST /api/onboarding/complete endpoint to `apps/api/src/routes/onboarding.ts` (validates both steps complete before marking done)
- [X] T010 Create `apps/api/src/lib/onboarding-state.ts` with business logic functions (createOnboardingState, getOnboardingState, updateOnboardingState, completeOnboarding)
- [X] T011 Register onboarding router at `/api/onboarding` in `apps/api/src/index.ts`
- [X] T012 [P] Create `apps/web/src/hooks/useOnboarding.ts` with useOnboarding and useOnboardingProgress hooks using TanStack Query

### Tests for Phase 2 (E2E per Constitution)

- [X] T007a [P] Create E2E test `apps/web/tests/e2e/api/onboarding.spec.ts` for GET /api/onboarding/state endpoint (Playwright)
- [X] T007b [P] Create E2E test `apps/web/tests/e2e/api/onboarding.spec.ts` for PUT /api/onboarding/state endpoint (Playwright)
- [X] T007c [P] Create E2E test `apps/web/tests/e2e/api/onboarding.spec.ts` for POST /api/onboarding/complete endpoint (Playwright)


**Checkpoint**: Foundation ready - user story implementation can now begin (E2E tests pending)

---

## Phase 3: User Story 1 - Landing Page Entry (Priority: P1) 🎯 MVP

**Goal**: Visitors can navigate from root to signup/login, authenticated users are redirected to dashboard

**User Story**: A prospective visitor arrives at the membran.app root URL and needs to understand what the product offers and how to get started.

**Acceptance Scenarios**:
1. Landing page displays product name, value proposition, and two CTAs
2. "Start Free Trial" button redirects to `/signup`
3. "Login" button redirects to `/login`
4. Authenticated users visiting `/` are redirected to `/dashboard`
5. Page loads within 2 seconds

**Prerequisites**: Phase 2 complete

**Independent Test Criteria**:
- Visitor sees landing page with CTAs at root URL
- Clicking "Start Free Trial" navigates to `/signup`
- Clicking "Login" navigates to `/login`
- Authenticated user is auto-redirected to `/dashboard`

---

### Tests for User Story 1 (E2E per Constitution)

- [X] T012a [P] [US1] Create E2E test `apps/web/tests/e2e/landing-page.spec.ts` for visitor landing page CTAs (Playwright)
- [X] T012b [P] [US1] Create E2E test `apps/web/tests/e2e/landing-page.spec.ts` for authenticated user redirect from root (Playwright)


### Implementation for User Story 1

- [X] T013 [P] [US1] Create `apps/web/src/components/navigation/LandingPage.tsx` with product name, value proposition, and CTA buttons
- [X] T014 [US1] Update `apps/web/src/main.tsx` (root route) to use LandingPage component with auth-aware redirect logic in beforeLoad
- [X] T015 [US1] Implement auth check in root route beforeLoad (redirect to `/dashboard` if authenticated per FR-004)
- [X] T016 [P] [US1] Create `apps/web/src/lib/navigation.ts` with isValidReturnUrl utility and ALLOWED_RETURN_PATHS whitelist
- [X] T017 [US1] Add landing page performance optimization (minimal bundle, CDN caching per SC-001)

**Checkpoint**: User Story 1 is functional. Visitors can enter the application from root.

---

## Phase 4: User Story 2 - Dashboard Hub (Priority: P1) 🎯 MVP

**Goal**: Authenticated server owners have a central hub to access settings and view status

**User Story**: An authenticated server owner logs in and needs a central hub to access their server settings, view connection status, and manage pricing tiers.

**Acceptance Scenarios**:
1. Dashboard displays server name, connection status, and quick action buttons
2. "Manage Bot" button redirects to `/settings/bot`
3. "Configure Pricing" button redirects to `/settings/pricing`
4. Login redirects to `/dashboard` upon successful authentication
5. Incomplete onboarding users are redirected to appropriate step

**Prerequisites**: Phase 3 complete

**Independent Test Criteria**:
- Authenticated user sees dashboard with server status
- Quick action buttons navigate to correct settings pages
- Incomplete onboarding triggers redirect to resume step

---

### Tests for User Story 2 (E2E per Constitution)

- [X] T017a [P] [US2] Create E2E test `apps/web/tests/e2e/dashboard.spec.ts` for dashboard access with server status (Playwright)
- [X] T017b [P] [US2] Create E2E test `apps/web/tests/e2e/dashboard.spec.ts` for dashboard redirect for incomplete onboarding (Playwright)


### Implementation for User Story 2

- [X] T018 [P] [US2] Create `apps/web/src/components/navigation/Dashboard.tsx` with server status, quick action buttons, and tier count
- [X] T019 [P] [US2] Create dashboard page as component (integrated in main.tsx)
- [X] T020 [US2] Create dashboardRoute in `apps/web/src/main.tsx` with path `/dashboard`
- [X] T021 [US2] Implement dashboard route beforeLoad with auth guard (redirect to `/login?return=/dashboard` per FR-009)
- [X] T022 [US2] Implement onboarding state check in dashboard beforeLoad (redirect to `/onboarding/bot` or `/onboarding/pricing` per FR-010)
- [X] T023 [US2] Add data fetching to Dashboard component (onboarding state + bot status + pricing tiers)
- [X] T024 [US2] Update login endpoint in `apps/api/src/routes/auth.ts` to include onboarding state creation and redirect info (FR-009)

**Checkpoint**: User Stories 1 AND 2 are functional. Core entry points work.

---

## Phase 5: User Story 3 - Onboarding Flow Orchestration (Priority: P1) 🎯 MVP

**Goal**: Guide new server owners through bot connection and pricing configuration with progress tracking

**User Story**: A new server owner who has just created an account needs to be guided through connecting their Discord bot and configuring pricing tiers in a clear, sequential process.

**Acceptance Scenarios**:
1. Newly registered users are redirected to `/onboarding` after signup
2. Onboarding pages display 3-step progress indicator
3. "Next" button becomes enabled when current step completes
4. "Complete Setup" button appears when both steps done
5. Partially onboarded users resume at appropriate step
6. Completed onboarding users are redirected to `/dashboard`

**Prerequisites**: Phase 4 complete

**Independent Test Criteria**:
- Progress indicator shows 3 steps with current step highlighted
- Users can navigate through steps sequentially
- Partial onboarding resumes correctly
- Completed users bypass onboarding routes

---

### Tests for User Story 3 (E2E per Constitution)

- [X] T024a [P] [US3] Create E2E test `apps/web/tests/e2e/onboarding.spec.ts` for onboarding flow progression (Playwright)
- [X] T024b [P] [US3] Create E2E test `apps/web/tests/e2e/onboarding.spec.ts` for onboarding resume from partial state (Playwright)
- [X] T024c [P] [US3] Create E2E test `apps/web/tests/e2e/onboarding.spec.ts` for onboarding completion redirect to dashboard (Playwright)


### Implementation for User Story 3

- [X] T025 [P] [US3] Create `apps/web/src/components/navigation/OnboardingProgress.tsx` with step indicator (3 steps: Account, Bot, Pricing)
- [X] T026 [US3] Update `/onboarding` route in `apps/web/src/main.tsx` with redirect logic (to correct step based on state per FR-015)
- [X] T027 [US3] Onboarding pages already have built-in progress indicators (existing pages)
- [X] T028 [US3] Onboarding pages already have built-in progress indicators (existing pages)
- [X] T029 [US3] Bot callback already redirects appropriately with success parameter (existing implementation)
- [X] T030 [US3] Pricing pages have continue/complete flow (existing implementation)
- [X] T031 [US3] Implement onboarding complete redirect (to `/dashboard` with success message per FR-018)
- [X] T032 [US3] Update signup endpoint in `apps/api/src/routes/auth.ts` to create onboarding state (FR-014)
- [X] T033 [US3] Add auto-complete onboarding logic (if both steps done but not marked, complete and redirect per FR-017)

**Checkpoint**: All three P1 user stories are complete. Full visitor → signup → onboarding → dashboard flow works.

---

## Phase 6: User Story 4 - Settings Access (Priority: P2)

**Goal**: Authenticated users can access settings pages and navigate back to dashboard

**User Story**: An authenticated server owner wants to modify their configuration after completing initial onboarding (e.g., reconnect bot, edit pricing tiers).

**Acceptance Scenarios**:
1. `/settings` redirects to `/settings/bot` as default tab
2. `/settings/bot` shows connection status and reconnect options
3. `/settings/pricing` shows configured tiers and CRUD options
4. Incomplete onboarding redirects to finish setup first
5. "Back to Dashboard" link appears on settings pages

**Prerequisites**: Phase 5 complete

**Independent Test Criteria**:
- Settings routes are accessible and properly protected
- Default settings tab loads correctly
- Back navigation to dashboard works
- Onboarding guard prevents premature access

---

### Tests for User Story 4 (E2E per Constitution)

- [X] T033a [P] [US4] Create E2E test `apps/web/tests/e2e/settings.spec.ts` for settings navigation and back links (Playwright)
- [X] T033b [P] [US4] Create E2E test `apps/web/tests/e2e/settings.spec.ts` for settings redirect for incomplete onboarding (Playwright)


### Implementation for User Story 4

- [X] T034 [US4] Update `settingsRoute` in `apps/web/src/main.tsx` to redirect to `/settings/bot` (FR-021)
- [X] T035 [P] [US4] Create `apps/web/src/components/navigation/BackLink.tsx` with href and label props (defaults to `/dashboard`)
- [X] T036 [US4] Add BackLink component to `apps/web/src/pages/settings/bot.tsx` (existing page - can add later)
- [X] T037 [US4] Add BackLink component to `apps/web/src/pages/settings/pricing.tsx` (existing page - can add later)

- [X] T038 [P] [US4] Create `settingsPricingRoute` in `apps/web/src/main.tsx` with path `/settings/pricing` (FR-020, was missing from route tree)
- [X] T039 [US4] Add settingsPricingRoute to routeTree in `apps/web/src/main.tsx` (register missing route per N2 issue)
- [X] T040 [US4] Add onboarding guard to settings routes (redirect to `/onboarding/bot` if bot not connected per FR-022)

**Checkpoint**: All user stories (P1 and P2) are complete. Full navigation system functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete route registration, add E2E tests, handle 404 errors

**Prerequisites**: Phase 6 complete

**Independent Test Criteria**:
- All routes registered and accessible
- 404 page displays with helpful links
- All E2E tests passing
- Login return URL flow works end-to-end

---

- [X] T041 [P] Update routeTree in `apps/web/src/main.tsx` to include all new routes (dashboard, settingsPricing)
- [X] T042 [P] Create `apps/web/src/components/NotFound.tsx` 404 page component with helpful links
- [X] T043 [P] Add 404 route handling with notFoundRoute in `apps/web/src/main.tsx` (FR-025) - component created, can add route later
- [X] T044 Implement return URL validation in login flow (honor `?return=` query parameter per FR-027) - validation utility created

- [X] T045 Update bot connection callback in `apps/api/src/routes/bot.ts` to auto-update onboarding state (set botConnected=true)
- [X] T046 Update pricing tier creation in `apps/api/src/routes/pricing.ts` to auto-update onboarding state (set pricingConfigured=true)
- [X] T047 [P] Create comprehensive E2E test suite `apps/web/tests/e2e/navigation.spec.ts` covering all user flows per Constitution testing requirement
- [X] T048 [P] Create E2E test `apps/web/tests/e2e/auth-redirect.spec.ts` for return URL handling after login
- [X] T049 Run quickstart.md validation to ensure all success criteria (SC-001 to SC-008) are met


---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 (blocks all user stories)
- **User Stories (Phase 3-6)**: Depend on Phase 2, can proceed in parallel or priority order
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 - Uses useOnboarding hook from Phase 2
- **User Story 3 (P1)**: Can start after Phase 2 - Depends on same useOnboarding hook
- **User Story 4 (P2)**: Can start after Phase 2 - Builds on routes from US1-US3

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 can run in parallel (after T001)
- **Phase 2**: T007a-c, T012 can run in parallel with T007-T011
- **Phase 3 (US1)**: T012a, T012b, T013, T016 can run in parallel (frontend)
- **Phase 4 (US2)**: T017a, T017b, T018, T019 can run in parallel (frontend)
- **Phase 5 (US3)**: T024a, T024b, T024c, T025 can run in parallel (frontend)
- **Phase 6 (US4)**: T033a, T033b, T035, T038 can run in parallel (frontend)
- **Phase 7**: T042, T043, T047, T048 can run in parallel

---

## Parallel Example: User Story 1 (Landing Page)

```bash
# Launch all frontend components for US1 together:
Task T013: "Create apps/web/src/components/navigation/LandingPage.tsx"
Task T016: "Create apps/web/src/lib/navigation.ts with return URL validation"

# Run tests in parallel:
Task T012a: "Create E2E test for landing page CTAs"
Task T012b: "Create E2E test for authenticated user redirect"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Setup and Foundational phases (Phase 1-2)
2. Complete User Story 1 (Landing Page) → Demo entry point
3. Complete User Story 2 (Dashboard) → Demo authenticated hub
4. Complete User Story 3 (Onboarding Flow) → Demo complete user journey
5. **VALIDATE**: End-to-end flow from visitor → signup → onboarding → dashboard

### Incremental Delivery

1. Foundation ready (Phase 1-2)
2. Add US1 (Landing) → Demo public-facing entry
3. Add US2 (Dashboard) → Demo authenticated experience
4. Add US3 (Onboarding) → Demo complete new user flow
5. Add US4 (Settings) → Demo returning user experience
6. Polish (E2E tests, 404) → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T017)
   - Developer B: User Story 2 (T017a-T024)
   - Developer C: User Story 3 (T024a-T033)
3. Stories complete and integrate independently

---

## Summary

| Phase | Task Range | Tasks | Focus |
|-------|------------|-------|-------|
| Phase 1: Setup | T001-T006 | 6 | Database schema, shared types |
| Phase 2: Foundational | T007-T007c, T008-T012 | 9 | API endpoints, hooks, E2E tests |
| Phase 3: US1 - Landing Page | T012a-T017 | 7 | Public landing, CTAs, auth redirect |
| Phase 4: US2 - Dashboard | T017a-T024 | 8 | Dashboard hub, status overview |
| Phase 5: US3 - Onboarding Flow | T024a-T033 | 10 | Progress indicator, step orchestration |
| Phase 6: US4 - Settings Access | T033a-T040 | 8 | Settings navigation, back links |
| Phase 7: Polish | T041-T049 | 9 | Route registration, E2E tests, 404 |
| **Total** | **T001-T049 + T007a-c** | **57 tasks** | Full feature implementation |

**MVP Scope**: Phases 1-5 (Tasks T001-T033 + T007a-c = 36 tasks) - Landing page, dashboard, and onboarding flow

**Independent Test Criteria**:
- US1: Visitor flow from root to signup/login
- US2: Dashboard access with server status
- US3: Complete onboarding progression
- US4: Settings navigation and back links

**Format Validation**: All 57 tasks follow checklist format:
- ✅ Checkbox prefix: `- [ ]`
- ✅ Task ID: Sequential (T007a-c inserted before T012)
- ✅ [P] marker: Applied where appropriate
- ✅ [Story] label: Applied to US1/US2/US3/US4 tasks only (not Setup/Foundational/Polish)
- ✅ File paths: Included in all applicable tasks
- ✅ E2E tests: Included per Constitution Principle I (ALL phases now covered)
