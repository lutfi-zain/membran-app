import { z } from 'zod';

/**
 * Subscription status enum
 */
export const subscriptionStatusEnum = z.enum([
  'Active',
  'Pending',
  'Expired',
  'Cancelled',
  'Failed',
]);

export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;

/**
 * Subscription response schema
 * Used for member portal display
 */
export const subscriptionResponseSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  serverId: z.string(),
  tierId: z.string(),
  status: subscriptionStatusEnum,
  startDate: z.string(), // ISO 8601 datetime
  expiryDate: z.string().nullable(), // ISO 8601 datetime
  lastPaymentAmount: z.number().nullable(),
  lastPaymentDate: z.string().nullable(), // ISO 8601 datetime
  tier: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    priceCents: z.number(),
    currency: z.string(),
    duration: z.enum(['monthly', 'yearly', 'lifetime']),
  }),
  isExpiringSoon: z.boolean().optional(), // Computed field
});

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

/**
 * Subscription list response
 */
export const subscriptionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(subscriptionResponseSchema),
});

export type SubscriptionListResponse = z.infer<typeof subscriptionListResponseSchema>;
