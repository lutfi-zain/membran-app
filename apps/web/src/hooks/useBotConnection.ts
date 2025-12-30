import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  BotInviteResponse,
  BotStatusResponse,
  ValidatePermissionsResponse,
} from "@membran/shared";

const API_BASE = "/api/bot";

// ============================================================================
// Types
// ============================================================================

export interface UseBotConnectionOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface UseBotInviteMutationOptions {
  onSuccess?: (data: BotInviteResponse) => void;
}

// ============================================================================
// Query Keys
// ============================================================================

export const botQueryKeys = {
  status: ["bot", "status"] as const,
  invite: ["bot", "invite"] as const,
  permissions: ["bot", "permissions"] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * useBotStatus - Get current bot connection status
 *
 * Returns the connected Discord server info if any
 */
export function useBotStatus() {
  return useQuery({
    queryKey: botQueryKeys.status,
    queryFn: async (): Promise<BotStatusResponse> => {
      const res = await fetch(`${API_BASE}/status`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to fetch bot status",
        }));
        throw new Error(error.message || "Failed to fetch bot status");
      }

      return res.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * useBotInvite - Initiate bot OAuth flow
 *
 * Returns the authorization URL for the user to click
 */
export function useBotInvite(options?: UseBotInviteMutationOptions) {
  return useMutation({
    mutationKey: botQueryKeys.invite,
    mutationFn: async (): Promise<BotInviteResponse> => {
      const res = await fetch(`${API_BASE}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to initiate bot invite",
        }));
        throw new Error(error.message || "Failed to initiate bot invite");
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to Discord authorization URL
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
      options?.onSuccess?.(data);
    },
  });
}

/**
 * useBotReconnect - Reconnect bot after disconnection
 *
 * Initiates a new OAuth flow for existing disconnected server
 */
export function useBotReconnect() {
  return useMutation({
    mutationKey: ["bot", "reconnect"],
    mutationFn: async (): Promise<BotInviteResponse> => {
      const res = await fetch(`${API_BASE}/reconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to initiate reconnect",
        }));
        throw new Error(error.message || "Failed to initiate reconnect");
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
  });
}

/**
 * useValidatePermissions - Check if bot has required permissions
 *
 * Validates bot permissions in the connected Discord server
 */
export function useValidatePermissions() {
  return useMutation({
    mutationKey: botQueryKeys.permissions,
    mutationFn: async (): Promise<ValidatePermissionsResponse> => {
      const res = await fetch(`${API_BASE}/validate-permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to validate permissions",
        }));
        throw new Error(error.message || "Failed to validate permissions");
      }

      return res.json();
    },
  });
}

/**
 * useBotDisconnect - Disconnect bot from server
 *
 * Admin action to manually disconnect the bot
 */
export function useBotDisconnect() {
  return useMutation({
    mutationKey: ["bot", "disconnect"],
    mutationFn: async (
      confirm: boolean,
    ): Promise<{ disconnected: boolean; message: string }> => {
      const res = await fetch(`${API_BASE}/disconnect`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: "Failed to disconnect bot",
        }));
        throw new Error(error.message || "Failed to disconnect bot");
      }

      return res.json();
    },
  });
}
