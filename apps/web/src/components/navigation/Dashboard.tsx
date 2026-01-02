import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useOnboardingProgress } from "../../hooks/useOnboarding";

/**
 * Dashboard Component
 *
 * Authenticated user hub showing:
 * - Server name and connection status
 * - Quick action buttons to settings pages
 * - Pricing tier summary
 *
 * Users with incomplete onboarding will be redirected via route beforeLoad.
 */
export function Dashboard() {
  const { data: botStatus } = useQuery({
    queryKey: ["bot", "status"],
    queryFn: async () => {
      const res = await fetch("/api/bot/status");
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["pricing", "tiers"],
    queryFn: async () => {
      const res = await fetch("/api/pricing/tiers");
      if (!res.ok) return [];
      const data = await res.json();
      return data.tiers || [];
    },
  });

  const status = botStatus?.connected ? "connected" : "not_configured";
  const tierCount = tiers?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Server Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server Status</h2>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                status === "connected" ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="capitalize">
              {status === "not_configured" ? "Not Configured" : status}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link
              to="/settings/bot"
              className="text-blue-600 hover:underline"
            >
              Manage Bot →
            </Link>
            <Link
              to="/settings/pricing"
              className="text-blue-600 hover:underline"
            >
              Configure Pricing ({tierCount} {tierCount === 1 ? "tier" : "tiers"})→
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
