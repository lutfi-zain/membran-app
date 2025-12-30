/**
 * Discord Bot API Client Library
 *
 * Provides helper functions for interacting with Discord's REST API
 * for bot operations (server info, guild list, permission validation).
 *
 * Key Features:
 * - fetchWithRetry: 60s timeout with linear backoff (5s, 10s, 15s)
 * - getGuildInfo: Fetch server details using bot token
 * - getCurrentUserGuilds: Fetch all guilds the bot is in
 * - hasRequiredPermissions: Validate bot permissions
 */

import { DISCORD_PERMISSIONS, REQUIRED_PERMISSIONS } from "@membran/shared";

// ============================================================================
// Constants
// ============================================================================

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const RETRY_DELAYS = [5000, 10000, 15000]; // Linear backoff: 5s, 10s, 15s
const MAX_RETRIES = 5;

// Permission flag names for display
export const PERMISSION_NAMES: Record<number, string> = {
  0x8: "MANAGE_ROLES",
  0x400: "VIEW_CHANNEL",
  0x800: "SEND_MESSAGES",
  0x1000: "EMBED_LINKS",
  0x2000: "ATTACH_FILES",
  0x4000: "ADD_REACTIONS",
  0x8000: "USE_EXTERNAL_EMOJIS",
  0x10000: "VIEW_GUILD_INSIGHTS",
  0x20000: "CONNECT",
  0x40000: "SPEAK",
  0x10000000: "ADMINISTRATOR",
};

// ============================================================================
// Types
// ============================================================================

export interface DiscordGuild {
  id: string; // Discord snowflake
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // Bitwise permission string
  features: string[];
}

