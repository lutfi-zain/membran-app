/**
 * SubscriptionCard Component
 *
 * Displays a single subscription with its tier, status, expiry date,
 * and renewal options.
 *
 * T068 [US3]: Create SubscriptionCard component
 * T070 [US3]: Implement renewal button flow
 * T071 [US3]: Add loading states to MemberPortal
 * T072 [US3]: Add error handling for subscription fetch
 */

import { useState } from 'react';
import type { Subscription } from '../hooks/useSubscription';

interface SubscriptionCardProps {
  subscription: Subscription;
  onRenew?: (subscriptionId: string, tierId: string) => void;
}

/**
 * Get status badge color classes
 */
function getStatusColor(status: Subscription['status']): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Expired':
    case 'Cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Failed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Format date to readable string
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate days remaining until expiry
 */
function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Format price to display string
 */
function formatPrice(priceCents: number | null, currency: string = 'IDR'): string {
  if (priceCents === null) return 'N/A';

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return formatter.format(priceCents / 100);
}

export function SubscriptionCard({ subscription, onRenew }: SubscriptionCardProps) {
  const [isRenewing, setIsRenewing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const daysRemaining = getDaysRemaining(subscription.expiryDate);
  const canRenew = subscription.status !== 'Pending';

  const handleRenew = async () => {
    if (!canRenew || isRenewing) return;

    setIsRenewing(true);
    try {
      // T070 [US3]: Implement renewal button flow
      // Navigate to checkout flow with existing subscription for pro-rated upgrade
      if (onRenew) {
        onRenew(subscription.id, subscription.tierId);
      } else {
        // Default behavior: navigate to checkout with existing subscription
        window.location.href = `/checkout?tierId=${subscription.tierId}&subscriptionId=${subscription.id}`;
      }
    } finally {
      setIsRenewing(false);
    }
  };

  const handleSyncStatus = async () => {
    if (!subscription.transactionId || isSyncing) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch(`/api/payments/${subscription.transactionId}/sync`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSyncMessage({ type: 'success', text: 'Status synced from Midtrans!' });
        // Refetch subscriptions after successful sync
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncMessage({ type: 'error', text: data.error?.message || 'Sync failed' });
      }
    } catch (error) {
      setSyncMessage({ type: 'error', text: 'Failed to sync status' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <div
      data-testid="subscription-card"
      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header with server name and status */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {subscription.server?.icon && (
            <img
              src={subscription.server.icon}
              alt={subscription.server.name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {subscription.server?.name || 'Unknown Server'}
            </h3>
            <p className="text-sm text-gray-500">Subscription ID: {subscription.id.slice(0, 8)}...</p>
          </div>
        </div>

        <span
          data-testid="subscription-status"
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(subscription.status)}`}
        >
          {subscription.status}
        </span>
      </div>

      {/* T071 [US3]: Loading state during renewal */}
      {isRenewing && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          <span className="text-sm text-blue-700">Preparing renewal...</span>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* Tier Information */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Tier</p>
            <p data-testid="tier-name" className="text-xl font-bold text-gray-900">
              {subscription.tier?.name || 'N/A'}
            </p>
          </div>
          {subscription.tier && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(subscription.tier.priceCents, subscription.tier.currency)}
                <span className="text-sm font-normal text-gray-500">/{subscription.tier.duration}</span>
              </p>
            </div>
          )}
        </div>

        {/* Tier Description */}
        {subscription.tier?.description && (
          <p className="text-sm text-gray-600">{subscription.tier.description}</p>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Started</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(subscription.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expires</p>
            <p
              data-testid="expiry-date"
              className={`text-sm font-medium ${
                subscription.isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'
              }`}
            >
              {formatDate(subscription.expiryDate)}
            </p>
          </div>
        </div>

        {/* Expiry Warning Banner (T061) */}
        {subscription.status === 'Active' && subscription.isExpiringSoon && (
          <div
            data-testid="expiry-warning-banner"
            className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start space-x-2"
          >
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                {daysRemaining !== null && daysRemaining <= 1
                  ? 'Expires today!'
                  : `Expiring in ${daysRemaining} days`}
              </p>
              <p className="text-sm text-yellow-700">Renew soon to maintain your benefits.</p>
            </div>
          </div>
        )}

        {/* Last Payment Info */}
        {subscription.lastPaymentAmount && (
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-sm text-gray-500">Last Payment</p>
            <p className="text-sm font-medium text-gray-900">
              {formatPrice(subscription.lastPaymentAmount)} on{' '}
              {formatDate(subscription.lastPaymentDate)}
            </p>
          </div>
        )}

        {/* Sync Status Button for Pending Subscriptions */}
        {subscription.status === 'Pending' && subscription.transactionId && (
          <div className="bg-blue-50 rounded-md p-3 space-y-2">
            <p className="text-sm text-blue-700">
              Payment is pending. Click sync to check Midtrans status.
            </p>
            <button
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isSyncing
                  ? 'bg-blue-200 text-blue-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSyncing ? 'Syncing...' : 'Sync Status from Midtrans'}
            </button>
            {syncMessage && (
              <p className={`text-sm ${syncMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {syncMessage.text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {subscription.status === 'Active' && !subscription.isExpiringSoon
            ? 'Your subscription is active'
            : subscription.status === 'Active' && subscription.isExpiringSoon
            ? 'Renew to continue access'
            : subscription.status === 'Expired' || subscription.status === 'Cancelled'
            ? 'Renew to reactivate'
            : subscription.status === 'Pending'
            ? 'Payment pending'
            : 'Contact support'}
        </p>

        {/* T070 [US3]: Renewal button */}
        {canRenew && (
          <button
            data-testid="renewal-button"
            onClick={handleRenew}
            disabled={isRenewing}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isRenewing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : subscription.status === 'Active'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isRenewing
              ? 'Processing...'
              : subscription.status === 'Active'
              ? 'Renew'
              : subscription.status === 'Expired' || subscription.status === 'Cancelled'
              ? 'Reactivate'
              : 'Manage'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for subscription card
 * T071 [US3]: Add loading states
 */
export function SubscriptionCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div>
            <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-7 w-32 bg-gray-200 rounded" />
          </div>
          <div className="text-right">
            <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-7 w-24 bg-gray-200 rounded" />
          </div>
        </div>

        <div className="h-4 w-full bg-gray-200 rounded" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-4 w-12 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div>
            <div className="h-4 w-12 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="h-9 w-24 bg-gray-200 rounded-md" />
      </div>
    </div>
  );
}
