/**
 * Pricing Tier Business Logic Library
 *
 * Provides business logic functions for managing pricing tiers.
 * Includes CRUD operations, validation, and feature management.
 *
 * Key Features:
 * - createPricingTier: Create tier with validation
 * - getPricingTiers: List tiers with features
 * - updatePricingTier: Update with optimistic locking
 * - deletePricingTier: Soft/hard delete based on subscribers
 * - reorderTiers: Update display order
 * - Feature management functions
 */

import { eq, and, sql, count, desc } from "drizzle-orm";
import {
  pricingTiers,
  tierFeatures,
  discordRoles,
  discordServers,
  type PricingTier,
  type NewPricingTier,
  type TierFeature,
} from "@membran/db";
import { PRICING_ERROR_CODES } from "@membran/shared";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Generate UUID using Web Crypto API (available in Cloudflare Workers)
 */
function randomUUID(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Constants
// ============================================================================

const MAX_TIERS_PER_SERVER = 5;
const MAX_FEATURES_PER_TIER = 20;

// ============================================================================
// Types
// ============================================================================

type Db = PostgresJsDatabase<any> | any;

export interface CreatePricingTierInput {
  discordServerId: string;
  name: string;
  description?: string | null;
  priceCents: number;
  duration: "monthly" | "yearly" | "lifetime";
  discordRoleId: string;
  isFeatured?: boolean;
  displayOrder?: number;
  features?: Array<{ description: string; displayOrder: number }>;
}

export interface UpdatePricingTierInput {
  name?: string;
  description?: string | null;
  priceCents?: number;
  duration?: "monthly" | "yearly" | "lifetime";
  discordRoleId?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  version: number;
}

export interface PricingTierWithFeatures extends PricingTier {
  features: TierFeature[];
  activeSubscriberCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve Discord role snowflake to internal database UUID
 *
 * The frontend sends Discord role IDs (snowflakes), but our foreign key
 * references the internal UUID (discord_roles.id). This helper resolves that.
 */
async function resolveDiscordRoleId(
  db: Db,
  discordServerId: string,
  discordRoleIdSnowflake: string,
): Promise<string | null> {
  const role = await db
    .select()
    .from(discordRoles)
    .where(
      and(
        eq(discordRoles.discordServerId, discordServerId),
        eq(discordRoles.discordRoleId, discordRoleIdSnowflake),
      ),
    )
    .limit(1);
  return role[0]?.id ?? null;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that server hasn't exceeded tier limit
 */
async function validateTierLimit(db: Db, discordServerId: string): Promise<void> {
  const result = await db
    .select({ count: count() })
    .from(pricingTiers)
    .where(
      and(
        eq(pricingTiers.discordServerId, discordServerId),
        eq(pricingTiers.isActive, true),
      ),
    );

  const tierCount = result[0].count;
  if (tierCount >= MAX_TIERS_PER_SERVER) {
    const error: any = new Error(
      `Maximum ${MAX_TIERS_PER_SERVER} tiers allowed per server`,
    );
    error.code = PRICING_ERROR_CODES.TIER_LIMIT_EXCEEDED;
    error.details = { currentCount: tierCount, maxAllowed: MAX_TIERS_PER_SERVER };
    throw error;
  }
}

/**
 * Validate feature count for a tier
 */
async function validateFeatureLimit(db: Db, tierId: string): Promise<void> {
  const result = await db
    .select({ count: count() })
    .from(tierFeatures)
    .where(eq(tierFeatures.tierId, tierId));

  const featureCount = result[0].count;
  if (featureCount >= MAX_FEATURES_PER_TIER) {
    const error: any = new Error(
      `Maximum ${MAX_FEATURES_PER_TIER} features allowed per tier`,
    );
    error.code = PRICING_ERROR_CODES.FEATURE_LIMIT_EXCEEDED;
    error.details = {
      currentCount: featureCount,
      maxAllowed: MAX_FEATURES_PER_TIER,
    };
    throw error;
  }
}

/**
 * Validate price range
 */
function validatePriceRange(priceCents: number): void {
  if (priceCents < 0 || priceCents > 99900) {
    const error: any = new Error("Price must be between $0 and $999");
    error.code = PRICING_ERROR_CODES.INVALID_PRICE_RANGE;
    throw error;
  }
}

/**
 * Validate tier name uniqueness (case-insensitive)
 */
async function validateTierNameUnique(
  db: Db,
  discordServerId: string,
  name: string,
  excludeTierId?: string,
): Promise<void> {
  let query = db
    .select()
    .from(pricingTiers)
    .where(
      and(
        eq(pricingTiers.discordServerId, discordServerId),
        eq(sql`LOWER(${pricingTiers.name})`, name.toLowerCase()),
      ),
    );

  if (excludeTierId) {
    query = db
      .select()
      .from(pricingTiers)
      .where(
        and(
          eq(pricingTiers.discordServerId, discordServerId),
          eq(sql`LOWER(${pricingTiers.name})`, name.toLowerCase()),
          sql`${pricingTiers.id} != ${excludeTierId}`,
        ),
      ) as any;
  }

  const existing = await query.limit(1);

  if (existing.length > 0) {
    const error: any = new Error("A tier with this name already exists");
    error.code = PRICING_ERROR_CODES.DUPLICATE_TIER_NAME;
    throw error;
  }
}

// ============================================================================
// CRUD Functions
// ============================================================================

/**
 * Create a new pricing tier
 *
 * Validates:
 * - Tier limit (max 5 per server)
 * - Price range ($0-$999)
 * - Name uniqueness
 * - Discord role manageability
 */
export async function createPricingTier(
  db: Db,
  input: CreatePricingTierInput,
): Promise<PricingTierWithFeatures> {
  const {
    discordServerId,
    name,
    description,
    priceCents,
    duration,
    discordRoleId: discordRoleIdSnowflake,
    isFeatured = false,
    displayOrder,
    features = [],
  } = input;

  // Validate tier limit
  await validateTierLimit(db, discordServerId);

  // Validate price range
  validatePriceRange(priceCents);

  // Validate name uniqueness
  await validateTierNameUnique(db, discordServerId, name);

  // Resolve Discord role snowflake to internal UUID
  const discordRoleId = await resolveDiscordRoleId(
    db,
    discordServerId,
    discordRoleIdSnowflake,
  );

  if (!discordRoleId) {
    const error: any = new Error("Discord role not found");
    error.code = PRICING_ERROR_CODES.NOT_FOUND;
    throw error;
  }

  // Get next display order if not provided
  let finalDisplayOrder = displayOrder;
  if (!finalDisplayOrder) {
    const maxOrder = await db
      .select({ maxOrder: sql<number>`MAX(${pricingTiers.displayOrder})` })
      .from(pricingTiers)
      .where(eq(pricingTiers.discordServerId, discordServerId));

    finalDisplayOrder = (maxOrder[0].maxOrder ?? 0) + 10;
  }

  // If setting as featured, unfeature other tiers
  if (isFeatured) {
    await db
      .update(pricingTiers)
      .set({ isFeatured: false })
      .where(
        and(
          eq(pricingTiers.discordServerId, discordServerId),
          eq(pricingTiers.isFeatured, true),
        ),
      );
  }

  const now = new Date();
  const tierId = randomUUID();

  // Create tier
  await db.insert(pricingTiers).values({
    id: tierId,
    discordServerId,
    discordRoleId,
    name,
    description: description ?? null,
    priceCents,
    currency: "USD",
    duration,
    isFeatured,
    displayOrder: finalDisplayOrder,
    isActive: true,
    version: 1,
    needsSync: false,
    createdAt: now,
    updatedAt: now,
  });

  // Create features if provided
  if (features.length > 0) {
    for (const feature of features) {
      await db.insert(tierFeatures).values({
        id: randomUUID(),
        tierId,
        description: feature.description,
        displayOrder: feature.displayOrder,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Return tier with features
  return getPricingTierById(db, tierId);
}

/**
 * Get all pricing tiers for a server
 */
export async function getPricingTiers(
  db: Db,
  discordServerId: string,
  includeInactive = false,
): Promise<PricingTierWithFeatures[]> {
  let query = db
    .select()
    .from(pricingTiers)
    .where(eq(pricingTiers.discordServerId, discordServerId));

  if (!includeInactive) {
    query = db
      .select()
      .from(pricingTiers)
      .where(
        and(
          eq(pricingTiers.discordServerId, discordServerId),
          eq(pricingTiers.isActive, true),
        ),
      ) as any;
  }

  const tiers = await query.orderBy(pricingTiers.displayOrder);

  // Get features for each tier
  const result: PricingTierWithFeatures[] = [];
  for (const tier of tiers) {
    const features = await db
      .select()
      .from(tierFeatures)
      .where(eq(tierFeatures.tierId, tier.id))
      .orderBy(tierFeatures.displayOrder);

    result.push({
      ...tier,
      features,
      activeSubscriberCount: 0, // MVP: no subscriptions yet
    });
  }

  return result;
}

/**
 * Get a specific pricing tier by ID
 */
export async function getPricingTierById(
  db: Db,
  tierId: string,
): Promise<PricingTierWithFeatures> {
  const tiers = await db
    .select()
    .from(pricingTiers)
    .where(eq(pricingTiers.id, tierId))
    .limit(1);

  if (tiers.length === 0) {
    const error: any = new Error("Pricing tier not found");
    error.code = PRICING_ERROR_CODES.NOT_FOUND;
    throw error;
  }

  const tier = tiers[0];

  const features = await db
    .select()
    .from(tierFeatures)
    .where(eq(tierFeatures.tierId, tierId))
    .orderBy(tierFeatures.displayOrder);

  return {
    ...tier,
    features,
    activeSubscriberCount: 0, // MVP: no subscriptions yet
  };
}

/**
 * Update a pricing tier with optimistic locking
 */
export async function updatePricingTier(
  db: Db,
  tierId: string,
  input: UpdatePricingTierInput,
): Promise<PricingTierWithFeatures> {
  const { version, discordRoleId: discordRoleIdSnowflake, ...restUpdateData } = input;

  // Get current tier
  const current = await getPricingTierById(db, tierId);

  // Validate name uniqueness if changing name
  if (restUpdateData.name && restUpdateData.name !== current.name) {
    await validateTierNameUnique(db, current.discordServerId, restUpdateData.name, tierId);
  }

  // Validate price range if changing price
  if (restUpdateData.priceCents !== undefined) {
    validatePriceRange(restUpdateData.priceCents);
  }

  // Resolve Discord role ID if changing
  let resolvedRoleId = current.discordRoleId;
  if (discordRoleIdSnowflake !== undefined && discordRoleIdSnowflake !== current.discordRoleId) {
    resolvedRoleId = await resolveDiscordRoleId(
      db,
      current.discordServerId,
      discordRoleIdSnowflake,
    );

    if (!resolvedRoleId) {
      const error: any = new Error("Discord role not found");
      error.code = PRICING_ERROR_CODES.NOT_FOUND;
      throw error;
    }
  }

  // If setting as featured, unfeature other tiers
  if (restUpdateData.isFeatured === true) {
    await db
      .update(pricingTiers)
      .set({ isFeatured: false })
      .where(
        and(
          eq(pricingTiers.discordServerId, current.discordServerId),
          eq(pricingTiers.isFeatured, true),
          sql`${pricingTiers.id} != ${tierId}`,
        ),
      );
  }

  // Update with optimistic locking
  const result = await db
    .update(pricingTiers)
    .set({
      ...restUpdateData,
      discordRoleId: resolvedRoleId,
      version: sql<number>`${pricingTiers.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(pricingTiers.id, tierId), eq(pricingTiers.version, version)),
    )
    .returning();

  if (result.length === 0) {
    const error: any = new Error(
      "This tier was modified by another user. Please refresh and try again.",
    );
    error.code = PRICING_ERROR_CODES.VERSION_CONFLICT;
    throw error;
  }

  return getPricingTierById(db, tierId);
}

/**
 * Delete a pricing tier
 *
 * Performs soft delete if tier has active subscribers (not implemented in MVP)
 * Performs hard delete if no subscribers
 */
export async function deletePricingTier(
  db: Db,
  tierId: string,
  confirm = false,
): Promise<{ deleted: boolean; message: string }> {
  const tier = await getPricingTierById(db, tierId);

  // Check if this is the last tier
  const tierCount = await db
    .select({ count: count() })
    .from(pricingTiers)
    .where(
      and(
        eq(pricingTiers.discordServerId, tier.discordServerId),
        eq(pricingTiers.isActive, true),
      ),
    );

  if (tierCount[0].count <= 1) {
    const error: any = new Error("Cannot delete the last tier");
    error.code = PRICING_ERROR_CODES.LAST_TIER_CANNOT_DELETE;
    throw error;
  }

  // MVP: Always hard delete (no subscribers to check)
  // TODO: Check for active subscribers when subscription feature is implemented
  await db.delete(tierFeatures).where(eq(tierFeatures.tierId, tierId));
  await db.delete(pricingTiers).where(eq(pricingTiers.id, tierId));

  return {
    deleted: true,
    message: "Tier has been deleted.",
  };
}

/**
 * Reorder pricing tiers
 *
 * Updates displayOrder for all tiers based on new order
 */
export async function reorderTiers(
  db: Db,
  discordServerId: string,
  tierIds: string[],
): Promise<PricingTierWithFeatures[]> {
  if (tierIds.length === 0) {
    return getPricingTiers(db, discordServerId);
  }

  // Validate all tiers belong to the same server
  const tiers = await db
    .select()
    .from(pricingTiers)
    .where(
      and(
        eq(pricingTiers.discordServerId, discordServerId),
        eq(pricingTiers.isActive, true),
      ),
    );

  const tierMap = new Map(tiers.map((t) => [t.id, t]));

  for (const tierId of tierIds) {
    if (!tierMap.has(tierId)) {
      const error: any = new Error("Invalid tier ID");
      error.code = PRICING_ERROR_CODES.NOT_FOUND;
      throw error;
    }
  }

  // Update display order (use 10, 20, 30... gaps)
  for (let i = 0; i < tierIds.length; i++) {
    await db
      .update(pricingTiers)
      .set({ displayOrder: (i + 1) * 10, updatedAt: new Date() })
      .where(eq(pricingTiers.id, tierIds[i]));
  }

  return getPricingTiers(db, discordServerId);
}

// ============================================================================
// Feature Management Functions
// ============================================================================

/**
 * Add a feature to a tier
 */
export async function addFeature(
  db: Db,
  tierId: string,
  description: string,
  displayOrder: number,
): Promise<TierFeature> {
  await validateFeatureLimit(db, tierId);

  const now = new Date();
  const featureId = randomUUID();

  await db.insert(tierFeatures).values({
    id: featureId,
    tierId,
    description,
    displayOrder,
    createdAt: now,
    updatedAt: now,
  });

  const features = await db
    .select()
    .from(tierFeatures)
    .where(eq(tierFeatures.id, featureId))
    .limit(1);

  return features[0];
}

/**
 * Update features for a tier (bulk replace)
 */
export async function updateFeatures(
  db: Db,
  tierId: string,
  features: Array<{ id?: string; description: string; displayOrder: number }>,
): Promise<TierFeature[]> {
  // Delete existing features
  await db.delete(tierFeatures).where(eq(tierFeatures.tierId, tierId));

  // Insert new features
  const now = new Date();
  const result: TierFeature[] = [];

  for (const feature of features) {
    const featureId = feature.id || randomUUID();

    await db.insert(tierFeatures).values({
      id: featureId,
      tierId,
      description: feature.description,
      displayOrder: feature.displayOrder,
      createdAt: now,
      updatedAt: now,
    });

    const inserted = await db
      .select()
      .from(tierFeatures)
      .where(eq(tierFeatures.id, featureId))
      .limit(1);

    result.push(inserted[0]);
  }

  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Delete a feature from a tier
 */
export async function deleteFeature(
  db: Db,
  featureId: string,
): Promise<{ deleted: boolean }> {
  await db.delete(tierFeatures).where(eq(tierFeatures.id, featureId));
  return { deleted: true };
}
