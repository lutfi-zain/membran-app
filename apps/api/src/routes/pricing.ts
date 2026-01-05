/**
 * Pricing Tier Configuration API Routes
 *
 * Implements endpoints for managing pricing tiers for Discord servers.
 * Server owners can create, edit, delete, and reorder pricing tiers.
 *
 * Endpoints:
 * - GET /api/pricing/public/:serverId - Public endpoint to view tiers for a server (no auth required)
 * - GET /api/pricing/tiers - List all tiers for authenticated user's server
 * - POST /api/pricing/tiers - Create a new pricing tier
 * - GET /api/pricing/tiers/:tierId - Get a specific tier
 * - PUT /api/pricing/tiers/:tierId - Update a tier
 * - DELETE /api/pricing/tiers/:tierId - Delete a tier
 * - POST /api/pricing/tiers/reorder - Reorder tiers
 * - GET /api/pricing/preview - Preview how tiers appear to potential subscribers
 */

import { createDb, discordServers, onboardingStates } from "@membran/db";
import type {
  AddFeatureRequest,
  CreatePricingTierRequest,
  DeletePricingTierResponse,
  FeatureResponse,
  ListPricingTiersResponse,
  PreviewPricingTiersResponse,
  UpdateFeaturesRequest,
  UpdatePricingTierRequest,
} from "@membran/shared";
import { PRICING_ERROR_CODES } from "@membran/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { alphabet, generateRandomString } from "oslo/crypto";
import {
  addFeature,
  createPricingTier,
  deleteFeature,
  deletePricingTier,
  getPricingTierById,
  getPricingTiers,
  updateFeatures,
  updatePricingTier,
} from "../lib/pricing-tiers";
import { createLogger } from "../lib/logger";
import { rateLimitMiddleware } from "../middleware/rate-limit";

// ============================================================================
// Types & Configuration
// ============================================================================

type PricingEnv = {
  DB: D1Database;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  DISCORD_BOT_TOKEN: string;
  ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
};

// ============================================================================
// Router Setup
// ============================================================================

const router = new Hono<{ Bindings: PricingEnv }>();

// Apply rate limiting to all pricing endpoints
router.use("*", rateLimitMiddleware);

// Helper function to generate IDs
const generateId = (length: number) => generateRandomString(length, alphabet("0-9", "a-z"));

// ============================================================================
// GET /api/pricing/public/:serverId - Public Pricing Tiers Endpoint
// ============================================================================

/**
 * Public endpoint to view pricing tiers for a specific Discord server.
 * Does NOT require authentication - used for the public pricing page.
 *
 * Returns server info and all active tiers with features.
 */
router.get("/public/:serverId", async (c) => {
  const logger = createLogger(c);
  const serverId = c.req.param("serverId");

  if (!serverId) {
    return c.json({ error: "BAD_REQUEST", message: "serverId is required" }, 400);
  }

  const db = createDb(c.env.DB);

  // Get server by ID
  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) => eq(discordServers.id, serverId),
  });

  if (!server) {
    return c.json({ error: "NOT_FOUND", message: "Server not found" }, 404);
  }

  try {
    // Get all active tiers for this server
    const tiers = await getPricingTiers(db, serverId, false);

    // Find featured tier
    const featuredTier = tiers.find((t) => t.isFeatured) || null;

    const response = {
      server: {
        id: server.id,
        discordId: server.discordId,
        name: server.name,
        icon: server.icon,
        memberCount: server.memberCount ?? 0,
      },
      featuredTier,
      tiers,
      currencySymbol: "$",
    };

    logger.info({
      event: "public_pricing_viewed",
      serverId,
      tierCount: tiers.length,
      hasFeatured: !!featuredTier,
    });

    return c.json(response);
  } catch (error) {
    logger.error({
      event: "public_pricing_error",
      serverId,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to fetch pricing tiers",
      },
      500,
    );
  }
});

// ============================================================================
// GET /api/pricing/tiers - List Pricing Tiers
// ============================================================================

