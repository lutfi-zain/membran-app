# Implementation Tasks: Pricing Tier Configuration

**Feature**: 004-pricing-tier-config
**Branch**: `004-pricing-tier-config`
**Status**: Implementation Complete
**Generated**: 2025-12-31
**Completed**: 2025-12-31

---

## Overview

Server owners need the ability to configure 1-5 pricing tiers for their Discord server's premium membership offerings. Each tier defines a subscription price point, the Discord role granted upon subscription, and the features included (0-20 features per tier).

**Tech Stack**: TypeScript 5.x / Bun 1.x + Hono, Drizzle ORM, TanStack Query, Zod

---

## Task Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1: Setup | 6 tasks | Database schema & shared types |
| Phase 2: Foundational | 5 tasks | API libraries & validation & testing |
| Phase 3: User Story 1 (P1) | 13 tasks | Create & configure pricing tiers |
| Phase 4: User Story 2 (P2) | 8 tasks | Edit & delete existing tiers |
| Phase 5: User Story 3 (P3) | 7 tasks | Reorder tier display sequence |
| Phase 6: Polish | 6 tasks | Cross-cutting concerns & UX |
| **Total** | **45 tasks** | |

---

## Phase 1: Setup (Database Schema & Shared Types)

**Goal**: Create database tables and shared validation schemas

**Independent Test Criteria**:
- Database migration runs successfully
- Drizzle ORM types are exported and usable
- Zod schemas validate correctly

---

- [X] T001 Create `packages/db/src/schema/discord-roles.ts` with discordRoles table definition
- [X] T002 Create `packages/db/src/schema/pricing-tiers.ts` with pricingTiers table definition
- [X] T003 Create `packages/db/src/schema/tier-features.ts` with tierFeatures table definition
- [X] T004 [P] Update `packages/db/src/schema/index.ts` to export new tables and types
- [X] T005 [P] Create `packages/shared/src/pricing.ts` with Zod schemas and error codes
- [X] T006 Generate and apply database migration via `bun run db:generate && cd apps/api && npx wrangler d1 migrations apply membran-db --local`

---

## Phase 2: Foundational (API Libraries & Discord Role Sync)

**Goal**: Build business logic libraries and Discord role synchronization

**Prerequisites**: Phase 1 complete

**Independent Test Criteria**:
- Discord roles can be synced from Discord API
- Roles are cached in database with botCanManage flags
- Pricing tier business logic functions are testable

---

- [X] T007 Create `apps/api/src/lib/discord-roles.ts` with syncDiscordRoles, getManageableRoles, validateRolePermission functions
- [X] T008 Create `apps/api/src/lib/pricing-tiers.ts` with createPricingTier, getPricingTiers, validateTierLimit functions
- [X] T009 Create `apps/api/src/routes/roles.ts` with GET /api/roles and POST /api/roles/sync endpoints
- [X] T010 Update `apps/api/src/index.ts` to mount roles router at `/api/roles`

### Testing (Phase 2)

- [X] T010a [P] Create `apps/api/src/lib/tests/discord-roles.test.ts` with tests for:
  - syncDiscordRoles handles 401/403 Discord API errors gracefully
  - syncDiscordRoles handles rate limit (429) with retry logic
  - validateRolePermission returns false for roles above bot's position
  - validateRolePermission returns true for manageable roles
  - getManageableRoles filters by bot_can_manage flag

---

## Phase 3: User Story 1 - Create and Configure Pricing Tiers (Priority: P1)

**Goal**: Server owners can create their first pricing tier(s) and see them displayed

**User Story**: As a server owner setting up membran.app for the first time, I need to define my available subscription tiers so that members can choose and purchase the access level that fits their needs.

**Acceptance Scenarios**:
1. Empty state prompts creation of first tier
2. Tier form saves and displays in tier list
3. Multiple tiers display with correct information
4. Price formats as currency ($5.00)
5. Maximum 5 tier limit enforced

**Prerequisites**: Phase 2 complete

**Independent Test Criteria**:
- Server owner can create a tier via form
- Tier appears in list after creation
- Tier limit (5) enforced with error message
- Price displays in currency format

---

### Backend Tasks (US1)

