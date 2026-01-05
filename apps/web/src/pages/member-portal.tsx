/**
 * MemberPortal Page
 *
 * Self-service portal where members can view their subscriptions,
 * see expiry dates, and access renewal options.
 *
 * T067 [US3]: Create MemberPortal page in apps/web/src/pages/member-portal.tsx
 */

import { Link } from '@tanstack/react-router';
import { useSubscriptions, useActiveSubscriptions, useExpiringSubscriptions } from '../hooks/useSubscription';
import { SubscriptionCard, SubscriptionCardSkeleton } from '../components/SubscriptionCard';

/**
 * Loading Spinner Component
 * T071 [US3]: Add loading states to MemberPortal
 */
function LoadingSpinner() {
  return (
    <div
      data-testid="loading-spinner"
      className="flex justify-center items-center py-12"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );
}

/**
 * Error Display Component
 * T072 [US3]: Add error handling for subscription fetch
 */
function ErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg
        className="mx-auto h-12 w-12 text-red-600 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-red-900 mb-2">
        Unable to load subscriptions
      </h3>
      <p className="text-sm text-red-700 mb-4">{error.message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Empty State Component
 * T063 [US3]: Display when user has no subscriptions
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <svg
        className="mx-auto h-24 w-24 text-gray-400 mb-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">No Active Subscriptions</h2>

      <p
        data-testid="no-subscription-message"
        className="text-gray-600 mb-6 max-w-md mx-auto"
      >
        You don't have any active subscriptions yet. Browse our pricing tiers to
        find the perfect plan for you.
      </p>

      <Link
        data-testid="view-pricing-button"
        to="/pricing"
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
      >
        View Pricing Plans
      </Link>
    </div>
  );
}

/**
 * Warning Banner for expiring subscriptions
 * T061 [US3]: Display warning when subscriptions are expiring soon
 */
function ExpiryWarningBanner({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            {count === 1
              ? 'You have 1 subscription expiring soon. Renew now to maintain your benefits.'
              : `You have ${count} subscriptions expiring soon. Renew now to maintain your benefits.`}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * MemberPortal Component
 *
 * Main page for members to view and manage their subscriptions
 */
export function MemberPortal() {
  // T069 [US3]: Use the subscription hook
  const {
    data: subscriptions,
    isLoading,
    error,
    refetch,
  } = useSubscriptions({
    onError: (err) => {
      // T072 [US3]: Error handling for subscription fetch
      console.error('Failed to load subscriptions:', err);
    },
  });

  // Get expiring subscriptions for warning banner
  const { data: expiringSubscriptions } = useExpiringSubscriptions();

  const handleRenew = (subscriptionId: string, tierId: string) => {
    // T070 [US3]: Implement renewal button flow
    // Navigate to checkout page for renewal
    window.location.href = `/checkout?tierId=${tierId}&subscriptionId=${subscriptionId}`;
  };

  // T071 [US3]: Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
          </div>
          <LoadingSpinner />
          {/* Show multiple skeleton cards while loading */}
          <div className="space-y-6 mt-6">
            <SubscriptionCardSkeleton />
            <SubscriptionCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // T072 [US3]: Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
          </div>
          <ErrorDisplay error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const hasSubscriptions = subscriptions && subscriptions.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
          <p className="text-gray-600">
            Manage your subscriptions and view your active benefits.
          </p>
        </div>

        {/* Expiry Warning Banner */}
        {hasSubscriptions && (
          <ExpiryWarningBanner count={expiringSubscriptions?.length || 0} />
        )}

        {/* Empty State - T063 [US3] */}
        {!hasSubscriptions && <EmptyState />}

        {/* Subscription List */}
        {hasSubscriptions && (
          <div className="space-y-6">
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onRenew={handleRenew}
              />
            ))}
          </div>
        )}

        {/* Help Section */}
        {hasSubscriptions && (
          <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Need Help?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              If you have questions about your subscription or need to make changes,
              please contact our support team.
            </p>
            <a
              href="mailto:support@membran.app"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberPortal;
