import { Link } from "@tanstack/react-router";

interface BackLinkProps {
  href?: string;
  label?: string;
}

/**
 * Back Link Component
 *
 * Simple breadcrumb-style link for navigation back to dashboard.
 * Used on settings pages and onboarding completion.
 *
 * Props:
 * - href: Target route (defaults to "/dashboard")
 * - label: Link text (defaults to "Back to Dashboard")
 */
export function BackLink({ href = "/dashboard", label = "Back to Dashboard" }: BackLinkProps) {
  return (
    <Link
      to={href}
      className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {label}
    </Link>
  );
}
