/**
 * Webhook Routes
 * Handles Midtrans webhook processing
 */

import { zValidator } from '@hono/zod-validator';
import { createDb, subscriptions, transactions, webhookEvents } from '@membran/db';
import { midtransWebhookPayloadSchema } from '@membran/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { alphabet, generateRandomString } from 'oslo/crypto';
import {
  logWebhookEvent,
  mapMidtransStatus,
  markWebhookProcessed,
  parseOrderId,
  validateWebhookTimestamp,
  verifyWebhookSignature,
} from '../services/webhooks';
import { assignRole, removeRole, sendDM, validateBotPermissions } from '../services/discord';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../services/notifications';
import { handleStatusTransition } from '../services/subscriptions';
import { logActivity } from '../services/activity-log';

const generateId = (length: number) =>
  generateRandomString(length, alphabet('0-9', 'a-z'));

const webhooks = new Hono<{
  Bindings: {
    DB: D1Database;
    MIDTRANS_SERVER_KEY: string;
    RESEND_API_KEY: string;
    FROM_EMAIL: string;
    APP_URL: string;
    DISCORD_BOT_TOKEN: string;
  };
}>();

/**
 * POST /webhooks/midtrans
 * Process Midtrans payment webhook
 */
webhooks.post('/midtrans', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('X-Signature');

  if (!signature) {
    return c.json(
      {
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'X-Signature header required' },
      },
      401
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_JSON', message: 'Invalid JSON payload' },
      },
      400
    );
  }

  // Validate payload schema
  const validationResult = midtransWebhookPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Invalid webhook payload' },
      },
      400
    );
  }

  const webhookData = validationResult.data;

  // Verify signature
  const isValidSignature = verifyWebhookSignature(
    webhookData.order_id,
    webhookData.status_code,
    webhookData.gross_amount,
    signature,
    c.env.MIDTRANS_SERVER_KEY
  );

  if (!isValidSignature) {
    // Log failed verification attempt
    const webhookId = generateId(25);
    const db = createDb(c.env.DB);
    await logWebhookEvent(db, {
      id: webhookId,
      midtransOrderId: webhookData.order_id,
      payload: rawBody,
      signature: signature,
      verified: false,
      processingError: 'Invalid signature',
    });

    return c.json(
      {
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
      },
      401
    );
  }

  // Validate timestamp (FR-022: Reject webhooks older than 24 hours)
  if (webhookData.transaction_time) {
    const isValidTimestamp = validateWebhookTimestamp(webhookData.transaction_time);
    if (!isValidTimestamp) {
      const webhookId = generateId(25);
      const db = createDb(c.env.DB);
      await logWebhookEvent(db, {
        id: webhookId,
        midtransOrderId: webhookData.order_id,
        payload: rawBody,
        signature: signature,
        verified: true,
        processingError: 'Webhook timestamp is too old (>24 hours)',
      });

      return c.json(
        {
          success: false,
          error: { code: 'OLD_WEBHOOK', message: 'Webhook is too old to process' },
        },
        400
      );
    }
  }

  const db = createDb(c.env.DB);

  // Check for duplicate (idempotency via transaction ID)
  const existingTransaction = await db
    .select()
    .from(transactions)
    .where(eq(transactions.midtransOrderId, webhookData.order_id))
    .limit(1);

  if (existingTransaction.length > 0) {
    const existing = existingTransaction[0];

    // If already successfully processed, return 200 (idempotent)
    if (existing.status === 'Success') {
      return c.json({
        status: 'ok',
        message: 'Webhook already processed',
      });
    }

    // Update existing transaction if status changed
    const mappedStatus = mapMidtransStatus(webhookData.transaction_status);
    if (mappedStatus.isValid && mappedStatus.status !== existing.status) {
      await db
        .update(transactions)
        .set({
          status: mappedStatus.status,
          midtransTransactionId: webhookData.transaction_id,
          paymentDate: webhookData.payment_date
            ? new Date(webhookData.payment_date)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, existing.id));
    }
  }

  // Process webhook
  const webhookId = generateId(25);
  await logWebhookEvent(db, {
    id: webhookId,
    midtransOrderId: webhookData.order_id,
    payload: rawBody,
    signature: signature,
    verified: true,
  });

  // Map Midtrans status to our status
  const mappedStatus = mapMidtransStatus(webhookData.transaction_status);

  if (!mappedStatus.isValid) {
    await logWebhookEvent(db, {
      id: webhookId,
      midtransOrderId: webhookData.order_id,
      payload: rawBody,
      signature: signature,
      verified: true,
      processingError: `Unknown transaction status: ${webhookData.transaction_status}`,
    });

    return c.json({
      status: 'ok',
      message: 'Unknown status ignored',
    });
  }

  // Extract subscription ID from order ID
  const { subscriptionId, isValid: isValidOrderId } = parseOrderId(webhookData.order_id);

  if (!isValidOrderId || !subscriptionId) {
    await logWebhookEvent(db, {
      id: webhookId,
      midtransOrderId: webhookData.order_id,
      payload: rawBody,
      signature: signature,
      verified: true,
      processingError: 'Invalid order ID format or subscription not found',
    });

    return c.json({
      status: 'ok',
      message: 'Invalid order ID',
    });
  }

  // Get subscription with tier and server details
  const subscriptionData = await db.query.subscriptions.findFirst({
    where: (subscriptions, { eq }) => eq(subscriptions.id, subscriptionId),
    with: {
      tier: true,
      server: true,
      member: true,
    },
  });

  if (!subscriptionData) {
    await logWebhookEvent(db, {
      id: webhookId,
      midtransOrderId: webhookData.order_id,
      payload: rawBody,
      signature: signature,
      verified: true,
      processingError: 'Subscription not found',
    });

    return c.json({
      status: 'ok',
      message: 'Subscription not found',
    });
  }

  // Handle different payment statuses
  try {
    switch (mappedStatus.status) {
      case 'Success':
        await handleSuccessfulPayment(
          c.env,
          db,
          subscriptionData,
          webhookData.transaction_id,
          webhookData.payment_date
        );
        break;

      case 'Failed':
        await handleFailedPayment(c.env, db, subscriptionData);
        break;

      case 'Refunded':
        await handleRefundedPayment(c.env, db, subscriptionData);
        break;

      case 'Pending':
        // Update transaction to pending, but don't activate subscription
        if (existingTransaction.length > 0) {
          await db
            .update(transactions)
            .set({
              status: 'Pending',
              midtransTransactionId: webhookData.transaction_id,
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, existingTransaction[0].id));
        }
        break;
    }

    // Mark webhook as processed
    await markWebhookProcessed(db, webhookId);

    return c.json({
      status: 'ok',
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Error processing webhook:', error);

    await logWebhookEvent(db, {
      id: webhookId,
      midtransOrderId: webhookData.order_id,
      payload: rawBody,
      signature: signature,
      verified: true,
      processingError: error instanceof Error ? error.message : 'Unknown error',
    });

    // Still return 200 to avoid Midtrans retries
    return c.json({
      status: 'ok',
      message: 'Webhook processed with errors',
    });
  }
});

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(
  env: any,
  db: any,
  subscription: any,
  midtransTransactionId: string,
  paymentDate?: string
) {
  // Update subscription status to Active
  await handleStatusTransition(
    db,
    subscription.id,
    'Active',
    paymentDate ? new Date(paymentDate) : undefined
  );

  // Update transaction
  await db
    .update(transactions)
    .set({
      status: 'Success',
      midtransTransactionId: midtransTransactionId,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(transactions.subscriptionId, subscription.id));

  // Validate bot permissions before role assignment (FR-024)
  const permissionCheck = await validateBotPermissions(env, subscription.server.discordId);
  if (!permissionCheck.success) {
    console.error('Bot lacks required permissions:', permissionCheck.error);
    // Log activity but don't fail the webhook
    await logActivity(db, {
      subscriptionId: subscription.id,
      actorType: 'system',
      action: 'role_assignment_failed',
      details: { error: permissionCheck.error },
    });
    return;
  }

  // Assign Discord role
  const roleResult = await assignRole(
    env,
    subscription.server.discordId,
    subscription.member.discordId,
    subscription.tier.discordRoleId
  );

  if (roleResult.success) {
    // Send DM notification
    const dmResult = await sendDM(
      env,
      subscription.member.discordId,
      `🎉 Payment successful! You've been granted the **${subscription.tier.name}** role on ${subscription.server.name}.`
    );

    // Email fallback if DM fails
    if (!dmResult.success && subscription.member.email) {
      await sendPaymentSuccessEmail(
        env,
        subscription.member.email,
        subscription.tier.name,
        subscription.lastPaymentAmount || subscription.tier.priceCents,
        subscription.tier.currency
      );
    }

    // Log activity
    await logActivity(db, {
      subscriptionId: subscription.id,
      actorType: 'system',
      action: 'payment_received',
      details: {
        midtransTransactionId,
        amount: subscription.lastPaymentAmount,
        tierName: subscription.tier.name,
      },
    });
  } else {
    console.error('Failed to assign Discord role:', roleResult.error);
    await logActivity(db, {
      subscriptionId: subscription.id,
      actorType: 'system',
      action: 'role_assignment_failed',
      details: { error: roleResult.error },
    });
  }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(env: any, db: any, subscription: any) {
  await handleStatusTransition(db, subscription.id, 'Failed');

  // Send failure notification
  if (subscription.member.email) {
    await sendPaymentFailedEmail(env, subscription.member.email);
  }

  // Log activity
  await logActivity(db, {
    subscriptionId: subscription.id,
    actorType: 'system',
    action: 'payment_failed',
    details: {
      tierName: subscription.tier.name,
    },
  });
}

/**
 * Handle refunded payment
 */
async function handleRefundedPayment(env: any, db: any, subscription: any) {
  await handleStatusTransition(db, subscription.id, 'Cancelled');

  // Remove Discord role
  if (subscription.tier.discordRoleId) {
    const removeResult = await removeRole(
      env,
      subscription.server.discordId,
      subscription.member.discordId,
      subscription.tier.discordRoleId
    );

    if (removeResult.success) {
      await logActivity(db, {
        subscriptionId: subscription.id,
        actorType: 'system',
        action: 'subscription_refunded',
        details: {
          tierName: subscription.tier.name,
        },
      });
    }
  }
}

export { webhooks as webhooksRouter };