- [X] T011 [US1] Add createTierHandler to `apps/api/src/routes/pricing.ts` for POST /api/pricing/tiers
- [X] T012 [US1] Add listTiersHandler to `apps/api/src/routes/pricing.ts` for GET /api/pricing/tiers
- [X] T013 [US1] Add getTierHandler to `apps/api/src/routes/pricing.ts` for GET /api/pricing/tiers/:tierId
- [X] T014 [US1] Add previewHandler to `apps/api/src/routes/pricing.ts` for GET /api/pricing/preview
- [X] T015 [US1] Update `apps/api/src/index.ts` to mount pricing router at `/api/pricing`

### Frontend Hooks (US1)

- [X] T016 [P] [US1] Create `apps/web/src/hooks/usePricingTiers.ts` with usePricingTiers, useCreateTier hooks
- [X] T017 [P] [US1] Create `apps/web/src/hooks/useDiscordRoles.ts` with useDiscordRoles, useSyncRoles hooks

### Frontend Components (US1)

- [X] T018 [P] [US1] Create `apps/web/src/components/pricing/RoleSelector.tsx` dropdown component
- [X] T019 [P] [US1] Create `apps/web/src/components/pricing/FeatureList.tsx` editor component with max 20 validation
- [X] T020 [P] [US1] Create `apps/web/src/components/pricing/TierForm.tsx` form component with validation
- [X] T021 [P] [US1] Create `apps/web/src/components/pricing/TierCard.tsx` display component
- [X] T022 [P] [US1] Create `apps/web/src/components/pricing/TierList.tsx` list component with empty state

### Frontend Pages (US1)

- [X] T023 [US1] Create `apps/web/src/pages/onboarding/pricing/index.tsx` onboarding page with progress indicator

---

## Phase 4: User Story 2 - Edit and Delete Existing Tiers (Priority: P2)

**Goal**: Server owners can modify tier details or remove tiers

**User Story**: As a server owner managing my monetization strategy, I need to modify pricing tier details (name, price, features) or remove tiers that are no longer relevant, so that my offerings stay aligned with my community's needs.

**Acceptance Scenarios**:
1. Tier edit updates and new subscribers see changes
2. Existing subscribers retain original price (grandfathered)
3. Tier with 0 subscribers can be deleted
4. Tier with active subscribers requires confirmation
5. Confirmed deletion hides tier but preserves access

**Prerequisites**: Phase 3 complete

**Independent Test Criteria**:
- Server owner can edit tier price and see change
- Deleting tier with 0 subscribers removes it
- Deleting tier with subscribers requires confirmation
- Optimistic locking detects concurrent edits

---

### Backend Tasks (US2)

- [X] T024 [US2] Add updatePricingTier with optimistic locking to `apps/api/src/lib/pricing-tiers.ts`
- [X] T025 [US2] Add deletePricingTier with soft/hard delete logic to `apps/api/src/lib/pricing-tiers.ts`
- [X] T026 [US2] Add updateTierHandler to `apps/api/src/routes/pricing.ts` for PUT /api/pricing/tiers/:tierId
- [X] T027 [US2] Add deleteTierHandler to `apps/api/src/routes/pricing.ts` for DELETE /api/pricing/tiers/:tierId

### Frontend Tasks (US2)

- [X] T028 [P] [US2] Update `apps/web/src/components/pricing/TierForm.tsx` to support edit mode with version field
- [X] T029 [P] [US2] Update `apps/web/src/components/pricing/TierCard.tsx` to show edit/delete buttons with subscriber warning
- [X] T030 [P] [US2] Update `apps/web/src/hooks/usePricingTiers.ts` to add useUpdateTier, useDeleteTier hooks
- [X] T031 [P] [US2] Update `apps/web/src/components/pricing/TierList.tsx` to handle version conflict error (409)

---

## Phase 5: User Story 3 - Reorder Tier Display Sequence (Priority: P3)

**Goal**: Server owners can control visual order of tiers on public page

**User Story**: As a server owner, I need to control the visual order of my pricing tiers on the public page (e.g., showing lowest-to-highest price, or highlighting a "recommended" tier in the center), so that I can influence purchase decisions.

**Acceptance Scenarios**:
1. Reordered tiers display in new order on public page
2. Order is preserved across sessions
3. Featured tier is visually highlighted

**Prerequisites**: Phase 4 complete

**Independent Test Criteria**:
- Server owner can drag tiers to reorder
- New order persists after page refresh
- Featured tier displays centrally highlighted

---

### Backend Tasks (US3)

