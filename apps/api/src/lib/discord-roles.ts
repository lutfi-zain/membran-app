/**
 * Discord Role Synchronization Library
 *
 * Provides helper functions for syncing and managing Discord roles
 * from connected servers. Tracks which roles the bot can manage
 * based on role hierarchy and permissions.
 *
 * Key Features:
 * - syncDiscordRoles: Fetch roles from Discord API and cache in database
 * - getManageableRoles: Query cached roles bot can manage
 * - validateRolePermission: Check bot can assign specific role
 */

import { eq, and } from "drizzle-orm";
import { discordRoles, discordServers, type DiscordRole } from "@membran/db";
import { fetchWithRetry, getBotUser } from "./discord-bot";
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

const DISCORD_API_BASE = "https://discord.com/api/v10";

// ============================================================================
// Types
// ============================================================================

export interface DiscordRoleAPIResponse {
  id: string; // Discord snowflake
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: {
    bot_id?: string;
    premium_subscriber?: boolean;
  };
}

export interface SyncResult {
  synced: boolean;
  roles: DiscordRole[];
  warnings: string[];
  message: string;
}

type Db = PostgresJsDatabase<any> | any;

// ============================================================================
// Discord API Functions
// ============================================================================

/**
 * Fetch roles from Discord API for a specific guild
 *
 * GET /guilds/{guild.id}/roles
 *
 * Requires bot token with MANAGE_ROLES permission
 */
async function fetchDiscordRoles(
  guildId: string,
  botToken: string,
): Promise<DiscordRoleAPIResponse[]> {
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/roles`;

  const response = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guild roles: ${response.status}`);
  }

  return response.json();
}

/**
 * Determine if bot can manage a specific role
 *
 * Bot can manage roles that are:
 * 1. Lower in position than bot's highest role
 * 2. Not managed by another bot (integration roles)
 * 3. Not the @everyone role (position 0)
 */
function canBotManageRole(
  role: DiscordRoleAPIResponse,
  botRolePosition: number,
  botUserId: string,
): boolean {
  // Can't manage @everyone
  if (role.position === 0) {
    return false;
  }

  // Can't manage roles managed by other bots
  if (role.managed && role.tags?.bot_id !== botUserId) {
    return false;
  }

  // Can't manage roles higher than or equal to bot's highest role
  if (role.position >= botRolePosition) {
    return false;
  }

  return true;
}

/**
 * Get bot's role position in a guild
 *
 * Bot's role position is determined by the highest role the bot has
 */
