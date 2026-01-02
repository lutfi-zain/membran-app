import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePricingTiers, useTierCount } from "../../../hooks/usePricingTiers";
import { TierList } from "../../../components/pricing/TierList";

// ============================================================================
// Onboarding Pricing Configuration Page
// ============================================================================

/**
 * Onboarding Pricing Configuration Page
 *
 * Step in the onboarding flow where server owners configure their
 * pricing tiers for premium memberships.
 *
 * Handles:
 * - Creating first pricing tier
 * - Prompt for tier creation if none exist
 * - Skip option with warning
 * - Progress indication
 */
export default function OnboardingPricingPage() {
  const navigate = useNavigate();
  const { data: tiers, isLoading, refetch } = usePricingTiers();
  const { count } = useTierCount();

  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Check if user has tiers
  const hasTiers = count > 0;

  // Handlers
  const handleContinue = () => {
    navigate({ to: "/dashboard" });
  };

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }

    // Proceed to dashboard without pricing tiers
    navigate({ to: "/dashboard" });
  };

  const handleCancelSkip = () => {
    setShowSkipWarning(false);
  };

  const handleTiersChange = () => {
    refetch();
  };

  // Auto-continue if already has tiers
  useEffect(() => {
    if (hasTiers && !isLoading) {
      // Could auto-advance or let user review
    }
  }, [hasTiers, isLoading]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Progress Header */}
        <nav aria-label="Progress" className="mb-8">
          <ol
            role="list"
            className="space-y-4 md:flex md:space-y-0 md:space-x-4"
          >
            {/* Step 1: Account Created - Complete */}
            <li className="md:flex-1">
              <div className="flex items-center px-4 py-3 border-2 border-green-500 rounded-lg bg-green-50">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-medium text-green-600 bg-green-200 rounded-full">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="ml-2 text-sm font-medium text-green-700 hidden sm:inline">
                  Account
                </span>
              </div>
            </li>

            {/* Step 2: Connect Bot - Complete */}
            <li className="md:flex-1">
              <div className="flex items-center px-4 py-3 border-2 border-green-500 rounded-lg bg-green-50">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-medium text-green-600 bg-green-200 rounded-full">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="ml-2 text-sm font-medium text-green-700 hidden sm:inline">
                  Bot
                </span>
              </div>
            </li>

            {/* Step 3: Configure Pricing - Current */}
            <li className="md:flex-1">
              <div
                className={`flex items-center px-4 py-3 border-2 rounded-lg ${
                  hasTiers
                    ? "border-green-500 bg-green-50"
                    : "border-indigo-500 bg-indigo-50"
                }`}
                aria-current="step"
              >
                {hasTiers ? (
                  <span className="flex items-center justify-center w-8 h-8 text-sm font-medium text-green-600 bg-green-200 rounded-full">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-8 h-8 text-sm font-medium text-indigo-600 bg-indigo-200 rounded-full">
                    3
                  </span>
                )}
                <span className="ml-2 text-sm font-medium hidden sm:inline">
                  Pricing
                </span>
              </div>
            </li>

            {/* Step 4: Complete - Pending */}
            <li className="md:flex-1">
              <div className="flex items-center px-4 py-3 border-2 border-gray-300 rounded-lg">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-500 bg-gray-200 rounded-full">
                  4
                </span>
                <span className="ml-2 text-sm font-medium text-gray-500 hidden sm:inline">
                  Complete
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Main Content Card */}
        <main className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">
              Configure Your Pricing Tiers
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Create pricing tiers that members can purchase to access premium
              features in your server.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <svg
                  className="animate-spin h-12 w-12 text-indigo-600 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            )}

            {/* Has Tiers - Show success and continue */}
            {!isLoading && hasTiers && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  {/* Success Icon */}
                  <div className="mx-auto h-20 w-20 text-green-500 mb-6">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Great! You've configured {count} pricing tier
                    {count > 1 ? "s" : ""}.
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Your server is ready to accept subscriptions. You can add more
                    tiers or modify existing ones anytime in Settings.
                  </p>

                  {/* Tier Preview */}
                  <div className="max-w-3xl mx-auto">
                    <TierList onChange={handleTiersChange} disabled />
                  </div>

                  {/* Continue Button */}
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="
                        inline-flex items-center px-6 py-3
                        border border-transparent text-base font-medium rounded-md
                        text-white bg-indigo-600 hover:bg-indigo-700
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                      "
                    >
                      Complete Setup
                      <svg
                        className="ml-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* No Tiers - Show creation prompt */}
            {!isLoading && !hasTiers && (
              <div className="space-y-8">
                {/* Why Section */}
                <section aria-labelledby="why-pricing-heading">
                  <h2
                    id="why-pricing-heading"
                    className="text-lg font-medium text-gray-900 mb-4"
                  >
                    Why configure pricing tiers?
                  </h2>
                  <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="bg-gray-50 px-4 py-5 rounded-lg">
                      <dt>
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                          <svg
                            className="h-6 w-6"
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
                      </dt>
                      <dd className="mt-4 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          Monetize Your Community
                        </span>
                        <p className="mt-1">
                          Earn recurring revenue from your most engaged members.
                        </p>
                      </dd>
                    </div>

                    <div className="bg-gray-50 px-4 py-5 rounded-lg">
                      <dt>
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                      </dt>
                      <dd className="mt-4 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          Exclusive Access
                        </span>
                        <p className="mt-1">
                          Offer premium roles and features to paying subscribers.
                        </p>
                      </dd>
                    </div>

                    <div className="bg-gray-50 px-4 py-5 rounded-lg">
                      <dt>
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                      </dt>
                      <dd className="mt-4 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          Flexible Options
                        </span>
                        <p className="mt-1">
                          Create up to 5 tiers with different prices and benefits.
                        </p>
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Empty Tier List with Create Button */}
                <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No pricing tiers yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first pricing tier.
                  </p>
                  <div className="mt-6">
                    <TierList
                      onChange={handleTiersChange}
                      disabled={false}
                      emptyMessage="Configure your premium membership options"
                      emptyActionText="Create First Tier"
                    />
                  </div>
                </div>

                {/* Skip Option */}
                {!showSkipWarning ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="
                        inline-flex items-center px-4 py-2
                        border border-gray-300 rounded-md
                        text-sm font-medium text-gray-700 bg-white
                        hover:bg-gray-50
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                      "
                    >
                      Skip for now
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      You can configure pricing tiers later in Settings
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-amber-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">
                          Skip pricing configuration?
                        </h3>
                        <div className="mt-2 text-sm text-amber-700">
                          <p className="mb-3">
                            Without pricing tiers, your server won't be able to accept
                            subscriptions. You can configure them later in Settings.
                          </p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={handleSkip}
                              className="
                                inline-flex items-center px-3 py-1.5
                                border border-transparent rounded-md
                                text-xs font-medium text-amber-800 bg-amber-100
                                hover:bg-amber-200
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500
                              "
                            >
                              Yes, skip
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelSkip}
                              className="
                                inline-flex items-center px-3 py-1.5
                                border border-amber-300 rounded-md
                                text-xs font-medium text-amber-700 bg-white
                                hover:bg-amber-50
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500
                              "
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Help Link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Need help?{" "}
          <a
            href="https://docs.membran.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            View our pricing guide
          </a>
        </p>
      </div>
    </div>
  );
}
