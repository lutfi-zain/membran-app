import { useValidatePermissions } from "../../hooks/useBotConnection";

// ============================================================================
// PermissionWarning Component
// ============================================================================

/**
 * PermissionWarning - Display warning when bot has insufficient permissions
 *
 * WCAG 2.1 AA Compliance:
 * - role="alert" for important warnings
 * - aria-live for dynamic updates
 * - High contrast colors (4.5:1+)
 * - Keyboard dismissible
 */
interface PermissionWarningProps {
  /**
   * Missing permission names to display
   */
  missingPermissions?: string[];

  /**
   * Additional warnings to display
   */
  warnings?: string[];

  /**
   * Whether to show the warning
   */
  show?: boolean;

  /**
   * Callback when dismissed
   */
  onDismiss?: () => void;
}

export function PermissionWarning({
  missingPermissions = [],
  warnings = [],
  show = true,
  onDismiss,
}: PermissionWarningProps) {
  // Auto-validate permissions if no props provided
  const { data: validationData, isLoading } = useValidatePermissions();

  const hasMissingPermissions =
    missingPermissions.length > 0 ||
    !validationData?.permissions.hasAllRequired;

  const displayWarnings =
    warnings.length > 0
      ? warnings
      : validationData?.permissions.missing.map((p) => `Missing: ${p}`) ?? [];

  if (!show || !hasMissingPermissions) {
    return null;
  }

  const handleDismiss = () => {
    onDismiss?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="rounded-md bg-yellow-50 p-4 border border-yellow-200"
      onKeyDown={handleKeyDown}
    >
      <div className="flex">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Bot Missing Required Permissions
          </h3>

          {isLoading ? (
            <p className="mt-2 text-sm text-yellow-700">
              Checking permissions...
            </p>
          ) : (
            <>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  The bot requires additional permissions to function properly.
                  Please re-invite the bot with the correct permissions.
                </p>

                {displayWarnings.length > 0 && (
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {displayWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action hint */}
              <p className="mt-3 text-xs text-yellow-600">
                Tip: Go to your Discord server settings, remove the bot, and
                invite it again with all required permissions.
              </p>
            </>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
                aria-label="Dismiss warning"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PermissionWarning.Inline - Compact inline variant
 */
PermissionWarning.Inline = function PermissionWarningInline(
  props: PermissionWarningProps,
) {
  const { missingPermissions = [], warnings = [], show = true } = props;
  const { data: validationData } = useValidatePermissions();

  const hasMissingPermissions =
    missingPermissions.length > 0 ||
    !validationData?.permissions.hasAllRequired;

  if (!show || !hasMissingPermissions) {
    return null;
  }

  return (
    <span
      role="alert"
      className="inline-flex items-center text-xs text-yellow-700"
    >
      <svg
        className="mr-1 h-4 w-4 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      Missing permissions
    </span>
  );
};

export default PermissionWarning;
