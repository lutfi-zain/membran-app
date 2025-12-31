# Research: Pricing Tier Configuration

**Feature**: 004-pricing-tier-config
**Date**: 2025-12-31
**Phase**: Phase 0 - Research & Decision Making

---

## Overview

This document consolidates research findings and technical decisions for implementing the pricing tier configuration feature. All decisions are based on the existing codebase patterns, feature requirements, and best practices for TypeScript/Bun/Hono stack.

---

## 1. Discord Role Synchronization

### Decision: Sync roles on-demand and cache in database

**Rationale**: Discord roles need to be stored locally to:
- Validate tier configuration when bot is offline
- Track which roles the bot can manage (permission validation)
- Detect when roles are deleted from Discord

**Implementation**:
- Create `discord_roles` table with `botCanManage` boolean flag
- Sync roles when:
  - Server owner accesses pricing configuration page
  - Bot connection status changes
  - Server owner manually triggers sync
- Use existing `fetchWithRetry` pattern from `discord-bot.ts`

**Alternatives Considered**:
- **Real-time API calls only**: Rejected because it would fail when Discord API is down/slow
- **Background cron sync only**: Rejected because data could be stale when user needs it

**Discord API Endpoints**:
- `GET /guilds/{guild.id}/roles` - Returns all roles in a guild
- Requires `MANAGE_ROLES` permission (already required for bot)

---

## 2. Price Storage Format

### Decision: Store price as integer (cents) in database

**Rationale**:
- Avoids floating-point precision issues (e.g., $0.10 + $0.20 = 0.30000000000000004)
- Standard practice for financial data
- D1/SQLite handles integers efficiently

**Implementation**:
- Database column: `priceCents` integer
- Display format: Convert to decimal for UI (e.g., 500 → $5.00)
- Validation: $0 = 0 cents, $999 = 99900 cents

**Alternatives Considered**:
- **Decimal/float storage**: Rejected due to precision issues
- **String storage**: Rejected because it complicates calculations and comparisons

---

## 3. Tier Display Order Management

### Decision: Use integer `displayOrder` field with gaps for reordering

**Rationale**:
- Simple to implement and query
- Supports drag-and-drop reordering
- Allows insertions between items (use 10, 20, 30... gaps)

**Implementation**:
- Default values: 10, 20, 30, 40, 50
- When reordering: Reassign based on new positions
- Query: `ORDER BY displayOrder ASC`

**Alternatives Considered**:
- **Sortable JS array only**: Rejected because order must persist in database
- **Doubly-linked list**: Overcomplicated for max 5 items

---

## 4. Featured Tier Selection

### Decision: At most one featured tier per server, stored as boolean

**Rationale**:
- Spec requires at most one featured tier
- Boolean flag is simplest
- When unfeaturing one tier, feature another in same transaction

**Implementation**:
- `isFeatured` boolean column on `pricing_tiers` table
- Unique partial index: `UNIQUE(discord_server_id, isFeatured) WHERE isFeatured = 1`
- Application logic: When setting a tier as featured, unset all others first

**Alternatives Considered**:
- **Featured tier ID on server record**: Rejected because it's tier-specific state
- **Allow multiple featured**: Rejected because spec says "at most one"

---

## 5. Feature List Storage (Tier Features)

### Decision: Separate `tier_features` table with one-to-many relationship

**Rationale**:
- Spec requires 0-20 features per tier
- Individual features need display order
- Allows querying features independently for previews

**Implementation**:
- Table `tier_features`: `id`, `tierId`, `description`, `displayOrder`
- Validation: Count features before insert (max 20)
- Cascade delete when tier is deleted

**Alternatives Considered**:
- **JSON array in tier record**: Rejected because harder to validate and query
- **Single text field with newlines**: Rejected because no display order support

---

## 6. Concurrent Edit Protection (Optimistic Locking)

### Decision: Version column with integer increment

**Rationale**:
- Spec requires conflict detection when multiple users edit tiers
- Optimistic locking is appropriate for low-contention scenarios
- Pattern: `version` column increments on each update

