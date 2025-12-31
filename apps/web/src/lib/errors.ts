/**
 * Error Message Mappings for Pricing Tier Configuration
 *
 * Provides user-friendly error messages for pricing-related error codes.
 * Maps backend error codes to displayable messages.
 */

import { PRICING_ERROR_CODES } from "@membran/shared";

// ============================================================================
// Types
// ============================================================================

export interface ErrorMapping {
  title: string;
  message: string;
  action?: string;
  variant?: "error" | "warning" | "info";
}

// ============================================================================
// Error Mappings
// ============================================================================

/**
 * Map pricing error codes to user-friendly messages
 */
export const PRICING_ERROR_MESSAGES: Record<string, ErrorMapping> = {
  [PRICING_ERROR_CODES.TIER_LIMIT_EXCEEDED]: {
    title: "Maximum Tiers Reached",
    message: "You can only create up to 5 pricing tiers. Please delete or deactivate an existing tier before creating a new one.",
    action: "Manage your existing tiers",
    variant: "error",
  },

  [PRICING_ERROR_CODES.FEATURE_LIMIT_EXCEEDED]: {
    title: "Too Many Features",
    message: "Each tier can have up to 20 features. Please remove some features before adding more.",
    action: "Edit tier features",
    variant: "error",
  },

  [PRICING_ERROR_CODES.INVALID_PRICE_RANGE]: {
    title: "Invalid Price",
    message: "Price must be between $0 and $999. Please enter a valid price.",
    action: "Update price",
    variant: "error",
  },

  [PRICING_ERROR_CODES.DUPLICATE_TIER_NAME]: {
    title: "Tier Name Already Exists",
    message: "A tier with this name already exists. Please choose a different name.",
    action: "Choose a unique name",
    variant: "error",
  },

  [PRICING_ERROR_CODES.ROLE_CANNOT_BE_MANAGED]: {
    title: "Discord Role Cannot Be Managed",
    message: "The bot doesn't have permission to assign this role. Make sure the bot's role is higher in the role hierarchy than the role you want to assign.",
    action: "Check Discord role settings",
    variant: "error",
  },

  [PRICING_ERROR_CODES.TIER_HAS_ACTIVE_SUBSCRIBERS]: {
    title: "Tier Has Active Subscribers",
    message: "This tier has active subscribers. You must confirm deletion to hide this tier from new subscribers while preserving access for existing subscribers.",
    action: "Confirm deletion",
    variant: "warning",
  },

  [PRICING_ERROR_CODES.LAST_TIER_CANNOT_DELETE]: {
    title: "Cannot Delete Last Tier",
    message: "You must have at least one pricing tier. Please create a new tier before deleting this one.",
    action: "Create a new tier first",
    variant: "error",
  },

  [PRICING_ERROR_CODES.VERSION_CONFLICT]: {
    title: "Tier Was Modified",
    message: "This tier was modified by another user. Please refresh and try again to see the latest changes.",
    action: "Refresh to see latest changes",
    variant: "warning",
  },
};

// ============================================================================
// Generic Error Messages
// ============================================================================

const GENERIC_ERROR_MESSAGES: Record<string, ErrorMapping> = {
  VALIDATION_ERROR: {
    title: "Invalid Input",
    message: "Please check your input and try again.",
    variant: "error",
  },
  UNAUTHORIZED: {
    title: "Not Authorized",
    message: "You need to log in to perform this action.",
    action: "Log in",
    variant: "error",
  },
  NOT_FOUND: {
    title: "Not Found",
    message: "The requested resource was not found.",
    variant: "error",
  },
  INTERNAL_ERROR: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    action: "Try again",
    variant: "error",
  },
  UNKNOWN_ERROR: {
    title: "Unknown Error",
    message: "An unexpected error occurred. Please try again later.",
    variant: "error",
  },
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Get user-friendly error message for a pricing error code
 *
 * @param errorCode - The error code from the API
 * @returns Error mapping with title, message, and optional action
 *
 * @example
 * ```ts
 * const error = getPricingError('TIER_LIMIT_EXCEEDED');
 * console.log(error.title); // "Maximum Tiers Reached"
 * console.log(error.message); // "You can only create up to 5 pricing tiers..."
 * ```
 */
export function getPricingError(errorCode: string): ErrorMapping {
  return (
    PRICING_ERROR_MESSAGES[errorCode] ||
    GENERIC_ERROR_MESSAGES[errorCode] ||
    GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR
  );
}

/**
 * Format error for display in toast/alert
 *
 * @param errorCode - The error code from the API
 * @param fallbackMessage - Optional fallback message if code not found
 * @returns Formatted error string for display
 *
 * @example
 * ```ts
 * const message = formatPricingError('TIER_LIMIT_EXCEEDED');
 * // "Maximum Tiers Reached: You can only create up to 5 pricing tiers..."
 * ```
 */
export function formatPricingError(
  errorCode: string,
  fallbackMessage?: string,
): string {
  const error = getPricingError(errorCode);
  return `${error.title}: ${error.message}`;
}

/**
 * Check if an error is a recoverable/ retryable error
 *
 * Some errors like VERSION_CONFLICT can be recovered by refreshing
 * and retrying. Others like TIER_LIMIT_EXCEEDED require user action.
 *
 * @param errorCode - The error code from the API
 * @returns True if the error can be recovered by retrying
 */
export function isRecoverableError(errorCode: string): boolean {
  return errorCode === PRICING_ERROR_CODES.VERSION_CONFLICT ||
         errorCode === "INTERNAL_ERROR" ||
         errorCode === "UNKNOWN_ERROR";
}

/**
 * Check if an error requires user confirmation
 *
 * Some destructive actions require explicit user confirmation.
 *
 * @param errorCode - The error code from the API
 * @returns True if the error requires user confirmation
 */
export function requiresConfirmation(errorCode: string): boolean {
  return errorCode === PRICING_ERROR_CODES.TIER_HAS_ACTIVE_SUBSCRIBERS;
}

// ============================================================================
// Export Default
// ============================================================================

export default {
  PRICING_ERROR_MESSAGES,
  getPricingError,
  formatPricingError,
  isRecoverableError,
  requiresConfirmation,
};
