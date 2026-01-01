/**
 * Bot Connection API Routes
 *
 * Implements Discord bot invitation OAuth2 flow, status checking,
 * permission validation, and reconnection functionality.
 *
 * Endpoints:
 * - POST /api/bot/invite - Initiate OAuth flow
 * - GET /api/bot/callback - OAuth callback handler
 * - GET /api/bot/status - Get connection status
 * - POST /api/bot/validate-permissions - Check bot permissions
 * - POST /api/bot/reconnect - Reconnect disconnected bot
 * - DELETE /api/bot/disconnect - Manual disconnect
 * - POST /api/bot/sync - Cron sync endpoint
 */

import { zValidator } from "@hono/zod-validator";
import { createDb, discordServers, oauthStates, users, onboardingStates } from "@membran/db";
import {
  BotStatusEnum,
  DISCORD_PERMISSIONS,
  REQUIRED_PERMISSIONS,
  type BotStatusResponse,
} from "@membran/shared";
import { Discord } from "arctic";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { alphabet, generateRandomString } from "oslo/crypto";
import { z } from "zod";
import { decryptToken, encryptToken } from "../lib/encryption";
import {
  formatDiscordError,
  getGuildIconUrl,
  getGuildInfo,
  getMissingPermissions,
  getPermissionNames,
  getCurrentUserGuilds,
  hasRequiredPermissions,
} from "../lib/discord-bot";
import { createLogger, BotEvent } from "../lib/logger";
import { rateLimitMiddleware } from "../middleware/rate-limit";

// ============================================================================
// Types & Configuration
// ============================================================================

type BotEnv = {
  DB: D1Database;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string; // For user OAuth
  DISCORD_BOT_REDIRECT_URI: string; // For bot OAuth
  DISCORD_BOT_TOKEN: string;
  ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
  // For sync endpoint
  CRON_SECRET?: string;
};

const generateId = (length: number) =>
  generateRandomString(length, alphabet("0-9", "a-z"));

// ============================================================================
// Router Setup
// ============================================================================

const router = new Hono<{ Bindings: BotEnv }>();

// Apply rate limiting to all bot endpoints
router.use("*", rateLimitMiddleware);

// ============================================================================
// POST /api/bot/invite - Initiate Bot OAuth Flow
// ============================================================================

/**
 * Initiates the Discord OAuth2 authorization flow for bot invitation.
 *
 * Returns an authorization URL that the user should visit to authorize
 * the bot for their Discord server.
 */
router.post("/invite", async (c) => {
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

  // Check if user already has a connected server (MVP: one-to-one)
  const existingServer = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.user.id),
  });

  if (existingServer) {
    return c.json(
      {
        error: "ALREADY_CONNECTED",
        message:
          "You already have a Discord server connected. Each account manages one server.",
        server: {
          id: existingServer.id,
          name: existingServer.name,
          botStatus: existingServer.botStatus,
        },
      },
      409,
    );
  }

  // Generate OAuth state for CSRF protection
  const state = generateId(32);
  const stateExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store state in database
  await db.insert(oauthStates).values({
    id: generateId(40),
    state,
    userId: session.user.id,
    expiresAt: stateExpiresAt,
  });

  // Calculate required permissions (MANAGE_ROLES | VIEW_CHANNEL)
  const permissions = REQUIRED_PERMISSIONS.reduce((acc, perm) => acc | perm, 0);

  // Generate authorization URL for Discord bot invitation
  // Discord bot OAuth2 URL format (manual construction for bot flow)
  const params = new URLSearchParams({
    client_id: c.env.DISCORD_CLIENT_ID,
    redirect_uri: c.env.DISCORD_BOT_REDIRECT_URI || c.env.DISCORD_REDIRECT_URI, // Fallback to main redirect URI
    response_type: "code",
    state,
    scope: "bot",
    permissions: permissions.toString(),
  });

  const authorizationUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  // Log OAuth initiation
  logger.info({
    event: "oauth_initiated",
    userId: session.user.id,
    state,
  } as BotEvent);

  return c.json({
    authorizationUrl,
    state,
  });
});

// ============================================================================
// GET /api/bot/callback - OAuth Callback Handler
// ============================================================================

/**
 * Handles the OAuth callback from Discord after user authorization.
 *
 * Creates a discord_servers record on successful connection and
 * redirects to onboarding or settings based on user state.
 */
