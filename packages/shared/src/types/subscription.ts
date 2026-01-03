/**
 * Subscription types for use across the application
 */

/**
 * Subscription status with state machine
 */
export type SubscriptionStatus =
  | 'Active'
  | 'Pending'
  | 'Expired'
  | 'Cancelled'
  | 'Failed';

/**
 * Valid state transitions for subscriptions
 */
export type SubscriptionTransition =
  | { from: 'Pending'; to: 'Active' } // Payment successful
  | { from: 'Pending'; to: 'Cancelled' } // Timeout after 1 hour
  | { from: 'Active'; to: 'Expired' } // Past expiry date
  | { from: 'Active'; to: 'Cancelled' } // Refund or manual cancellation
  | { from: 'Active'; to: 'Pending' } // Upgrade with pro-rated credit
  | { from: 'Failed'; to: 'Pending' } // Retry payment
  | { from: 'Cancelled'; to: 'Pending' } // Renewal
  | { from: 'Expired'; to: 'Pending' }; // Renewal

/**
 * Subscription state transition validator
 */
export function isValidSubscriptionTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus
): boolean {
  const validTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    Pending: ['Active', 'Cancelled', 'Failed'],
    Active: ['Expired', 'Cancelled', 'Pending'],
    Expired: ['Pending'],
    Cancelled: ['Pending'],
    Failed: ['Pending'],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Subscription details for display
 */
export interface SubscriptionDetails {
  id: string;
  memberId: string;
  serverId: string;
  tierId: string;
  status: SubscriptionStatus;
  startDate: Date;
  expiryDate: Date | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: Date | null;
  tierName: string;
  tierPriceCents: number;
  tierCurrency: string;
  tierDuration: 'monthly' | 'yearly' | 'lifetime';
}

/**
 * Pro-rated credit calculation result
 */
export interface ProRatedCredit {
  unusedDays: number;
  creditAmountCents: number;
  newChargeAmountCents: number;
  newExpiryDate: Date;
}

/**
 * Activity log entry
 */
export interface ActivityLogEntry {
  id: string;
  subscriptionId: string | null;
  actorType: 'system' | 'server_owner';
  actorId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
