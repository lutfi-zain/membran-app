/**
 * Discord Role Synchronization API Routes
 *
 * Implements endpoints for syncing Discord roles from connected servers
 * and querying cached role data.
 *
 * Endpoints:
 * - GET /api/roles - Get cached Discord roles
 * - POST /api/roles/sync - Sync roles from Discord API
 */

import { createDb, discordServers } from "@membran/db";
import type { DiscordRolesResponse, DiscordRolesSyncResponse } from "@membran/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getLastSyncTime, getManageableRoles, syncDiscordRoles } from "../lib/discord-roles";
import { createLogger } from "../lib/logger";
import { rateLimitMiddleware } from "../middleware/rate-limit";

// ============================================================================
// Types & Configuration
// ============================================================================

type RolesEnv = {
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

const router = new Hono<{ Bindings: RolesEnv }>();

// Apply rate limiting to all role endpoints
router.use("*", rateLimitMiddleware);

// ============================================================================
// POST /api/roles/sync - Sync Discord Roles
// ============================================================================

/**
 * Syncs roles from Discord API for the authenticated user's connected server.
 *
 * Fetches all roles from the Discord guild, updates the local cache,
 * and sets botCanManage flags based on role hierarchy.
 */
router.post("/sync", async (c) => {
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
    // Sync roles from Discord API
    const result = await syncDiscordRoles(db, server.id);

    logger.info({
      event: "roles_synced",
      userId: session.user.id,
      serverId: server.id,
      roleCount: result.roles.length,
      warnings: result.warnings,
    });

    // Return sync result
    const response: DiscordRolesSyncResponse = {
      synced: result.synced,
      roles: result.roles,
      warnings: result.warnings,
      message: result.message,
    };

    // If Discord API was unavailable, return 503 status
    if (!result.synced) {
      return c.json(
        {
          error: "DISCORD_API_UNAVAILABLE",
          message: "Discord is currently unavailable. Using cached role data.",
        },
        503,
      );
    }

    return c.json(response);
  } catch (error) {
    logger.error({
      event: "roles_sync_error",
      userId: session.user.id,
      serverId: server.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle custom error codes
    if (error instanceof Error && "code" in error) {
      const err = error as any;
      return c.json(
        { error: err.code, message: err.message },
        err.code === "FORBIDDEN" ? 503 : 500,
      );
    }

    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to sync roles from Discord",
      },
      500,
    );
  }
});

// ============================================================================
// GET /api/roles - Get Cached Discord Roles
// ============================================================================

/**
 * Returns cached Discord roles for the authenticated user's connected server.
 *
 * Only returns roles that the bot can manage (botCanManage = true).
 */
router.get("/", async (c) => {
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
    // Get manageable roles (botCanManage = true)
    const roles = await getManageableRoles(db, server.id, true);

    // Get last sync time
    const lastSynced = await getLastSyncTime(db, server.id);

    const response: DiscordRolesResponse = {
      roles,
      lastSynced: lastSynced?.toISOString() ?? null,
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to fetch roles",
      },
      500,
    );
  }
});

export { router as rolesRouter };
