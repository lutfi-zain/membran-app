/**
 * Critical paths configuration for 100% coverage requirement
 *
 * These paths are security-sensitive or critical business logic
 * that require 100% test coverage before any milestone can be
 * marked as complete.
 */

export const CRITICAL_PATHS = [
  // Authentication routes - critical for security
  'apps/api/src/routes/auth.ts',

  // Discord bot integration - critical for user management
  'apps/api/src/routes/bot.ts',

  // Payment processing - critical for business operations
  'apps/api/src/routes/payments.ts',

  // Database schemas - critical for data integrity
  'packages/db/src/schema/*.ts',

  // Add more critical paths as needed
  // 'apps/api/src/routes/users.ts',
  // 'packages/shared/src/auth.ts',
];

/**
 * Paths that are excluded from critical coverage requirements
 */
export const NON_CRITICAL_PATHS = [
  // Test files
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.e2e.ts',

  // Type definition files
  '**/*.d.ts',

  // Configuration files
  '**/types/**',
  '**/config/**',

  // Utility files that don't contain business logic
  'src/utils/logger.ts',
  'src/utils/formatters.ts',

  // Mock and fixture files
  '**/mocks/**',
  '**/fixtures/**',
  '**/__mocks__/**',
];

/**
 * Coverage threshold for critical paths
 * This should be 100% for critical security/business paths
 */
export const COVERAGE_THRESHOLD = 100;

/**
 * Default timeout for test verification in milliseconds
 */
export const DEFAULT_TEST_TIMEOUT = 120000; // 2 minutes

/**
 * Default timeout for E2E tests in milliseconds
 */
export const DEFAULT_E2E_TIMEOUT = 180000; // 3 minutes