/**
 * Returns all pricing tiers for the authenticated user's Discord server.
 *
 * Includes tier features and subscriber counts. Returns active tiers only
 * by default. Ordered by displayOrder ascending.
 */
router.get("/tiers", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  // Get user's discord server
  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.user.id),
  });

  if (!server) {
    // Return empty list if no server connected
    const response: ListPricingTiersResponse = {
      tiers: [],
    };
    return c.json(response);
  }

  try {
    // Get all active tiers for the server
    const tiers = await getPricingTiers(db, server.id, false);

    const response: ListPricingTiersResponse = {
      tiers,
    };

    logger.info({
      event: "pricing_tiers_listed",
      userId: session.user.id,
      serverId: server.id,
      tierCount: tiers.length,
    });

    return c.json(response);
  } catch (error) {
    logger.error({
      event: "pricing_tiers_list_error",
      userId: session.user.id,
      serverId: server.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to fetch pricing tiers",
      },
      500,
    );
  }
});

// ============================================================================
// POST /api/pricing/tiers - Create Pricing Tier
// ============================================================================

/**
 * Creates a new pricing tier for the authenticated user's Discord server.
 *
 * Validates:
 * - Tier limit (max 5 per server)
 * - Price range ($0-$999)
 * - Name uniqueness
 * - Discord role manageability
 * - Feature limit (max 20)
 */
router.post("/tiers", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  // Get user's discord server
  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.user.id),
  });

  if (!server) {
    return c.json(
      { error: "NOT_FOUND", message: "No Discord server connected" },
      404,
    );
  }

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const input: CreatePricingTierRequest = {
      name: body.name,
      description: body.description,
      priceCents: body.priceCents,
      duration: body.duration,
      discordRoleId: body.discordRoleId,
      isFeatured: body.isFeatured ?? false,
      displayOrder: body.displayOrder,
      features: body.features,
    };

    // Create tier
    const tier = await createPricingTier(db, {
      discordServerId: server.id,
      ...input,
    });

    // Auto-update onboarding state: mark pricingConfigured=true
    // Use upsert pattern to handle case where onboarding state doesn't exist yet
    const existingState = await db.query.onboardingStates.findFirst({
      where: (onboardingStates, { eq }) => eq(onboardingStates.userId, session.user.id),
    });

    if (existingState) {
      await db
        .update(onboardingStates)
        .set({ pricingConfigured: true, updatedAt: new Date() })
        .where(eq(onboardingStates.userId, session.user.id));
    } else {
      const now = new Date();
      await db.insert(onboardingStates).values({
        id: generateId(25),
        userId: session.user.id,
        botConnected: false,
        pricingConfigured: true,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    logger.info({
      event: "pricing_tier_created",
      userId: session.user.id,
      serverId: server.id,
      tierId: tier.id,
      tierName: tier.name,
    });

    return c.json(tier, 201);
  } catch (error) {
    logger.error({
      event: "pricing_tier_create_error",
      userId: session.user.id,
      serverId: server.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message: string; details?: any };
      return c.json(
        {
          error: err.code,
          message: err.message,
          details: err.details,
        },
        err.code === PRICING_ERROR_CODES.VERSION_CONFLICT ? 409 : 400,
      );
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to create pricing tier",
      },
      500,
    );
  }
});

// ============================================================================
// GET /api/pricing/tiers/:tierId - Get Pricing Tier
// ============================================================================

/**
 * Returns a specific pricing tier with its features.
 */
router.get("/tiers/:tierId", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");
  const tierId = c.req.param("tierId");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  try {
    const tier = await getPricingTierById(db, tierId);

    // Verify user owns this tier's server
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) =>
        eq(discordServers.id, tier.discordServerId),
    });

    if (!server || server.userId !== session.user.id) {
      return c.json(
        { error: "FORBIDDEN", message: "You don't have access to this tier" },
        403,
      );
    }

    logger.info({
      event: "pricing_tier_fetched",
      userId: session.user.id,
      serverId: server.id,
      tierId,
    });

    return c.json(tier);
  } catch (error) {
    logger.error({
      event: "pricing_tier_fetch_error",
      userId: session.user.id,
      tierId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message: string };
      if (err.code === PRICING_ERROR_CODES.NOT_FOUND) {
        return c.json({ error: err.code, message: err.message }, 404);
      }
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to fetch pricing tier",
      },
      500,
    );
  }
});

