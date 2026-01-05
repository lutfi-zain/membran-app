import { z } from 'zod';

/**
 * Midtrans webhook payload schema
 * Based on Midtrans webhook documentation
 */
export const midtransWebhookPayloadSchema = z.object({
  transaction_id: z.string(),
  order_id: z.string(),
  gross_amount: z.string(),
  payment_type: z.string(),
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
  status_code: z.string(),
  signature_key: z.string().optional(),
  payment_date: z.string().optional(),
  transaction_time: z.string().optional(),
});

export type MidtransWebhookPayload = z.infer<typeof midtransWebhookPayloadSchema>;

/**
 * Webhook response schema
 */
export const webhookResponseSchema = z.object({
  status: z.literal('ok'),
  message: z.string(),
});

export type WebhookResponse = z.infer<typeof webhookResponseSchema>;
