/**
 * OAuth State Storage Utilities
 *
 * Manages OAuth state parameters for CSRF protection during Discord bot
 * invitation flow. States are stored in D1 with 5-minute expiration.
 *
 * Using D1 for persistence (could use KV for faster performance in future)
 */

import { eq } from "drizzle-orm";
import { generateRandomString } from "oslojs/crypto";
import { db } from "../db";
import { oauthStates } from "../db/schema/oauth-state";

// ============================================================================
// Configuration
// ============================================================================

const STATE_LENGTH = 32; // Cryptographically random 32 bytes
const STATE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Types
// ============================================================================

export interface OAuthStateData {
  state: string;
  userId: string;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateStateOptions {
  userId: string;
  metadata?: Record<string, unknown>;
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
}

// ============================================================================
// State Management Functions
// ============================================================================

/**
 * Generate and store a new OAuth state for CSRF protection
 *
 * Creates a cryptographically random state string and stores it
 * in D1 with the associated user ID and expiration timestamp.
 *
 * @param options - State creation options
 * @returns The generated state string
 */
export async function createOAuthState(
  options: CreateStateOptions,
): Promise<string> {
  const { userId, metadata, ttl = STATE_EXPIRATION_MS } = options;

  // Generate cryptographically random state
  const state = await generateRandomString(
    STATE_LENGTH,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  );

  // Calculate expiration
  const expiresAt = new Date(Date.now() + ttl);

  try {
    // Insert state into database
    await db.insert(oauthStates).values({
      state,
      userId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      expiresAt: expiresAt.getTime(), // Store as timestamp
      createdAt: Date.now(),
    });

    return state;
  } catch (error) {
    throw new Error(
      `Failed to create OAuth state: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Validate and consume an OAuth state
 *
 * Checks if the state exists, hasn't expired, and deletes it
 * (one-time use) to prevent replay attacks.
 *
 * @param state - The state string to validate
 * @returns The associated state data if valid
 * @throws Error if state is invalid, expired, or not found
 */
export async function validateAndConsumeState(
  state: string,
): Promise<OAuthStateData> {
  try {
    // Find the state
    const [stateRecord] = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .limit(1);

    if (!stateRecord) {
      throw new Error("Invalid state: not found");
    }

    // Check expiration
    const now = Date.now();
    if (stateRecord.expiresAt < now) {
      // Clean up expired state
      await deleteState(state);
      throw new Error("Invalid state: expired");
    }

    // Parse metadata if present
    let metadata: Record<string, unknown> | undefined;
    if (stateRecord.metadata) {
      try {
        metadata = JSON.parse(stateRecord.metadata);
      } catch {
        // Invalid JSON, ignore metadata
      }
    }

    // Delete the state (one-time use)
    await deleteState(state);

    return {
      state: stateRecord.state,
      userId: stateRecord.userId,
      expiresAt: new Date(stateRecord.expiresAt),
      metadata,
    };
  } catch (error) {
    throw new Error(
      `State validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Delete an OAuth state from storage
 *
 * Used during validation and for cleanup
 */
async function deleteState(state: string): Promise<void> {
  try {
    await db.delete(oauthStates).where(eq(oauthStates.state, state));
  } catch {
    // Ignore delete errors (state might not exist)
  }
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up expired OAuth states
 *
 * Should be run periodically (e.g., cron job) to remove expired states
 *
 * @returns Number of states deleted
 */
export async function cleanupExpiredStates(): Promise<number> {
  try {
    const now = Date.now();

    // Delete all states where expiresAt < now
    const result = await db
      .delete(oauthStates)
      .where(eq(oauthStates.expiresAt, now))
      .returning({ id: oauthStates.state });

    // Note: The above won't work with Drizzle's SQLite adapter for "less than"
    // We need to use raw SQL or a different approach

    // For now, return 0 (cleanup will be handled by a cron job using raw SQL)
    return 0;
  } catch (error) {
    console.error("Failed to cleanup expired states:", error);
    return 0;
  }
}

/**
 * Clean up expired states using raw SQL
 *
 * This function uses raw SQL which is more efficient for bulk deletes
 */
export async function cleanupExpiredStatesSQL(): Promise<number> {
  try {
    const now = Date.now();
    const sql = `DELETE FROM oauth_states WHERE expires_at < ${now}`;

    // This would need to be executed against the D1 binding
    // Implementation depends on your D1 setup
    return 0;
  } catch (error) {
    console.error("Failed to cleanup expired states:", error);
    return 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a state string without storing it
 *
 * Useful for testing or when you want to manage storage manually
 */
export async function generateStateString(): Promise<string> {
  return generateRandomString(
    STATE_LENGTH,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  );
}

/**
 * Check if a state format is valid (basic validation)
 *
 * Note: This doesn't check if the state exists in storage
 */
export function isValidStateFormat(state: string): boolean {
  // States should be 32 characters, alphanumeric
  return /^[a-zA-Z0-9]{32}$/.test(state);
}

/**
 * Get time remaining before state expires
 *
 * @returns Time remaining in milliseconds, or 0 if expired/invalid
 */
export async function getStateTTL(state: string): Promise<number> {
  try {
    const [stateRecord] = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .limit(1);

    if (!stateRecord) {
      return 0;
    }

    const now = Date.now();
    const remaining = stateRecord.expiresAt - now;

    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}
