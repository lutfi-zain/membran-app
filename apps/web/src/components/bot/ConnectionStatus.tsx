import { useBotStatus, useBotReconnect } from "../../hooks/useBotConnection";
import { BotInviteButton } from "./BotInviteButton";

// ============================================================================
// ConnectionStatus Component
// ============================================================================

/**
 * ConnectionStatus - Display bot connection status with server info
 *
 * WCAG 2.1 AA Compliance:
 * - Semantic HTML (article, section, h3)
 * - aria-live for status updates
 * - Proper heading hierarchy
 * - Keyboard accessible controls
 */
export function ConnectionStatus() {
  const { data, isLoading, error, refetch } = useBotStatus();
  const reconnect = useBotReconnect();

  if (isLoading) {
    return (
      <article
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex items-center justify-center py-8">
          <svg
            className="animate-spin h-6 w-6 text-indigo-600"
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
          <span className="ml-2 text-gray-600">
            Loading connection status...
          </span>
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article
        className="bg-white rounded-lg shadow-sm border border-red-200 p-6"
        aria-live="polite"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Unable to load connection status
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {(error as Error).message ||
                "An error occurred while checking bot status."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Not connected
  if (!data?.connected) {
    return (
      <article
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        aria-live="polite"
      >
        <div className="text-center py-8">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Bot Connected
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect the membran.app bot to your Discord server to enable role
            assignment for your subscribers.
          </p>
          <BotInviteButton />
        </div>
      </article>
    );
  }

  const server = data.server!;

  return (
    <article
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        {/* Server Info */}
        <div className="flex items-start space-x-4 flex-1">
          {/* Server Icon */}
          <div className="flex-shrink-0">
            {server.icon ? (
              <img
                src={server.icon}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
                aria-hidden="true"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-600">
                  {server.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Server Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {server.name}
              </h3>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  server.botStatus === "Connected"
                    ? "bg-green-100 text-green-800"
                    : server.botStatus === "Disconnected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
                aria-label={`Bot status: ${server.botStatus}`}
              >
                <span
                  className={`mr-1.5 h-2 w-2 rounded-full ${
                    server.botStatus === "Connected"
                      ? "bg-green-500"
                      : server.botStatus === "Disconnected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                  aria-hidden="true"
                />
                {server.botStatus}
              </span>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
              <div>
                <dt className="sr-only">Server ID</dt>
                <dd>
                  <span className="font-medium">ID:</span> {server.discordId}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Member Count</dt>
                <dd>
                  <span className="font-medium">Members:</span>{" "}
                  {server.memberCount.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Bot Added Date</dt>
                <dd>
                  <span className="font-medium">Added:</span>{" "}
                  {new Date(server.botAddedAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Permissions</dt>
                <dd>
                  <span className="font-medium">Permissions:</span>{" "}
                  {server.permissions.join(", ")}
                </dd>
              </div>
            </dl>

            {/* Permission Warning */}
            {!server.permissionsValid &&
              server.permissionsWarnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
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
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">
                        Missing Permissions
                      </h4>
                      <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                        {server.permissionsWarnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Actions */}
        {server.botStatus === "Disconnected" && (
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => reconnect.mutate()}
              disabled={reconnect.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={reconnect.isPending}
            >
              {reconnect.isPending ? "Connecting..." : "Reconnect Bot"}
            </button>
          </div>
        )}
      </div>

      {/* Recently connected badge */}
      {server.recentlyConnected && (
        <div className="mt-4 flex items-center text-sm text-green-600">
          <svg
            className="h-4 w-4 mr-1"
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
          Bot connected successfully (within 24 hours)
        </div>
      )}
    </article>
  );
}

export default ConnectionStatus;
