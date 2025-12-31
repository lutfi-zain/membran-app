# Quickstart Guide: Pricing Tier Configuration

**Feature**: 004-pricing-tier-config
**Branch**: `004-pricing-tier-config`
**Phase**: Phase 1 - Design Complete

---

## Overview

This guide provides implementation guidance for developers building the pricing tier configuration feature. It covers the step-by-step process from database setup to frontend implementation.

---

## Prerequisites

- Discord bot already connected (feature 003-discord-bot-connection complete)
- Node.js 18+ and Bun installed
- Database migrations can be applied via `npx wrangler d1`

---

## Implementation Checklist

### Phase 1: Database Schema

**Location**: `packages/db/src/schema/`

1. **Create `discord-roles.ts`**
   - Define `discordRoles` table with sync tracking
   - Add relation to `discordServers`
   - Export types: `DiscordRole`, `NewDiscordRole`

2. **Create `pricing-tiers.ts`**
   - Define `pricingTiers` table with constraints
   - Add relation to `discordServers` and `discordRoles`
   - Export types: `PricingTier`, `NewPricingTier`

3. **Create `tier-features.ts`**
   - Define `tierFeatures` table with cascade delete
   - Add relation to `pricingTiers`
   - Export types: `TierFeature`, `NewTierFeature`

4. **Update `packages/db/src/schema/index.ts`**
   - Export all new tables and types

5. **Generate and apply migration**
   ```bash
   bun run db:generate
   cd apps/api && npx wrangler d1 migrations apply membran-db --local
   ```

---

### Phase 2: Shared Types & Validation

**Location**: `packages/shared/src/`

1. **Create `pricing.ts`**
   - Define Zod schemas for all pricing operations
   - Export TypeScript types inferred from schemas
   - Define error code constants

**Example schemas**:
```typescript
import { z } from "zod";

// Duration enum
export const DurationEnum = z.enum(["monthly", "yearly", "lifetime"]);

// Tier feature schema
export const TierFeatureSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(200),
  displayOrder: z.number().int().min(1).max(20),
});

// Create tier schema
export const CreatePricingTierSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0).max(99900),
  duration: DurationEnum,
  discordRoleId: z.string(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().positive(),
  features: z.array(TierFeatureSchema).max(20).optional(),
});

// Update tier schema (with version for optimistic locking)
export const UpdatePricingTierSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0).max(99900).optional(),
  duration: DurationEnum.optional(),
  discordRoleId: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().positive().optional(),
  version: z.number().int().min(1), // Required for optimistic locking
});

// Error codes
export const PRICING_ERROR_CODES = {
  TIER_LIMIT_EXCEEDED: "TIER_LIMIT_EXCEEDED",
  FEATURE_LIMIT_EXCEEDED: "FEATURE_LIMIT_EXCEEDED",
  INVALID_PRICE_RANGE: "INVALID_PRICE_RANGE",
  DUPLICATE_TIER_NAME: "DUPLICATE_TIER_NAME",
  ROLE_CANNOT_BE_MANAGED: "ROLE_CANNOT_BE_MANAGED",
  TIER_HAS_ACTIVE_SUBSCRIBERS: "TIER_HAS_ACTIVE_SUBSCRIBERS",
  LAST_TIER_CANNOT_DELETE: "LAST_TIER_CANNOT_DELETE",
  VERSION_CONFLICT: "VERSION_CONFLICT",
} as const;
```

---

### Phase 3: API Libraries

**Location**: `apps/api/src/lib/`

1. **Create `discord-roles.ts`**
   - `syncDiscordRoles(discordServerId, botToken)` - Fetch roles from Discord API
   - `getManageableRoles(discordServerId)` - Query cached roles bot can manage
   - `validateRolePermission(discordRoleId, botToken)` - Check bot can assign role
   - Use existing `fetchWithRetry` from `discord-bot.ts`

2. **Create `pricing-tiers.ts`**
   - `createPricingTier(userId, data)` - Validate and create tier with features
   - `getPricingTiers(userId)` - List all tiers with features
   - `updatePricingTier(tierId, data, version)` - Optimistic lock update
   - `deletePricingTier(tierId, confirm)` - Soft/hard delete based on subscribers
   - `reorderTiers(userId, tierIds)` - Update display order
   - `addFeature(tierId, description, order)` - Add feature to tier
   - `updateFeatures(tierId, features)` - Bulk update features
   - `deleteFeature(featureId)` - Remove feature

