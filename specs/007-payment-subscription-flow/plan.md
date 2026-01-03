# Implementation Plan: Payment & Subscription Flow

**Branch**: `007-payment-subscription-flow` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-payment-subscription-flow/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the core payment and subscription flow for membran.app, enabling Discord members to purchase subscriptions through Midtrans and automatically receive Discord roles. The system must handle webhook processing, subscription lifecycle management (Active, Pending, Expired, Cancelled, Failed), email confirmation for member registration, and provide a member portal for subscription visibility. Key requirements include: 99.99% webhook uptime, 10-second role assignment SLA, one-subscription-per-member constraint with pro-rated upgrades, and email fallback for DM delivery failures.

## Technical Context

**Language/Version**: TypeScript 5.x on Bun 1.x
**Primary Dependencies**:
- Hono (web framework)
- Drizzle ORM (database)
- Midtrans SDK (payments)
- Arctic (Discord OAuth)
- Oslo (crypto utilities)
- TanStack Query/Router (frontend state/routing)
- Zod (validation)

**Storage**: Cloudflare D1 (SQLite at edge)
**Testing**: Playwright for E2E, Bun test runner for unit/integration
**Target Platform**: Cloudflare Workers (API) + Cloudflare Pages (frontend)
**Project Type**: Monorepo (apps/api, apps/web, packages/*)
**Performance Goals**:
- Webhook response: <5s (Midtrans timeout requirement)
- Role assignment: <10s in 99% of cases
- Member portal load: <2s
- Concurrent checkouts: 1000 without degradation

**Constraints**:
- 99.99% uptime for webhook endpoint (~4.3min/month downtime max)
- Discord API rate limits (1 role update/sec per server)
- Midtrans webhook timeout: 30 seconds
- Cloudflare Workers CPU: 30ms free, 10s paid
- D1 limits: 5M reads/day, 100K writes/day free

**Scale/Scope**:
- Target: 100 server owners in 3 months
- Expected load: ~10K subscriptions initially
- Email verification required for all members
- One active subscription per member per server

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Required Constitution Compliance

- [x] **Testing Discipline (NON-NEGOTIABLE)**: E2E tests MUST be planned for each implementation phase
  - [x] Frontend: Playwright tests for user interactions (checkout flow, portal access, DM delivery)
  - [x] Backend: Playwright tests for API contracts (webhook processing, subscription CRUD, role assignment)
  - [x] Integration: Tests covering frontend-backend communication flows (OAuth redirect, payment confirmation)
- [x] **Security First**: Input validation (Zod schemas for all API inputs), least privilege (Discord bot permissions), no secret exposure (env variables), webhook signature verification
- [x] **Type Safety**: TypeScript strict mode, explicit types for all entities, Zod for external data (Midtrans webhooks, Discord responses)
- [x] **API-First Design**: RESTful endpoints, consistent error responses, OpenAPI documentation in contracts/
- [x] **User-Centric Development**: Incremental MVP (P1: checkout, P2: webhooks, P3: portal, P4: manual mgmt), clear feedback (loading states, success/error messages)

### E2E Testing Gate

Each implementation phase MUST include:
- [x] Phase 0: N/A (research only)
- [ ] Phase 1: Test file creation `tests/e2e/payment-flow.spec.ts` covering happy path
- [ ] Phase 1: Tests for webhook processing with mock Midtrans payloads
- [ ] Phase 2: Full end-to-end checkout flow test (OAuth → payment → role assignment)
- [ ] Phase 2: Edge case tests (DM failure, pending timeout, duplicate webhooks)
- [ ] Full test suite passes with no regressions

**Phase 0 Complete** ✅ - research.md generated with all technical decisions
**Phase 1 Complete** ✅ - data-model.md, contracts/, quickstart.md generated

### Architecture & Scope Review

- [x] Technology stack compliance: Bun, React, Hono, Cloudflare Workers, D1, Drizzle
- [x] Monorepo structure: apps/api, apps/web, packages/db, packages/shared
- [x] Dependencies: Arctic/Oslo for auth/crypto, Midtrans for payments (no other auth/payment libs)
- [x] Performance constraints: Webhook <5s, role assignment <10s, portal <2s load time
- [x] Security compliance: Webhook signature verification, email confirmation before checkout, input validation on all endpoints

## Project Structure

### Documentation (this feature)

```text
specs/007-payment-subscription-flow/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.yaml         # OpenAPI spec for payment/subscription endpoints
│   └── webhooks.yaml    # Midtrans webhook contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure
apps/api/
├── src/
│   ├── routes/
│   │   ├── payments.ts          # POST /payments/create, GET /payments/:id
│   │   ├── webhooks.ts          # POST /webhooks/midtrans
│   │   ├── subscriptions.ts     # GET/POST /subscriptions, member portal API
│   │   └── members.ts           # Manual role management endpoints
│   ├── services/
│   │   ├── midtrans.ts          # Midtrans SDK wrapper, transaction creation
│   │   ├── webhooks.ts          # Webhook signature verification, processing
│   │   ├── subscriptions.ts     # Subscription lifecycle, pro-rated upgrades
│   │   ├── notifications.ts     # DM and email notification service
│   │   └── discord.ts           # Discord bot integration for role assignment
│   ├── models/
│   │   ├── subscription.ts      # Subscription entity operations
│   │   ├── transaction.ts       # Transaction entity operations
│   │   └── activity-log.ts      # Audit logging
│   └── middleware/
│       ├── webhook-auth.ts      # Midtrans signature verification
│       └── email-verified.ts    # Email verification check
└── tests/
    ├── integration/
    │   ├── payments.test.ts
    │   ├── webhooks.test.ts
    │   └── subscriptions.test.ts
    └── e2e/
        └── payment-flow.spec.ts # Full checkout flow test

apps/web/
├── src/
│   ├── pages/
│   │   ├── pricing.tsx          # Server pricing page (entry point)
│   │   ├── checkout.tsx         # Checkout confirmation page
│   │   └── member-portal.tsx    # Member subscription status
│   ├── components/
│   │   ├── TierSelector.tsx     # Tier selection component
│   │   ├── PaymentButton.tsx    # Subscribe button with OAuth flow
│   │   └── SubscriptionCard.tsx # Subscription display component
│   ├── hooks/
│   │   ├── usePayment.ts        # Payment mutation hook
│   │   └── useSubscription.ts   # Subscription query hook
│   └── services/
│       └── api-client.ts        # Typed API wrappers
└── tests/
    └── e2e/
        ├── checkout.spec.ts     # Checkout flow E2E
        └── portal.spec.ts       # Member portal E2E

packages/db/
├── drizzle/
│   └── schema/
│       ├── subscriptions.ts     # Subscriptions table
│       ├── transactions.ts      # Midtrans transactions table
│       ├── webhook-events.ts    # Webhook delivery log
│       ├── activity-logs.ts     # Audit trail
│       └── members.ts           # Member-server relationships
└── migrations/                  # Database migrations

packages/shared/
├── schemas/
│   ├── payment.ts               # Payment request/response Zod schemas
│   ├── subscription.ts          # Subscription Zod schemas
│   └── webhook.ts               # Midtrans webhook Zod schemas
└── types/
    └── subscription.ts          # Shared TypeScript types
```

**Structure Decision**: Web application structure with separate frontend (apps/web) and backend (apps/api) projects. Database schema and shared types in packages/ to maintain type safety across the monorepo. E2E tests in both apps to cover integration points.

## Complexity Tracking

> **No Constitution violations requiring justification**

All design choices align with constitution principles:
- Testing discipline: E2E tests planned for all phases
- Security: Webhook signature verification, email confirmation, input validation
- Type safety: TypeScript strict mode, Zod for external data
- API-first: RESTful design with OpenAPI contracts
- User-centric: Incremental MVP with prioritized user stories
