import { useAuth } from "../../../hooks/useAuth";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view settings.</div>;

  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  const connected = urlParams.get("connected");

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          Connections
        </h2>

        {error === "already_linked" && (
          <div className="bg-red-50 text-red-700 p-4 rounded mb-4">
            This Discord account is already linked to another user.
          </div>
        )}

        {connected === "discord" && (
          <div className="bg-green-50 text-green-700 p-4 rounded mb-4">
            Successfully connected Discord!
          </div>
        )}

        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col">
            <span className="text-lg font-medium">Discord</span>
            <span className="text-sm text-gray-500">
              Link your Discord account to manage servers and bot features.
            </span>
          </div>

          <div className="flex items-center">
            {user.discordId ? (
              <div className="flex items-center text-green-600">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Connected
              </div>
            ) : (
              <a
                href="/api/auth/connect/discord"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Connect Discord
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
