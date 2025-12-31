import { useState } from "react";
import { useDeleteTier } from "../../hooks/usePricingTiers";
import type { PricingTierWithFeatures } from "@membran/shared";

// ============================================================================
// Types
// ============================================================================

interface TierCardProps {
  /**
   * The tier data to display
   */
  tier: PricingTierWithFeatures;

  /**
   * Callback when tier is edited
   */
  onEdit?: (tier: PricingTierWithFeatures) => void;

  /**
   * Callback when tier is deleted
   */
  onDelete?: () => void;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Disable edit/delete actions
   */
  disabled?: boolean;

  /**
   * Show drag handle for reordering
   */
  showDragHandle?: boolean;

  /**
   * Compact display mode (for lists)
   */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format cents as currency string
 */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format duration for display
 */
function formatDuration(duration: string): string {
  const durationMap: Record<string, string> = {
    monthly: "month",
    yearly: "year",
    lifetime: "lifetime",
  };
  return durationMap[duration] || duration;
}

/**
 * Get role color as hex string
 */
function getRoleColor(color: number | null): string {
  if (color === null) return "#99aab5"; // Default Discord gray
  return `#${color.toString(16).padStart(6, "0")}`;
}

// ============================================================================
// TierCard Component
// ============================================================================

/**
 * TierCard - Display component for a pricing tier
 *
 * Shows tier information with edit/delete actions.
 * Highlights featured tier and shows subscriber count.
 *
 * WCAG 2.1 AA Compliance:
 * - Keyboard accessible actions
 * - ARIA labels for screen readers
 * - 4.5:1 color contrast (verified via design system)
 * - Focus indicator for keyboard navigation
 */
export function TierCard({
  tier,
  onEdit,
  onDelete,
  className = "",
  disabled = false,
  showDragHandle = false,
  compact = false,
}: TierCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTier = useDeleteTier({
    onSuccess: onDelete,
  });

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    deleteTier.mutate({
      tierId: tier.id,
      confirm: true,
    });
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Card base styles
  const cardStyles = `
    relative group rounded-lg border bg-white
    transition-all duration-200
    ${tier.isFeatured ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200"}
    hover:shadow-md
    ${compact ? "p-4" : "p-6"}
  `;

  return (
    <div className={`${cardStyles} ${className}`.trim()}>
      {/* Drag handle */}
      {showDragHandle && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1"
          aria-label="Drag to reorder tier"
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      )}

      {/* Featured badge */}
      {tier.isFeatured && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </span>
        </div>
      )}

      {/* Content */}
      <div className={showDragHandle ? "ml-6" : ""}>
        {/* Header: Name and Price */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className={`font-semibold text-gray-900 ${compact ? "text-lg" : "text-xl"}`}>
              {tier.name}
            </h3>
            {tier.description && !compact && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {tier.description}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className={`font-bold text-indigo-600 ${compact ? "text-lg" : "text-2xl"}`}>
              {formatCents(tier.priceCents)}
            </div>
            <div className="text-xs text-gray-500">
              /{formatDuration(tier.duration)}
            </div>
          </div>
        </div>

        {/* Features list */}
        {tier.features.length > 0 && (
          <ul className={`space-y-2 mb-4 ${compact ? "text-sm" : ""}`}>
            {tier.features.map((feature) => (
              <li
                key={feature.id}
                className="flex items-start"
              >
                <svg
                  className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700">{feature.description}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer: Actions and metadata */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {/* Subscriber count */}
          <div className="text-sm text-gray-500">
            {tier.activeSubscriberCount === 0 ? (
              <span>No subscribers yet</span>
            ) : tier.activeSubscriberCount === 1 ? (
              <span>1 active subscriber</span>
            ) : (
              <span>{tier.activeSubscriberCount} active subscribers</span>
            )}
          </div>

          {/* Actions */}
          {!disabled && (onEdit || onDelete) && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(tier)}
                  disabled={deleteTier.isPending}
                  aria-label={`Edit ${tier.name}`}
                  className="
                    inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium
                    text-gray-700 bg-white border border-gray-300
                    hover:bg-gray-50
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteTier.isPending}
                  aria-label={`Delete ${tier.name}`}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium
                    border transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      showDeleteConfirm
                        ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100 focus:ring-red-500"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
                    }
                  `}
                >
                  {showDeleteConfirm ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                        />
                      </svg>
                      Confirm
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              )}

              {showDeleteConfirm && (
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={deleteTier.isPending}
                  className="
                    inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium
                    text-gray-700 bg-white border border-gray-300
                    hover:bg-gray-50
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                  "
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Warning for tiers with subscribers */}
        {tier.activeSubscriberCount > 0 && showDeleteConfirm && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              This tier has {tier.activeSubscriberCount} active subscriber
              {tier.activeSubscriberCount > 1 ? "s" : ""}. Deleting will hide it
              from new subscribers but existing subscribers will retain access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TierCard.Compact - Compact variant for lists
// ============================================================================

TierCard.Compact = function TierCardCompact(props: TierCardProps) {
  return <TierCard {...props} compact />;
};

export default TierCard;