router.get("/callback", async (c) => {
  const logger = createLogger(c);
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  // Frontend URL for redirects
  const frontendUrl = "http://localhost:5173";

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    logger.warn({
      event: "oauth_error",
      error,
      errorDescription,
    } as BotEvent);

    // Redirect with error flag
    return c.redirect(`${frontendUrl}/onboarding/bot?error=${error || "unknown"}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/onboarding/bot?error=invalid_request`);
  }

  // Get session cookie
  const sessionId = getCookie(c, "auth_session");
  if (!sessionId) {
    return c.redirect(`${frontendUrl}/login?error=bot_callback_no_session`);
  }

  const db = createDb(c.env.DB);

  // Verify session
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.redirect("/login?error=bot_callback_invalid_session");
  }

  // Validate OAuth state
  const stateRecord = await db.query.oauthStates.findFirst({
    where: (oauthStates, { eq, and }) =>
      and(
        eq(oauthStates.state, state),
        eq(oauthStates.userId, session.user.id),
      ),
  });

  if (!stateRecord || stateRecord.expiresAt < new Date()) {
    logger.warn({
      event: "invalid_state",
      userId: session.user.id,
      state,
    } as BotEvent);
    return c.redirect(`${frontendUrl}/onboarding/bot?error=invalid_state`);
  }

  // Delete used state
  await db.delete(oauthStates).where(eq(oauthStates.id, stateRecord.id));

  try {
    // Fetch current user guilds (servers the bot was added to)
    // For bot invitations, Discord doesn't return OAuth tokens
    // We use the bot token to fetch the guild list
    const guilds = await getCurrentUserGuilds(c.env.DISCORD_BOT_TOKEN);

    if (!guilds || guilds.length === 0) {
      logger.error({
        event: "bot_not_added",
        userId: session.user.id,
      } as BotEvent);
      return c.redirect(`${frontendUrl}/onboarding/bot?error=bot_not_added`);
    }

    // Get the most recently added guild (should be the one just authorized)
    // In production, you'd track this more carefully by comparing with previous list
    const guild = guilds[0];

    // Check permissions using the guild list (permissions are NOT in guild details)
    const permissionNames = getPermissionNames(guild.permissions);
    const missingPermissions = getMissingPermissions(guild.permissions);
    const hasRequired = missingPermissions.length === 0;

    // Fetch detailed guild info including member count
    const guildInfo = await getGuildInfo(guild.id, c.env.DISCORD_BOT_TOKEN);

    // Note: For bot flow, Discord doesn't return user OAuth tokens
    // We only need to store the guild info, not access/refresh tokens
    // The bot token is used for all API calls

    // Check if a record already exists for this user (one-to-one relationship)
    const existingServer = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) => eq(discordServers.userId, session.user.id),
    });

    const now = new Date();
    const serverData = {
      discordId: guildInfo.id,
      name: guildInfo.name,
      icon: getGuildIconUrl(guildInfo.id, guildInfo.icon),
      memberCount: guildInfo.approximate_member_count || 0,
      botStatus: hasRequired ? "Connected" : "Pending",
      botAddedAt: now,
      permissions: permissionNames.join(","),
      // Store empty strings for tokens since we use bot token for API calls
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId: session.user.id,
      updatedAt: now,
    };

    if (existingServer) {
      // Update existing record
      await db.update(discordServers)
        .set(serverData)
        .where(eq(discordServers.id, existingServer.id));
    } else {
      // Create new discord server record
      const serverId = generateId(25);
      await db.insert(discordServers).values({
        id: serverId,
        ...serverData,
        createdAt: now,
      });
    }

    // Auto-update onboarding state: mark botConnected=true
    await db
      .update(onboardingStates)
      .set({ botConnected: true, updatedAt: now })
      .where(eq(onboardingStates.userId, session.user.id));

    const serverId = existingServer?.id || null;

    // Log successful connection
    logger.info({
      event: "bot_connected",
      userId: session.user.id,
      serverId,
      discordId: guildInfo.id,
      serverName: guildInfo.name,
      hasRequired,
      missingPermissions,
    } as BotEvent);

    // Redirect based on user state
    // Check if user has completed onboarding by checking some flag or condition
    const isOnboardingComplete = session.user.emailVerified && false; // Add actual check

    // frontendUrl is already declared at the top of the function
    const redirectUrl = isOnboardingComplete
      ? `${frontendUrl}/settings?connected=bot`
      : `${frontendUrl}/onboarding/bot?connected=success`;

    return c.redirect(redirectUrl);
  } catch (err) {
    logger.error({
      event: "callback_error",
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    } as BotEvent);

    return c.redirect(`${frontendUrl}/onboarding/bot?error=callback_failed`);
  }
});

