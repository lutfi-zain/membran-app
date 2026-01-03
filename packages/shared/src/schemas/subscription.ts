import { z } from 'zod';

// T040: Subscription validation schemas

/**
 * Subscription tier schema
 */
export const tierSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tier ID' }),
  name: z
    .string()
    .min(1, { message: 'Tier name is required' })
    .max(100, { message: 'Tier name is too long (max 100 characters)' }),
  description: z.string().optional(),
  price: z
    .number()
    .nonnegative({ message: 'Price cannot be negative' }),
  currency: z.string().length(3, { message: 'Invalid currency code (e.g., USD)' }),
  interval: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid billing interval' }),
  }),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type TierInput = z.infer<typeof tierSchema>;

/**
 * Subscription plan schema
 */
export const planSchema = z.object({
  tierId: z.string().uuid({ message: 'Invalid tier ID' }),
  maxServers: z
    .number()
    .int()
    .positive({ message: 'Max servers must be a positive integer' }),
  maxUsers: z
    .number()
    .int()
    .nonnegative({ message: 'Max users cannot be negative' }),
  customFeatures: z.array(z.string()).optional(),
});

export type PlanInput = z.infer<typeof planSchema>;

/**
 * Subscription update schema
 */
export const subscriptionUpdateSchema = z.object({
  tierId: z.string().uuid({ message: 'Invalid tier ID' }),
  prorate: z.boolean().optional(),
});

export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
