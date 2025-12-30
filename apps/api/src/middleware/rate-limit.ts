/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting for API endpoints using in-memory storage.
 * For production, use Cloudflare Workers Rate Limiting or KV.
 *
 * Bot Endpoint Rate Limits (from contracts/bot-connection.md):
 * - POST /api/bot/invite: 5 requests / 1 hour
 * - GET /api/bot/status: 60 requests / 1 minute
 * - POST /api/bot/validate-permissions: 10 requests / 1 minute
 * - POST /api/bot/reconnect: 3 requests / 1 hour
 * - DELETE /api/bot/disconnect: 3 requests / 1 hour
 * - POST /api/bot/sync: 1 request / 5 minutes (cron)
 */

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";

// ============================================================================
// Types
// ============================================================================

interface RateLimitConfig {
  limit: number;
  window: number; // milliseconds
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ============================================================================
// Rate Limit Rules (per contracts/bot-connection.md)
// ============================================================================

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Bot endpoint limits
  "POST:/api/bot/invite": { limit: 5, window: 60 * 60 * 1000 }, // 5 / hour
  "GET:/api/bot/status": { limit: 60, window: 60 * 1000 }, // 60 / minute
  "POST:/api/bot/validate-permissions": { limit: 10, window: 60 * 1000 }, // 10 / minute
  "POST:/api/bot/reconnect": { limit: 3, window: 60 * 60 * 1000 }, // 3 / hour
  "DELETE:/api/bot/disconnect": { limit: 3, window: 60 * 60 * 1000 }, // 3 / hour
  "POST:/api/bot/sync": { limit: 1, window: 5 * 60 * 1000 }, // 1 / 5 minutes (cron)
};

// Default rate limit for endpoints not specified
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 100,
  window: 60 * 1000, // 100 / minute
};

// In-memory storage (reset on worker restart)
// For production, use Cloudflare KV or Durable Objects
const rateLimitStore = new Map<string, RateLimitEntry>();

// ============================================================================
// Rate Limit Functions
// ============================================================================

/**
 * Check if a request should be rate limited
 *
 * @param key - Unique identifier for the rate limit bucket (e.g., "userId:endpoint")
 * @param config - Rate limit configuration
 * @returns Object with { allowed: boolean, resetAt: number }
 */
function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; resetAt: number } {
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or window has expired
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.window,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const allowed = entry.count <= config.limit;

  return {
    allowed,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit key for a request
 *
 * Combines user identifier with method and path for unique bucket
 */
function getRateLimitKey(c: Context): string {
  const userId = c.get("userId") || c.get("session")?.userId || "anonymous";
  const method = c.req.method;
  const path = c.req.path;

  return `${userId}:${method}:${path}`;
}

/**
 * Get rate limit configuration for an endpoint
 */
function getRateLimitConfig(method: string, path: string): RateLimitConfig {
  const key = `${method}:${path}`;
  return RATE_LIMITS[key] || DEFAULT_RATE_LIMIT;
}

/**
 * Calculate rate limit headers for response
 */
function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number,
): Record<string, string> {
  const resetInSeconds = Math.ceil((resetAt - Date.now()) / 1000);

  return {
    "RateLimit-Limit": limit.toString(),
    "RateLimit-Remaining": remaining.toString(),
    "RateLimit-Reset": resetInSeconds.toString(),
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetAt.toString(),
  };
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Rate limiting middleware for Hono
 *
 * Checks request against configured rate limits and returns 429 if exceeded.
 */
export const rateLimitMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const key = getRateLimitKey(c);
    const config = getRateLimitConfig(c.req.method, c.req.path);

    const result = checkRateLimit(key, config);

    // Add rate limit headers to all responses
    const remaining = Math.max(
      0,
      config.limit - rateLimitStore.get(key)!.count,
    );
    const headers = getRateLimitHeaders(
      config.limit,
      remaining,
      result.resetAt,
    );

    for (const [name, value] of Object.entries(headers)) {
      c.header(name, value);
    }

    // Check if rate limit exceeded
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

      return c.json(
        {
          error: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          details: {
            retryAfter,
            resetAt: new Date(result.resetAt).toISOString(),
          },
        },
        429,
      );
    }

    await next();
  },
);

/**
 * Specific rate limit middleware for bot endpoints
 *
 * Apply this to bot routes for stricter rate limiting
 */
export const botRateLimitMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const path = c.req.path;

    // Only apply to bot endpoints
    if (!path.startsWith("/api/bot")) {
      return next();
    }

    // Use the main rate limit middleware
    return rateLimitMiddleware(c, next);
  },
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset rate limit for a specific key
 *
 * Useful for testing or administrative purposes
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Reset all rate limits
 *
 * Useful for testing or administrative purposes
 */
export function resetAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status for a key
 *
 * Useful for displaying rate limit info to users
 */
export function getRateLimitStatus(key: string): {
  count: number;
  limit: number;
  remaining: number;
  resetAt: number;
} | null {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;

  // Find config for this key
  // This is a simplified version - in production you'd store config with entry
  return {
    count: entry.count,
    limit: DEFAULT_RATE_LIMIT.limit,
    remaining: Math.max(0, DEFAULT_RATE_LIMIT.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up expired rate limit entries
 *
 * Should be called periodically to free memory
 */
export function cleanupExpiredRateLimits(): void {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}
