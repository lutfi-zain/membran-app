/**
 * Currency Formatting Utilities
 *
 * Provides functions for formatting prices in cents to currency strings.
 * Defaults to USD with "$" symbol for MVP.
 */

// ============================================================================
// Constants
// ============================================================================

const USD_LOCALE = "en-US";
const USD_CURRENCY = "USD";
const USD_SYMBOL = "$";

// ============================================================================
// Types
// ============================================================================

export interface CurrencyFormatOptions {
  /**
   * Whether to include the currency symbol
   * @default true
   */
  includeSymbol?: boolean;

  /**
   * Whether to include decimal places
   * @default true
   */
  includeCents?: boolean;

  /**
   * Custom locale for formatting
   * @default "en-US"
   */
  locale?: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Format cents as USD currency string
 *
 * @param cents - Price in cents (e.g., 500 for $5.00)
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$5.00", "5.00")
 *
 * @example
 * ```ts
 * formatCents(500) // "$5.00"
 * formatCents(500, { includeCents: false }) // "$5"
 * formatCents(500, { includeSymbol: false }) // "5.00"
 * ```
 */
export function formatCents(
  cents: number,
  options: CurrencyFormatOptions = {},
): string {
  const {
    includeSymbol = true,
    includeCents = true,
    locale = USD_LOCALE,
  } = options;

  // Convert cents to dollars
  const dollars = cents / 100;

  // Format with Intl.NumberFormat
  const formatter = new Intl.NumberFormat(locale, {
    style: includeSymbol ? "currency" : "decimal",
    currency: USD_CURRENCY,
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0,
  });

  return formatter.format(dollars);
}

/**
 * Format cents as a simple dollar string (non-localized)
 *
 * Uses simple string concatenation for consistent formatting
 * regardless of user locale. Useful for UI where exact format matters.
 *
 * @param cents - Price in cents
 * @param includeCents - Whether to include decimal places
 * @returns Simple currency string (e.g., "$5.00", "$10")
 *
 * @example
 * ```ts
 * formatCentsSimple(500) // "$5.00"
 * formatCentsSimple(500, false) // "$5"
 * formatCentsSimple(1000) // "$10.00"
 * ```
 */
export function formatCentsSimple(cents: number, includeCents = true): string {
  const dollars = cents / 100;
  return includeCents ? `$${dollars.toFixed(2)}` : `$${Math.floor(dollars)}`;
}

/**
 * Parse dollar string to cents
 *
 * @param dollars - Dollar amount as string or number (e.g., "5.00", 5.99)
 * @returns Price in cents (e.g., 500, 599)
 *
 * @example
 * ```ts
 * parseDollarsToCents("5.00") // 500
 * parseDollarsToCents("5.99") // 599
 * parseDollarsToCents(10) // 1000
 * ```
 */
export function parseDollarsToCents(dollars: string | number): number {
  const normalized = typeof dollars === "string"
    ? parseFloat(dollars.replace(/[^0-9.-]+/g, ""))
    : dollars;
  return Math.round(normalized * 100);
}

/**
 * Validate if a price in cents is within the allowed range
 *
 * @param cents - Price in cents to validate
 * @param minCents - Minimum allowed price in cents (default: 0)
 * @param maxCents - Maximum allowed price in cents (default: 99900 for $999)
 * @returns True if price is valid
 *
 * @example
 * ```ts
 * isValidCents(500) // true
 * isValidCents(0) // true
 * isValidCents(-100) // false
 * isValidCents(100000) // false (exceeds $999)
 * ```
 */
export function isValidCents(
  cents: number,
  minCents = 0,
  maxCents = 99900,
): boolean {
  return cents >= minCents && cents <= maxCents;
}

/**
 * Get the currency symbol for USD
 *
 * @returns "$"
 */
export function getCurrencySymbol(): string {
  return USD_SYMBOL;
}

// ============================================================================
// Export Default
// ============================================================================

export default {
  formatCents,
  formatCentsSimple,
  parseDollarsToCents,
  isValidCents,
  getCurrencySymbol,
};