// ============================================================================
// PUT /api/pricing/tiers/:tierId - Update Pricing Tier
// ============================================================================

/**
 * Updates an existing pricing tier.
 *
 * Uses optimistic locking via the version field to detect concurrent edits.
 * Returns 409 Conflict if version doesn't match.
 */
router.put("/tiers/:tierId", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");
  const tierId = c.req.param("tierId");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  try {
    // Verify user owns this tier
    const existingTier = await getPricingTierById(db, tierId);
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) =>
        eq(discordServers.id, existingTier.discordServerId),
    });

    if (!server || server.userId !== session.user.id) {
      return c.json(
        { error: "FORBIDDEN", message: "You don't have access to this tier" },
        403,
      );
    }

    // Parse and validate request body
    const body = await c.req.json();
    const input: UpdatePricingTierRequest = {
      version: body.version,
      name: body.name,
      description: body.description,
      priceCents: body.priceCents,
      duration: body.duration,
      discordRoleId: body.discordRoleId,
      isFeatured: body.isFeatured,
      isActive: body.isActive,
      displayOrder: body.displayOrder,
    };

    // Update tier
    const tier = await updatePricingTier(db, tierId, input);

    logger.info({
      event: "pricing_tier_updated",
      userId: session.user.id,
      serverId: server.id,
      tierId,
      version: input.version,
    });

    return c.json(tier);
  } catch (error) {
    logger.error({
      event: "pricing_tier_update_error",
      userId: session.user.id,
      tierId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message: string };
      const statusCode =
        err.code === PRICING_ERROR_CODES.VERSION_CONFLICT
          ? 409
          : err.code === PRICING_ERROR_CODES.NOT_FOUND
            ? 404
            : 400;
      return c.json({ error: err.code, message: err.message }, statusCode);
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to update pricing tier",
      },
      500,
    );
  }
});

// ============================================================================
// DELETE /api/pricing/tiers/:tierId - Delete Pricing Tier
// ============================================================================

/**
 * Deletes a pricing tier.
 *
 * Performs soft delete if tier has active subscribers (preserves access).
 * Performs hard delete if no subscribers exist.
 */
router.delete("/tiers/:tierId", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");
  const tierId = c.req.param("tierId");
  const confirm = c.req.query("confirm") === "true";

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  try {
    // Verify user owns this tier
    const existingTier = await getPricingTierById(db, tierId);
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) =>
        eq(discordServers.id, existingTier.discordServerId),
    });

    if (!server || server.userId !== session.user.id) {
      return c.json(
        { error: "FORBIDDEN", message: "You don't have access to this tier" },
        403,
      );
    }

    // Delete tier
    const result = await deletePricingTier(db, tierId, confirm);

    logger.info({
      event: "pricing_tier_deleted",
      userId: session.user.id,
      serverId: server.id,
      tierId,
      confirmed: confirm,
    });

    const response: DeletePricingTierResponse = {
      deleted: result.deleted,
      message: result.message,
    };

    return c.json(response);
  } catch (error) {
    logger.error({
      event: "pricing_tier_delete_error",
      userId: session.user.id,
      tierId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message: string };
      const statusCode =
        err.code === PRICING_ERROR_CODES.NOT_FOUND ? 404 :
        err.code === PRICING_ERROR_CODES.LAST_TIER_CANNOT_DELETE ? 400 :
        400;
      return c.json({ error: err.code, message: err.message }, statusCode);
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to delete pricing tier",
      },
      500,
    );
  }
});

