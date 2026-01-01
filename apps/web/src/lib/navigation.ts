/**
 * Navigation Utilities
 *
 * Helper functions for route validation and navigation logic.
 */

/**
 * Allowed return paths for post-login redirect.
 *
 * Prevents open redirect vulnerabilities by whitelisting valid routes.
 */
export const ALLOWED_RETURN_PATHS = [
  "/dashboard",
  "/onboarding",
  "/onboarding/bot",
  "/onboarding/pricing",
  "/settings",
  "/settings/bot",
  "/settings/pricing",
] as const;

/**
 * Validates if a URL is a safe return URL.
 *
 * Checks:
 * - Same origin (prevents external redirects)
 * - Path is in whitelist (prevents access to unexpected routes)
 *
 * @param url - URL to validate
 * @returns true if URL is safe for redirect
 */
export function isValidReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);

    // Must be same origin
    if (parsed.origin !== window.location.origin) {
      return false;
    }

    // Check if path matches allowed patterns
    const pathname = parsed.pathname;
    return ALLOWED_RETURN_PATHS.some(
      (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`)
    );
  } catch {
    return false;
  }
}

/**
 * Extracts and validates return URL from search params.
 *
 * @param searchParams - URLSearchParams object
 * @returns Valid return URL or undefined
 */
export function getValidReturnUrl(
  searchParams: URLSearchParams
): string | undefined {
  const returnParam = searchParams.get("return");
  if (!returnParam) return undefined;

  if (isValidReturnUrl(returnParam)) {
    return returnParam;
  }

  return undefined;
}
