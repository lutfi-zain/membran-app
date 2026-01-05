import { z } from 'zod';

/**
 * Payment creation request schema
 * Used when member initiates checkout for a subscription tier
 */
export const createPaymentRequestSchema = z.object({
  tierId: z.string().min(1, { message: 'Tier ID is required' }),
  serverId: z.string().min(1, { message: 'Server ID is required' }),
});

export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;

/**
 * Payment creation response schema
 * Returns redirect URL to Midtrans payment page
 */
export const createPaymentResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    transactionId: z.string(),
    redirectUrl: z.string().url(),
    expiry: z.string(), // ISO 8601 datetime
  }),
});

export type CreatePaymentResponse = z.infer<typeof createPaymentResponseSchema>;

/**
 * Payment status query response
 */
export const paymentStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    transactionId: z.string(),
    status: z.enum(['Pending', 'Success', 'Failed', 'Refunded']),
    amount: z.number(),
    currency: z.string(),
    paymentMethod: z.string().optional(),
    paymentDate: z.string().optional(), // ISO 8601 datetime
  }),
});

export type PaymentStatusResponse = z.infer<typeof paymentStatusResponseSchema>;

/**
 * Midtrans transaction status enum
 */
export const midtransStatusEnum = z.enum([
  'Pending',
  'Success',
  'Failed',
  'Refunded',
]);

export type MidtransStatus = z.infer<typeof midtransStatusEnum>;
