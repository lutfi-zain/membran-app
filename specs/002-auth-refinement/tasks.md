# Tasks: Auth Refinement: Account Connection and Verification

**Input**: Design documents from `/specs/002-auth-refinement/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Critical authentication and token validation paths require automated tests per Constitution Principle V.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 [P] Verify monorepo structure and existing auth files for integration context

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Implement `verification_tokens` table schema in `packages/db/src/schema/users.ts`
- [X] T003 [P] Define `VerificationSchema` and `DiscordConnectSchema` in `packages/shared/src/auth.ts`
- [X] T004 Implement token hashing/verification utility using Oslo in `apps/api/src/lib/auth.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Email Verification Completion (Priority: P1) 🎯 MVP

**Goal**: Allow owners to finalize account setup via email link.

**Independent Test**: Register with email -> Trigger token -> Visit `/api/auth/verify?token=...` -> Verify `email_verified` is 1 in DB and user redirected to dashboard.

### Tests for User Story 1
- [X] T005 [P] [US1] Unit tests for token generation and hashing in `apps/api/src/routes/auth.verify.test.ts`
- [X] T006 [P] [US1] Integration test for verification redirect and DB update in `apps/api/src/tests/integration/verify.test.ts`

### Implementation for User Story 1
- [X] T007 [US1] Update `POST /api/auth/signup` to generate `verification_tokens` record and send email in `apps/api/src/routes/auth.ts`
- [X] T008 [US1] Implement `GET /api/auth/verify` endpoint (FR-001, FR-002) in `apps/api/src/routes/auth.ts`
- [X] T009 [P] [US1] Implement `VerificationBanner.tsx` with "Soft Verification" model (FR-011) in `apps/web/src/components/auth/VerificationBanner.tsx`
- [X] T010 [US1] Integrate `VerificationBanner` into the main application layout in `apps/web/src/pages/index.tsx` (or root layout)

**Checkpoint**: User Story 1 is functional. Users can verify their emails.

---

## Phase 4: User Story 2 - Discord Account Connection (Priority: P1)

**Goal**: Link Discord ID to an existing email-based account.

**Independent Test**: Login via email -> Go to Settings -> Connect Discord -> Verify `discord_id` is updated in `users` table and success redirect.

### Tests for User Story 2
- [X] T011 [P] [US2] Unit tests for Discord connection logic (FR-004 collision check) in `apps/api/src/routes/auth.connect.test.ts`
- [X] T012 [P] [US2] Integration test for full connection flow in `apps/api/src/tests/integration/connect.test.ts`
- [X] T013 [US2] Implement `GET /api/auth/connect/discord` to initiate OAuth flow in `apps/api/src/routes/auth.ts`
- [X] T014 [US2] Implement `GET /api/auth/connect/discord/callback` with collision check (FR-003, FR-004) in `apps/api/src/routes/auth.ts`
- [X] T015 [P] [US2] Add "Connect Discord" button and status display in `apps/web/src/pages/settings/index.tsx`
- [X] T016 [US2] Update `useAuth` hook to include `discord_id` in user state in `apps/web/src/hooks/useAuth.ts`

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness and security hardening.

- [X] T017 Implement token expiry cleanup job/logic (Edge Case: Expired Tokens)
- [X] T018 Finalize error messaging for OAuth failures and invalid tokens in `apps/web/src/pages/login/index.tsx` and `apps/web/src/pages/settings/index.tsx`
- [X] T019 Run quickstart.md validation to ensure SC-001 to SC-004 are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 & 2**: No functional dependencies, but BLOCKS Phase 3 and 4.
- **Phase 3 (US1)**: Can proceed once Phase 2 is done.
- **Phase 4 (US2)**: Can proceed once Phase 2 is done. Independent of Phase 3.
- **Phase 5**: Depends on Phase 3 and 4.

### Parallel Opportunities

- T003 and T004 can run in parallel.
- US1 (Phase 3) and US2 (Phase 4) can be implemented in parallel after Phase 2.
- T009 (Banner UI) can be built while T007/T008 (Backend logic) are in progress.
- T015 (Settings UI) can be built while T013/T014 (Backend logic) are in progress.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Foundational Phase (Phase 2).
2. Complete User Story 1 (Email Verification).
3. **VALIDATE**: Ensure a user can sign up and verify their email.

### Incremental Delivery

1. Foundation ready.
2. Add US1 (Email Verification) -> Security milestone.
3. Add US2 (Discord Connection) -> Feature parity milestone.
4. Final Polish -> Production ready.
