/**
 * useSubscription Hook
 *
 * Hook for fetching and managing member subscriptions using TanStack Query
 *
 * T069 [US3]: Create useSubscription hook in apps/web/src/hooks/useSubscription.ts
 * (subscription query using TanStack Query)
 */

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionTier {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  duration: 'monthly' | 'yearly';
}

export interface SubscriptionServer {
  id: string;
  name: string;
  icon?: string;
}

export interface Subscription {
  id: string;
  memberId: string;
  serverId: string;
  tierId: string;
  status: 'Active' | 'Pending' | 'Expired' | 'Cancelled' | 'Failed';
  startDate: string;
  expiryDate: string | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  tier: SubscriptionTier | null;
  server: SubscriptionServer | null;
  isExpiringSoon: boolean;
  transactionId?: string;
}

export interface SubscriptionListResponse {
  success: boolean;
  data: Subscription[];
}

export interface SubscriptionDetailResponse {
  success: boolean;
  data: Subscription & {
    activityHistory?: any[];
  };
}

export interface UseSubscriptionOptions {
  onError?: (error: Error) => void;
}

// ============================================================================
// Query Keys
// ============================================================================

export const subscriptionQueryKeys = {
  all: ['subscriptions'] as const,
  list: ['subscriptions', 'list'] as const,
  detail: (id: string) => ['subscriptions', 'detail', id] as const,
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all subscriptions for the authenticated user
 */
async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch('/api/subscriptions');

  if (!res.ok) {
    // 401 = not authenticated
    if (res.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }

    const error = await res.json().catch(() => ({
      error: 'UNKNOWN_ERROR',
      message: 'Failed to fetch subscriptions',
    }));

    throw new Error(error.message || 'Failed to fetch subscriptions');
  }

  const data: SubscriptionListResponse = await res.json();

  if (!data.success) {
    throw new Error(data.data?.toString() || 'Failed to fetch subscriptions');
  }

  return data.data;
}

/**
 * Fetch a single subscription by ID
 */
async function fetchSubscription(id: string): Promise<Subscription & { activityHistory?: any[] }> {
  const res = await fetch(`/api/subscriptions/${id}`);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }

    if (res.status === 403) {
      throw new Error('Access denied. You do not own this subscription.');
    }

    if (res.status === 404) {
      throw new Error('Subscription not found.');
    }

    const error = await res.json().catch(() => ({
      error: 'UNKNOWN_ERROR',
      message: 'Failed to fetch subscription',
    }));

    throw new Error(error.message || 'Failed to fetch subscription');
  }

  const data: SubscriptionDetailResponse = await res.json();

  if (!data.success) {
    throw new Error(data.data?.toString() || 'Failed to fetch subscription');
  }

  return data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * T069 [US3]: useSubscriptions - Get all subscriptions for the authenticated user
 *
 * Returns a list of subscriptions with tier information and expiry status
 *
 * @param options - Query options including error callback
 * @returns Query result with subscriptions array
 */
export function useSubscriptions(options?: UseSubscriptionOptions) {
  return useQuery({
    queryKey: subscriptionQueryKeys.list,
    queryFn: fetchSubscriptions,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: options?.onError,
  });
}

/**
 * T069 [US3]: useSubscription - Get a single subscription by ID
 *
 * Returns detailed subscription information with activity history
 *
 * @param id - Subscription ID to fetch
 * @param options - Query options including error callback
 * @returns Query result with subscription details
 */
export function useSubscription(id: string | null | undefined, options?: UseSubscriptionOptions) {
  return useQuery({
    queryKey: subscriptionQueryKeys.detail(id || ''),
    queryFn: () => fetchSubscription(id!),
    enabled: !!id,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    onError: options?.onError,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * useActiveSubscriptions - Get only active subscriptions
 *
 * Filters the subscriptions list to return only active subscriptions
 */
export function useActiveSubscriptions(options?: UseSubscriptionOptions) {
  const { data: subscriptions, ...rest } = useSubscriptions(options);

  const activeSubscriptions = subscriptions?.filter((sub) => sub.status === 'Active') || [];

  return {
    ...rest,
    data: activeSubscriptions,
  };
}

/**
 * useExpiringSubscriptions - Get subscriptions expiring within 7 days
 *
 * Returns subscriptions that are active and have isExpiringSoon = true
 */
export function useExpiringSubscriptions(options?: UseSubscriptionOptions) {
  const { data: subscriptions, ...rest } = useSubscriptions(options);

  const expiringSubscriptions = subscriptions?.filter(
    (sub) => sub.status === 'Active' && sub.isExpiringSoon
  ) || [];

  return {
    ...rest,
    data: expiringSubscriptions,
  };
}

/**
 * useRefetchSubscriptions - Returns a function to refetch subscriptions
 *
 * Useful for refreshing subscription data after actions
 */
export function useRefetchSubscriptions() {
  const queryClient = useQueryClient();

  return {
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: subscriptionQueryKeys.list,
      }),
  };
}
