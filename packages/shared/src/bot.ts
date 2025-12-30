import { z } from "zod";

/**
 * Bot Connection Shared Zod Schemas
 *
 * Defines the types for Discord bot invitation and server connection API responses.
 * These schemas are shared between frontend (apps/web) and backend (apps/api).
 */

// ============================================================================
// Enums
// ============================================================================

export const BotStatusEnum = z.enum(["Connected", "Disconnected", "Pending"]);
export type BotStatus = z.infer<typeof BotStatusEnum>;

// Discord Permission Flag Constants
export const DISCORD_PERMISSIONS = {
  MANAGE_ROLES: 0x8, // 8
  VIEW_CHANNEL: 0x400, // 1024
  SEND_MESSAGES: 0x800, // 2048
  EMBED_LINKS: 0x1000, // 4096
  ATTACH_FILES: 0x2000, // 8192
  ADD_REACTIONS: 0x4000, // 16384
} as const;

// Required permissions for bot to function properly
export const REQUIRED_PERMISSIONS = [
  DISCORD_PERMISSIONS.MANAGE_ROLES,
  DISCORD_PERMISSIONS.VIEW_CHANNEL,
] as const;

// ============================================================================
// Bot OAuth Flow Schemas
// ============================================================================

/**
 * Response for POST /api/bot/invite and POST /api/bot/reconnect
 */
export const BotInviteResponseSchema = z.object({
  authorizationUrl: z.string().url(),
  state: z.string(),
});

export type BotInviteResponse = z.infer<typeof BotInviteResponseSchema>;

// ============================================================================
// Discord Server Schemas
// ============================================================================

/**
 * Discord server info (subset of full server object)
 */
export const DiscordServerSchema = z.object({
  id: z.string().uuid(), // UUID from our database
  discordId: z.string().regex(/^\d{17,19}$/, "Invalid Discord snowflake ID"),
  name: z.string().min(1).max(100),
  icon: z.string().url().nullable(),
  memberCount: z.number().int().min(0).max(1000), // MVP: max 1000 members
  botStatus: BotStatusEnum,
  botAddedAt: z.string().datetime(), // ISO 8601 timestamp
  permissions: z.array(z.string()), // Permission names e.g. ["MANAGE_ROLES", "VIEW_CHANNEL"]
  recentlyConnected: z.boolean(), // true if added within 24h
  permissionsValid: z.boolean(),
  permissionsWarnings: z.array(z.string()),
});

export type DiscordServer = z.infer<typeof DiscordServerSchema>;

/**
 * Response for GET /api/bot/status
 */
export const BotStatusResponseSchema = z.object({
  connected: z.boolean(),
  server: DiscordServerSchema.optional(),
});

export type BotStatusResponse = z.infer<typeof BotStatusResponseSchema>;

// ============================================================================
// Permission Validation Schemas
// ============================================================================

/**
 * Response for POST /api/bot/validate-permissions
 */
export const PermissionCheckSchema = z.object({
  current: z.string(), // Bitwise permission string
  required: z.string(), // Required permission flags
  missing: z.array(z.string()), // Missing permission names
  hasAllRequired: z.boolean(),
});

export const ValidatePermissionsResponseSchema = z.object({
  valid: z.boolean(),
  permissions: PermissionCheckSchema,
  warnings: z.array(z.string()).optional(),
});

export type ValidatePermissionsResponse = z.infer<
  typeof ValidatePermissionsResponseSchema
>;

// ============================================================================
// Error Response Schemas
// ============================================================================

/**
 * Standard error response format
 */
export const BotErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(), // Additional error-specific fields
});

export type BotErrorResponse = z.infer<typeof BotErrorResponseSchema>;

// Error codes
export const BotErrorCode = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "ALREADY_CONNECTED",
  "INVALID_STATE",
  "INVALID_REQUEST",
  "OAUTH_ERROR",
  "DISCORD_API_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export type BotErrorCode = z.infer<typeof BotErrorCode>;

// ============================================================================
// Disconnect/Sync Response Schemas
// ============================================================================

/**
 * Response for DELETE /api/bot/disconnect
 */
export const BotDisconnectResponseSchema = z.object({
  disconnected: z.boolean(),
  message: z.string(),
});

export type BotDisconnectResponse = z.infer<typeof BotDisconnectResponseSchema>;

/**
 * Response for POST /api/bot/sync (cron endpoint)
 */
export const BotSyncErrorSchema = z.object({
  serverId: z.string().uuid(),
  error: z.string(),
  retryAfter: z.number().int().optional(),
});

export const BotSyncUpdateSchema = z.object({
  serverId: z.string().uuid(),
  previousStatus: BotStatusEnum,
  newStatus: BotStatusEnum,
  reason: z.string(),
});

export const BotSyncResponseSchema = z.object({
  synced: z.number().int(),
  updated: z.array(BotSyncUpdateSchema),
  errors: z.array(BotSyncErrorSchema),
});

export type BotSyncResponse = z.infer<typeof BotSyncResponseSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert permission flag numbers to readable names
 */
export function permissionFlagsToNames(flags: string): string[] {
  const flagNum = parseInt(flags, 10);
  const names: string[] = [];

  for (const [name, value] of Object.entries(DISCORD_PERMISSIONS)) {
    if ((flagNum & value) === value) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Check if a permission flag string includes all required permissions
 */
export function hasRequiredPermissions(flags: string): boolean {
  const flagNum = parseInt(flags, 10);
  return REQUIRED_PERMISSIONS.every((req) => (flagNum & req) === req);
}
