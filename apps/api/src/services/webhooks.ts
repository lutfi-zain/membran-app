/**
 * Webhook Service
 * Handles Midtrans webhook signature verification and processing
 */

import crypto from 'node:crypto';
import { webhookEvents, transactions } from '@membran/db';
import { eq } from 'drizzle-orm';

/**
 * Verify Midtrans webhook signature
 * Signature is SHA512(order_id + status_code + gross_amount + SERVER_KEY)
 */
export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string,
  serverKey: string
): boolean {
  try {
    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY environment variable is not set');
      return false;
    }

    // Build the payload
    const payload = orderId + statusCode + grossAmount + serverKey;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHash('sha512')
      .update(payload)
      .digest('hex');

    // Compare with received signature
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Validate webhook timestamp
 * Reject webhooks older than 24 hours (FR-022)
 */
export function validateWebhookTimestamp(transactionTime: string): boolean {
  try {
    const transactionDate = new Date(transactionTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);

    return hoursDiff <= 24;
  } catch (error) {
    console.error('Error validating webhook timestamp:', error);
    return false;
  }
}

/**
 * Check if webhook has already been processed (idempotency)
 */
export async function checkWebhookProcessed(
  db: any,
  midtransOrderId: string
): Promise<boolean> {
  try {
    // Check if transaction with this order_id already exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.midtransOrderId, midtransOrderId))
      .limit(1);

    return existingTransaction.length > 0 && existingTransaction[0].status === 'Success';
  } catch (error) {
    console.error('Error checking webhook processing status:', error);
    return false;
  }
}

/**
 * Map Midtrans transaction status to our status enum
 */
export function mapMidtransStatus(midtransStatus: string): {
  status: 'Pending' | 'Success' | 'Failed' | 'Refunded';
  isValid: boolean;
} {
  const statusMap: Record<string, 'Pending' | 'Success' | 'Failed' | 'Refunded'> = {
    'pending': 'Pending',
    'settlement': 'Success',
    'capture': 'Success',
    'deny': 'Failed',
    'cancel': 'Failed',
    'expire': 'Failed',
    'failure': 'Failed',
    'refund': 'Refunded',
    'partial_refund': 'Refunded',
    'authorize': 'Pending',
  };

  const mappedStatus = statusMap[midtransStatus];
  return {
    status: mappedStatus || 'Pending',
    isValid: !!mappedStatus,
  };
}

/**
 * Log webhook event to database
 */
export async function logWebhookEvent(
  db: any,
  params: {
    id: string;
    midtransOrderId: string;
    payload: string;
    signature: string;
    verified: boolean;
    processingError?: string;
  }
): Promise<void> {
  try {
    await db.insert(webhookEvents).values({
      id: params.id,
      midtransOrderId: params.midtransOrderId,
      payload: params.payload,
      signature: params.signature,
      verified: params.verified,
      processingError: params.processingError || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging webhook event:', error);
    // Don't throw - logging failure shouldn't block webhook processing
  }
}

/**
 * Mark webhook as processed
 */
export async function markWebhookProcessed(
  db: any,
  webhookId: string
): Promise<void> {
  try {
    await db
      .update(webhookEvents)
      .set({ processed: true })
      .where(eq(webhookEvents.id, webhookId));
  } catch (error) {
    console.error('Error marking webhook as processed:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Extract order ID components for subscription lookup
 * Format: SUB-{subscriptionId}
 */
export function parseOrderId(orderId: string): {
  subscriptionId?: string;
  isValid: boolean;
} {
  try {
    if (orderId.startsWith('SUB-')) {
      const subscriptionId = orderId.substring(4);
      return { subscriptionId, isValid: true };
    }
    return { isValid: false };
  } catch {
    return { isValid: false };
  }
}
