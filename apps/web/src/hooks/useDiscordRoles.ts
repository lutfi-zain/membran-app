import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DiscordRole,
  DiscordRolesResponse,
  DiscordRolesSyncResponse,
} from "@membran/shared";

const API_BASE = "/api/roles";

// ============================================================================
// Types
// ============================================================================

export interface UseDiscordRolesOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export interface UseSyncRolesOptions {
  onSuccess?: (data: DiscordRolesSyncResponse) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Query Keys
// ============================================================================

export const rolesQueryKeys = {
  all: ["roles"] as const,
  list: ["roles", "list"] as const,
  sync: ["roles", "sync"] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * useDiscordRoles - Get cached Discord roles for the authenticated user's server
 *
 * Returns only roles that the bot can manage (botCanManage = true)
 */
export function useDiscordRoles(options?: UseDiscordRolesOptions) {
  return useQuery({
    queryKey: rolesQueryKeys.list,
    queryFn: async (): Promise<DiscordRole[]> => {
      const res = await fetch(`${API_BASE}/`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch Discord roles",
        }));
        throw new Error(error.message || "Failed to fetch Discord roles");
      }

      const data: DiscordRolesResponse = await res.json();
      return data.roles;
    },
    enabled: options?.enabled !== false,
    retry: 1,
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}

/**
 * useDiscordRolesWithLastSync - Get Discord roles with last sync time
 *
 * Returns roles along with the timestamp of the last sync
 */
export function useDiscordRolesWithLastSync(options?: UseDiscordRolesOptions) {
  return useQuery({
    queryKey: rolesQueryKeys.list,
    queryFn: async (): Promise<DiscordRolesResponse> => {
      const res = await fetch(`${API_BASE}/`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch Discord roles",
        }));
        throw new Error(error.message || "Failed to fetch Discord roles");
      }

      return res.json();
    },
    enabled: options?.enabled !== false,
    retry: 1,
    refetchOnWindowFocus: false,
    onError: options?.onError,
  });
}

/**
 * useSyncRoles - Sync roles from Discord API
 *
 * Fetches all roles from the Discord guild and updates the local cache
 * Sets botCanManage flags based on role hierarchy
 */
export function useSyncRoles(options?: UseSyncRolesOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<DiscordRolesSyncResponse> => {
      const res = await fetch(`${API_BASE}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to sync Discord roles",
        }));

        // Handle Discord API unavailable (503)
        if (res.status === 503) {
          const apiError = new Error(
            error.message || "Discord is currently unavailable. Using cached role data.",
          );
          (apiError as any).code = "DISCORD_API_UNAVAILABLE";
          (apiError as any).warnings = error.warnings || [];
          throw apiError;
        }

        throw new Error(error.message || "Failed to sync Discord roles");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate roles query to refetch
      queryClient.invalidateQueries({ queryKey: rolesQueryKeys.list });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * useManageableRoles - Get manageable Discord roles
 *
 * Alias for useDiscordRoles for clearer intent in code
 */
export function useManageableRoles(options?: UseDiscordRolesOptions) {
  return useDiscordRoles(options);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * useRoleById - Get a specific role by Discord snowflake ID
 *
 * Useful for pre-selecting a role in a dropdown
 */
export function useRoleById(roleId: string | undefined) {
  const { data: roles, isLoading } = useDiscordRoles({
    enabled: !!roleId,
  });

  return {
    role: roles?.find((r) => r.discordRoleId === roleId) ?? null,
    isLoading,
  };
}

/**
 * useRoleCount - Get the count of manageable roles
 *
 * Useful for showing role availability status
 */
export function useRoleCount() {
  const { data: roles, isLoading } = useDiscordRoles();

  return {
    count: roles?.length ?? 0,
    hasRoles: (roles?.length ?? 0) > 0,
    isLoading,
  };
}

/**
 * useRoleGroupedByPosition - Get roles grouped by position
 *
 * Useful for displaying roles in a hierarchical order
 */
export function useRoleGroupedByPosition() {
  const { data: roles, isLoading } = useDiscordRoles();

  // Sort by position (highest first, excluding @everyone)
  const sortedRoles = roles
    ?.filter((r) => r.position > 0)
    .sort((a, b) => b.position - a.position) ?? [];

  return {
    roles: sortedRoles,
    isLoading,
  };
}