**Key validation logic**:
```typescript
// Check tier limit
async function validateTierLimit(discordServerId: string) {
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(pricingTiers)
    .where(eq(pricingTiers.discordServerId, discordServerId))
    .where(eq(pricingTiers.isActive, true));

  if (count[0].count >= 5) {
    throw new ApiError(400, PRICING_ERROR_CODES.TIER_LIMIT_EXCEEDED);
  }
}

// Check feature limit
async function validateFeatureLimit(tierId: string) {
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(tierFeatures)
    .where(eq(tierFeatures.tierId, tierId));

  if (count[0].count >= 20) {
    throw new ApiError(400, PRICING_ERROR_CODES.FEATURE_LIMIT_EXCEEDED);
  }
}

// Optimistic locking update
async function updateWithVersion(tierId: string, data: UpdateData, expectedVersion: number) {
  const result = await db
    .update(pricingTiers)
    .set({ ...data, version: sql<number>`version + 1` })
    .where(eq(pricingTiers.id, tierId))
    .where(eq(pricingTiers.version, expectedVersion))
    .returning();

  if (result.length === 0) {
    throw new ApiError(409, PRICING_ERROR_CODES.VERSION_CONFLICT);
  }
  return result[0];
}
```

---

### Phase 4: API Routes

**Location**: `apps/api/src/routes/`

1. **Create `pricing.ts`**

**Route structure**:
```typescript
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
// ... imports

const router = new Hono<{ Bindings: Env }>();

// Apply authentication middleware (existing pattern)
router.use("*", sessionMiddleware);

// GET /api/pricing/tiers - List tiers
router.get("/tiers", listTiersHandler);

// POST /api/pricing/tiers - Create tier
router.post("/tiers",
  zValidator("json", CreatePricingTierSchema),
  createTierHandler
);

// GET /api/pricing/tiers/:tierId - Get tier
router.get("/tiers/:tierId", getTierHandler);

// PUT /api/pricing/tiers/:tierId - Update tier
router.put("/tiers/:tierId",
  zValidator("json", UpdatePricingTierSchema),
  updateTierHandler
);

// DELETE /api/pricing/tiers/:tierId - Delete tier
router.delete("/tiers/:tierId", deleteTierHandler);

// POST /api/pricing/tiers/reorder - Reorder tiers
router.post("/tiers/reorder", reorderTiersHandler);

// GET /api/pricing/preview - Preview page
router.get("/preview", previewHandler);

// POST /api/pricing/features/:tierId - Add feature
router.post("/features/:tierId",
  zValidator("json", CreateFeatureSchema),
  addFeatureHandler
);

// PUT /api/pricing/features/:tierId - Update features
router.put("/features/:tierId", updateFeaturesHandler);

// DELETE /api/pricing/features/:tierId/:featureId - Delete feature
router.delete("/features/:tierId/:featureId", deleteFeatureHandler);

export { router as pricingRouter };
```

2. **Update `apps/api/src/index.ts`**
   - Import and mount pricing router: `app.route("/api/pricing", pricingRouter);`

---

### Phase 5: Discord Role Sync Routes

**Location**: `apps/api/src/routes/`

1. **Create or update `roles.ts`**
   - POST `/api/roles/sync` - Sync roles from Discord
   - GET `/api/roles` - List cached roles

2. **Update `apps/api/src/index.ts`**
   - Mount roles router

**Discord API endpoint for roles**:
```
GET https://discord.com/api/v10/guilds/{guild.id}/roles
```

---

### Phase 6: Frontend Hooks

**Location**: `apps/web/src/hooks/`

1. **Create `usePricingTiers.ts`**
   - `usePricingTiers()` - Fetch all tiers
   - `useCreateTier()` - Create tier mutation
   - `useUpdateTier()` - Update tier mutation
   - `useDeleteTier()` - Delete tier mutation
   - `useReorderTiers()` - Reorder mutation

2. **Create `useDiscordRoles.ts`**
   - `useDiscordRoles()` - Fetch roles
   - `useSyncRoles()` - Sync mutation

**Example using TanStack Query**:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreatePricingTierSchema } from "@membran/shared";

export function usePricingTiers() {
  return useQuery({
    queryKey: ["pricing-tiers"],
    queryFn: async () => {
      const response = await fetch("/api/pricing/tiers");
      if (!response.ok) throw new Error("Failed to fetch tiers");
      return response.json();
    },
  });
}

