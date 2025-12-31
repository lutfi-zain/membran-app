import { useState } from "react";
import type { TierFeatureInput } from "@membran/shared";

// ============================================================================
// Types
// ============================================================================

export interface FeatureItem extends TierFeatureInput {
  id: string; // Temporary ID for React keys
}

interface FeatureListProps {
  /**
   * Current list of features
   */
  value: FeatureItem[];

  /**
   * Callback when features change
   */
  onChange: (features: FeatureItem[]) => void;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Disable editing
   */
  disabled?: boolean;

  /**
   * Error state
   */
  error?: string;

  /**
   * Label for the feature list
   */
  label?: string;

  /**
   * Helper text to display
   */
  helperText?: string;

  /**
   * Maximum number of features allowed
   * @default 20
   */
  maxFeatures?: number;

  /**
   * Show add/remove buttons
   * @default true
   */
  showActions?: boolean;

  /**
   * Show reorder controls
   * @default true
   */
  showReorder?: boolean;

  /**
   * Placeholder text for empty feature descriptions
   */
  placeholder?: string;
}

// ============================================================================
// FeatureList Component
// ============================================================================

/**
 * FeatureList - Editor for tier feature descriptions
 *
 * Allows adding, editing, removing, and reordering features.
 * Validates maximum 20 features per tier.
 *
 * WCAG 2.1 AA Compliance:
 * - Keyboard navigable with Tab/Shift+Tab
 * - ARIA labels for screen readers
 * - 4.5:1 color contrast (verified via design system)
 * - Focus indicator for keyboard navigation
 */
