import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/pricing";

// ============================================================================
// Types
// ============================================================================

export interface PublicServerInfo {
  id: string;
  discordId: string;
  name: string;
  icon: string | null;
  memberCount: number;
}

export interface PublicPricingTier {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  duration: "monthly" | "yearly" | "lifetime";
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  features: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export interface PublicPricingResponse {
  server: PublicServerInfo;
  featuredTier: PublicPricingTier | null;
  tiers: PublicPricingTier[];
  currencySymbol: string;
}

export interface UsePublicPricingTiersOptions {
  onError?: (error: Error) => void;
}

// ============================================================================
// Query Keys
// ============================================================================

export const publicPricingQueryKeys = {
  all: ["public", "pricing"] as const,
  forServer: (serverId: string) => ["public", "pricing", "servers", serverId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * usePublicPricingTiers - Fetch pricing tiers for a specific server (no auth required)
 *
 * Used for the public pricing page where potential subscribers can view tiers
 * without being authenticated.
 */
export function usePublicPricingTiers(
  serverId: string,
  options?: UsePublicPricingTiersOptions
) {
  return useQuery({
    queryKey: publicPricingQueryKeys.forServer(serverId),
    queryFn: async (): Promise<PublicPricingResponse> => {
      const res = await fetch(`${API_BASE}/public/${serverId}`);

      if (!res.ok) {
        // 404 means server not found - return empty response
        if (res.status === 404) {
          return {
            server: {
              id: serverId,
              discordId: "",
              name: "",
              icon: null,
              memberCount: 0,
            },
            featuredTier: null,
            tiers: [],
            currencySymbol: "$",
          };
        }

        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch pricing tiers",
        }));
        throw new Error(error.message || "Failed to fetch pricing tiers");
      }

      return res.json();
    },
    enabled: !!serverId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}
