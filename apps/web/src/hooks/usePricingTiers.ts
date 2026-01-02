import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePricingTierRequest,
  DeletePricingTierResponse,
  ListPricingTiersResponse,
  PreviewPricingTiersResponse,
  PricingTierWithFeatures,
  UpdatePricingTierRequest,
  ReorderPricingTiersRequest,
  DiscordRolesResponse,
  DiscordRolesSyncResponse,
} from "@membran/shared";

const API_BASE = "/api/pricing";
const ROLES_API_BASE = "/api/roles";

// ============================================================================
// Types
// ============================================================================

export interface UsePricingTiersOptions {
  onError?: (error: Error) => void;
}

export interface UseCreateTierOptions {
  onSuccess?: (data: PricingTierWithFeatures) => void;
  onError?: (error: Error) => void;
}

export interface UseUpdateTierOptions {
  onSuccess?: (data: PricingTierWithFeatures) => void;
  onError?: (error: Error) => void;
}

export interface UseDeleteTierOptions {
  onSuccess?: (data: DeletePricingTierResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseReorderTiersOptions {
  onSuccess?: (data: ListPricingTiersResponse) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Query Keys
// ============================================================================

export const pricingQueryKeys = {
  all: ["pricing"] as const,
  tiers: ["pricing", "tiers"] as const,
  tier: (tierId: string) => ["pricing", "tiers", tierId] as const,
  preview: ["pricing", "preview"] as const,
  roles: ["roles"] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * usePricingTiers - Get all pricing tiers for the authenticated user's server
 *
 * Returns tier list with features and subscriber counts
 */
export function usePricingTiers(options?: UsePricingTiersOptions) {
  return useQuery({
    queryKey: pricingQueryKeys.tiers,
    queryFn: async (): Promise<PricingTierWithFeatures[]> => {
      const res = await fetch(`${API_BASE}/tiers`);

      if (!res.ok) {
        // 404 means no Discord server connected yet - return empty array
        if (res.status === 404) {
          return [];
        }
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch pricing tiers",
        }));
        throw new Error(error.message || "Failed to fetch pricing tiers");
      }

      const data: ListPricingTiersResponse = await res.json();
      return data.tiers;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}

/**
 * usePricingTier - Get a specific pricing tier by ID
 *
 * Returns tier with features and subscriber counts
 */
export function usePricingTier(
  tierId: string,
  options?: UsePricingTiersOptions,
) {
  return useQuery({
    queryKey: pricingQueryKeys.tier(tierId),
    queryFn: async (): Promise<PricingTierWithFeatures> => {
      const res = await fetch(`${API_BASE}/tiers/${tierId}`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch pricing tier",
        }));
        throw new Error(error.message || "Failed to fetch pricing tier");
      }

      return res.json();
    },
    enabled: !!tierId,
    retry: 1,
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}

/**
 * usePricingPreview - Preview how tiers appear to potential subscribers
 *
 * Returns server info, featured tier, and all active tiers
 */
export function usePricingPreview(options?: UsePricingTiersOptions) {
  return useQuery({
    queryKey: pricingQueryKeys.preview,
    queryFn: async (): Promise<PreviewPricingTiersResponse> => {
      const res = await fetch(`${API_BASE}/preview`);

      if (!res.ok) {
        // 404 means no Discord server connected yet - return empty preview
        if (res.status === 404) {
          return {
            serverName: "",
            currencySymbol: "$",
            tiers: [],
          };
        }
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch pricing preview",
        }));
        throw new Error(error.message || "Failed to fetch pricing preview");
      }

      return res.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}

/**
 * useCreateTier - Create a new pricing tier
 *
 * Validates tier limit, price range, name uniqueness, and role manageability
 */
export function useCreateTier(options?: UseCreateTierOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreatePricingTierRequest,
    ): Promise<PricingTierWithFeatures> => {
      const res = await fetch(`${API_BASE}/tiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to create pricing tier",
        }));
        throw new Error(error.message || "Failed to create pricing tier");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate tiers query to refetch
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.tiers });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * useUpdateTier - Update an existing pricing tier
 *
 * Uses optimistic locking via version field to detect concurrent edits
 */
export function useUpdateTier(options?: UseUpdateTierOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tierId,
      data,
    }: {
      tierId: string;
      data: UpdatePricingTierRequest;
    }): Promise<PricingTierWithFeatures> => {
      const res = await fetch(`${API_BASE}/tiers/${tierId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to update pricing tier",
        }));

        // Handle version conflict (409)
        if (res.status === 409) {
          const conflictError = new Error(
            "This tier was modified by another user. Please refresh and try again.",
          );
          (conflictError as any).code = error.error || "VERSION_CONFLICT";
          throw conflictError;
        }

        throw new Error(error.message || "Failed to update pricing tier");
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all pricing queries
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.tiers });
      queryClient.invalidateQueries({
        queryKey: pricingQueryKeys.tier(variables.tierId),
      });
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.preview });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * useDeleteTier - Delete a pricing tier
 *
 * Performs soft delete if tier has active subscribers
 * Performs hard delete if no subscribers exist
 */
