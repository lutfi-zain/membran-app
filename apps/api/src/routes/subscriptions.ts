/**
 * Subscription Routes
 * API for member subscription management
 */

import { zValidator } from '@hono/zod-validator';
import { createDb, pricingTiers, subscriptions, transactions, discordServers } from '@membran/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { isExpiringSoon } from '../services/subscriptions';
import { getActivityHistory } from '../services/activity-log';

const subscriptionsRouter = new Hono<{
  Bindings: {
    DB: D1Database;
  };
}>();

/**
 * GET /subscriptions
 * Get current user's subscriptions
 */
subscriptionsRouter.get('/', async (c) => {
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

  const db = createDb(c.env.DB);
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

  const userSubscriptions = await db
    .select({
      id: subscriptions.id,
      memberId: subscriptions.memberId,
      serverId: subscriptions.serverId,
      tierId: subscriptions.tierId,
      status: subscriptions.status,
      startDate: subscriptions.startDate,
      expiryDate: subscriptions.expiryDate,
      lastPaymentAmount: subscriptions.lastPaymentAmount,
      lastPaymentDate: subscriptions.lastPaymentDate,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.memberId, session.user.id))
    .orderBy(desc(subscriptions.createdAt))
    .execute();

  // Get transaction IDs for each subscription
  const subscriptionIds = userSubscriptions.map((sub: any) => sub.id);
  const transactionRecords = subscriptionIds.length > 0
    ? await db
        .select({
          id: transactions.id,
          subscriptionId: transactions.subscriptionId,
        })
        .from(transactions)
        .where(sql`${transactions.subscriptionId} IN ${sql.raw(`('${subscriptionIds.join("','")}')`)}`)
        .execute()
    : [];

  const transactionMap = new Map<string, string>();
  transactionRecords.forEach((t: any) => {
    transactionMap.set(t.subscriptionId, t.id);
  });

  // Enrich with tier, server, and transaction information
  const enrichedSubscriptions = await Promise.all(
    userSubscriptions.map(async (sub: any) => {
      const [tier, server] = await Promise.all([
        db.query.pricingTiers.findFirst({
          where: (pricingTiers, { eq }) => eq(pricingTiers.id, sub.tierId),
        }),
        db.query.discordServers.findFirst({
          where: (discordServers, { eq }) => eq(discordServers.id, sub.serverId),
        }),
      ]);

      return {
        ...sub,
        tier: tier
          ? {
              id: tier.id,
              name: tier.name,
              description: tier.description,
              priceCents: tier.priceCents,
              currency: tier.currency,
              duration: tier.duration,
            }
          : null,
        server: server
          ? {
              id: server.id,
              name: server.name,
              icon: server.icon,
            }
          : null,
        transactionId: transactionMap.get(sub.id) || undefined,
        isExpiringSoon: sub.expiryDate ? isExpiringSoon(new Date(Number(sub.expiryDate))) : false,
      };
    })
  );

  return c.json({
    success: true,
    data: enrichedSubscriptions,
  });
});

/**
 * GET /subscriptions/:id
 * Get single subscription with activity history
 */
subscriptionsRouter.get('/:id', async (c) => {
  const subscriptionId = c.req.param('id');
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

  const db = createDb(c.env.DB);
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
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

  const subscription = await db.query.subscriptions.findFirst({
    where: (subscriptions, { eq }) => eq(subscriptions.id, subscriptionId),
    with: {
      tier: true,
      server: true,
    },
  });

  if (!subscription) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      },
      404
    );
  }

  // Verify user owns this subscription
  if (subscription.memberId !== session.user.id) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      },
      403
    );
  }

  // Get activity history
  const activityHistory = await getActivityHistory(db, subscriptionId);

  // Get transaction for this subscription
  const transaction = await db.query.transactions.findFirst({
    where: (transactions, { eq }) => eq(transactions.subscriptionId, subscriptionId),
  });

  const responseData = {
    id: subscription.id,
    memberId: subscription.memberId,
    serverId: subscription.serverId,
    tierId: subscription.tierId,
    status: subscription.status,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    lastPaymentAmount: subscription.lastPaymentAmount,
    lastPaymentDate: subscription.lastPaymentDate,
    tier: subscription.tier
      ? {
          id: subscription.tier.id,
          name: subscription.tier.name,
          description: subscription.tier.description,
          priceCents: subscription.tier.priceCents,
          currency: subscription.tier.currency,
          duration: subscription.tier.duration,
        }
      : null,
    server: subscription.server
      ? {
          id: subscription.server.id,
          name: subscription.server.name,
          icon: subscription.server.icon,
        }
      : null,
    transactionId: transaction?.id || undefined,
    isExpiringSoon: subscription.expiryDate
      ? isExpiringSoon(subscription.expiryDate)
      : false,
    activityHistory,
  };

  return c.json({
    success: true,
    data: responseData,
  });
});

export { subscriptionsRouter };