async function getBotRolePosition(
  guildId: string,
  botToken: string,
): Promise<number> {
  const botUser = await getBotUser(botToken);
  const roles = await fetchDiscordRoles(guildId, botToken);

  // Find the bot's own role
  const botRole = roles.find((r) => r.tags?.bot_id === botUser.id);

  // Return bot's role position, or 1 if not found (shouldn't happen)
  return botRole?.position ?? 1;
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Sync Discord roles from Discord API to database
 *
 * Fetches all roles from the guild and updates the local cache.
 * Sets botCanManage flag based on role hierarchy and permissions.
 *
 * @param db - Database instance from createDb(c.env.DB)
 * @param discordServerId - Internal database ID of the discord server
 * @param botToken - Discord bot token from c.env.DISCORD_BOT_TOKEN
 * @returns Sync result with synced roles and any warnings
 */
export async function syncDiscordRoles(
  db: Db,
  discordServerId: string,
  botToken: string,
): Promise<SyncResult> {
  // Get server info from database
  const servers = await db
    .select()
    .from(discordServers)
    .where(eq(discordServers.id, discordServerId))
    .limit(1);

  if (servers.length === 0) {
    throw new Error("Discord server not found");
  }

  const server = servers[0];

  // Check if bot is connected
  if (server.botStatus !== "Connected") {
    throw new Error("Bot is not connected to this server");
  }

  const warnings: string[] = [];
  const now = new Date();

  try {
    // Fetch roles from Discord API
    const discordRolesData = await fetchDiscordRoles(
      server.discordId,
      botToken,
    );

    // Get bot's role position for manageability check
    const botUser = await getBotUser(botToken);
    const botRolePosition = await getBotRolePosition(
      server.discordId,
      botToken,
    );

    // Upsert roles to database
    for (const role of discordRolesData) {
      const botCanManage = canBotManageRole(
        role,
        botRolePosition,
        botUser.id,
      );

      // Check if role already exists
      const existing = await db
        .select()
        .from(discordRoles)
        .where(
          and(
            eq(discordRoles.discordServerId, discordServerId),
            eq(discordRoles.discordRoleId, role.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing role
        await db
          .update(discordRoles)
          .set({
            roleName: role.name,
            botCanManage,
            position: role.position,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            syncedAt: now,
            updatedAt: now,
          })
          .where(eq(discordRoles.id, existing[0].id));
      } else {
        // Insert new role
        await db.insert(discordRoles).values({
          id: randomUUID(),
          discordServerId,
          discordRoleId: role.id,
          roleName: role.name,
          botCanManage,
          position: role.position,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          syncedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Get all synced roles
    const allRoles = await getManageableRoles(db, discordServerId, false);

    // Check for manageable roles
    const manageableCount = allRoles.filter((r) => r.botCanManage).length;
    if (manageableCount === 0) {
      warnings.push(
        "Bot cannot manage any roles. Ensure bot has a role higher than the roles you want to assign.",
      );
    }

    return {
      synced: true,
      roles: allRoles,
      warnings,
      message: `Synced ${allRoles.length} roles from Discord`,
    };
  } catch (error) {
    // On API failure, return cached roles with warning
    const cachedRoles = await db
      .select()
      .from(discordRoles)
      .where(eq(discordRoles.discordServerId, discordServerId));

    if (cachedRoles.length > 0) {
      warnings.push(
        "Discord API unavailable - showing cached role data. Changes may not be current.",
      );

      return {
        synced: false,
        roles: cachedRoles,
        warnings,
        message: `Using cached data (${cachedRoles.length} roles)`,
      };
    }

    throw error;
  }
}

/**
 * Get roles for a server, optionally filtered by manageability
 *
 * @param db - Database instance from createDb(c.env.DB)
 * @param discordServerId - Internal database ID of the discord server
 * @param manageableOnly - If true, only return roles bot can manage
 * @returns Array of Discord roles
 */
export async function getManageableRoles(
  db: Db,
  discordServerId: string,
  manageableOnly = true,
): Promise<DiscordRole[]> {
  let query = db
    .select()
    .from(discordRoles)
    .where(eq(discordRoles.discordServerId, discordServerId));

  // If manageableOnly, also filter by botCanManage
  if (manageableOnly) {
    const roles = await db
      .select()
      .from(discordRoles)
      .where(
        and(
          eq(discordRoles.discordServerId, discordServerId),
          eq(discordRoles.botCanManage, true),
        ),
      )
      .orderBy(discordRoles.position);

    return roles;
  }

  // Otherwise, return all roles ordered by position
  const roles = await query.orderBy(discordRoles.position);
  return roles;
}

/**
 * Validate that bot can assign a specific role
 *
 * Checks database cache for role manageability.
 * Use after syncDiscordRoles to ensure data is current.
 *
 * @param db - Database instance from createDb(c.env.DB)
 * @param discordRoleId - Discord snowflake ID of the role
 * @param discordServerId - Internal database ID of the discord server
 * @returns True if bot can manage this role
 */
export async function validateRolePermission(
  db: Db,
  discordRoleId: string,
  discordServerId: string,
): Promise<boolean> {
  const roles = await db
    .select()
    .from(discordRoles)
    .where(
      and(
        eq(discordRoles.discordServerId, discordServerId),
        eq(discordRoles.discordRoleId, discordRoleId),
      ),
    )
    .limit(1);

  if (roles.length === 0) {
    return false; // Role not found
  }

  return roles[0].botCanManage;
}

/**
 * Get last sync time for a server's roles
 *
 * @param db - Database instance from createDb(c.env.DB)
 * @param discordServerId - Internal database ID of the discord server
 * @returns Date of last sync, or null if never synced
 */
export async function getLastSyncTime(
  db: Db,
  discordServerId: string,
): Promise<Date | null> {
  const roles = await db
    .select({ syncedAt: discordRoles.syncedAt })
    .from(discordRoles)
    .where(eq(discordRoles.discordServerId, discordServerId))
    .orderBy(discordRoles.syncedAt)
    .limit(1);

  if (roles.length === 0) {
    return null;
  }

  return roles[0].syncedAt;
}
