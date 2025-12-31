import { z } from "zod";

/**
 * Pricing Tier Configuration Shared Zod Schemas
 *
 * Defines the types for pricing tier configuration API requests and responses.
 * These schemas are shared between frontend (apps/web) and backend (apps/api).
 */

// ============================================================================
// Enums
// ============================================================================

export const DurationEnum = z.enum(["monthly", "yearly", "lifetime"]);
export type Duration = z.infer<typeof DurationEnum>;

export const CurrencyEnum = z.enum(["USD"]);
export type Currency = z.infer<typeof CurrencyEnum>;

// ============================================================================
// Error Codes
// ============================================================================

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

export type PricingErrorCode = (typeof PRICING_ERROR_CODES)[keyof typeof PRICING_ERROR_CODES];

// ============================================================================
// Discord Role Schemas
// ============================================================================

/**
 * Discord role synced from server
 */
export const DiscordRoleSchema = z.object({
  id: z.string(),
  discordServerId: z.string(),
  discordRoleId: z.string().regex(/^\d{17,19}$/, "Invalid Discord snowflake ID"),
  roleName: z.string().min(1).max(100),
  botCanManage: z.boolean(),
  position: z.number().int().min(0),
  color: z.number().int().nullable(),
  hoist: z.boolean(),
  permissions: z.string().nullable(),
  syncedAt: z.string().datetime(),
});

export type DiscordRole = z.infer<typeof DiscordRoleSchema>;

/**
 * Response for GET /api/roles
 */
export const DiscordRolesResponseSchema = z.object({
  roles: z.array(DiscordRoleSchema),
  lastSynced: z.string().datetime().nullable(),
});

export type DiscordRolesResponse = z.infer<typeof DiscordRolesResponseSchema>;

/**
 * Response for POST /api/roles/sync
 */
export const DiscordRolesSyncResponseSchema = z.object({
  synced: z.boolean(),
  roles: z.array(DiscordRoleSchema),
  warnings: z.array(z.string()),
  message: z.string(),
});

export type DiscordRolesSyncResponse = z.infer<typeof DiscordRolesSyncResponseSchema>;

// ============================================================================
// Tier Feature Schemas
// ============================================================================

/**
 * Single tier feature/benefit
 */
export const TierFeatureSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(200),
  displayOrder: z.number().int().min(1).max(20),
});

export type TierFeature = z.infer<typeof TierFeatureSchema>;

/**
 * Tier feature input (for create/update operations)
 */
export const TierFeatureInputSchema = TierFeatureSchema.omit({ id: true });

export type TierFeatureInput = z.infer<typeof TierFeatureInputSchema>;

// ============================================================================
// Pricing Tier Schemas
// ============================================================================

/**
 * Pricing tier (core fields)
 */
export const PricingTierSchema = z.object({
  id: z.string(),
  discordServerId: z.string(),
  discordRoleId: z.string().nullable(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  priceCents: z.number().int().min(0).max(99900),
  currency: CurrencyEnum,
  duration: DurationEnum,
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.number().int().positive(),
  version: z.number().int().min(1),
  needsSync: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PricingTier = z.infer<typeof PricingTierSchema>;

/**
 * Pricing tier with features and subscriber count
 */
export const PricingTierWithFeaturesSchema = PricingTierSchema.extend({
  features: z.array(TierFeatureSchema),
  activeSubscriberCount: z.number().int().min(0).default(0),
});

export type PricingTierWithFeatures = z.infer<typeof PricingTierWithFeaturesSchema>;

/**
 * Request to create a pricing tier
 */
export const CreatePricingTierRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0).max(99900),
  duration: DurationEnum,
  discordRoleId: z.string().regex(/^\d{17,19}$/, "Invalid Discord snowflake ID"),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().positive().optional(),
  features: z.array(TierFeatureInputSchema).max(20).optional(),
});

export type CreatePricingTierRequest = z.infer<typeof CreatePricingTierRequestSchema>;

/**
 * Request to update a pricing tier (with version for optimistic locking)
 */
export const UpdatePricingTierRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  priceCents: z.number().int().min(0).max(99900).optional(),
  duration: DurationEnum.optional(),
  discordRoleId: z.string().regex(/^\d{17,19}$/).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().positive().optional(),
  version: z.number().int().min(1),
});

export type UpdatePricingTierRequest = z.infer<typeof UpdatePricingTierRequestSchema>;

/**
 * Request to reorder pricing tiers
 */
export const ReorderPricingTiersRequestSchema = z.object({
  tierIds: z.array(z.string()).min(1).max(5),
});

export type ReorderPricingTiersRequest = z.infer<typeof ReorderPricingTiersRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Response for GET /api/pricing/tiers
 */
export const ListPricingTiersResponseSchema = z.object({
  tiers: z.array(PricingTierWithFeaturesSchema),
});

export type ListPricingTiersResponse = z.infer<typeof ListPricingTiersResponseSchema>;

/**
 * Server info for preview
 */
export const ServerInfoSchema = z.object({
  id: z.string(),
  discordId: z.string().regex(/^\d{17,19}$/),
  name: z.string().min(1).max(100),
  icon: z.string().url().nullable(),
  memberCount: z.number().int().min(0),
});

export type ServerInfo = z.infer<typeof ServerInfoSchema>;

/**
 * Response for GET /api/pricing/preview
 */
export const PreviewPricingTiersResponseSchema = z.object({
  server: ServerInfoSchema,
  featuredTier: PricingTierWithFeaturesSchema.nullable(),
  tiers: z.array(PricingTierWithFeaturesSchema),
  currencySymbol: z.string().default("$"),
});

export type PreviewPricingTiersResponse = z.infer<typeof PreviewPricingTiersResponseSchema>;

/**
 * Response for tier deletion
 */
export const DeletePricingTierResponseSchema = z.object({
  deleted: z.boolean(),
  message: z.string(),
});

export type DeletePricingTierResponse = z.infer<typeof DeletePricingTierResponseSchema>;

/**
 * Request to add a feature to a tier
 */
export const AddFeatureRequestSchema = z.object({
  description: z.string().min(1).max(200),
  displayOrder: z.number().int().min(1).max(20),
});

export type AddFeatureRequest = z.infer<typeof AddFeatureRequestSchema>;

/**
 * Request to update features for a tier (bulk replace)
 */
export const UpdateFeaturesRequestSchema = z.object({
  features: z.array(TierFeatureSchema).max(20),
});

export type UpdateFeaturesRequest = z.infer<typeof UpdateFeaturesRequestSchema>;

/**
 * Response for feature operations
 */
export const FeatureResponseSchema = z.object({
  features: z.array(TierFeatureSchema),
});

export type FeatureResponse = z.infer<typeof FeatureResponseSchema>;

/**
 * Response for single feature add
 */
export const AddedFeatureResponseSchema = z.object({
  id: z.string(),
  tierId: z.string(),
  description: z.string().min(1).max(200),
  displayOrder: z.number().int().min(1).max(20),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AddedFeatureResponse = z.infer<typeof AddedFeatureResponseSchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

/**
 * Standard error response format
 */
export const PricingErrorResponseSchema = z.object({
  error: z.nativeEnum(PRICING_ERROR_CODES).or(
    z.enum(["VALIDATION_ERROR", "UNAUTHORIZED", "NOT_FOUND", "INTERNAL_ERROR"])
  ),
  message: z.string(),
  details: z.any().optional(),
});

export type PricingErrorResponse = z.infer<typeof PricingErrorResponseSchema>;
