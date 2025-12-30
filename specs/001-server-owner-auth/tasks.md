# Tasks: Server Owner Registration & Authentication

**Input**: Design documents from `/specs/001-server-owner-auth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Critical authentication paths require automated tests per Constitution Principle V. Unit and integration tests are included in each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure

- [x] T001 Initialize monorepo structure (apps/api, apps/web, packages/db, packages/shared)
- [x] T002 [P] Configure Bun and Turborepo in root package.json and turbo.json
- [x] T003 [P] Configure Biome for linting and formatting in biome.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Setup Cloudflare D1 and Drizzle ORM in packages/db/src/index.ts
- [x] T005 [P] Define base Zod auth schemas in packages/shared/src/auth.ts
- [x] T006 Setup Hono API entry point in apps/api/src/index.ts
- [x] T007 Implement custom session middleware in apps/api/src/middleware/session.ts
- [x] T007b Implement CSRF protection middleware (Principle IV) in apps/api/src/index.ts
- [x] T008 [P] Configure Oslo (hashing) and Arctic (OAuth) in apps/api/src/lib/auth.ts
- [x] T008b [P] Configure Email Service (Resend) and templates in apps/api/src/lib/email.ts
- [x] T009 Setup React + Vite + TanStack Router + TanStack Query in apps/web/src/main.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - New Owner Registration (Priority: P1) 🎯 MVP

**Goal**: Allow prospective owners to register via Email/Password or Discord OAuth.

**Independent Test**: Register a new user via the signup form or Discord, verify the record exists in the D1 database, and ensure redirection to the onboarding wizard.

### Tests for User Story 1
- [x] T009b [P] [US1] Unit tests for registration and hashing logic in apps/api/src/routes/auth.signup.test.ts
- [x] T009c [P] [US1] Integration test for full registration flow (Email & Discord) in apps/api/src/tests/integration/signup.test.ts

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement `users` table schema in packages/db/src/schema/users.ts
- [x] T011 [US1] Implement registration logic (FR-001, FR-004) and trigger verification email in apps/api/src/routes/auth.ts
- [x] T012 [US1] Implement Discord OAuth initiation (FR-002) in apps/api/src/routes/auth.ts (discord endpoint)
- [x] T013 [US1] Implement Discord OAuth callback and user creation in apps/api/src/routes/auth.ts (callback endpoint)
- [x] T014 [P] [US1] Create Signup page layout in apps/web/src/pages/signup/index.tsx
- [x] T015 [US1] Implement Signup form and Discord button in apps/web/src/components/auth/SignupForm.tsx
- [x] T016 [US1] Add email collision checks and validation (FR-003, FR-006, FR-012)

**Checkpoint**: User Story 1 is functional. Users can create accounts.

---

## Phase 4: User Story 2 - Owner Login & Logout (Priority: P1)

**Goal**: Allow existing owners to authenticate and terminate sessions.

**Independent Test**: Log in with valid email/password or Discord, verify dashboard access, then log out and verify redirection to the landing page.

### Tests for User Story 2
- [x] T016b [P] [US2] Unit tests for login and session validation in apps/api/src/routes/auth.login.test.ts
- [x] T016c [P] [US2] Integration test for login/logout cycle in apps/api/src/tests/integration/login.test.ts

### Implementation for User Story 2

- [x] T017 [US2] Implement Login endpoint with Oslo verification (FR-005) in apps/api/src/routes/auth.ts
- [x] T018 [US2] Implement Logout endpoint with session invalidation (FR-008) in apps/api/src/routes/auth.ts
- [x] T019 [US2] Implement `me` endpoint to fetch current user profile in apps/api/src/routes/auth.ts
- [x] T020 [P] [US2] Create Login page layout in apps/web/src/pages/login/index.tsx
- [x] T021 [US2] Implement Login form in apps/web/src/components/auth/LoginForm.tsx

**Checkpoint**: User Story 2 is functional. Returning users can access the app.

---

## Phase 5: User Story 3 - Protected Route Access (Priority: P2)

**Goal**: Secure management features and display verification reminders.

**Independent Test**: Attempt to visit `/dashboard` while unauthenticated to verify redirect to `/login`. Log in with an unverified account to see the verification banner.

### Implementation for User Story 3

- [x] T022 [US3] Implement `useAuth` hook for frontend session state in apps/web/src/hooks/useAuth.ts
- [x] T023 [US3] Create `ProtectedRoute` component for route guarding (FR-009) in apps/web/src/components/auth/ProtectedRoute.tsx
- [x] T023b [US3] Create placeholder Onboarding page to satisfy registration redirect in apps/web/src/pages/onboarding/index.tsx
- [x] T024 [US3] Implement dismissible email verification banner (FR-011) in apps/web/src/components/auth/VerificationBanner.tsx

**Checkpoint**: User Story 3 ensures secure access control across the app.

---

## Phase 6: User Story 4 - Password Reset (Priority: P2)

**Goal**: Provide a mechanism for users to recover access via email.

**Independent Test**: Request a reset for a known email, verify the token generation in DB, and use the token to set a new password.

### Implementation for User Story 4

- [x] T025 [US4] Implement `password_reset_tokens` table in packages/db/src/schema/users.ts
- [x] T026 [US4] Implement forgot-password endpoint, token generation, and trigger reset email in apps/api/src/routes/auth.ts
- [x] T027 [US4] Implement reset-password endpoint in apps/api/src/routes/auth.ts
- [x] T028 [P] [US4] Create Forgot Password page in apps/web/src/pages/forgot-password/index.tsx
- [x] T029 [P] [US4] Create Reset Password page in apps/web/src/pages/reset-password/index.tsx

**Checkpoint**: User Story 4 provides a complete recovery flow.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness and security hardening.

- [x] T030 Implement rate limiting middleware for auth endpoints in apps/api/src/middleware/rate-limit.ts
- [x] T031 [P] Configure Sentry monitoring in apps/api/src/index.ts and apps/web/src/main.tsx
- [x] T032 Final UI polish and accessibility check for all auth components using smoothui.dev (Tailwind)
- [x] T032b [P] Implement performance test script for concurrent logins (SC-004) in tests/performance/auth-load.ts
- [x] T033 Run verification against quickstart.md and ensure all success criteria (SC-001 to SC-004) are met.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. BLOCKS all user stories.
- **User Stories (Phase 3-6)**: All depend on Phase 2. Can proceed in parallel or priority order.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Parallel Opportunities

- T002, T003 can run together.
- T005, T008 can run together.
- T010 and T014 can run while T011 is being worked on.
- T020 and T028, T029 can be built by frontend developers in parallel with backend endpoints.

---

## Implementation Strategy

### MVP First (US1 & US2 Only)

1. Complete Setup and Foundational phases.
2. Complete User Story 1 (Registration).
3. Complete User Story 2 (Login).
4. **VALIDATE**: Ensure a user can sign up, log in, and log out successfully.

### Incremental Delivery

1. Foundation ready.
2. Add US1 (Signup) -> Demo.
3. Add US2 (Login) -> Demo.
4. Add US3 (Protection) -> Security verification.
5. Add US4 (Reset) -> Full feature set.
