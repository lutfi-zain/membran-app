import type { CacheKey, SessionCache, VerificationResult } from '../types';

/**
 * Create a new session cache for memoizing verification results
 * @param key - Cache key identifying this session
 * @returns New session cache instance
 */
export function createSessionCache(key: string): SessionCache {
  return {
    key,
    results: new Map<string, VerificationResult>(),
    timestamp: new Date(),
    sourceHashes: new Map<string, string>(),
  };
}

/**
 * Get a cached verification result
 * @param cache - Session cache instance
 * @param criterionId - ID of the criterion to retrieve
 * @returns Cached result or undefined
 */
export function getCachedResult(
  cache: SessionCache,
  criterionId: string
): VerificationResult | undefined {
  return cache.results.get(criterionId);
}

/**
 * Store a verification result in cache
 * @param cache - Session cache instance
 * @param result - Verification result to cache
 */
export function setCachedResult(
  cache: SessionCache,
  result: VerificationResult
): void {
  cache.results.set(result.criterionId, result);
}

/**
 * Check if a criterion has a cached result
 * @param cache - Session cache instance
 * @param criterionId - ID of the criterion to check
 * @returns True if cached result exists
 */
export function hasCachedResult(
  cache: SessionCache,
  criterionId: string
): boolean {
  return cache.results.has(criterionId);
}

/**
 * Clear all cached results
 * @param cache - Session cache instance
 */
export function clearCache(cache: SessionCache): void {
  cache.results.clear();
  cache.sourceHashes.clear();
  cache.timestamp = new Date();
}

/**
 * Invalidate cache entries for files that have changed
 * @param cache - Session cache instance
 * @param currentHashes - Current file hashes to compare against
 * @returns Array of criterion IDs that were invalidated
 */
export function invalidateChangedFiles(
  cache: SessionCache,
  currentHashes: Map<string, string>
): string[] {
  const invalidated: string[] = [];

  for (const [filePath, cachedHash] of cache.sourceHashes.entries()) {
    const currentHash = currentHashes.get(filePath);

    if (currentHash && currentHash !== cachedHash) {
      // File changed - find all criteria related to this file
      // This is a simple implementation - you could make this more sophisticated
      // by tracking which criteria depend on which files
      invalidated.push(`related-to-${filePath}`);
    }
  }

  // Remove invalidated results from cache
  for (const id of invalidated) {
    cache.results.delete(id);
  }

  return invalidated;
}

/**
 * Update source file hashes in cache
 * @param cache - Session cache instance
 * @param sourceHashes - New source file hashes
 */
export function updateSourceHashes(
  cache: SessionCache,
  sourceHashes: Map<string, string>
): void {
  cache.sourceHashes = new Map([...cache.sourceHashes, ...sourceHashes]);
}

/**
 * Check if cache is still valid for given source files
 * @param cache - Session cache instance
 * @param sourceHashes - Current source file hashes
 * @returns True if all source files are unchanged
 */
export function isCacheValid(
  cache: SessionCache,
  sourceHashes: Map<string, string>
): boolean {
  for (const [filePath, currentHash] of sourceHashes.entries()) {
    const cachedHash = cache.sourceHashes.get(filePath);

    if (!cachedHash || cachedHash !== currentHash) {
      return false;
    }
  }

  return true;
}
