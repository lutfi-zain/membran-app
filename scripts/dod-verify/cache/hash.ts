import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Compute SHA-256 hash of a file's contents
 * @param filePath - Absolute path to the file
 * @returns Hex-encoded hash string
 */
export function hashFile(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return hashContent(content);
  } catch (error) {
    throw new Error(`Failed to hash file ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Compute SHA-256 hash of a string content
 * @param content - String content to hash
 * @returns Hex-encoded hash string
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Compute hash for multiple files and return as map
 * @param filePaths - Array of absolute file paths
 * @returns Map of file path to hash
 */
export function hashFiles(filePaths: string[]): Map<string, string> {
  const hashes = new Map<string, string>();

  for (const filePath of filePaths) {
    try {
      hashes.set(filePath, hashFile(filePath));
    } catch {
      // Skip files that can't be read (may not exist yet)
      hashes.set(filePath, '');
    }
  }

  return hashes;
}

/**
 * Combine multiple hashes into a single composite hash
 * @param hashes - Array of hash strings to combine
 * @returns Combined hex-encoded hash
 */
export function combineHashes(hashes: string[]): string {
  const sorted = [...hashes].sort(); // Sort for consistent ordering
  return hashContent(sorted.join(''));
}