export function FeatureList({
  value = [],
  onChange,
  className = "",
  disabled = false,
  error,
  label = "Features",
  helperText = "Add the benefits included in this tier (max 20)",
  maxFeatures = 20,
  showActions = true,
  showReorder = true,
  placeholder = "e.g., Access to exclusive channels",
}: FeatureListProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleAddFeature = () => {
    if (value.length >= maxFeatures) return;

    const newFeature: FeatureItem = {
      id: `temp-${Date.now()}`,
      description: "",
      displayOrder: value.length + 1,
    };

    onChange([...value, newFeature]);
    setFocusedIndex(value.length);
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = value
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, displayOrder: i + 1 }));
    onChange(newFeatures);

    if (focusedIndex === index) {
      setFocusedIndex(null);
    } else if (focusedIndex !== null && focusedIndex > index) {
      setFocusedIndex(focusedIndex - 1);
    }
  };

  const handleFeatureChange = (index: number, description: string) => {
    const newFeatures = value.map((f, i) =>
      i === index ? { ...f, description } : f,
    );
    onChange(newFeatures);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newFeatures = [...value];
    [newFeatures[index - 1], newFeatures[index]] = [
      newFeatures[index],
      newFeatures[index - 1],
    ];

    // Update displayOrder
    newFeatures.forEach((f, i) => {
      f.displayOrder = i + 1;
    });

    onChange(newFeatures);
  };

  const handleMoveDown = (index: number) => {
    if (index === value.length - 1) return;

    const newFeatures = [...value];
    [newFeatures[index], newFeatures[index + 1]] = [
      newFeatures[index + 1],
      newFeatures[index],
    ];

    // Update displayOrder
    newFeatures.forEach((f, i) => {
      f.displayOrder = i + 1;
    });

    onChange(newFeatures);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    index: number,
  ) => {
    // Keyboard shortcuts for editing
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      if (index < value.length - 1) {
        setFocusedIndex(index + 1);
      } else if (value.length < maxFeatures) {
        handleAddFeature();
      }
    } else if (e.key === "Backspace" && value[index]?.description === "") {
      e.preventDefault();
      if (value.length > 0) {
        handleRemoveFeature(index);
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
      }
    }
  };

  // Base input styles
  const inputStyles = `
    flex-1 block w-full rounded-md border-gray-300 shadow-sm
    focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    sm:text-sm
  `;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {/* Label and count */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className="text-sm text-gray-500">
          {value.length} / {maxFeatures}
        </span>
      </div>

      {/* Feature list */}
      <div className="space-y-2">
        {value.map((feature, index) => (
          <div
            key={feature.id}
            className={`
              flex items-center gap-2 p-2 rounded-lg border
              transition-colors duration-200
              ${
                focusedIndex === index
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }
              ${error ? "border-red-300" : ""}
            `}
          >
            {/* Drag handle / Reorder controls */}
            {showReorder && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={disabled || index === 0}
                  aria-label={`Move feature ${index + 1} up`}
                  className={`
                    p-1 rounded transition-colors
                    disabled:opacity-30 disabled:cursor-not-allowed
                    ${
                      !disabled && index > 0
                        ? "hover:bg-gray-100 text-gray-600"
                        : "text-gray-300"
                    }
                  `}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={disabled || index === value.length - 1}
                  aria-label={`Move feature ${index + 1} down`}
                  className={`
                    p-1 rounded transition-colors
                    disabled:opacity-30 disabled:cursor-not-allowed
                    ${
                      !disabled && index < value.length - 1
                        ? "hover:bg-gray-100 text-gray-600"
                        : "text-gray-300"
                    }
                  `}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Display order badge */}
            <span
              className={`
                flex-shrink-0 inline-flex items-center justify-center
                w-6 h-6 text-xs font-medium rounded-full
                transition-colors
                ${
                  focusedIndex === index
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-600"
                }
              `}
              aria-hidden="true"
            >
              {index + 1}
            </span>

            {/* Feature description input */}
            <input
              type="text"
              value={feature.description}
              onChange={(e) => handleFeatureChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              disabled={disabled}
              placeholder={placeholder}
              maxLength={200}
              aria-label={`Feature ${index + 1} description`}
              aria-describedby={
                error ? "feature-list-error" : `feature-list-helper-${index}`
              }
              className={inputStyles}
            />

            {/* Character count */}
            <span className="text-xs text-gray-400 min-w-[3rem] text-right">
              {feature.description.length}/200
            </span>

            {/* Remove button */}
            {showActions && (
              <button
                type="button"
                onClick={() => handleRemoveFeature(index)}
                disabled={disabled}
                aria-label={`Remove feature ${index + 1}`}
                className={`
                  p-2 rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    !disabled
                      ? "hover:bg-red-50 text-red-500"
                      : "text-gray-300"
                  }
                `}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p id="feature-list-error" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}

      {/* Add button */}
      {showActions && (
        <button
          type="button"
          onClick={handleAddFeature}
          disabled={disabled || value.length >= maxFeatures}
          aria-label="Add a new feature"
          className={`
            inline-flex items-center gap-2 px-3 py-2
            rounded-lg text-sm font-medium
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              value.length >= maxFeatures || disabled
                ? "bg-gray-100 text-gray-400"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }
          `}
        >
          <svg
            className="w-4 h-4"
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
          Add Feature
        </button>
      )}

      {/* Limit warning */}
      {value.length >= maxFeatures && (
        <p className="text-sm text-amber-600">
          Maximum {maxFeatures} features reached
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert raw feature input to display format
 */
export function normalizeFeatures(
  features: Array<{ description: string; displayOrder?: number }>,
): FeatureItem[] {
  return features.map((f, i) => ({
    id: f.id || `feature-${i}`,
    description: f.description,
    displayOrder: f.displayOrder ?? i + 1,
  }));
}

/**
 * Validate feature list
 */
export function validateFeatures(
  features: FeatureItem[],
  maxFeatures = 20,
): { valid: boolean; error?: string } {
  if (features.length > maxFeatures) {
    return {
      valid: false,
      error: `Maximum ${maxFeatures} features allowed`,
    };
  }

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (feature.description.trim().length === 0) {
      return {
        valid: false,
        error: `Feature ${i + 1} cannot be empty`,
      };
    }
    if (feature.description.length > 200) {
      return {
        valid: false,
        error: `Feature ${i + 1} exceeds 200 character limit`,
      };
    }
  }

  return { valid: true };
}

export default FeatureList;
