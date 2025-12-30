import { BotInviteButton } from "../../../components/bot/BotInviteButton";
import { useBotStatus } from "../../../hooks/useBotConnection";

// ============================================================================
// Onboarding Bot Invitation Page
// ============================================================================

/**
 * Onboarding Bot Invitation Page
 *
 * Step in the onboarding flow where server owners invite the membran.app bot
 * to their Discord server.
 *
 * Handles:
 * - Initial bot invitation
 * - OAuth callback display (connected/error states)
 * - Progress indication
 */
export default function OnboardingBotPage() {
  const { data, isLoading } = useBotStatus();

  // Check URL params for OAuth callback result
  const urlParams = new URLSearchParams(window.location.search);
  const connectedParam = urlParams.get("connected");
  const errorParam = urlParams.get("error");

  const isConnected = connectedParam === "success" || connectedParam === "bot";
  const hasError = errorParam !== null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Header */}
        <nav aria-label="Progress" className="mb-8">
          <ol
            role="list"
            className="space-y-4 md:flex md:space-y-0 md:space-x-8"
          >
            {/* Step 1: Account Created - Complete */}
            <li className="md:flex-1">
              <div className="flex items-center px-6 py-3 border-2 border-green-500 rounded-lg bg-green-50">
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
                <span className="ml-3 text-sm font-medium text-green-700">
                  Account Created
                </span>
              </div>
            </li>

            {/* Step 2: Connect Bot - Current */}
            <li className="md:flex-1">
              <div
                className={`flex items-center px-6 py-3 border-2 rounded-lg ${
                  isConnected
                    ? "border-green-500 bg-green-50"
                    : "border-indigo-500 bg-indigo-50"
                }`}
                aria-current="step"
              >
                {isConnected ? (
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
                    2
                  </span>
                )}
                <span
                  className={`ml-3 text-sm font-medium ${
                    isConnected ? "text-green-700" : "text-indigo-700"
                  }`}
                >
                  Connect Discord Bot
                </span>
              </div>
            </li>

            {/* Step 3: Complete - Pending */}
            <li className="md:flex-1">
              <div className="flex items-center px-6 py-3 border-2 border-gray-300 rounded-lg">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-500 bg-gray-200 rounded-full">
                  3
                </span>
                <span className="ml-3 text-sm font-medium text-gray-500">
                  Complete Setup
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
              Connect Your Discord Bot
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Invite the membran.app bot to your Discord server to enable
              subscriber role assignments.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {/* Loading State */}
            {isLoading && !isConnected && !hasError && (
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
                <p className="mt-4 text-gray-600">
                  Checking connection status...
                </p>
              </div>
            )}

            {/* Connected State */}
            {(isConnected || data?.connected) && !hasError && (
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
                  Bot Connected Successfully!
                </h2>
                <p className="text-gray-600 mb-8">
                  The membran.app bot has been added to your Discord server. You
                  can proceed to the next step.
                </p>

                {/* Server Info */}
                {data?.server && (
                  <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 text-left mb-8">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                      Connected Server
                    </h3>
                    <dl className="space-y-3">
                      <div className="flex items-center">
                        <dt className="w-24 text-sm font-medium text-gray-500">
                          Server
                        </dt>
                        <dd className="flex-1 text-sm text-gray-900 font-medium">
                          {data.server.name}
                        </dd>
                      </div>
                      <div className="flex items-center">
                        <dt className="w-24 text-sm font-medium text-gray-500">
                          Members
                        </dt>
                        <dd className="flex-1 text-sm text-gray-900">
                          {data.server.memberCount.toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex items-center">
                        <dt className="w-24 text-sm font-medium text-gray-500">
                          Status
                        </dt>
                        <dd className="flex-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span
                              className="mr-1.5 h-2 w-2 rounded-full bg-green-500"
                              aria-hidden="true"
                            />
                            {data.server.botStatus}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Continue Button */}
                <a
                  href="/settings"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Continue to Settings
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
                </a>
              </div>
            )}

            {/* Error State */}
            {hasError && (
              <div className="text-center py-8">
                {/* Error Icon */}
                <div className="mx-auto h-20 w-20 text-red-500 mb-6">
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
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Bot Connection Failed
                </h2>
                <p className="text-gray-600 mb-2">
                  {errorParam === "access_denied"
                    ? "You denied the bot authorization. Please try again and accept the permissions."
                    : errorParam === "invalid_state"
                      ? "Invalid authorization state. Please try again."
                      : errorParam === "expired_code"
                        ? "The authorization code expired. Please try again."
                        : "An error occurred during bot connection. Please try again."}
                </p>

                {/* Retry Button */}
                <BotInviteButton className="mt-6" />
              </div>
            )}

            {/* Initial State - Show Invite Button */}
            {!isLoading && !isConnected && !hasError && !data?.connected && (
              <div className="space-y-8">
                {/* Why Section */}
                <section aria-labelledby="why-heading">
                  <h2
                    id="why-heading"
                    className="text-lg font-medium text-gray-900 mb-4"
                  >
                    Why do I need to invite the bot?
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
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                      </dt>
                      <dd className="mt-4 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          Role Assignment
                        </span>
                        <p className="mt-1">
                          Automatically assign subscriber roles to your paying
                          members.
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
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                        </div>
                      </dt>
                      <dd className="mt-4 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          Secure
                        </span>
                        <p className="mt-1">
                          Uses Discord's official OAuth2 flow for secure
                          authorization.
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
                          Instant Setup
                        </span>
                        <p className="mt-1">
                          Takes less than 2 minutes to complete the setup.
                        </p>
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Permissions Info */}
                <section
                  aria-labelledby="permissions-heading"
                  className="bg-blue-50 border border-blue-200 rounded-lg p-6"
                >
                  <h2
                    id="permissions-heading"
                    className="text-lg font-medium text-blue-900 mb-3"
                  >
                    Required Permissions
                  </h2>
                  <p className="text-sm text-blue-700 mb-4">
                    The bot requires the following permissions to function
                    properly:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Manage Roles - To assign subscriber roles",
                      "View Channels - To see server channels",
                    ].map((permission) => (
                      <li
                        key={permission}
                        className="flex items-start text-sm text-blue-700"
                      >
                        <svg
                          className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0"
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
                        {permission}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Call to Action */}
                <div className="text-center">
                  <BotInviteButton className="text-lg px-8 py-4" />
                  <p className="mt-4 text-sm text-gray-500">
                    You'll be redirected to Discord to authorize the bot
                  </p>
                </div>
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
            View our setup guide
          </a>
        </p>
      </div>
    </div>
  );
}