export interface DiscordGuildWithCount extends DiscordGuild {
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

export interface DiscordError {
  code: number;
  message: string;
}

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep/delay utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract permission names from a bitwise permission integer
 */
export function getPermissionNames(permissionFlags: string | number): string[] {
  const flags =
    typeof permissionFlags === "string"
      ? parseInt(permissionFlags, 10)
      : permissionFlags;

  const names: string[] = [];

  for (const [flag, name] of Object.entries(PERMISSION_NAMES)) {
    const flagValue = parseInt(flag, 10);
    if ((flags & flagValue) === flagValue) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Check if a permission flag string includes all required permissions
 * Note: ADMINISTRATOR permission (0x10000000) grants all permissions
 */
export function hasRequiredPermissions(
  permissionFlags: string | number,
): boolean {
  const flags =
    typeof permissionFlags === "string"
      ? parseInt(permissionFlags, 10)
      : permissionFlags;

  // ADMINISTRATOR grants all permissions
  if ((flags & 0x10000000) === 0x10000000) {
    return true;
  }

  return REQUIRED_PERMISSIONS.every((req) => (flags & req) === req);
}

/**
 * Get missing required permissions
 * Note: ADMINISTRATOR permission (0x10000000) grants all permissions
 */
export function getMissingPermissions(
  permissionFlags: string | number,
): string[] {
  const flags =
    typeof permissionFlags === "string"
      ? parseInt(permissionFlags, 10)
      : permissionFlags;

  // ADMINISTRATOR grants all permissions - no missing permissions
  if ((flags & 0x10000000) === 0x10000000) {
    return [];
  }

  const missing: string[] = [];

  for (const req of REQUIRED_PERMISSIONS) {
    if ((flags & req) !== req) {
      missing.push(PERMISSION_NAMES[req] || `0x${req.toString(16)}`);
    }
  }

  return missing;
}

// ============================================================================
// Discord API Client Functions
// ============================================================================

/**
 * Fetch with retry logic for Discord API calls
 *
 * Features:
 * - 60-second timeout per request
 * - Linear backoff: 5s → 10s → 15s delays
 * - Maximum 5 retries
 * - Respects Discord's Retry-After header on 429 responses
 *
 * @throws Error if all retries fail or timeout exceeded
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxRetries = MAX_RETRIES,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "5",
          10,
        );
        const delay = retryAfter * 1000;

        // Log rate limit for observability
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            event: "discord_rate_limit",
            url,
            retryAfter,
            attempt: attempt + 1,
          }),
        );

        await sleep(delay);
        continue;
      }

      // Return successful response
      if (response.ok) {
        return response;
      }

      // Handle non-429 errors
      const errorText = await response.text().catch(() => "");
      lastError = new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );

      // Don't retry client errors (4xx except 429)
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        throw lastError;
      }

      // Retry server errors (5xx)
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        await sleep(delay);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // AbortError means timeout - don't retry
      if (lastError.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Network errors - retry with backoff
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Fetch Discord guild (server) information using bot token
 *
 * GET /guilds/{guild.id}
 *
 * Requires bot token with proper permissions
 */
export async function getGuildInfo(
  guildId: string,
  botToken: string,
): Promise<DiscordGuildWithCount> {
  const url = `${DISCORD_API_BASE}/guilds/${guildId}?with_counts=true`;

  const response = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guild info: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all guilds the bot is a member of
 *
 * GET /users/@me/guilds
 *
 * Returns paginated list of guilds (max 100 per page)
 */
export async function getCurrentUserGuilds(
  botToken: string,
  limit = 100,
  after?: string,
): Promise<DiscordGuild[]> {
  const url = new URL(`${DISCORD_API_BASE}/users/@me/guilds`);
  url.searchParams.set("limit", limit.toString());
  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetchWithRetry(url.toString(), {
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guilds: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if bot is still a member of a specific guild
 *
 * Uses the bot's guild list to verify presence
 */
export async function isBotInGuild(
  guildId: string,
  botToken: string,
): Promise<boolean> {
  try {
    const guilds = await getCurrentUserGuilds(botToken);
    return guilds.some((guild) => guild.id === guildId);
  } catch {
    return false;
  }
}

/**
 * Fetch current bot user information
 *
 * GET /users/@me
 *
 * Returns the bot's user profile
 */
export async function getBotUser(botToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot: boolean;
}> {
  const url = `${DISCORD_API_BASE}/users/@me`;

  const response = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bot user: ${response.status}`);
  }

  return response.json();
}

/**
 * Get bot's permissions in a specific guild
 *
 * Uses the guild list response which includes permissions
 */
export async function getBotPermissionsInGuild(
  guildId: string,
  botToken: string,
): Promise<{
  permissions: string;
  permissionNames: string[];
  hasRequired: boolean;
  missing: string[];
}> {
  const guilds = await getCurrentUserGuilds(botToken);
  const guild = guilds.find((g) => g.id === guildId);

  if (!guild) {
    throw new Error("Bot is not a member of this guild");
  }

  const permissionNames = getPermissionNames(guild.permissions);
  const missing = getMissingPermissions(guild.permissions);

  return {
    permissions: guild.permissions,
    permissionNames,
    hasRequired: missing.length === 0,
    missing,
  };
}

/**
 * Construct Discord icon URL from guild data
 */
export function getGuildIconUrl(
  guildId: string,
  iconHash: string | null,
  size = 128,
): string | null {
  if (!iconHash) return null;

  const sizeParam = size ? `?size=${size}` : "";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png${sizeParam}`;
}

/**
 * Format Discord API error for client responses
 */
export function formatDiscordError(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof Error) {
    // Parse common Discord error patterns
    if (error.message.includes("403")) {
      return { code: "FORBIDDEN", message: "Insufficient bot permissions" };
    }
    if (error.message.includes("404")) {
      return { code: "NOT_FOUND", message: "Discord resource not found" };
    }
    if (error.message.includes("429")) {
      return {
        code: "RATE_LIMITED",
        message: "Discord API rate limit exceeded",
      };
    }
    if (error.message.includes("timeout")) {
      return { code: "DISCORD_API_ERROR", message: "Discord API timeout" };
    }

    return { code: "DISCORD_API_ERROR", message: error.message };
  }

  return { code: "DISCORD_API_ERROR", message: "Unknown Discord error" };
}