export function useCreateTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof CreatePricingTierSchema>) => {
      const response = await fetch("/api/pricing/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
    },
  });
}
```

---

### Phase 7: Frontend Components

**Location**: `apps/web/src/components/pricing/`

1. **Create `RoleSelector.tsx`**
   - Dropdown to select Discord role
   - Filter to manageable roles only
   - Show warning if role cannot be managed

2. **Create `FeatureList.tsx`**
   - List of feature inputs
   - Add/remove feature buttons
   - Display order controls (drag handle or up/down buttons)
   - Validation: max 20 features

3. **Create `TierForm.tsx`**
   - Form inputs: name, description, price, duration
   - RoleSelector component
   - FeatureList component
   - Validation feedback
   - Submit button with loading state

4. **Create `TierCard.tsx`**
   - Display tier info
   - Edit/delete buttons
   - Drag handle for reordering
   - Featured badge if applicable

5. **Create `TierList.tsx`**
   - List of TierCard components
   - Drag-and-drop reordering
   - "Add Tier" button (disabled if limit reached)
   - Empty state message

---

### Phase 8: Frontend Pages

**Location**: `apps/web/src/pages/`

1. **Create `onboarding/pricing/index.tsx`**
   - Step in onboarding flow
   - Prompt user to create first tier
   - "Skip" option (with warning that server can't accept payments)
   - Progress indicator

2. **Create or update `settings/pricing.tsx`**
   - Tier list with edit controls
   - Preview button/modal
   - Sync roles button
   - Usage stats (tier count, feature count)

---

## Testing Strategy

### Unit Tests

**Location**: Co-located with source files (`.test.ts` suffix)

1. **Database logic tests**
   - `pricing-tiers.test.ts` - Validation, limits, constraints
   - `discord-roles.test.ts` - Sync logic, permission checks

2. **Business logic tests**
   - Price calculation (cents to dollars)
   - Feature limit validation
   - Tier limit validation
   - Optimistic locking scenarios

### Integration Tests

**Location**: `apps/api/src/tests/integration/`

1. **API endpoint tests**
   - `pricing.test.ts` - Full CRUD flow
   - `roles.test.ts` - Sync and list operations

**Example test structure**:
```typescript
import { beforeEach, test, expect } from "bun:test";
import { createDb } from "@membran/db";

let db: ReturnType<typeof createDb>;

beforeEach(() => {
  db = createDb(mockD1Database);
});

test("create tier with valid data", async () => {
  const result = await createPricingTier(userId, validTierData);
  expect(result).toHaveProperty("id");
  expect(result.name).toBe("Premium");
});

test("reject tier exceeding limit", async () => {
  // Create 5 tiers
  for (let i = 0; i < 5; i++) {
    await createPricingTier(userId, { ...validTierData, name: `Tier ${i}` });
  }
  // 6th should fail
  await expect(createPricingTier(userId, validTierData)).rejects.toThrow("TIER_LIMIT_EXCEEDED");
});
```

---

## Deployment Steps

1. **Apply database migration** (production)
   ```bash
   cd apps/api && npx wrangler d1 migrations apply membran-db
   ```

2. **Deploy API**
   ```bash
   bun run deploy
   ```

3. **Deploy frontend**
   ```bash
   cd apps/web && bun run build && bun run deploy
   ```

4. **Verify endpoints**
   - `GET /api/pricing/tiers` returns empty array
   - `POST /api/roles/sync` syncs Discord roles
   - `POST /api/pricing/tiers` creates tier

---

## Troubleshooting

### Discord API Errors

**Symptom**: Role sync fails with 403 Forbidden
**Cause**: Bot lacks `MANAGE_ROLES` permission
**Fix**: Re-invite bot with correct permissions via `/api/bot/invite`

### Tier Creation Fails

**Symptom**: "TIER_LIMIT_EXCEEDED" with fewer than 5 tiers
**Cause**: Soft-deleted tiers count against limit
**Fix**: Check for `is_active = false` tiers and hard delete if no subscribers

### Version Conflict

**Symptom**: 409 error when editing tier
**Cause**: Another user modified the tier
**Fix**: Refresh data and reapply changes

---

## Next Steps

After completing this feature:
1. Implement subscription management (feature 005)
2. Build public pricing page
3. Add payment processing integration
4. Implement role assignment webhook

---

## References

- [Database Schema](./data-model.md)
- [API Contract](./contracts/api.yaml)
- [Feature Specification](./spec.md)
- [Research Findings](./research.md)
