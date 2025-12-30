/**
 * Token Encryption Utilities
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data
 * (Discord OAuth tokens) stored in D1 database.
 *
 * Using Oslo crypto library (already in project for auth)
 *
 * Environment Variables Required:
 * - ENCRYPTION_KEY: Base64-encoded 32-byte key (256 bits)
 */

import { base64 } from "oslo/encoding";

// ============================================================================
// Internal Encryption Utilities
// ============================================================================

/**
 * Encrypt data using AES-GCM with Web Crypto API
 * Returns ciphertext with IV and auth tag
 */
async function encrypt(
  plaintext: string,
  key: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV (12 bytes recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data,
  );

  // Combine IV + ciphertext
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);

  return result;
}

/**
 * Decrypt data encrypted with encrypt()
 */
async function decrypt(
  ciphertext: Uint8Array,
  key: Uint8Array,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Extract IV (first 12 bytes)
  const iv = ciphertext.slice(0, 12);
  const data = ciphertext.slice(12);

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get encryption key from environment
 * Must be a 32-byte (256-bit) key for AES-256-GCM
 *
 * Note: For Cloudflare Workers, pass c.env.ENCRYPTION_KEY
 */
export function getEncryptionKey(envKey?: string): Uint8Array {
  const key =
    envKey ||
    (typeof process !== "undefined" ? process.env.ENCRYPTION_KEY : undefined);

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }

  try {
    // Decode base64 key
    const keyBytes = base64.decode(key);

    // Validate key length (32 bytes for AES-256)
    if (keyBytes.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must be 32 bytes, got ${keyBytes.length} bytes`,
      );
    }

    return keyBytes;
  } catch (error) {
    throw new Error(
      `Invalid ENCRYPTION_KEY: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Encryption/Decryption Functions
// ============================================================================

/**
 * Encrypt sensitive data (tokens, secrets) using AES-256-GCM
 *
 * Returns a base64-encoded string containing:
 * - IV (initialization vector)
 * - Ciphertext
 * - Auth tag
 *
 * @param plaintext - Sensitive data to encrypt
 * @param envKey - Optional encryption key (uses env if not provided)
 * @returns Base64-encoded encrypted data
 * @throws Error if encryption fails
 */
export async function encryptToken(
  plaintext: string,
  envKey?: string,
): Promise<string> {
  try {
    const key = getEncryptionKey(envKey);

    // Oslo's encrypt function returns ciphertext with auth tag appended
    const ciphertext = await encrypt(plaintext, key);

    // Return as base64 string for storage
    return base64.encode(ciphertext);
  } catch (error) {
    throw new Error(
      `Token encryption failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Decrypt sensitive data that was encrypted with encryptToken
 *
 * @param encrypted - Base64-encoded encrypted data
 * @param envKey - Optional encryption key (uses env if not provided)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or key is incorrect
 */
export async function decryptToken(
  encrypted: string,
  envKey?: string,
): Promise<string> {
  try {
    const key = getEncryptionKey(envKey);

    // Decode base64 encrypted data
    const ciphertext = base64.decode(encrypted);

    // Decrypt using Oslo
    const plaintext = await decrypt(ciphertext, key);

    return plaintext;
  } catch (error) {
    throw new Error(
      `Token decryption failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Batch Encryption/Decryption (for multiple tokens)
// ============================================================================

/**
 * Encrypt multiple tokens at once
 */
export async function encryptTokens(
  tokens: Record<string, string>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    result[key] = await encryptToken(value);
  }

  return result;
}

/**
 * Decrypt multiple tokens at once
 */
export async function decryptTokens(
  tokens: Record<string, string>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    result[key] = await decryptToken(value);
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a new encryption key (for setup)
 *
 * Use this to generate a secure key for ENCRYPTION_KEY environment variable
 */
export function generateEncryptionKey(): string {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return base64.encode(key);
}

/**
 * Validate if a string is a properly formatted encrypted token
 *
 * Checks if the string is valid base64 and decrypts without error
 */
export async function isValidEncryptedToken(data: string): Promise<boolean> {
  try {
    // Check if valid base64
    const decoded = base64.decode(data);

    // Check if reasonable length (IV + ciphertext + tag)
    // Minimum: 12 bytes IV + 1 byte ciphertext + 16 bytes tag = 29 bytes
    if (decoded.length < 29) {
      return false;
    }

    // Try to decrypt (will throw if invalid)
    await decryptToken(data);

    return true;
  } catch {
    return false;
  }
}

/**
 * Mask sensitive token for logging/monitoring
 *
 * Returns first 4 and last 4 characters with middle masked
 */
export function maskToken(token: string, showChars = 4): string {
  if (token.length <= showChars * 2) {
    return "*".repeat(token.length);
  }

  const start = token.substring(0, showChars);
  const end = token.substring(token.length - showChars);
  const maskedLength = Math.max(8, token.length - showChars * 2);

  return `${start}${"*".repeat(maskedLength)}${end}`;
}