**Implementation**:
- `version` integer column, default 1
- On update: `WHERE id = ? AND version = ?` then `SET version = version + 1`
- Return 409 Conflict if row not found (version mismatch)

**Alternatives Considered**:
- **Pessimistic locking (SELECT FOR UPDATE)**: Not supported in D1/SQLite
- **Last write wins**: Rejected because spec requires conflict warning

---

## 7. Grandfathered Pricing for Existing Subscribers

### Decision: Store snapshot of price on subscription record

**Rationale**:
- Spec: "When a tier's price is changed, existing subscribers MUST retain their original price"
- Subscription captures price at time of purchase
- Tier price can change independently

**Implementation**:
- Subscriptions table (created later) will have `pricePaidCents` column
- When renewing, use subscription's `pricePaidCents`, not tier's current price
- Migration path if needed (not in this feature's scope)

**Alternatives Considered**:
- **Price history table**: Overcomplicated for MVP
- **Disallow price changes**: Rejected because spec allows editing

---

## 8. Discord API Failure Handling

### Decision: Graceful degradation with background retry

**Rationale**:
- Spec: "When Discord API is unavailable or rate-limited, system MUST allow saving tier configuration with a warning"
- Server owners shouldn't be blocked by Discord outages
- Background job can validate and sync when API recovers

**Implementation**:
- Store tier configuration even if role validation fails
- Set `discordRoleId` to null and add warning message
- Add `needsSync` boolean flag on tier
- Background cron job retries validation using existing sync pattern

**Alternatives Considered**:
- **Block saves until API succeeds**: Rejected per spec requirements
- **Queue all requests**: Overcomplicated for this feature

---

## 9. Tier Deletion with Active Subscribers

### Decision: Soft delete with `isActive` flag

**Rationale**:
- Spec: "When a tier with active subscribers is deleted, it MUST be hidden from new subscribers but existing subscribers retain access"
- Soft delete preserves data for active subscribers
- Can be truly deleted after all subscriptions expire

**Implementation**:
- `isActive` boolean column, default true
- When "deleting" with subscribers: Set `isActive = false`
- When deleting without subscribers: True delete
- Query filters: Always include `WHERE isActive = true` for new subscribers

**Alternatives Considered**:
- **Hard delete only**: Rejected because spec says existing subscribers keep access
- **Archived table**: Overcomplicated for MVP

---

## 10. Validation Error Messages

### Decision: Structured error codes with user-friendly messages

**Rationale**:
- Consistent with existing error handling pattern in `bot.ts`
- Frontend can display appropriate UI based on error code
- Separates technical from user-facing messages

**Error Codes**:
- `TIER_LIMIT_EXCEEDED`: Maximum 5 tiers per server
- `FEATURE_LIMIT_EXCEEDED`: Maximum 20 features per tier
- `INVALID_PRICE_RANGE`: Price must be $0-$999
- `DUPLICATE_TIER_NAME`: Tier names must be unique (case-insensitive)
- `ROLE_CANNOT_BE_MANAGED`: Bot lacks permission for selected role
- `TIER_HAS_ACTIVE_SUBSCRIBERS`: Cannot delete tier with active subscribers
- `LAST_TIER_CANNOT_DELETE`: At least 1 tier must remain

**Alternatives Considered**:
- **Generic errors**: Rejected because less user-friendly
- **Validation library messages**: Too technical for end users

---

## 11. Public Pricing Page Preview

### Decision: Read-only endpoint that returns rendered tier data

**Rationale**:
- Spec: "System MUST display a preview of how tiers will appear to potential subscribers"
- Same data structure as public page, but scoped to server owner's server
- Can reuse components between preview and public page

**Implementation**:
- GET `/api/pricing/preview` - Returns formatted tiers for current user's server
- Use same query logic as public page (but authenticated)
- Frontend renders using shared pricing card component

**Alternatives Considered**:
- **Separate preview page**: Unnecessary duplication
- **Live edit mode**: More complex, preview endpoint is sufficient

---

## 12. Currency Handling for MVP

### Decision: USD only for MVP, stored as `$` symbol

**Rationale**:
- Spec: "Assume USD with "$" symbol for MVP"
- Simplifies implementation
- Future: Add `currencyCode` column and multi-currency support

**Implementation**:
- Hardcode `$` symbol in display
- Store prices in cents (integer)
- Validate: 0-99900 cents ($0-$999)

**Alternatives Considered**:
- **Multi-currency from start**: Out of scope for MVP per spec
- **Currency table**: Overcomplicated for USD-only MVP

---

## 13. Database Index Strategy

### Decision: Index on frequently queried columns

**Indexes to add**:
1. `pricing_tiers(discord_server_id, displayOrder)` - For listing tiers in order
2. `pricing_tiers(discord_server_id, isFeatured)` - For finding featured tier
3. `tier_features(tier_id, displayOrder)` - For loading tier features
4. `discord_roles(discord_server_id, discord_role_id)` - For role lookup/validation
5. `pricing_tiers(discord_server_id, name)` - For unique name validation

**Rationale**: Optimizes common query patterns while keeping write overhead low

---

## 14. Frontend State Management

### Decision: TanStack Query for server state, local form state for edits

**Rationale**:
- TanStack Query is already used in the codebase (`useAuth`, `useBotConnection`)
- Handles caching, invalidation, and loading states
- Local state for form inputs (don't refetch on every keystroke)

**Implementation**:
- `usePricingTiers()` - Query for fetching tiers
- `useDiscordRoles()` - Query for fetching available roles
- `useCreateTier()`, `useUpdateTier()`, `useDeleteTier()` - Mutations
- Local form state with `useState` for editing individual tiers

**Alternatives Considered**:
- **Redux/Zustand**: Overkill for this feature's scope
- **Pure local state**: Doesn't handle sync across windows/components

---

## 15. Testing Strategy

### Decision: Unit tests for business logic, integration tests for API endpoints

**Rationale**:
- Follows existing test pattern in codebase
- Unit tests: Validation, price calculations, feature counting
- Integration tests: Full CRUD flow, permission checks, error cases

**Test Coverage Targets**:
- Tier creation with valid data
- Tier creation with invalid data (price, name, limits)
- Tier editing with and without conflicts
- Tier deletion with and without subscribers
- Discord role sync and validation
- Error handling for Discord API failures

---

## Summary of Technical Decisions

| Area | Decision | Key Points |
|------|----------|------------|
| Discord Roles | Sync to database, cache locally | On-demand sync + cron backup |
| Price Storage | Integer cents (0-99900) | Avoids floating-point issues |
| Display Order | Integer with gaps | Simple, supports reordering |
| Featured Tier | Boolean flag, max 1 per server | Unique partial index |
| Tier Features | Separate table, 0-20 per tier | One-to-many with displayOrder |
| Concurrent Edits | Optimistic locking (version column) | 409 Conflict on mismatch |
| Grandfathered Pricing | Store price on subscription | Subscription snapshot |
| API Failures | Graceful degradation + retry | Save with warning, background sync |
| Deletion | Soft delete (isActive flag) | Preserves data for subscribers |
| Validation | Structured error codes | User-friendly messages |
| Preview | Read-only endpoint | Reuses public page logic |
| Currency | USD only for MVP | Hardcoded `$` symbol |
| Indexes | Query-based indexing | Optimizes reads, minimal writes |
| State Management | TanStack Query + local form | Follows existing pattern |
| Testing | Unit + integration | Business logic + API flows |

---

## Open Questions Resolved

All questions from the spec have been addressed through the research above:
1. **Currency multi-language support**: USD only for MVP
2. **Tier limits enforcement**: Universal 1-5 tier limit
3. **Feature lists formatting**: Structured list with TierFeature table
4. **Concurrent edits**: Optimistic locking with version column
5. **Discord API failures**: Graceful degradation with retry
6. **Price range validation**: $0-$999 (0-99900 cents)
7. **Featured tier behavior**: Boolean flag, max one per server
8. **Feature limits**: 0-20 features per tier validated at insert time

---

## Next Steps (Phase 1)

With research complete, proceed to:
1. Generate `data-model.md` with detailed schema definitions
2. Generate `contracts/api.yaml` with OpenAPI specification
3. Generate `quickstart.md` with implementation guidance
