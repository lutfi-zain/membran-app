import { useState } from "react";
import { TierList } from "../../components/pricing/TierList";
import { usePricingTiers, useTierCount, useDiscordRoles, useSyncRoles } from "../../hooks/usePricingTiers";
import { formatCents } from "../../lib/currency";

// ============================================================================
// Settings Pricing Page
// ============================================================================

/**
 * Settings Pricing Page
 *
 * Displays pricing tier configuration interface with:
 * - List of all pricing tiers
 * - Sync roles button
 * - Preview button
 * - Usage stats (tier count, subscriber counts)
 *
 * Part of User Story 1-3: Pricing Tier Configuration
 */
export default function SettingsPricingPage() {
  const { data: tiers, isLoading: isLoadingTiers } = usePricingTiers();
  const { count, canAddMore, maxTiers } = useTierCount();
  const { data: rolesData, isLoading: isLoadingRoles } = useDiscordRoles();
  const syncRoles = useSyncRoles();

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // Calculate stats
  const totalSubscribers = tiers?.reduce((sum, tier) => sum + (tier.activeSubscriberCount || 0), 0) ?? 0;
  const featuredTier = tiers?.find((t) => t.isFeatured);
  const averagePrice = tiers && tiers.length > 0
    ? tiers.reduce((sum, tier) => sum + tier.priceCents, 0) / tiers.length
    : 0;

  // Handlers
  const handleSyncRoles = () => {
    syncRoles.mutate(undefined, {
      onSuccess: () => {
        // Optional: show success toast
      },
    });
  };

  const handleTierChange = () => {
    // Refetch data when tiers change
    // The hooks will auto-refetch via invalidation
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Pricing Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure pricing tiers for your Discord server memberships
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
            {/* Sync Roles Button */}
            <button
              type="button"
              onClick={handleSyncRoles}
              disabled={syncRoles.isPending || isLoadingRoles}
              className="
                inline-flex items-center px-4 py-2
                rounded-lg text-sm font-medium
                bg-white border border-gray-300 text-gray-700
                hover:bg-gray-50
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <svg
                className={syncRoles.isPending ? "animate-spin -ml-1 mr-2 h-4 w-4" : "w-4 h-4 mr-2"}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {syncRoles.isPending ? (
                  <>
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
                  </>
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                )}
              </svg>
              {syncRoles.isPending ? "Syncing..." : "Sync Roles"}
            </button>

            {/* Preview Button */}
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!tiers || tiers.length === 0}
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Preview
            </button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Tier Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Tiers</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {count}
                  <span className="text-lg font-normal text-gray-500">/{maxTiers}</span>
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Subscribers */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Subscribers</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {totalSubscribers}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Price */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Price</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {formatCents(Math.round(averagePrice))}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
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
            </div>
          </div>

          {/* Featured Tier */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Featured Tier</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 truncate">
                  {featuredTier?.name || "None set"}
                </p>
                {featuredTier && (
                  <p className="text-sm text-gray-500">
                    {formatCents(featuredTier.priceCents)}/{featuredTier.duration === "monthly" ? "mo" : featuredTier.duration === "yearly" ? "yr" : "lifetime"}
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Roles Sync Status */}
          {rolesData && (
            <section aria-labelledby="roles-status-heading" className="bg-white shadow rounded-lg p-6">
              <h2 id="roles-status-heading" className="text-lg font-medium text-gray-900 mb-4">
                Discord Roles
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{rolesData.roles.length}</span> roles synced from Discord
                  </p>
                  {rolesData.lastSynced && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last synced: {new Date(rolesData.lastSynced).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${syncRoles.isPending ? "bg-yellow-400" : "bg-green-400"}`} />
                  <span className="text-sm text-gray-600">
                    {syncRoles.isPending ? "Syncing..." : "Synced"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Tier List */}
          <section aria-labelledby="tiers-heading">
            <h2 id="tiers-heading" className="sr-only">
              Pricing Tiers
            </h2>
            <TierList
              onChange={handleTierChange}
              showReorder
              showAddButton
              emptyMessage="No pricing tiers configured yet"
              emptyActionText="Create your first tier"
            />
          </section>

          {/* Help Section */}
          <section
            aria-labelledby="help-heading"
            className="bg-white shadow rounded-lg p-6"
          >
            <h2
              id="help-heading"
              className="text-lg font-medium text-gray-900 mb-4"
            >
              Setting Up Pricing Tiers
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  1. Create Tiers
                </h3>
                <p className="text-sm text-gray-600">
                  Define up to 5 pricing tiers with different prices and benefits. Each tier must be linked to a Discord role.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  2. Add Features
                </h3>
                <p className="text-sm text-gray-600">
                  Add up to 20 features per tier to describe what members get (e.g., "Access to VIP channels", "Custom role color").
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  3. Set Featured Tier
                </h3>
                <p className="text-sm text-gray-600">
                  Mark one tier as "Featured" to highlight it on the public pricing page. This is typically your recommended option.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  4. Reorder Tiers
                </h3>
                <p className="text-sm text-gray-600">
                  Drag and drop tiers to change their display order on the public pricing page.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowPreview(false)}
              aria-hidden="true"
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900 mb-4"
                      id="modal-title"
                    >
                      Pricing Page Preview
                    </h3>

                    {/* Preview content */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      {tiers && tiers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {tiers.map((tier) => (
                            <div
                              key={tier.id}
                              className={`
                                relative rounded-lg border bg-white p-6
                                ${tier.isFeatured ? "border-indigo-300 ring-2 ring-indigo-100 scale-105" : "border-gray-200"}
                              `}
                            >
                              {tier.isFeatured && (
                                <div className="absolute -top-2 -right-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                    Featured
                                  </span>
                                </div>
                              )}

                              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                {tier.name}
                              </h4>
                              <p className="text-2xl font-bold text-indigo-600 mb-1">
                                {formatCents(tier.priceCents)}
                              </p>
                              <p className="text-sm text-gray-500 mb-4">
                                /{tier.duration === "monthly" ? "month" : tier.duration === "yearly" ? "year" : "lifetime"}
                              </p>

                              {tier.features.length > 0 && (
                                <ul className="space-y-2">
                                  {tier.features.map((feature) => (
                                    <li key={feature.id} className="flex items-start text-sm">
                                      <svg
                                        className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-gray-600">{feature.description}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          No tiers to preview. Create a tier first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
