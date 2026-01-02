import { useDiscordRoles, useSyncRoles } from "../../hooks/useDiscordRoles";
import type { DiscordRole } from "@membran/shared";

// ============================================================================
// Types
// ============================================================================

interface RoleSelectorProps {
  /**
   * Currently selected Discord role ID (snowflake)
   */
  value: string;

  /**
   * Callback when role selection changes
   */
  onChange: (roleId: string) => void;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Disable the selector
   */
  disabled?: boolean;

  /**
   * Show a "Sync Roles" button
   */
  showSyncButton?: boolean;

  /**
   * Error state
   */
  error?: string;

  /**
   * Required field indicator
   */
  required?: boolean;

  /**
   * Label for the selector
   */
  label?: string;

  /**
   * Placeholder text when no role is selected
   */
  placeholder?: string;

  /**
   * Helper text to display below the selector
   */
  helperText?: string;
}

// ============================================================================
// RoleSelector Component
// ============================================================================

/**
 * RoleSelector - Dropdown to select a Discord role
 *
 * Displays a dropdown of manageable Discord roles synced from the server.
 * Includes a sync button to refresh roles from Discord API.
 *
 * WCAG 2.1 AA Compliance:
 * - Keyboard navigable with arrow keys
 * - ARIA labels for screen readers
 * - 4.5:1 color contrast (verified via design system)
 * - Focus indicator for keyboard navigation
 */
export function RoleSelector({
  value,
  onChange,
  className = "",
  disabled = false,
  showSyncButton = true,
  error,
  required = false,
  label = "Discord Role",
  placeholder = "Select a role...",
  helperText,
}: RoleSelectorProps) {
  const { data: roles, isLoading: isLoadingRoles, refetch } = useDiscordRoles();
  const syncRoles = useSyncRoles({
    onSuccess: () => {
      refetch();
    },
  });

  const selectedRole = roles?.find((r) => r.id === value);

  const handleSync = () => {
    syncRoles.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard accessibility
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLSelectElement).click();
    }
  };

  // Base styles
  const baseStyles = `
    relative block w-full rounded-lg border
    px-3 py-2 text-sm
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  // Error styles
  const errorStyles = error
    ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300 text-gray-900";

  // Color indicator for role
  const getRoleColor = (color: number | null) => {
    if (color === null) return "#99aab5"; // Default Discord gray
    return `#${color.toString(16).padStart(6, "0")}`;
  };

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        {/* Role dropdown */}
        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoadingRoles || syncRoles.isPending}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${label}-error` : helperText ? `${label}-helper` : undefined
            }
            className={`${baseStyles} ${errorStyles}`.trim()}
          >
            <option value="">{placeholder}</option>
            {roles?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.roleName}
                {!role.botCanManage && " (Cannot manage)"}
              </option>
            ))}
          </select>

          {/* Selected role color indicator */}
          {selectedRole && (
            <div
              className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: getRoleColor(selectedRole.color) }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Sync button */}
        {showSyncButton && (
          <button
            type="button"
            onClick={handleSync}
            disabled={disabled || syncRoles.isPending}
            aria-label="Sync roles from Discord"
            aria-busy={syncRoles.isPending}
            className={`
              inline-flex items-center justify-center
              px-3 py-2 rounded-lg text-sm font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                syncRoles.isPending
                  ? "bg-gray-100 text-gray-400"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            <svg
              className={`w-4 h-4 ${syncRoles.isPending ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p id={`${label}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p id={`${label}-helper`} className="text-sm text-gray-500">
          {helperText}
        </p>
      )}

      {/* Warnings from sync */}
      {syncRoles.data?.warnings &&
        syncRoles.data.warnings.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              {syncRoles.data.warnings.map((w, i) => (
                <span key={i}>
                  {w}
                  <br />
                </span>
              ))}
            </p>
          </div>
        )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get role display name with position info
 */
export function getRoleDisplayName(role: DiscordRole): string {
  return role.roleName;
}

/**
 * Check if role can be managed
 */
export function isRoleManageable(role: DiscordRole): boolean {
  return role.botCanManage;
}

/**
 * Sort roles by position (highest first)
 */
export function sortRolesByPosition(roles: DiscordRole[]): DiscordRole[] {
  return [...roles].sort((a, b) => b.position - a.position);
}

export default RoleSelector;
