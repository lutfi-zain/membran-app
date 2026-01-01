import { ConnectionStatus } from "../../components/bot/ConnectionStatus";
import { PermissionWarning } from "../../components/bot/PermissionWarning";
import { useBotStatus } from "../../hooks/useBotConnection";
import { BackLink } from "../../components/navigation/BackLink";

// ============================================================================
// Settings Bot Status Page
// ============================================================================

/**
 * Settings Bot Status Page
 *
 * Displays the bot connection status and permission warnings for the
 * authenticated user's Discord server connection.
 *
 * Part of User Story 2: Server Connection Status Verification
 */
export default function SettingsBotPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <BackLink />

        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Bot Connection Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your Discord bot connection and permissions
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Connection Status Card */}
          <section aria-labelledby="connection-status-heading">
            <h2 id="connection-status-heading" className="sr-only">
              Bot Connection Status
            </h2>
            <ConnectionStatus />
          </section>

          {/* Additional Information */}
          <section
            aria-labelledby="help-heading"
            className="bg-white shadow rounded-lg p-6"
          >
            <h2
              id="help-heading"
              className="text-lg font-medium text-gray-900 mb-4"
            >
              Need Help?
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Bot Permissions
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  The bot requires the following permissions to function
                  properly:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
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
                    <span>
                      <strong>Manage Roles</strong> - Assign subscriber roles to
                      your paying members
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
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
                    <span>
                      <strong>View Channels</strong> - Access server channels
                      for role assignment
                    </span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Reconnecting the Bot
                </h3>
                <p className="text-sm text-gray-600">
                  If the bot was removed from your server, you can reconnect it
                  by clicking the "Reconnect Bot" button that appears when the
                  status is "Disconnected". This will initiate a new OAuth flow
                  to add the bot back to your server.
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Support
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  If you encounter issues with the bot connection, please visit
                  our documentation or contact support.
                </p>
                <a
                  href="https://docs.membran.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View Documentation
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