export function useDeleteTier(options?: UseDeleteTierOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tierId,
      confirm = false,
    }: {
      tierId: string;
      confirm?: boolean;
    }): Promise<DeletePricingTierResponse> => {
      const res = await fetch(
        `${API_BASE}/tiers/${tierId}?confirm=${confirm}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to delete pricing tier",
        }));
        throw new Error(error.message || "Failed to delete pricing tier");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate all pricing queries
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.tiers });
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.preview });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * useReorderTiers - Update the display order of pricing tiers
 *
 * Accepts an array of tier IDs in the desired order
 */
export function useReorderTiers(options?: UseReorderTiersOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      tierIds: string[],
    ): Promise<ListPricingTiersResponse> => {
      const res = await fetch(`${API_BASE}/tiers/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tierIds }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to reorder pricing tiers",
        }));
        throw new Error(error.message || "Failed to reorder pricing tiers");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Update the cache directly with the new order
      queryClient.setQueryData(pricingQueryKeys.tiers, data.tiers);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * useDiscordRoles - Get cached Discord roles
 */
export function useDiscordRoles(options?: UsePricingTiersOptions) {
  return useQuery({
    queryKey: pricingQueryKeys.roles,
    queryFn: async (): Promise<DiscordRolesResponse> => {
      const res = await fetch(`${ROLES_API_BASE}`);

      if (!res.ok) {
        if (res.status === 404) {
          return { roles: [], lastSynced: null };
        }
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch roles",
        }));
        throw new Error(error.message || "Failed to fetch roles");
      }

      return res.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}

/**
 * useSyncRoles - Sync Discord roles from API
 */
export function useSyncRoles(options?: UsePricingTiersOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<DiscordRolesSyncResponse> => {
      const res = await fetch(`${ROLES_API_BASE}/sync`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to sync roles",
        }));
        throw new Error(error.message || "Failed to sync roles");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pricingQueryKeys.roles });
    },
    onError: options?.onError,
  });
}

/**
 * useTierCount - Get the count of active tiers
 *
 * Useful for enforcing the 5-tier limit in the UI
 */
export function useTierCount() {
  const { data: tiers, isLoading } = usePricingTiers();

  return {
    count: tiers?.length ?? 0,
    canAddMore: (tiers?.length ?? 0) < 5,
    maxTiers: 5,
    isLoading,
  };
}

/**
 * useFeaturedTier - Get the featured tier (if any)
 *
 * Returns the tier marked as featured, or null
 */
export function useFeaturedTier() {
  const { data: tiers, isLoading } = usePricingTiers();

  return {
    featuredTier: tiers?.find((t) => t.isFeatured) ?? null,
    isLoading,
  };
}
