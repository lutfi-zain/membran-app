import { Link } from "@tanstack/react-router";

/**
 * Landing Page Component
 *
 * Public-facing entry point for visitors.
 * Displays product name, value proposition, and call-to-action buttons.
 *
 * Features:
 * - "Start Free Trial" button → /signup
 * - "Login" button → /login
 * - Auth-aware: Redirects authenticated users to /dashboard via route beforeLoad
 */
export function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6 text-center">
        {/* Product Name */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Membran</h1>

        {/* Value Proposition */}
        <p className="text-lg text-gray-600 mb-8">
          Monetize your Discord server with premium memberships and role
          automation
        </p>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col gap-4">
          <Link
            to="/signup"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Start Free Trial
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
