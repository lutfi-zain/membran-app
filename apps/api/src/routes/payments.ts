/**
 * Payment Routes
 * Handles payment creation and status queries
 */

import { zValidator } from '@hono/zod-validator';
import {
  createDb,
  pricingTiers,
  subscriptions,
  transactions,
  users,
} from '@membran/db';
import { createPaymentRequestSchema } from '@membran/shared';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { alphabet, generateRandomString } from 'oslo/crypto';
import {
  createTransaction,
  generateOrderId,
  getPaymentExpiry,
  getTransactionStatus,
} from '../services/midtrans';
import { checkActiveSubscription } from '../services/subscriptions';

const generateId = (length: number) =>
  generateRandomString(length, alphabet('0-9', 'a-z'));

const payments = new Hono<{
  Bindings: {
    DB: D1Database;
    MIDTRANS_SERVER_KEY: string;
    MIDTRANS_ENVIRONMENT?: string;
  };
}>();

/**
 * POST /payments/create
 * Create a new payment transaction
 */
payments.post(
  '/create',
  zValidator('json', createPaymentRequestSchema),
  async (c) => {
    const { tierId, serverId } = c.req.valid('json');
    const db = createDb(c.env.DB);

    // Get user from session
    const sessionId = getCookie(c, 'auth_session');
    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        },
        401
      );
    }

    const session = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, sessionId),
      with: {
        user: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
        },
        401
      );
    }

    const user = session.user;

    // Check email verification
    if (!user.emailVerified) {
      return c.json(
        {
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before purchasing a subscription',
          },
        },
        403
      );
    }

    // Check for active subscription (one per member per server)
    const existingSubscription = await checkActiveSubscription(
      db,
      user.id,
      serverId
    );

    if (existingSubscription) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ACTIVE_SUBSCRIPTION_EXISTS',
            message:
              'You already have an active subscription on this server. Upgrades will be available soon.',
          },
        },
        409
      );
    }

    // Get pricing tier
    const tier = await db.query.pricingTiers.findFirst({
      where: (pricingTiers, { eq }) => eq(pricingTiers.id, tierId),
    });

    if (!tier) {
      return c.json(
        {
          success: false,
          error: { code: 'TIER_NOT_FOUND', message: 'Pricing tier not found' },
        },
        404
      );
    }

    // Create pending subscription
    const subscriptionId = generateId(25);
    const startDate = new Date();
    const expiryDate = calculateExpiryDate(tier.duration);

    await db
      .insert(subscriptions)
      .values({
        id: subscriptionId,
        memberId: user.id,
        serverId: serverId,
        tierId: tierId,
        status: 'Pending',
        startDate: startDate,
        expiryDate: expiryDate,
        createdAt: startDate,
        updatedAt: startDate,
      })
      .returning();

    // Create transaction with Midtrans
    const orderId = generateOrderId(subscriptionId);
    const midtransResponse = await createTransaction(c.env, {
      orderId: orderId,
      amount: tier.priceCents,
      customerEmail: user.email || '',
      tierName: tier.name,
      memberId: user.id,
    });

    if (!midtransResponse.success) {
      // Cleanup failed subscription
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));

      return c.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_CREATION_FAILED',
            message: midtransResponse.error || 'Failed to create payment',
          },
        },
        500
      );
    }

    // Create transaction record
    const transactionId = generateId(25);
    await db.insert(transactions).values({
      id: transactionId,
      subscriptionId: subscriptionId,
      midtransOrderId: orderId,
      amount: tier.priceCents,
      currency: tier.currency,
      status: 'Pending',
      createdAt: startDate,
      updatedAt: startDate,
    });

    return c.json({
      success: true,
      data: {
        transactionId: transactionId,
        redirectUrl: midtransResponse.redirectUrl,
        expiry: getPaymentExpiry().toISOString(),
      },
    }, 201);
  }
);

/**
 * GET /payments/:transactionId
 * Get payment status
 */
payments.get('/:transactionId', async (c) => {
  const transactionId = c.req.param('transactionId');
  const db = createDb(c.env.DB);

  const transaction = await db.query.transactions.findFirst({
    where: (transactions, { eq }) => eq(transactions.id, transactionId),
    with: {
      subscription: true,
    },
  });

  if (!transaction) {
    return c.json(
      {
        success: false,
        error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' },
      },
      404
    );
  }

  return c.json({
    success: true,
    data: {
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      paymentDate: transaction.paymentDate?.toISOString(),
    },
  });
});

/**
 * POST /payments/:transactionId/sync
 * Sync payment status from Midtrans
 */
payments.post('/:transactionId/sync', async (c) => {
  const transactionId = c.req.param('transactionId');
  const db = createDb(c.env.DB);

  const transaction = await db.query.transactions.findFirst({
    where: (transactions, { eq }) => eq(transactions.id, transactionId),
  });

  if (!transaction) {
    return c.json(
      {
        success: false,
        error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' },
      },
      404
    );
  }

  // Query Midtrans for current status
  const midtransStatus = await getTransactionStatus(c.env, transaction.midtransOrderId);

  if (!midtransStatus.success || !midtransStatus.status) {
    return c.json(
      {
        success: false,
        error: { code: 'MIDTRANS_ERROR', message: midtransStatus.error || 'Failed to fetch status from Midtrans' },
      },
      500
    );
  }

  // Map Midtrans status to our status
  let newStatus: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | 'Cancelled' = 'Pending';
  const status = midtransStatus.status?.toLowerCase();

  if (status === 'settlement' || status === 'capture') {
    newStatus = 'Completed';
  } else if (status === 'pending') {
    newStatus = 'Pending';
  } else if (status === 'deny' || status === 'expire') {
    newStatus = 'Failed';
  } else if (status === 'refund' || status === 'partial_refund') {
    newStatus = 'Refunded';
  } else if (status === 'cancel') {
    newStatus = 'Cancelled';
  }

  // Update transaction status
  await db
    .update(transactions)
    .set({
      status: newStatus,
      midtransTransactionId: midtransStatus.transactionStatus || null,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId));

  // Update subscription if completed
  if (newStatus === 'Completed' && transaction.subscriptionId) {
    await db
      .update(subscriptions)
      .set({
        status: 'Active',
        lastPaymentAmount: String(transaction.amount),
        lastPaymentDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, transaction.subscriptionId));
  }

  return c.json({
    success: true,
    data: {
      transactionId: transaction.id,
      status: newStatus,
      midtransStatus: midtransStatus.status,
      message: `Status synced from Midtrans: ${newStatus}`,
    },
  });
});

/**
 * Calculate expiry date based on tier duration
 */
function calculateExpiryDate(duration: 'monthly' | 'yearly' | 'lifetime'): Date | null {
  const now = new Date();

  if (duration === 'lifetime') {
    return null; // No expiry for lifetime
  }

  if (duration === 'monthly') {
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + 1);
    return expiry;
  }

  if (duration === 'yearly') {
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  return null;
}

export { payments as paymentsRouter };