// ============================================================================
// GET /api/bot/status - Get Bot Connection Status
// ============================================================================

/**
 * Returns the current bot connection status for the authenticated user.
 *
 * Includes server info, permissions, and whether recently connected.
 */
router.get("/status", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  // Verify session
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
    return c.json({ connected: false } satisfies BotStatusResponse);
  }

  // Calculate recentlyConnected (within 24 hours)
  const hoursSinceAdded =
    (Date.now() - server.botAddedAt.getTime()) / (1000 * 60 * 60);
  const recentlyConnected = hoursSinceAdded < 24;

  // Parse permissions
  const permissions = server.permissions.split(",").filter((p) => p.trim());

  // Check if permissions are valid
  const permissionsValid = REQUIRED_PERMISSIONS.every((req) =>
    permissions.some((p) => {
      const permName = Object.entries(DISCORD_PERMISSIONS).find(
        ([, value]) => value === req,
      )?.[0];
      return p === permName;
    }),
  );

  const permissionsWarnings: string[] = [];
  if (!permissionsValid) {
    const missing = REQUIRED_PERMISSIONS.filter((req) => {
      const permName = Object.entries(DISCORD_PERMISSIONS).find(
        ([, value]) => value === req,
      )?.[0];
      return !permissions.includes(permName || "");
    });
    missing.forEach((m) => {
      const name = Object.entries(DISCORD_PERMISSIONS).find(
        ([, value]) => value === m,
      )?.[0];
      if (name) permissionsWarnings.push(`Missing: ${name}`);
    });
  }

  return c.json({
    connected: true,
    server: {
      id: server.id,
      discordId: server.discordId,
      name: server.name,
      icon: server.icon,
      memberCount: server.memberCount,
      botStatus: server.botStatus,
      botAddedAt: server.botAddedAt.toISOString(),
      permissions,
      recentlyConnected,
      permissionsValid,
      permissionsWarnings,
    },
  } satisfies BotStatusResponse);
});

// ============================================================================
// POST /api/bot/validate-permissions - Validate Bot Permissions
// ============================================================================

/**
 * Checks if the bot has required permissions in the connected Discord server.
 *
 * Returns current permissions, missing permissions, and validation status.
 */
router.post("/validate-permissions", async (c) => {
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.userId),
  });

  if (!server) {
    return c.json(
      { error: "NOT_FOUND", message: "No Discord server connected" },
      404,
    );
  }

  // Get bot's current permissions in the guild
  try {
    const guilds = await getCurrentUserGuilds(c.env.DISCORD_BOT_TOKEN);
    const guild = guilds.find((g) => g.id === server.discordId);

    if (!guild) {
      return c.json({
        valid: false,
        permissions: {
          current: "0",
          required: REQUIRED_PERMISSIONS.reduce(
            (acc, p) => acc | p,
            0,
          ).toString(),
          missing: ["Bot not in server"],
          hasAllRequired: false,
        },
      });
    }

    const missing = getMissingPermissions(guild.permissions);
    const permissionNames = missing.map(
      (m) =>
        Object.entries(DISCORD_PERMISSIONS).find(([, v]) => v === m)?.[0] || m,
    );

    return c.json({
      valid: missing.length === 0,
      permissions: {
        current: guild.permissions,
        required: REQUIRED_PERMISSIONS.reduce(
          (acc, p) => acc | p,
          0,
        ).toString(),
        missing: permissionNames,
        hasAllRequired: missing.length === 0,
      },
      warnings:
        missing.length > 0
          ? [`Bot is missing: ${permissionNames.join(", ")}`]
          : undefined,
    });
  } catch (error) {
    const formattedError = formatDiscordError(error);
    return c.json(
      { error: formattedError.code, message: formattedError.message },
      500,
    );
  }
});

// ============================================================================
// POST /api/bot/reconnect - Reconnect Bot
// ============================================================================

/**
 * Initiates a new OAuth flow to reconnect the bot to a Discord server.
 *
 * Only works if the bot is currently disconnected.
 */