// ============================================================================
// POST /api/pricing/tiers/reorder - Reorder Pricing Tiers
// ============================================================================

/**
 * Updates the display order of pricing tiers.
 *
 * Accepts an array of tier IDs in the desired order.
 * Updates displayOrder using gaps (10, 20, 30...).
 */
router.post("/tiers/reorder", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  // Get user's discord server
  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.user.id),
  });

  if (!server) {
    return c.json(
      { error: "NOT_FOUND", message: "No Discord server connected" },
      404,
    );
  }

  try {
    // Parse request body
    const body = await c.req.json();
    const { tierIds } = body;

    if (!Array.isArray(tierIds) || tierIds.length === 0) {
      return c.json(
        { error: "VALIDATION_ERROR", message: "tierIds must be a non-empty array" },
        400,
      );
    }

    if (tierIds.length > 5) {
      return c.json(
        { error: "VALIDATION_ERROR", message: "Cannot reorder more than 5 tiers" },
        400,
      );
    }

    // Reorder tiers
    const tiers = await getPricingTiers(db, server.id);

    // Verify all tier IDs belong to this server
    const serverTierIds = new Set(tiers.map((t) => t.id));
    for (const tierId of tierIds) {
      if (!serverTierIds.has(tierId)) {
        return c.json(
          { error: "NOT_FOUND", message: `Tier ${tierId} not found` },
          404,
        );
      }
    }

    // Import reorder function
    const { reorderTiers } = await import("../lib/pricing-tiers");

    // Reorder
    const reorderedTiers = await reorderTiers(db, server.id, tierIds);

    logger.info({
      event: "pricing_tiers_reordered",
      userId: session.user.id,
      serverId: server.id,
      newOrder: tierIds,
    });

    return c.json({ tiers: reorderedTiers });
  } catch (error) {
    logger.error({
      event: "pricing_tiers_reorder_error",
      userId: session.user.id,
      serverId: server.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to reorder pricing tiers",
      },
      500,
    );
  }
});

// ============================================================================
// GET /api/pricing/preview - Preview Pricing Tiers
// ============================================================================

/**
 * Returns a preview of how pricing tiers appear to potential subscribers.
 *
 * Includes server info, featured tier, and all active tiers.
 * Used for the preview modal/button in the settings page.
 */
router.get("/preview", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  // Get user's discord server
  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.user.id),
  });

  if (!server) {
    return c.json(
      { error: "NOT_FOUND", message: "No Discord server connected" },
      404,
    );
  }

  try {
    // Get all active tiers
    const tiers = await getPricingTiers(db, server.id, false);

    // Find featured tier
    const featuredTier = tiers.find((t) => t.isFeatured) || null;

    const response: PreviewPricingTiersResponse = {
      server: {
        id: server.id,
        discordId: server.discordId,
        name: server.name,
        icon: server.icon,
        memberCount: server.memberCount ?? 0,
      },
      featuredTier,
      tiers,
      currencySymbol: "$",
    };

    logger.info({
      event: "pricing_preview_fetched",
      userId: session.user.id,
      serverId: server.id,
      tierCount: tiers.length,
      hasFeatured: !!featuredTier,
    });

    return c.json(response);
  } catch (error) {
    logger.error({
      event: "pricing_preview_error",
      userId: session.user.id,
      serverId: server.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to fetch pricing preview",
      },
      500,
    );
  }
});

// ============================================================================
// POST /api/pricing/features/:tierId - Add Feature to Tier
// ============================================================================

/**
 * Adds a single feature to a pricing tier.
 *
 * Validates feature limit (max 20 per tier) before adding.
 */
