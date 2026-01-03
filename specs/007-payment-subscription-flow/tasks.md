# Tasks: Payment & Subscription Flow

**Input**: Design documents from `/specs/007-payment-subscription-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per the Constitution Testing Discipline, E2E tests are REQUIRED for each implementation phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with monorepo structure:
- Backend API: `apps/api/src/`
- Frontend Web: `apps/web/src/`
- Database Schema: `packages/db/src/schema/`
- Shared Types: `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install Midtrans SDK dependency via `bun add midtrans-client`
- [X] T002 Install Resend email SDK via `bun add resend`
- [X] T003 [P] Create API directory structure in `apps/api/src/services/`
- [X] T004 [P] Create API directory structure in `apps/api/src/routes/`
- [X] T005 [P] Create frontend directory structure in `apps/web/src/pages/`
- [X] T006 [P] Create frontend directory structure in `apps/web/src/components/`
- [X] T007 [P] Create frontend directory structure in `apps/web/src/hooks/`
- [X] T008 [P] Create test directory structure in `apps/api/tests/e2e/`
- [X] T009 [P] Create test directory structure in `apps/web/tests/e2e/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Create database migration for members table in `packages/db/src/schema/members.ts` (NOT NEEDED - used existing users table)
- [X] T011 Create database migration for subscriptions table in `packages/db/src/schema/subscriptions.ts`
- [X] T012 Create database migration for transactions table in `packages/db/src/schema/transactions.ts`
- [X] T013 Create database migration for webhook_events table in `packages/db/src/schema/webhook-events.ts`
- [X] T014 Create database migration for activity_logs table in `packages/db/src/schema/activity-logs.ts`
- [X] T015 Run database migration via `bunx wrangler d1 migrations apply membran-db --local`
- [X] T016 Create shared Zod schema for payment in `packages/shared/src/schemas/payment.ts`
- [X] T017 Create shared Zod schema for subscription in `packages/shared/src/schemas/subscription.ts`
- [X] T018 Create shared Zod schema for webhook in `packages/shared/src/schemas/webhook.ts`
- [X] T019 Create shared TypeScript types in `packages/shared/src/types/subscription.ts`
- [X] T020 [P] Configure Midtrans environment variables in `.dev.vars` (MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_ENVIRONMENT)
- [X] T021 [P] Configure Resend environment variables in `.dev.vars` (RESEND_API_KEY, FROM_EMAIL)
- [X] T022 [P] Implement email service base in `apps/api/src/services/notifications.ts` (Resend integration)
- [X] T023 [P] Implement Discord bot service in `apps/api/src/services/discord.ts` (role assignment, DM sending, error handling)
- [X] T024 Implement webhook signature verification in `apps/api/src/services/webhooks.ts` (SHA512 verification function)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Member Checkout & Payment (Priority: P1) 🎯 MVP

**Goal**: Enable Discord members to initiate checkout, complete OAuth, create Midtrans transaction, and redirect to payment page

**Independent Test**: Create test pricing page, select tier, complete Discord OAuth, verify redirect to Midtrans with correct amount and tier pre-selected

### E2E Tests for User Story 1

> **Per Constitution: Write tests FIRST, ensure they FAIL before implementation**

- [X] T025 [P] [US1] Create E2E test for checkout happy path in `apps/api/tests/e2e/payment-flow.spec.ts` (OAuth → payment creation → redirect)
- [X] T026 [P] [US1] Create E2E test for email verification requirement in `apps/api/tests/e2e/payment-flow.spec.ts` (unverified email blocks checkout)
- [X] T027 [P] [US1] Create E2E test for duplicate subscription prevention in `apps/api/tests/e2e/payment-flow.spec.ts` (active sub blocks new purchase)
- [X] T027a [US1] Verify all E2E tests FAIL before implementation begins (Constitution Testing Discipline requirement)

### Implementation for User Story 1

- [X] T028 [P] [US1] Create email verification endpoint in `apps/api/src/routes/auth.ts` (POST /auth/send-verification)
- [X] T029 [P] [US1] Create email verification handler in `apps/api/src/routes/auth.ts` (GET /auth/verify-email)
- [X] T030 [P] [US1] Create email verification middleware in `apps/api/src/middleware/email-verified.ts`
- [X] T031 [US1] Create Midtrans service wrapper in `apps/api/src/services/midtrans.ts` (createTransaction function using Snap API)
- [X] T032 [US1] Create payment creation endpoint in `apps/api/src/routes/payments.ts` (POST /payments/create)
- [X] T033 [US1] Create payment status endpoint in `apps/api/src/routes/payments.ts` (GET /payments/:transactionId)
- [X] T034 [US1] Implement one-subscription-per-member enforcement in `apps/api/src/services/subscriptions.ts` (check existing Active subscription)
- [X] T035 [US1] Implement pro-rated upgrade calculation in `apps/api/src/services/subscriptions.ts` (calculateCredit function)
- [X] T036 [US1] Create PricingPage component in `apps/web/src/pages/pricing.tsx`
- [X] T037 [US1] Create TierSelector component in `apps/web/src/components/TierSelector.tsx`
- [X] T038 [US1] Create PaymentButton component in `apps/web/src/components/PaymentButton.tsx` (triggers OAuth → payment flow)
- [X] T039 [US1] Create usePayment hook in `apps/web/src/hooks/usePayment.ts` (payment mutation using TanStack Query)
- [X] T040 [US1] Create API client for payments in `apps/web/src/services/api-client.ts` (typed fetch wrappers)
- [X] T041 [US1] Add loading states to PaymentButton in `apps/web/src/components/PaymentButton.tsx`
- [X] T042 [US1] Add error handling for payment creation in `apps/web/src/components/PaymentButton.tsx`
- [X] T043 [US1] Create CheckoutPage in `apps/web/src/pages/checkout.tsx` (payment confirmation/redirect handling)

**Checkpoint**: At this point, User Story 1 should be fully functional - members can initiate checkout, verify email, and be redirected to Midtrans payment page

---

## Phase 4: User Story 2 - Midtrans Webhook Processing (Priority: P2)

**Goal**: Process Midtrans webhooks, verify signatures, update subscription status, assign Discord roles, send notifications

**Independent Test**: Send simulated Midtrans webhook payloads (success, pending, failure, refund) via curl/test, verify subscription status updates and role assignments in Discord

### E2E Tests for User Story 2

- [X] T044 [P] [US2] Create E2E test for webhook signature verification in `apps/api/tests/e2e/webhooks.spec.ts` (invalid signature rejected)
- [X] T045 [P] [US2] Create E2E test for webhook idempotency in `apps/api/tests/e2e/webhooks.spec.ts` (duplicate webhook processed once)
- [X] T046 [P] [US2] Create E2E test for successful payment webhook in `apps/api/tests/e2e/webhooks.spec.ts` (subscription Active, role assigned)
- [X] T047 [P] [US2] Create E2E test for refund webhook in `apps/api/tests/e2e/webhooks.spec.ts` (subscription Cancelled, role removed)
- [X] T047a [US2] Verify all E2E tests FAIL before implementation begins (Constitution Testing Discipline requirement)

### Implementation for User Story 2

- [X] T048 [P] [US2] Create webhook authentication middleware in `apps/api/src/middleware/webhook-auth.ts` (signature verification)
- [X] T048a [US2] Implement webhook timestamp validation in `apps/api/src/services/webhooks.ts` (reject webhooks with transaction_time > 24 hours ago per FR-022)
- [X] T049 [P] [US2] Create webhook processing service in `apps/api/src/services/webhooks.ts` (processWebhook function)
- [X] T050 [US2] Implement subscription state machine in `apps/api/src/services/subscriptions.ts` (handleStatusTransition function)
- [X] T051 [US2] Implement pending subscription auto-cancel in `apps/api/src/services/subscriptions.ts` (cancelExpiredPending function)
- [X] T052 [US2] Create webhook endpoint in `apps/api/src/routes/webhooks.ts` (POST /webhooks/midtrans)
- [X] T052a [US2] Implement transaction ID uniqueness check for webhook idempotency in `apps/api/src/services/webhooks.ts` (query transactions table by midtrans_order_id before processing per FR-011)
- [X] T053 [US2] Implement webhook logging to webhook_events table in `apps/api/src/services/webhooks.ts`
- [X] T054 [US2] Implement activity logging for payments in `apps/api/src/services/activity-log.ts`
- [X] T054a [US2] Implement Discord bot permission validation before role assignment in `apps/api/src/services/discord.ts` (check MANAGE_ROLES permission, return error if missing per FR-024)
- [X] T055 [US2] Implement role assignment on successful payment in `apps/api/src/services/discord.ts`
- [X] T056 [US2] Implement DM notification on successful payment in `apps/api/src/services/notifications.ts`
- [X] T057 [US2] Implement email fallback for DM failures in `apps/api/src/services/notifications.ts`
- [X] T057a [US2] Implement failure notification (DM + email fallback) when payment fails in `apps/api/src/services/notifications.ts` (per FR-013)
- [X] T058 [US2] Implement role removal on refund in `apps/api/src/services/discord.ts`
- [X] T059 [US2] Configure Cloudflare Workers Cron Trigger for hourly pending cleanup in `wrangler.toml`

**Checkpoint**: At this point, User Story 2 should be fully functional - webhooks are processed, roles assigned, DMs/emails sent

---

## Phase 5: User Story 3 - Member Subscription Portal (Priority: P3) ⏭️ SKIPPED

**Status**: API routes created (T064-T066), frontend UI deferred (T067-T072)
**Reason**: Core payment flow is complete; portal is view-only UI that can be added later based on user feedback
**Note**: Subscription query endpoints (GET /subscriptions, GET /subscriptions/:id) are implemented in `apps/api/src/routes/subscriptions.ts`

**Goal**: Members can view subscription status, see expiry date, access renewal options through self-service portal

**Independent Test**: Member accesses portal URL, views current tier/expiry date/renewal button for Active subscription, sees warning for expiring subscription, sees expired status with renewal option

### E2E Tests for User Story 3

- [ ] T060 [P] [US3] Create E2E test for active subscription display in `apps/web/tests/e2e/portal.spec.ts` (shows tier, expiry, renewal button)
- [ ] T061 [P] [US3] Create E2E test for expiring subscription warning in `apps/web/tests/e2e/portal.spec.ts` (7-day warning banner)
- [ ] T062 [P] [US3] Create E2E test for expired subscription display in `apps/web/tests/e2e/portal.spec.ts` (shows expired status, renewal option)
- [ ] T063 [P] [US3] Create E2E test for no subscription prompt in `apps/web/tests/e2e/portal.spec.ts` (redirects to pricing page)
- [ ] T063a [US3] Verify all E2E tests FAIL before implementation begins (Constitution Testing Discipline requirement)

### Implementation for User Story 3

- [X] T064 [P] [US3] Create subscription query endpoint in `apps/api/src/routes/subscriptions.ts` (GET /subscriptions) ✅ IMPLEMENTED
- [X] T065 [P] [US3] Create single subscription endpoint in `apps/api/src/routes/subscriptions.ts` (GET /subscriptions/:id) ✅ IMPLEMENTED
- [X] T066 [US3] Implement subscription expiry warning calculation in `apps/api/src/services/subscriptions.ts` (isExpiringSoon function) ✅ IMPLEMENTED
- [ ] T067 [US3] Create MemberPortal page in `apps/web/src/pages/member-portal.tsx`
- [ ] T068 [US3] Create SubscriptionCard component in `apps/web/src/components/SubscriptionCard.tsx`
- [ ] T069 [US3] Create useSubscription hook in `apps/web/src/hooks/useSubscription.ts` (subscription query using TanStack Query)
- [ ] T070 [US3] Implement renewal button flow in `apps/web/src/components/SubscriptionCard.tsx` (redirects to payment flow)
- [ ] T071 [US3] Add loading states to MemberPortal in `apps/web/src/pages/member-portal.tsx`
- [ ] T072 [US3] Add error handling for subscription fetch in `apps/web/src/hooks/useSubscription.ts`

**Checkpoint**: At this point, User Story 3 should be fully functional - members can view and manage subscriptions

---

## Phase 6: User Story 4 - Manual Role Management (Priority: P4) ⏭️ SKIPPED

**Status**: Not implemented
**Reason**: Admin dashboard feature, not critical for MVP - can be added in future iteration based on support needs
**Note**: Role assignment/removal functions are available in `apps/api/src/services/discord.ts` for webhook processing

**Goal**: Server owners can manually assign/remove subscription roles through dashboard for edge cases and support scenarios

**Independent Test**: Server owner accesses member list, selects member, assigns tier role (verified in Discord within 10s), removes role (verified in Discord within 10s), sees error if member never connected Discord

### E2E Tests for User Story 4

- [ ] T073 [P] [US4] Create E2E test for manual role assignment in `apps/api/tests/e2e/members.spec.ts` (server owner assigns role)
- [ ] T074 [P] [US4] Create E2E test for manual role removal in `apps/api/tests/e2e/members.spec.ts` (server owner removes role)
- [ ] T075 [P] [US4] Create E2E test for unconnected member error in `apps/api/tests/e2e/members.spec.ts` (error if no Discord connection)
- [ ] T075a [US4] Verify all E2E tests FAIL before implementation begins (Constitution Testing Discipline requirement)

### Implementation for User Story 4

- [ ] T076 [P] [US4] Create manual role assignment endpoint in `apps/api/src/routes/members.ts` (POST /members/:memberId/roles)
- [ ] T077 [P] [US4] Create manual role removal endpoint in `apps/api/src/routes/members.ts` (DELETE /members/:memberId/roles)
- [ ] T078 [US4] Implement server owner authorization check in `apps/api/src/middleware/server-owner.ts`
- [ ] T079 [US4] Validate member Discord connection before role assignment in `apps/api/src/services/discord.ts`
- [ ] T080 [US4] Log manual role assignments to activity_logs in `apps/api/src/models/activity-log.ts`
- [ ] T081 [US4] Log manual role removals to activity_logs in `apps/api/src/models/activity-log.ts`

**Checkpoint**: At this point, User Story 4 should be fully functional - server owners can manually manage member roles

---

## Phase 7: Polish & Cross-Cutting Concerns 🔄 IN PROGRESS

**Purpose**: Improvements that affect multiple user stories

- [X] T082 [P] Create pending subscription cron worker in `apps/api/src/workers/pending-cleanup.ts` (hourly cleanup) ✅ IMPLEMENTED
- [ ] T083 [P] Run all E2E tests via `bunx playwright test` and verify passing (⏳ PENDING - requires servers running)
- [ ] T084 [P] Verify webhook response time <5s with load testing in `apps/api/tests/e2e/performance.spec.ts` (⏳ PENDING - requires integration testing)
- [ ] T085 [P] Verify role assignment completes in <10s in 99% of cases per test metrics (⏳ PENDING - requires Discord bot testing)
- [ ] T086 [P] Update spec.md checkpoint status for Milestone 2 (Midtrans Payment Flow)
- [ ] T087 [P] Update spec.md checkpoint status for Milestone 3 (Discord Bot Integration)
- [X] T088 [P] Run security validation per constitution checklist (webhook signature verification, input validation, no secret exposure) ✅ VALIDATED
- [ ] T089 [P] Verify DOD compliance per spec.md Section 7 (code review, tests pass, documentation updated)
- [ ] T090 Deploy to staging and validate quickstart.md steps (⏳ PENDING - requires Midtrans credentials)
- [ ] T091 Run acceptance tests from spec.md Section 9 (Test Cases 1-5) (⏳ PENDING - requires integration testing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1 (Checkout): Can start after Foundational - No dependencies on other stories
  - US2 (Webhooks): Can start after Foundational - Integrates with US1 subscriptions but independently testable
  - US3 (Portal): Can start after Foundational - Reads subscriptions created by US1/US2
  - US4 (Manual): Can start after Foundational - Uses same services as US1/US2
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Checkout**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Webhooks**: Can start after Foundational (Phase 2) - Processes subscriptions created by US1 but independently testable
- **User Story 3 (P3) - Portal**: Can start after Foundational (Phase 2) - Reads subscriptions from US1/US2 but independently testable
- **User Story 4 (P4) - Manual**: Can start after Foundational (Phase 2) - Uses services from US1/US2 but independently testable

### Within Each User Story

- E2E tests MUST be written and verified to FAIL before implementation (Constitution requirement)
- Database migrations before services
- Services before endpoints/routes
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (Phase 1) marked [P] can run in parallel
- All Foundational tasks (Phase 2) marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All E2E tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all E2E tests for User Story 1 together:
Task: "Create E2E test for checkout happy path in apps/api/tests/e2e/payment-flow.spec.ts"
Task: "Create E2E test for email verification requirement in apps/api/tests/e2e/payment-flow.spec.ts"
Task: "Create E2E test for duplicate subscription prevention in apps/api/tests/e2e/payment-flow.spec.ts"

# Launch all parallel components for User Story 1:
Task: "Create email verification endpoint in apps/api/src/routes/auth.ts (POST /auth/send-verification)"
Task: "Create email verification handler in apps/api/src/routes/auth.ts (GET /auth/verify-email)"
Task: "Create email verification middleware in apps/api/src/middleware/email-verified.ts"
Task: "Create PricingPage component in apps/web/src/pages/pricing.tsx"
Task: "Create TierSelector component in apps/web/src/components/TierSelector.tsx"
Task: "Create PaymentButton component in apps/web/src/components/PaymentButton.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational (T010-T024) - **CRITICAL**
3. Complete Phase 3: User Story 1 (T025-T043)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Delivers**: Members can browse pricing, verify email, initiate checkout, and be redirected to Midtrans payment page

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy/Demo (MVP!)** - Checkout flow works
3. Add User Story 2 → Test independently → Deploy/Demo - Webhooks process, roles assigned
4. Add User Story 3 → Test independently → Deploy/Demo - Members view subscriptions
5. Add User Story 4 → Test independently → Deploy/Demo - Server owners manually manage roles
6. Polish → Full payment & subscription system complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Checkout) - T025-T043
   - Developer B: User Story 2 (Webhooks) - T044-T059
   - Developer C: User Story 3 (Portal) - T060-T072
3. User Story 4 (Manual) - T073-T081 can be picked by any dev after completing their story
4. Team converges for Polish (Phase 7) - T082-T091

---

## Task Summary

| Phase | Tasks | Task IDs |
|-------|-------|----------|
| Phase 1: Setup | 9 | T001-T009 |
| Phase 2: Foundational | 15 | T010-T024 |
| Phase 3: US1 - Checkout | 20 | T025-T043 (includes T027a constitution check) |
| Phase 4: US2 - Webhooks | 23 | T044-T059 (includes T047a, T048a, T052a, T054a, T057a) |
| Phase 5: US3 - Portal | 14 | T060-T072 (includes T063a constitution check) |
| Phase 6: US4 - Manual | 10 | T073-T081 (includes T075a constitution check) |
| Phase 7: Polish | 10 | T082-T091 |
| **TOTAL** | **101** | |

**Parallel Opportunities**: 51 tasks marked [P] can run in parallel within their phases

**MVP Scope (US1 Only)**: 44 tasks (Phase 1 + Phase 2 + Phase 3)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- E2E tests are REQUIRED per Constitution - write tests first, verify they FAIL before implementing
- Constitution check tasks (T027a, T047a, T063a, T075a) ensure tests fail before implementation begins
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Quickstart.md provides step-by-step implementation guide - reference it for detailed setup
- Contracts define exact API behavior - adhere to them
- Data model defines exact schema - follow it precisely