router.post("/reconnect", async (c) => {
  const logger = createLogger(c);
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.userId),
  });

  if (!server) {
    return c.json(
      { error: "NOT_FOUND", message: "No Discord server to reconnect" },
      404,
    );
  }

  // Check if bot is currently connected (should be disconnected to reconnect)
  if (server.botStatus === "Connected") {
    return c.json(
      {
        error: "INVALID_STATE",
        message:
          "Bot is currently connected. Please disconnect first or use the existing connection.",
      },
      400,
    );
  }

  // Generate OAuth state
  const state = generateId(32);
  const stateExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(oauthStates).values({
    id: generateId(40),
    state,
    userId: session.userId,
    expiresAt: stateExpiresAt,
  });

  const permissions = REQUIRED_PERMISSIONS.reduce((acc, perm) => acc | perm, 0);

  // Generate authorization URL for Discord bot reconnection
  const params = new URLSearchParams({
    client_id: c.env.DISCORD_CLIENT_ID,
    redirect_uri: c.env.DISCORD_BOT_REDIRECT_URI || c.env.DISCORD_REDIRECT_URI, // Fallback to main redirect URI
    response_type: "code",
    state,
    scope: "bot",
    permissions: permissions.toString(),
  });

  const authorizationUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  logger.info({
    event: "bot_reconnected",
    userId: session.userId,
    serverId: server.id,
  } as BotEvent);

  return c.json({
    authorizationUrl,
    state,
  });
});

// ============================================================================
// DELETE /api/bot/disconnect - Manual Disconnect
// ============================================================================

/**
 * Manually disconnects the bot from the Discord server.
 *
 * Requires explicit confirmation (confirm: true) in request body.
 */
router.delete("/disconnect", async (c) => {
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json({ error: "UNAUTHORIZED", message: "No valid session" }, 401);
  }

  const db = createDb(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid session" }, 401);
  }

  // Parse request body
  const body = await c.req.json().catch(() => ({}));

  if (body.confirm !== true) {
    return c.json(
      {
        error: "INVALID_REQUEST",
        message: "Confirmation required. Set confirm: true in request body.",
      },
      400,
    );
  }

  const server = await db.query.discordServers.findFirst({
    where: (discordServers, { eq }) =>
      eq(discordServers.userId, session.userId),
  });

  if (!server) {
    return c.json(
      { error: "NOT_FOUND", message: "No Discord server connected" },
      404,
    );
  }

  // Delete the server record
  await db.delete(discordServers).where(eq(discordServers.id, server.id));

  return c.json({
    disconnected: true,
    message: "Bot has been disconnected from your Discord server.",
  });
});

// ============================================================================
// POST /api/bot/sync - Cron Sync Endpoint
// ============================================================================

/**
 * Internal endpoint called by cron job to sync bot status across all servers.
 *
 * Updates botStatus based on whether bot is still in the guild list.
 * Requires CRON_SECRET bearer token for authentication.
 */
router.post("/sync", async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Bearer token required" },
      401,
    );
  }

  const token = authHeader.slice(7);

  if (token !== c.env.CRON_SECRET) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Invalid cron token" },
      401,
    );
  }

  const db = createDb(c.env.DB);
  const logger = createLogger(c);

  // Get all connected servers
  const allServers = await db.query.discordServers.findMany();

  // Fetch bot's current guild list
  const botGuilds = await getCurrentUserGuilds(c.env.DISCORD_BOT_TOKEN);
  const botGuildIds = new Set(botGuilds.map((g) => g.id));

  const updated: Array<{
    serverId: string;
    previousStatus: string;
    newStatus: string;
    reason: string;
  }> = [];
  const errors: Array<{
    serverId: string;
    error: string;
    retryAfter?: number;
  }> = [];

  for (const server of allServers) {
    try {
      const isBotInGuild = botGuildIds.has(server.discordId);

      if (server.botStatus === "Connected" && !isBotInGuild) {
        // Bot was removed
        await db
          .update(discordServers)
          .set({ botStatus: "Disconnected", updatedAt: new Date() })
          .where(eq(discordServers.id, server.id));

        updated.push({
          serverId: server.id,
          previousStatus: "Connected",
          newStatus: "Disconnected",
          reason: "bot_not_in_guild_list",
        });

        logger.warn({
          event: "bot_removed",
          serverId: server.id,
          discordId: server.discordId,
        } as BotEvent);
      } else if (server.botStatus === "Disconnected" && isBotInGuild) {
        // Bot was re-added (either manually or via reconnect flow)
        await db
          .update(discordServers)
          .set({ botStatus: "Connected", updatedAt: new Date() })
          .where(eq(discordServers.id, server.id));

        updated.push({
          serverId: server.id,
          previousStatus: "Disconnected",
          newStatus: "Connected",
          reason: "bot_found_in_guild_list",
        });

        logger.info({
          event: "bot_restored",
          serverId: server.id,
          discordId: server.discordId,
        } as BotEvent);
      }
    } catch (error) {
      errors.push({
        serverId: server.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return c.json({
    synced: allServers.length,
    updated,
    errors,
  });
});

export { router as botRouter };
