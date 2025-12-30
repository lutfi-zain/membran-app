/**
 * Structured Logging Utility for Bot Operations
 *
 * Provides consistent JSON-formatted logging with trace IDs for
 * distributed tracing of bot operations (OAuth flow, status sync, etc.)
 *
 * All logs include:
 * - timestamp: ISO 8601 timestamp
 * - traceId: Unique ID for request correlation
 * - event: Event type (e.g., "oauth_initiated", "bot_joined")
 * - Additional context fields
 */

import { alphabet, generateRandomString } from "oslo/crypto";

const generateId = (length: number) =>
  generateRandomString(length, alphabet("0-9", "a-z"));

// ============================================================================
// Types
// ============================================================================

export type LogLevel = "info" | "warn" | "error" | "debug";

export type BotEventType =
  | "oauth_initiated"
  | "oauth_callback_received"
  | "oauth_state_validated"
  | "oauth_token_exchange_failed"
  | "bot_joined"
  | "bot_removed"
  | "bot_reconnected"
  | "permission_check_passed"
  | "permission_check_failed"
  | "status_sync_started"
  | "status_sync_completed"
  | "discord_api_call"
  | "discord_api_error"
  | "rate_limit_exceeded";

export interface BotLogEvent {
  traceId: string;
  event: BotEventType;
  userId?: string;
  serverId?: string;
  discordId?: string;
  success?: boolean;
  error?: string;
  errorCode?: string;
  duration?: number; // Duration in milliseconds
  metadata?: Record<string, unknown>;
}

export interface LogEntry extends BotLogEvent {
  timestamp: string;
  level: LogLevel;
}

// ============================================================================
// Trace ID Management
// ============================================================================

const TRACE_ID_LENGTH = 16;

/**
 * Generate a new trace ID for request correlation
 *
 * Creates a short, URL-safe random string for tracing requests
 * through the OAuth flow and Discord API calls.
 */
export async function generateTraceId(): Promise<string> {
  return generateRandomString(
    TRACE_ID_LENGTH,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  );
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Emit a structured log for bot operations
 *
 * All logs are formatted as JSON for Cloudflare Workers Analytics
 * and external log aggregation services.
 *
 * @param event - Bot log event data
 * @param level - Log level (default: "info")
 */
export function logBotEvent(
  event: BotLogEvent,
  level: LogLevel = "info",
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    traceId: event.traceId,
    event: event.event,
    userId: event.userId,
    serverId: event.serverId,
    discordId: event.discordId,
    success: event.success,
    error: event.error,
    errorCode: event.errorCode,
    duration: event.duration,
    metadata: event.metadata,
  };

  // Output as JSON for structured logging
  console.log(JSON.stringify(logEntry));
}

/**
 * Log OAuth initiation event
 */
export function logOAuthInitiated(traceId: string, userId: string): void {
  logBotEvent({
    traceId,
    event: "oauth_initiated",
    userId,
    success: true,
  });
}

/**
 * Log OAuth callback received event
 */
export function logOAuthCallbackReceived(traceId: string, state: string): void {
  logBotEvent({
    traceId,
    event: "oauth_callback_received",
    success: true,
    metadata: { stateProvided: !!state },
  });
}

/**
 * Log OAuth state validation
 */
export function logOAuthStateValidated(traceId: string, userId: string): void {
  logBotEvent({
    traceId,
    event: "oauth_state_validated",
    userId,
    success: true,
  });
}

/**
 * Log OAuth token exchange failure
 */
export function logOAuthTokenExchangeFailed(
  traceId: string,
  error: string,
  errorCode?: string,
): void {
  logBotEvent(
    {
      traceId,
      event: "oauth_token_exchange_failed",
      success: false,
      error,
      errorCode,
    },
    "error",
  );
}

/**
 * Log bot joined guild event
 */
export function logBotJoined(
  traceId: string,
  userId: string,
  serverId: string,
  discordId: string,
): void {
  logBotEvent({
    traceId,
    event: "bot_joined",
    userId,
    serverId,
    discordId,
    success: true,
  });
}

/**
 * Log bot removal from guild event
 */
export function logBotRemoved(
  traceId: string,
  serverId: string,
  discordId: string,
): void {
  logBotEvent(
    {
      traceId,
      event: "bot_removed",
      serverId,
      discordId,
      success: true,
    },
    "warn",
  );
}

/**
 * Log bot reconnection event
 */
export function logBotReconnected(
  traceId: string,
  userId: string,
  serverId: string,
): void {
  logBotEvent({
    traceId,
    event: "bot_reconnected",
    userId,
    serverId,
    success: true,
  });
}

/**
 * Log permission check result
 */
export function logPermissionCheck(
  traceId: string,
  serverId: string,
  hasRequired: boolean,
  missing?: string[],
): void {
  if (hasRequired) {
    logBotEvent({
      traceId,
      event: "permission_check_passed",
      serverId,
      success: true,
    });
  } else {
    logBotEvent(
      {
        traceId,
        event: "permission_check_failed",
        serverId,
        success: false,
        metadata: { missingPermissions: missing },
      },
      "warn",
    );
  }
}

/**
 * Log status sync start
 */
export function logStatusSyncStarted(traceId: string): void {
  logBotEvent({
    traceId,
    event: "status_sync_started",
    success: true,
  });
}

/**
 * Log status sync completion
 */
export function logStatusSyncCompleted(
  traceId: string,
  synced: number,
  updated: number,
  errors: number,
  duration: number,
): void {
  logBotEvent({
    traceId,
    event: "status_sync_completed",
    success: errors === 0,
    duration,
    metadata: { synced, updated, errors },
  });
}

/**
 * Log Discord API call
 */