router.post("/features/:tierId", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");
  const tierId = c.req.param("tierId");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  try {
    // Verify user owns this tier
    const tier = await getPricingTierById(db, tierId);
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) =>
        eq(discordServers.id, tier.discordServerId),
    });

    if (!server || server.userId !== session.user.id) {
      return c.json(
        { error: "FORBIDDEN", message: "You don't have access to this tier" },
        403,
      );
    }

    // Parse and validate request body
    const body = await c.req.json();
    const input: AddFeatureRequest = {
      description: body.description,
      displayOrder: body.displayOrder,
    };

    // Add feature
    const feature = await addFeature(db, tierId, input.description, input.displayOrder);

    logger.info({
      event: "tier_feature_added",
      userId: session.user.id,
      serverId: server.id,
      tierId,
      featureId: feature.id,
    });

    return c.json(feature, 201);
  } catch (error) {
    logger.error({
      event: "tier_feature_add_error",
      userId: session?.user?.id,
      tierId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message: string };
      const statusCode =
        err.code === PRICING_ERROR_CODES.NOT_FOUND ? 404 :
        err.code === PRICING_ERROR_CODES.FEATURE_LIMIT_EXCEEDED ? 400 :
        400;
      return c.json({ error: err.code, message: err.message }, statusCode);
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to add feature",
      },
      500,
    );
  }
});

// ============================================================================
// PUT /api/pricing/features/:tierId - Update Tier Features
// ============================================================================

/**
 * Bulk replaces all features for a pricing tier.
 *
 * Deletes existing features and creates new ones based on the provided array.
 * Validates feature limit (max 20 per tier).
 */
router.put("/features/:tierId", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");
  const tierId = c.req.param("tierId");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  try {
    // Verify user owns this tier
    const tier = await getPricingTierById(db, tierId);
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) =>
        eq(discordServers.id, tier.discordServerId),
    });

    if (!server || server.userId !== session.user.id) {
      return c.json(
        { error: "FORBIDDEN", message: "You don't have access to this tier" },
        403,
      );
    }

    // Parse and validate request body
    const body = await c.req.json();
    const input: UpdateFeaturesRequest = {
      features: body.features,
    };

    if (!Array.isArray(input.features) || input.features.length > 20) {
      return c.json(
        { error: "VALIDATION_ERROR", message: "Maximum 20 features allowed" },
        400,
      );
    }

    // Update features
    const features = await updateFeatures(db, tierId, input.features);

    logger.info({
      event: "tier_features_updated",
      userId: session.user.id,
      serverId: server.id,
      tierId,
      featureCount: features.length,
    });

    const response: FeatureResponse = { features };
    return c.json(response);
  } catch (error) {
    logger.error({
      event: "tier_features_update_error",
      userId: session?.user?.id,
      tierId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message: string };
      const statusCode =
        err.code === PRICING_ERROR_CODES.NOT_FOUND ? 404 :
        err.code === PRICING_ERROR_CODES.FEATURE_LIMIT_EXCEEDED ? 400 :
        400;
      return c.json({ error: err.code, message: err.message }, statusCode);
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to update features",
      },
      500,
    );
  }
});

// ============================================================================
// DELETE /api/pricing/features/:tierId/:featureId - Delete Tier Feature
// ============================================================================

/**
 * Deletes a single feature from a pricing tier.
 */
router.delete("/features/:tierId/:featureId", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");
  const tierId = c.req.param("tierId");
  const featureId = c.req.param("featureId");

  // Authentication check
  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session is valid
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  try {
    // Verify user owns this tier
    const tier = await getPricingTierById(db, tierId);
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) =>
        eq(discordServers.id, tier.discordServerId),
    });

    if (!server || server.userId !== session.user.id) {
      return c.json(
        { error: "FORBIDDEN", message: "You don't have access to this tier" },
        403,
      );
    }

    // Delete feature
    await deleteFeature(db, featureId);

    logger.info({
      event: "tier_feature_deleted",
      userId: session.user.id,
      serverId: server.id,
      tierId,
      featureId,
    });

    return c.json({ deleted: true });
  } catch (error) {
    logger.error({
      event: "tier_feature_delete_error",
      userId: session?.user?.id,
      tierId,
      featureId,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to delete feature",
      },
      500,
    );
  }
});

export { router as pricingRouter };
