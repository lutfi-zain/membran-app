# Implementation Plan: Payment & Subscription Flow

**Branch**: `007-payment-subscription-flow` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-payment-subscription-flow/spec.md`

## Summary

Implement Discord member subscription checkout and payment processing with Midtrans integration. Members can select pricing tiers, authorize via Discord OAuth, complete payment, and automatically receive Discord roles. The system processes Midtrans webhooks for payment confirmation, handles pending/failed states, supports pro-rated tier upgrades, and provides a member portal for subscription management.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Hono (API), React 18 (web), Drizzle ORM (DB), TanStack Query (data fetching), TanStack Router (v7), Arctic (Discord OAuth), Oslo (crypto), Midtrans SDK, Zod (validation), shadcn/ui (Radix UI + Tailwind)
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Playwright (E2E for web + API)
**Target Platform**: Cloudflare Workers (backend), Vite dev server (frontend)
**Project Type**: Web (monorepo: apps/api + apps/web + packages/)
**Performance Goals**: 99.99% webhook uptime, 10s role assignment, <5s webhook response, <2s portal load time, 1000 concurrent payment initiations
**Constraints**: <200ms webhook processing p95, 1-hour pending payment timeout, 3 retry attempts for Discord API failures
**Scale/Scope**: Support multiple servers with thousands of members each

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Required Constitution Compliance

- [x] **Testing Discipline (NON-NEGOTIABLE)**: E2E tests MUST be planned for each implementation phase
  - [x] Frontend: Playwright tests for user interactions, forms, visual states
  - [x] Backend: Playwright tests for API contracts, auth, error handling
  - [x] Integration: Tests covering frontend-backend communication flows
- [x] **Security First**: Input validation, least privilege, no secret exposure
  - Midtrans webhook signature verification (FR-006)
  - Discord OAuth token encryption (existing pattern)
  - Email verification required before purchase (FR-025, FR-026, FR-027)
  - Zod validation for all external data
  - No secrets in logs
- [x] **Type Safety**: TypeScript strict mode, explicit types, Zod for external data
  - Existing codebase uses strict mode
  - Zod schemas for Midtrans payloads, Discord data, subscription states
  - Discriminated unions for subscription status states
- [x] **API-First Design**: RESTful conventions, consistent error formats, schema documentation
  - Shared package schemas for API contracts
  - Consistent error response format: `{ error: { code, message } }`
  - OpenAPI/GraphQL schema generation in contracts/
- [x] **User-Centric Development**: Incremental value, clear user feedback, accessibility
  - Priority-sorted user stories (P1-P4)
  - Loading states for payment processing
  - Clear error messages for payment failures
  - Email fallback for DM failures

### E2E Testing Gate

Each implementation phase MUST include:
- [ ] Test file creation (e.g., `tests/007-payment-checkout.spec.ts`)
- [ ] Tests written and passing before phase completion
- [ ] Coverage for: happy path, error cases, edge cases
- [ ] Full test suite passes with no regressions

### Demo & Handoff (NON-NEGOTIABLE)

After completing feature implementation:
- [ ] **E2E Happy Flow Testing**: Complete user journey run in headfull mode
  - [ ] Launch Playwright in headfull mode (`npx playwright test --ui` or `--headed`)
  - [ ] Execute all critical paths: Discord OAuth, payment completion, role assignment, portal access
  - [ ] Verify system stability throughout the flow
  - [ ] Capture screenshots or video evidence of successful completion
- [ ] **Progress Reporting**: Document and communicate completion
  - [ ] Summarize feature functionality
  - [ ] Confirm system working as expected
  - [ ] Note any observed issues or areas needing attention
- [ ] **Integration Coordination**: External integrations requiring manual setup
  - [ ] Midtrans sandbox API keys
  - [ ] Midtrans webhook configuration
  - [ ] Discord bot token for testing
  - [ ] Email service for verification and notifications

### Architecture & Scope Review

- [x] Technology stack compliance (Bun, React, Hono, Cloudflare Workers, D1, Drizzle)
- [x] Monorepo structure within limits (apps/, packages/)
- [x] Dependencies: Arctic/Oslo for auth/crypto, Midtrans for payments
- [x] Performance constraints met (response times, memory limits)

## Project Structure

### Documentation (this feature)

```text
specs/007-payment-subscription-flow/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research & decisions
├── data-model.md        # Phase 1: Database schema design
├── quickstart.md        # Phase 1: Developer quickstart guide
├── contracts/           # Phase 1: API contracts
│   ├── checkout-api.md      # Checkout flow endpoints
│   ├── webhook-api.md       # Midtrans webhook endpoint
│   ├── subscription-api.md  # Subscription management endpoints
│   └── portal-api.md        # Member portal endpoints
└── tasks.md             # Phase 2: Implementation tasks (generated by /speckit.tasks)
```

### Source Code (repository root)

```text
# Backend (apps/api)
apps/api/
├── src/
│   ├── routes/
│   │   ├── checkout.ts         # Checkout initiation endpoints
│   │   ├── webhook.ts          # Midtrans webhook handler
│   │   ├── subscriptions.ts    # Subscription management API
│   │   └── portal.ts           # Member portal endpoints
│   ├── lib/
│   │   ├── midtrans.ts         # Midtrans SDK wrapper
│   │   ├── subscriptions.ts    # Subscription business logic
│   │   ├── pro-rating.ts       # Pro-rated credit calculation
│   │   └── notifications.ts    # DM/Email notification service
│   └── middleware/
│       ├── webhook-signature.ts # Midtrans signature verification
│       └── email-verification.ts # Email verification check
└── tests/
    └── e2e/
        ├── checkout.spec.ts        # Checkout flow E2E tests
        ├── webhook.spec.ts         # Webhook processing tests
        └── portal.spec.ts          # Member portal tests

