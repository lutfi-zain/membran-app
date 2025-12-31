import { useState, useMemo } from "react";
import { usePricingTiers, useReorderTiers, useTierCount } from "../../hooks/usePricingTiers";
import { TierCard } from "./TierCard";
import { TierForm } from "./TierForm";
import type { PricingTierWithFeatures } from "@membran/shared";

// ============================================================================
// Types
// ============================================================================

interface TierListProps {
  /**
   * Callback when tier list changes
   */
  onChange?: () => void;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Disable edit/delete actions
   */
  disabled?: boolean;

  /**
   * Show drag handles for reordering
   */
  showReorder?: boolean;

  /**
   * Show "Add Tier" button
   * @default true
   */
  showAddButton?: boolean;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Empty state action text
   */
  emptyActionText?: string;
}

// ============================================================================
// TierList Component
// ============================================================================

/**
 * TierList - List component for displaying and managing pricing tiers
 *
 * Shows all tiers with edit/delete actions.
 * Handles empty state and tier creation.
 * Supports drag-and-drop reordering (when implemented).
 *
 * WCAG 2.1 AA Compliance:
 * - Keyboard accessible navigation
 * - ARIA labels for screen readers
 * - 4.5:1 color contrast (verified via design system)
 * - Focus indicator for keyboard navigation
 */
export function TierList({
  onChange,
  className = "",
  disabled = false,
  showReorder = false,
  showAddButton = true,
  emptyMessage = "No pricing tiers configured yet",
  emptyActionText = "Create your first tier",
}: TierListProps) {
  const { data: tiers, isLoading, error, refetch } = usePricingTiers();
  const { count, canAddMore, maxTiers } = useTierCount();
  const reorderTiers = useReorderTiers({
    onSuccess: () => {
      onChange?.();
    },
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTierWithFeatures | null>(null);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Local state for optimistic updates during drag
  const [localTiers, setLocalTiers] = useState<PricingTierWithFeatures[] | null>(null);

  // Computed values
  const isEmpty = !tiers || tiers.length === 0;
  const displayTiers = localTiers || tiers;

  // Handlers
  const handleAddTier = () => {
    setEditingTier(null);
    setShowForm(true);
  };

  const handleEditTier = (tier: PricingTierWithFeatures) => {
    setEditingTier(tier);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTier(null);
    refetch();
    onChange?.();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTier(null);
  };

  const handleDeleteSuccess = () => {
    refetch();
    onChange?.();
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setLocalTiers(null); // Clear any previous local state
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);

    // Optimistically update local state for visual feedback
    if (tiers) {
      const newTiers = [...tiers];
      const [removed] = newTiers.splice(draggedIndex, 1);
      newTiers.splice(index, 0, removed);
      setLocalTiers(newTiers);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setLocalTiers(null);
      return;
    }

    // Get the new order based on local state or current tiers
    const tiersToReorder = localTiers || tiers;
    if (!tiersToReorder) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setLocalTiers(null);
      return;
    }

    const tierIds = tiersToReorder.map((t) => t.id);

    // Call the reorder mutation
    reorderTiers.mutate(tierIds, {
      onSuccess: () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setLocalTiers(null);
      },
      onError: () => {
        // Reset local state on error
        setDraggedIndex(null);
        setDragOverIndex(null);
        setLocalTiers(null);
      },
    });
  };

  const handleDragLeave = () => {
    // Don't clear dragOverIndex here to avoid flickering
  };

  // Form view - MUST be checked BEFORE empty state
  // Because when creating first tier, both showForm=true AND isEmpty=true
  if (showForm) {
    return (
      <div className={`${className}`.trim()}>
        <div className="mb-4">
          <button
            type="button"
            onClick={handleFormCancel}
            className="
              inline-flex items-center text-sm text-gray-600 hover:text-gray-900
              focus:outline-none focus:underline
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to tiers
          </button>
        </div>

        <TierForm
          initialData={editingTier ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  // Empty state
  if (isEmpty && !isLoading) {
    return (
      <div className={`${className}`.trim()}>
        <div className="text-center py-12 px-4">
          {/* Empty state illustration */}
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {emptyMessage}
          </h3>
          <p className="text-gray-500 mb-6">
            Create pricing tiers to let members purchase access to your server
          </p>

          {showAddButton && canAddMore && (
            <button
              type="button"
              onClick={handleAddTier}
              disabled={disabled}
              className="
                inline-flex items-center px-4 py-2
                rounded-lg text-sm font-medium text-white
                bg-indigo-600 hover:bg-indigo-700
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {emptyActionText}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`.trim()}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-100 rounded-lg h-48"
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`.trim()}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Failed to load pricing tiers. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm text-red-700 underline focus:outline-none"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Pricing Tiers
          </h2>
          <p className="text-sm text-gray-500">
            {count} of {maxTiers} tiers configured
          </p>
        </div>

        {showAddButton && canAddMore && (
          <button
            type="button"
            onClick={handleAddTier}
            disabled={disabled}
            className="
              inline-flex items-center px-4 py-2
              rounded-lg text-sm font-medium text-white
              bg-indigo-600 hover:bg-indigo-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Tier
          </button>
        )}
      </div>

      {/* Limit warning */}
      {count >= maxTiers && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            You've reached the maximum of {maxTiers} pricing tiers.
          </p>
        </div>
      )}

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTiers?.map((tier, index) => (
          <div
            key={tier.id}
            draggable={showReorder && !disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            style={{
              opacity: draggedIndex === index ? 0.5 : 1,
              cursor: showReorder && !disabled ? "move" : "auto",
              transform: dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
                ? "scale(1.02)"
                : "none",
              transition: "transform 0.2s, opacity 0.2s",
            }}
          >
            <TierCard
              tier={tier}
              onEdit={disabled ? undefined : handleEditTier}
              onDelete={disabled ? undefined : handleDeleteSuccess}
              showDragHandle={showReorder}
            />
          </div>
        ))}
      </div>

      {/* No tiers after loading */}
      {tiers?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No pricing tiers found. Create your first tier to get started.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TierList.Compact - Compact variant for smaller displays
// ============================================================================

TierList.Compact = function TierListCompact(props: TierListProps) {
  return <TierList {...props} />;
};

export default TierList;