- [X] T032 [US3] Add reorderTiers function to `apps/api/src/lib/pricing-tiers.ts`
- [X] T033 [US3] Add addFeature, updateFeatures, deleteFeature functions to `apps/api/src/lib/pricing-tiers.ts`
- [X] T034 [US3] Add reorderTiersHandler to `apps/api/src/routes/pricing.ts` for POST /api/pricing/tiers/reorder
- [X] T035 [US3] Add feature handlers to `apps/api/src/routes/pricing.ts` (POST /features/:tierId, PUT /features/:tierId, DELETE /features/:tierId/:featureId)

### Frontend Tasks (US3)

- [X] T036 [P] [US3] Update `apps/web/src/components/pricing/TierList.tsx` to add drag-and-drop reordering
- [X] T037 [P] [US3] Update `apps/web/src/components/pricing/TierCard.tsx` to show featured badge and drag handle
- [X] T038 [P] [US3] Update `apps/web/src/hooks/usePricingTiers.ts` to add useReorderTiers hook

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Complete settings page, error handling, and UX improvements

**Prerequisites**: Phase 5 complete

**Independent Test Criteria**:
- Settings page displays full tier management
- Error messages are user-friendly
- Loading states display appropriately
- Currency formatting is consistent

---

- [X] T039 Create or update `apps/web/src/pages/settings/pricing.tsx` settings page with sync roles button, preview button, and usage stats
- [X] T040 Add price formatting utility to `apps/web/src/lib/currency.ts` for cents-to-dollars conversion
- [X] T041 Add error message mappings to `apps/web/src/lib/errors.ts` for PRICING_ERROR_CODES
- [X] T042 Add loading states to all `apps/web/src/hooks/usePricingTiers.ts` mutations
- [X] T043 Add optimistic update behavior to `apps/web/src/hooks/usePricingTiers.ts` for better UX
- [X] T044 Update `apps/web/src/components/pricing/TierForm.tsx` to show live currency preview as user types price

---

## Dependencies

```text
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US1 - Create Tiers) ← MVP SCOPE
    ↓
Phase 4 (US2 - Edit/Delete)
    ↓
Phase 5 (US3 - Reorder)
    ↓
Phase 6 (Polish)
```

**MVP Recommendation**: Implement Phases 1-3 for initial delivery. This enables server owners to create and configure pricing tiers, which is the foundational capability.

---

## Parallel Execution Opportunities

### Phase 1 (after T003):
- T004 (schema exports) **[PARALLEL]** with T005 (shared types)
- T006 (migration) must run after both

### Phase 2 (after T006):
- T007 (discord-roles lib) **[PARALLEL]** with T008 (pricing-tiers lib)

### Phase 3 (after T010):
- T016 (usePricingTiers hook) **[PARALLEL]** with T017 (useDiscordRoles hook)
- T018-T022 (all components) **[ALL PARALLEL]**
- T023 (onboarding page) after components

### Phase 4 (after T015):
- T028-T031 (all frontend tasks) **[ALL PARALLEL]** after backend tasks T024-T027

### Phase 5 (after T031):
- T036-T038 (all frontend tasks) **[ALL PARALLEL]** after backend tasks T032-T035

### Phase 6 (after T038):
- Most tasks can run in parallel as they are independent UX improvements

---

## Implementation Strategy

### MVP First (Phases 1-3)
Focus on the highest-value user story first: creating and configuring pricing tiers. This enables the core business function (selling subscriptions) as quickly as possible.

**MVP Deliverable**:
- Database schema for pricing tiers
- API endpoints for creating and listing tiers
- Onboarding page for first-time tier configuration
- Discord role synchronization
- Basic validation and error handling

### Incremental Delivery (Phases 4-6)
After MVP, add editing/deleting, then reordering, then polish. Each phase adds value while maintaining a working system.

**Benefits**:
- Faster time-to-market for core functionality
- Early validation of pricing model with users
- Reduced risk of over-building

---

## Testing Notes

Tests are **not included** in this task list as they were not explicitly requested in the feature specification. If TDD is desired, add test tasks for each phase following the pattern:
- Unit tests co-located with source files (`.test.ts` suffix)
- Integration tests in `apps/api/src/tests/integration/`

---

## References

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [API Contract](./contracts/api.yaml)
- [Quickstart Guide](./quickstart.md)
- [Research Findings](./research.md)