# Database Schema (packages/db)
packages/db/src/schema/
├── subscriptions.ts       # New: Subscriptions table
├── transactions.ts        # New: Payment transactions table
├── webhook-events.ts      # New: Webhook event log
└── activity-logs.ts       # New: Audit trail

# Shared Schemas (packages/shared)
packages/shared/src/schemas/
├── subscription.ts        # Update: Add subscription validation schemas
└── midtrans.ts           # New: Midtrans webhook/payload schemas

# Frontend (apps/web)
apps/web/src/
├── pages/
│   ├── checkout.tsx           # Checkout flow page
│   └── portal.tsx             # Member subscription portal
├── components/
│   ├── subscription/
│   │   ├── TierSelector.tsx       # Pricing tier selection
│   │   ├── PaymentStatus.tsx      # Payment status display
│   │   └── SubscriptionCard.tsx   # Subscription details card
│   └── ui/                    # shadcn/ui components
└── hooks/
    ├── useSubscription.ts     # Subscription data hook
    └── useCheckout.ts         # Checkout flow hook

# E2E Tests (tests/)
tests/e2e/
├── 007-checkout-flow.spec.ts     # Full checkout journey tests
├── 007-webhook-processing.spec.ts # Webhook handling tests
└── 007-member-portal.spec.ts      # Portal interaction tests
```

**Structure Decision**: Monorepo web application structure with separate backend (Hono on Cloudflare Workers) and frontend (React with Vite) apps. Database schema and shared types in packages/ for reusability.

## Complexity Tracking

> **No violations - all constitution requirements met**

## Phase 0: Research & Decisions

### Research Tasks

1. **Midtrans Integration Pattern**
   - Research Midtrans SDK for TypeScript/Node.js
   - Investigate webhook signature verification implementation
   - Determine transaction creation and redirect flow
   - Understand pending/success/failed/refund webhook payloads

2. **Pro-rated Credit Calculation**
   - Research industry standard methods for subscription upgrade/downgrade
   - Determine time-based vs cost-based credit calculation
   - Clarify expiry date handling for upgrades

3. **Discord Role Assignment Error Handling**
   - Research Discord bot permission requirements
   - Investigate rate limiting and retry patterns
   - Determine logging for failed role assignments

4. **Email Verification Flow**
   - Determine when email is captured (Discord OAuth provides email)
   - Design verification token storage and expiration
   - Plan fallback notification for DM failures

5. **Webhook Idempotency**
   - Research best practices for duplicate webhook detection
   - Determine transaction ID uniqueness handling
   - Plan webhook replay attack prevention

### Key Decisions

See [research.md](./research.md) for detailed findings.

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete database schema design.

### API Contracts

See [contracts/](./contracts/) directory for API specifications:
- [checkout-api.md](./contracts/checkout-api.md) - Checkout flow endpoints
- [webhook-api.md](./contracts/webhook-api.md) - Midtrans webhook endpoint
- [subscription-api.md](./contracts/subscription-api.md) - Subscription management
- [portal-api.md](./contracts/portal-api.md) - Member portal endpoints

### Quickstart Guide

See [quickstart.md](./quickstart.md) for developer setup instructions.

## Phase 2: Implementation Tasks

See [tasks.md](./tasks.md) (generated by `/speckit.tasks` command).

## Phase N+1: Demo & Handoff

### E2E Demo Checklist

- [ ] Complete checkout flow: select tier → Discord OAuth → Midtrans payment → role assigned
- [ ] Webhook processing: test success, pending, failed, refund scenarios
- [ ] Member portal: view subscription status, renewal flow
- [ ] Manual role management: assign/remove roles via dashboard
- [ ] Error handling: failed payments, DM fallback, rate limiting
- [ ] Pro-rated upgrade: purchase new tier with existing subscription

### Integration Requirements

- [ ] Midtrans sandbox account configured
- [ ] Midtrans webhook URL registered (need staging URL from Lutfi)
- [ ] Discord bot test server configured
- [ ] Email service for verification emails (need credentials from Lutfi)

### Progress Report Template

```
Feature: Payment & Subscription Flow
Status: COMPLETE / IN PROGRESS
Summary: [Brief description of what was implemented]
E2E Demo: [Link to screenshots/video or notes]
Issues: [Any observed problems or areas needing attention]
Integration Needs: [What credentials/access from Lutfi]
```
