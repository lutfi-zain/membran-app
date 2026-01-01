import { Link, useRouteContext } from "@tanstack/react-router";

/**
 * 404 Not Found Component
 *
 * User-friendly error page for undefined routes.
 * Provides helpful links back to login or dashboard based on auth state.
 */
export function NotFound() {
  const context = useRouteContext({ from: "__root__" });
  const isAuthenticated = context?.user != null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Go to Login
              </Link>
              <Link
                to="/"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Go to Homepage
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
