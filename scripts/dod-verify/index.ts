#!/usr/bin/env bun
import { parseCLIOptions } from './cli';
import { parsePRP, filterByMilestone } from './parsers/prp';
import {
  updateCheckpoints,
  updateMilestoneCheckpoints,
  createBackup,
} from './parsers/checkpoint';
import { verifyTests, verifyE2ETests } from './verifiers/tests';
import { verifyTypeScript } from './verifiers/typescript';
import { verifyLint } from './verifiers/lint';
import { verifySecrets } from './verifiers/secrets';
import { verifySecurityBasics } from './verifiers/security';
import { formatReport, printReport } from './reporters/console';
import { createSessionCache, getCachedResult, setCachedResult, isCacheValid } from './cache/session';
import { hashFile, hashFiles } from './cache/hash';
import type { DODCriterion, VerificationResult, CLIOptions } from './types';

// Default PRP file path (auto-detect from common locations)
const DEFAULT_PRP_PATHS = [
  'PRP.md',
  'prp.md',
  '.specify/prp.md',
  'specs/PRP.md',
  'specs/prp.md',
];

/**
 * Find the prp.md file
 * @param customPath - Optional custom path from CLI
 * @returns Absolute path to prp.md
 */
function findPrpPath(customPath?: string): string {
  if (customPath) {
    return customPath;
  }

  for (const path of DEFAULT_PRP_PATHS) {
    try {
      const { existsSync } = require('node:fs');
      if (existsSync(path)) {
        return path;
      }
    } catch {
      // Continue searching
    }
  }

  // Default to PRP.md if none found
  return 'PRP.md';
}

/**
 * Run verification for a single criterion
 * @param criterion - DOD criterion to verify
 * @param options - CLI options
 * @returns Verification result
 */
async function verifyCriterion(
  criterion: DODCriterion,
  options: CLIOptions
): Promise<VerificationResult> {
  const timeout = options.timeout || 60000;

  switch (criterion.category) {
    case 'tests':
      return verifyTests(timeout);

    case 'typescript':
      return verifyTypeScript(timeout);

    case 'lint':
      return verifyLint(timeout);

    case 'security':
      if (criterion.id.includes('secret')) {
        return verifySecrets(timeout);
      }
      return verifySecurityBasics(timeout);

    case 'documentation':
      // Documentation checks are manual for now
      return {
        criterionId: criterion.id,
        status: 'skipped',
        timestamp: new Date(),
        duration: 0,
        details: {
          message: 'Documentation checks are manual',
        },
      };

    case 'manual':
      // Manual checks like peer review
      return {
        criterionId: criterion.id,
        status: 'skipped',
        timestamp: new Date(),
        duration: 0,
        details: {
          message: 'Manual verification required',
        },
      };

    default:
      return {
        criterionId: criterion.id,
        status: 'skipped',
        timestamp: new Date(),
        duration: 0,
        details: {
          message: `Unknown category: ${criterion.category}`,
        },
      };
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const start = Date.now();

  try {
    // Parse CLI options
    const options = parseCLIOptions();

    // Find PRP file
    const prpPath = findPrpPath(options.prpPath);

    // Parse PRP and extract DOD criteria
    let criteria = await parsePRP(prpPath);

    // Apply milestone filter if specified
    if (options.milestone) {
      criteria = filterByMilestone(criteria, options.milestone);
    }

    if (criteria.length === 0) {
      console.warn('No DOD criteria found in prp.md section 7');
      process.exit(0);
    }

    // Initialize cache
    const cache = createSessionCache('dod-verify-session');

    // Compute hashes for cache invalidation
    const sourceHashes = hashFiles([prpPath]);
    cache.sourceHashes = sourceHashes;

    // Check if we can use cached results
    const useCache = !options.fresh && isCacheValid(cache, sourceHashes);

    if (useCache && options.verbose) {
      console.log('Using cached results (use --fresh to force re-run)');
    }

    // Verify each criterion
    const results: VerificationResult[] = [];

    for (const criterion of criteria) {
      // Check cache first
      if (useCache && getCachedResult(cache, criterion.id)) {
        const cached = getCachedResult(cache, criterion.id)!;
        results.push(cached);
        continue;
      }

      // Run verification
      if (options.verbose) {
        console.log(`Verifying: ${criterion.id}`);
      }

      const result = await verifyCriterion(criterion, options);

      // Cache the result
      setCachedResult(cache, result);
      results.push(result);
    }

    // Calculate summary
    const total = results.length;
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const errors = results.filter((r) => r.status === 'error').length;
    const percentage = total > 0 ? (passed / total) * 100 : 0;

    // Generate report
    const report = {
      milestone: options.milestone,
      criteria,
      results,
      summary: {
        total,
        passed,
        failed,
        skipped,
        errors,
        percentage,
      },
      generatedAt: new Date(),
      duration: Date.now() - start,
    };

    // Format output
    const output = formatReport(report, options.format);

    // Print report
    printReport(output);

    // Update prp.md checkpoints if all passed
    if (failed === 0 && errors === 0 && !options.prpPath) {
      const checkpointUpdates = new Map<number, boolean>();

      for (const criterion of criteria) {
        if (criterion.status !== 'passed') {
          checkpointUpdates.set(criterion.line, true);
        }
      }

      if (checkpointUpdates.size > 0) {
        if (options.verbose) {
          console.log('Updating prp.md checkpoints...');
        }

        // Create backup
        const backupPath = createBackup(prpPath);

        try {
          if (options.milestone) {
            await updateMilestoneCheckpoints(prpPath, options.milestone, true);
          } else {
            await updateCheckpoints(prpPath, checkpointUpdates);
          }

          if (options.verbose) {
            console.log(`✓ Updated prp.md checkpoints (backup: ${backupPath})`);
          }
        } catch (error) {
          console.warn(`Failed to update prp.md: ${(error as Error).message}`);
        }
      }
    }

    // Exit with appropriate code
    process.exit(output.exitCode);
  } catch (error) {
    console.error(`DOD verification error: ${(error as Error).message}`);

    if ((error as Error).stack) {
      console.error((error as Error).stack);
    }

    process.exit(2);
  }
}

// Run main
main();
