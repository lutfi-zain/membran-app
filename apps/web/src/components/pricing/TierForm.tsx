import { useState, useEffect } from "react";
import { useCreateTier, useUpdateTier } from "../../hooks/usePricingTiers";
import { RoleSelector } from "./RoleSelector";
import { FeatureList, FeatureItem, normalizeFeatures, validateFeatures } from "./FeatureList";
import type { CreatePricingTierRequest, UpdatePricingTierRequest, PricingTierWithFeatures, Duration } from "@membran/shared";

// ============================================================================
// Types
// ============================================================================

export interface TierFormData {
  name: string;
  description: string;
  priceCents: number;
  duration: Duration;
  discordRoleId: string;
  isFeatured: boolean;
  features: FeatureItem[];
}

interface TierFormProps {
  /**
   * Initial tier data for edit mode
   */
  initialData?: PricingTierWithFeatures;

  /**
   * Callback after successful submission
   */
  onSuccess?: (tier: PricingTierWithFeatures) => void;

  /**
   * Callback on cancel
   */
  onCancel?: () => void;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Submit button text
   */
  submitText?: string;

  /**
   * Show price in dollars (vs cents) in input
   * @default true
   */
  showDollars?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert cents to dollars for display
 */
function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents for storage
 */
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format cents as currency string
 */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ============================================================================
// TierForm Component
// ============================================================================

/**
 * TierForm - Form for creating/editing pricing tiers
 *
 * Handles tier creation and editing with validation.
 * Includes role selection, feature list, and price formatting.
 *
 * WCAG 2.1 AA Compliance:
 * - Form labels associated with inputs
 * - Error messages announced to screen readers
 * - 4.5:1 color contrast (verified via design system)
 * - Focus indicator for keyboard navigation
 */
export function TierForm({
  initialData,
  onSuccess,
  onCancel,
  className = "",
  submitText = initialData ? "Update Tier" : "Create Tier",
  showDollars = true,
}: TierFormProps) {
  const isEditMode = !!initialData;

  // Form state
  const [formData, setFormData] = useState<TierFormData>(() => {
    if (initialData) {
      return {
        name: initialData.name,
        description: initialData.description ?? "",
        priceCents: initialData.priceCents,
        duration: initialData.duration,
        discordRoleId: initialData.discordRoleId ?? "",
        isFeatured: initialData.isFeatured,
        features: normalizeFeatures(initialData.features),
      };
    }

    return {
      name: "",
      description: "",
      priceCents: 0,
      duration: "monthly" as Duration,
      discordRoleId: "",
      isFeatured: false,
      features: [],
    };
  });

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof TierFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TierFormData, boolean>>>({});

  // Mutations
  const createTier = useCreateTier({
    onSuccess,
    onError: (error) => {
      if ((error as any).code === "TIER_LIMIT_EXCEEDED") {
        setErrors((prev) => ({ ...prev, _form: error.message }));
      }
    },
  });

  const updateTier = useUpdateTier({
    onSuccess,
    onError: (error) => {
      if ((error as any).code === "VERSION_CONFLICT") {
        setErrors((prev) => ({ ...prev, _form: error.message }));
      }
    },
  });

  // Computed values
  const priceInDollars = centsToDollars(formData.priceCents);
  const pricePreview = formatCents(formData.priceCents);

  // Handlers
  const handleFieldChange = <K extends keyof TierFormData>(
    field: K,
    value: TierFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = <K extends keyof TierFormData>(
    field: K,
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = <K extends keyof TierFormData>(
    field: K,
    value: TierFormData[K],
  ) => {
    let error: string | undefined;

    switch (field) {
      case "name":
        if (!value || (value as string).trim().length === 0) {
          error = "Tier name is required";
        } else if ((value as string).length > 100) {
          error = "Tier name must be 100 characters or less";
        }
        break;
      case "priceCents":
        if (typeof value === "number" && (value < 0 || value > 99900)) {
          error = "Price must be between $0 and $999";
        }
        break;
      case "discordRoleId":
        if (!value || (value as string).trim().length === 0) {
          error = "Please select a Discord role";
        }
        break;
      case "features":
        const validation = validateFeatures(value as FeatureItem[]);
        if (!validation.valid) {
          error = validation.error;
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateForm = (): boolean => {
    const fields: (keyof TierFormData)[] = ["name", "priceCents", "discordRoleId", "features"];
    let isValid = true;

    for (const field of fields) {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      priceCents: true,
      duration: true,
      discordRoleId: true,
      features: true,
    });

    if (!validateForm()) {
      return;
    }

    if (isEditMode && initialData) {
      // Update mode
      const updateData: UpdatePricingTierRequest = {
        name: formData.name,
        description: formData.description || null,
        priceCents: formData.priceCents,
        duration: formData.duration,
        discordRoleId: formData.discordRoleId,
        isFeatured: formData.isFeatured,
        version: initialData.version,
      };

      updateTier.mutate({
        tierId: initialData.id,
        data: updateData,
      });
    } else {
      // Create mode
      const createData: CreatePricingTierRequest = {
        name: formData.name,
        description: formData.description || undefined,
        priceCents: formData.priceCents,
        duration: formData.duration,
        discordRoleId: formData.discordRoleId,
        isFeatured: formData.isFeatured,
        features: formData.features.map((f) => ({
          description: f.description,
          displayOrder: f.displayOrder,
        })),
      };

      createTier.mutate(createData);
    }
  };

  const isLoading = createTier.isPending || updateTier.isPending;

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`.trim()}>
      {/* Form-level error */}
      {errors._form && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errors._form}</p>
        </div>
      )}

      {/* Tier Name */}
      <div>
        <label htmlFor="tier-name" className="block text-sm font-medium text-gray-700">
          Tier Name <span className="text-red-500">*</span>
        </label>
        <input
          id="tier-name"
          type="text"
          value={formData.name}
          onChange={(e) => handleFieldChange("name", e.target.value)}
          onBlur={() => handleFieldBlur("name")}
          disabled={isLoading}
          maxLength={100}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "tier-name-error" : undefined}
          className={`
            mt-1 block w-full rounded-lg border px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300"}
          `}
          placeholder="e.g., Premium, Gold, VIP"
        />
        {errors.name && (
          <p id="tier-name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="tier-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="tier-description"
          value={formData.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          disabled={isLoading}
          maxLength={500}
          rows={3}
          aria-describedby="tier-description-helper"
          className={`
            mt-1 block w-full rounded-lg border px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
            border-gray-300
          `}
          placeholder="Optional description of this tier (max 500 characters)"
        />
        <p id="tier-description-helper" className="mt-1 text-sm text-gray-500">
          {formData.description.length}/500
        </p>
      </div>

      {/* Price and Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Price */}
        <div>
          <label htmlFor="tier-price" className="block text-sm font-medium text-gray-700">
            Price (USD) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            {showDollars ? (
              <input
                id="tier-price"
                type="number"
                value={priceInDollars}
                onChange={(e) => handleFieldChange("priceCents", dollarsToCents(parseFloat(e.target.value) || 0))}
                onBlur={() => handleFieldBlur("priceCents")}
                disabled={isLoading}
                min={0}
                max={999}
                step={0.01}
                required
                aria-invalid={!!errors.priceCents}
                aria-describedby={
                  errors.priceCents
                    ? "tier-price-error"
                    : "tier-price-preview"
                }
                className={`
                  block w-full rounded-lg border py-2 pl-7 pr-12 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    errors.priceCents
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300"
                  }
                `}
                placeholder="0.00"
              />
            ) : (
              <input
                id="tier-price"
                type="number"
                value={formData.priceCents}
                onChange={(e) => handleFieldChange("priceCents", parseInt(e.target.value) || 0)}
                onBlur={() => handleFieldBlur("priceCents")}
                disabled={isLoading}
                min={0}
                max={99900}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 sm:text-sm">USD</span>
            </div>
          </div>
          {errors.priceCents ? (
            <p id="tier-price-error" className="mt-1 text-sm text-red-600">
              {errors.priceCents}
            </p>
          ) : (
            <p id="tier-price-preview" className="mt-1 text-sm text-gray-500">
              Preview: {pricePreview}
            </p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="tier-duration" className="block text-sm font-medium text-gray-700">
            Billing Duration <span className="text-red-500">*</span>
          </label>
          <select
            id="tier-duration"
            value={formData.duration}
            onChange={(e) => handleFieldChange("duration", e.target.value as Duration)}
            disabled={isLoading}
            required
            className={`
              mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>
      </div>

      {/* Discord Role */}
      <RoleSelector
        value={formData.discordRoleId}
        onChange={(value) => handleFieldChange("discordRoleId", value)}
        onBlur={() => handleFieldBlur("discordRoleId")}
        error={errors.discordRoleId}
        required
        helperText="Members who purchase this tier will receive this role"
      />

      {/* Featured toggle */}
      <div className="flex items-center">
        <input
          id="tier-featured"
          type="checkbox"
          checked={formData.isFeatured}
          onChange={(e) => handleFieldChange("isFeatured", e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="tier-featured" className="ml-2 block text-sm text-gray-700">
          Featured tier <span className="text-gray-500">(highlighted on pricing page)</span>
        </label>
      </div>

      {/* Features */}
      <FeatureList
        value={formData.features}
        onChange={(features) => handleFieldChange("features", features)}
        onBlur={() => handleFieldBlur("features")}
        error={errors.features}
        label="Tier Features"
        helperText="Add the benefits included in this tier (max 20 features)"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="
              px-4 py-2 rounded-lg text-sm font-medium text-gray-700
              bg-white border border-gray-300
              hover:bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="
            inline-flex items-center justify-center
            px-6 py-2 rounded-lg text-sm font-medium text-white
            bg-indigo-600 hover:bg-indigo-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : (
            submitText
          )}
        </button>
      </div>
    </form>
  );
}

export default TierForm;
