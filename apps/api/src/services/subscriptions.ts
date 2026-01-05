/**
 * Subscription Service
 * Business logic for subscription management
 */

import { eq, and, sql } from 'drizzle-orm';
import { subscriptions } from '@membran/db';

/**
 * Check if user has an active subscription on a server
 * Enforces one-subscription-per-member-per-server rule
 */
export async function checkActiveSubscription(
  db: any,
  memberId: string,
  serverId: string
): Promise<{ id: string; status: string } | null> {
  try {
    const activeSubscription = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.memberId, memberId),
          eq(subscriptions.serverId, serverId),
          eq(subscriptions.status, 'Active')
        )
      )
      .limit(1)
      .execute();

    if (activeSubscription.length > 0) {
      return activeSubscription[0];
    }

    return null;
  } catch (error) {
    console.error('Error checking active subscription:', error);
    return null;
  }
}

/**
 * Calculate pro-rated credit for upgrades
 * Returns unused value from current subscription
 */
export function calculateCredit(
  currentExpiryDate: Date,
  currentTierPrice: number,
  currentTierDuration: 'monthly' | 'yearly' | 'lifetime'
): {
  unusedDays: number;
  creditAmount: number;
} {
  const now = new Date();
  const timeDiff = currentExpiryDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff <= 0) {
    return { unusedDays: 0, creditAmount: 0 };
  }

  // Calculate total days in the subscription period
  let totalDays = 30; // Default monthly
  if (currentTierDuration === 'yearly') {
    totalDays = 365;
  } else if (currentTierDuration === 'lifetime') {
    return { unusedDays: 0, creditAmount: 0 }; // No credit for lifetime
  }

  // Calculate credit: unused days / total days * price
  const creditAmount = Math.floor((daysDiff / totalDays) * currentTierPrice);

  return {
    unusedDays: daysDiff,
    creditAmount,
  };
}

/**
 * Validate subscription state transition
 */
export function isValidSubscriptionTransition(
  from: string,
  to: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    Pending: ['Active', 'Cancelled', 'Failed'],
    Active: ['Expired', 'Cancelled', 'Pending'],
    Expired: ['Pending'],
    Cancelled: ['Pending'],
    Failed: ['Pending'],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isExpiringSoon(expiryDate: Date | null): boolean {
  if (!expiryDate) {
    return false;
  }

  const now = new Date();
  const daysUntilExpiry =
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
}

/**
 * Handle subscription status transition from webhook
 */
export async function handleStatusTransition(
  db: any,
  subscriptionId: string,
  newStatus: 'Active' | 'Cancelled' | 'Failed',
  transactionDate?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current subscription
    const currentSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1)
      .execute();

    if (currentSub.length === 0) {
      return { success: false, error: 'Subscription not found' };
    }

    const subscription = currentSub[0];

    // Validate transition
    if (!isValidSubscriptionTransition(subscription.status, newStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${subscription.status} to ${newStatus}`,
      };
    }

    // Update subscription
    await db
      .update(subscriptions)
      .set({
        status: newStatus,
        lastPaymentDate: transactionDate || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Error handling subscription transition:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel expired pending subscriptions (for cron job)
 */
export async function cancelExpiredPendingSubscriptions(
  db: any
): Promise<{ cancelled: number; error?: string }> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db
      .update(subscriptions)
      .set({
        status: 'Cancelled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.status, 'Pending'),
          sql`${subscriptions.createdAt} < ${oneHourAgo.getTime()}`
        )
      )
      .execute();

    return { cancelled: result.length || 0 };
  } catch (error) {
    console.error('Error cancelling expired subscriptions:', error);
    return {
      cancelled: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