export function logDiscordApiCall(
  traceId: string,
  endpoint: string,
  method: string,
): void {
  logBotEvent({
    traceId,
    event: "discord_api_call",
    success: true,
    metadata: { endpoint, method },
  });
}

/**
 * Log Discord API error
 */
export function logDiscordApiError(
  traceId: string,
  endpoint: string,
  error: string,
  statusCode?: number,
): void {
  logBotEvent(
    {
      traceId,
      event: "discord_api_error",
      success: false,
      error,
      metadata: { endpoint, statusCode },
    },
    "error",
  );
}

/**
 * Log rate limit exceeded event
 */
export function logRateLimitExceeded(
  traceId: string,
  endpoint: string,
  retryAfter?: number,
): void {
  logBotEvent(
    {
      traceId,
      event: "rate_limit_exceeded",
      success: false,
      metadata: { endpoint, retryAfter },
    },
    "warn",
  );
}

// ============================================================================
// Metrics Collection
// ============================================================================

/**
 * Metrics collector for bot operations
 *
 * Tracks:
 * - Connection success rate
 * - Average flow duration
 * - Error counts by type
 */
export class BotMetrics {
  private metrics = {
    oauthInitiated: 0,
    oauthCompleted: 0,
    oauthFailed: 0,
    botJoined: 0,
    botRemoved: 0,
    permissionChecks: 0,
    permissionFailures: 0,
    discordApiCalls: 0,
    discordApiErrors: 0,
    rateLimitHits: 0,
    totalFlowDuration: 0,
    flowCount: 0,
  };

  private errorCounts = new Map<string, number>();

  /**
   * Increment a metric counter
   */
  increment(metric: keyof typeof this.metrics, value = 1): void {
    this.metrics[metric] += value;
  }

  /**
   * Track an error occurrence
   */
  trackError(errorCode: string): void {
    const current = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, current + 1);
  }

  /**
   * Track flow duration
   */
  trackFlowDuration(duration: number): void {
    this.metrics.totalFlowDuration += duration;
    this.metrics.flowCount += 1;
  }

  /**
   * Get connection success rate
   */
  getConnectionSuccessRate(): number {
    const total = this.metrics.oauthCompleted + this.metrics.oauthFailed;
    if (total === 0) return 0;
    return (this.metrics.oauthCompleted / total) * 100;
  }

  /**
   * Get average flow duration in milliseconds
   */
  getAverageFlowDuration(): number {
    if (this.metrics.flowCount === 0) return 0;
    return this.metrics.totalFlowDuration / this.metrics.flowCount;
  }

  /**
   * Get current metrics as JSON
   */
  getMetrics(): Record<string, number> {
    return {
      ...this.metrics,
      connectionSuccessRate: this.getConnectionSuccessRate(),
      averageFlowDuration: this.getAverageFlowDuration(),
      uniqueErrorCodes: this.errorCounts.size,
    };
  }

  /**
   * Get error breakdown
   */
  getErrorBreakdown(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      oauthInitiated: 0,
      oauthCompleted: 0,
      oauthFailed: 0,
      botJoined: 0,
      botRemoved: 0,
      permissionChecks: 0,
      permissionFailures: 0,
      discordApiCalls: 0,
      discordApiErrors: 0,
      rateLimitHits: 0,
      totalFlowDuration: 0,
      flowCount: 0,
    };
    this.errorCounts.clear();
  }
}

// Global metrics instance
export const botMetrics = new BotMetrics();

// ============================================================================
// Logger Class for Cloudflare Workers
// ============================================================================

/**
 * BotEvent type for simplified logging
 * Matches the interface used in bot.ts
 */
export type BotEvent = {
  event: string;
  userId?: string;
  serverId?: string;
  discordId?: string;
  state?: string;
  error?: string;
  [key: string]: unknown;
};

/**
 * Logger class for Cloudflare Workers context
 *
 * Provides structured logging methods for bot operations
 */
export class BotLogger {
  constructor(private c?: { env?: Record<string, string> }) {}

  private log(level: LogLevel, event: BotEvent): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: crypto.randomUUID ? crypto.randomUUID() : generateId(16),
      event: event.event as BotEventType,
      userId: event.userId,
      serverId: event.serverId,
      discordId: event.discordId,
      error: event.error,
      metadata: event as unknown as Record<string, unknown>,
    };

    console.log(JSON.stringify(logEntry));
  }

  info(event: BotEvent): void {
    this.log("info", event);
  }

  warn(event: BotEvent): void {
    this.log("warn", event);
  }

  error(event: BotEvent): void {
    this.log("error", event);
  }

  debug(event: BotEvent): void {
    this.log("debug", event);
  }
}

/**
 * Create a logger instance for the current request context
 *
 * Usage in Hono routes:
 * ```ts
 * const logger = createLogger(c);
 * logger.info({ event: "oauth_initiated", userId });
 * ```
 */
export function createLogger(c?: { env?: Record<string, string> }): BotLogger {
  return new BotLogger(c);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a timed operation tracker
 *
 * Usage:
 * ```ts
 * const tracker = createTimedOperation(traceId);
 * await someOperation();
 * const duration = tracker.end();
 * ```
 */
export function createTimedOperation(traceId: string) {
  const startTime = Date.now();

  return {
    end: (): number => {
      const duration = Date.now() - startTime;
      return duration;
    },
  };
}

/**
 * Wrap an async function with timing and error logging
 *
 * Usage:
 * ```ts
 * const result = await withTiming(
 *   traceId,
 *   "discord_api_call",
 *   () => fetchDiscordApi()
 * );
 * ```
 */
export async function withTiming<T>(
  traceId: string,
  event: BotEventType,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logBotEvent({
      traceId,
      event,
      success: true,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logBotEvent(
      {
        traceId,
        event,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      },
      "error",
    );

    throw error;
  }
}
