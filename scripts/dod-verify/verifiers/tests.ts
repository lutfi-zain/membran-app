import { spawn } from 'child_process';
import type { VerificationResult, TestCoverageDetails } from '../types';

// Critical paths that require 100% coverage
const CRITICAL_PATHS = [
  'apps/api/src/routes/auth.ts',
  'apps/api/src/routes/bot.ts',
  'apps/api/src/routes/payments.ts',
  'packages/db/src/schema/',
];

/**
 * Verify test execution and coverage
 * @param timeout - Timeout in milliseconds (default: 120000)
 * @returns Verification result
 */
export async function verifyTests(timeout = 120000): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Run tests with coverage
    const testResult = await runTestsWithCoverage(timeout);

    if (!testResult.success) {
      return {
        criterionId: 'tests',
        status: 'failed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: testResult.error || 'Tests failed to execute',
        },
      };
    }

    // Check coverage for critical paths
    const coverageResult = await checkCriticalPathCoverage(testResult.coverage);

    if (!coverageResult.passed) {
      return {
        criterionId: 'tests',
        status: 'failed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: `Critical path coverage below 100% threshold`,
          metadata: {
            coverage: coverageResult.coverage,
            threshold: 100,
            criticalPaths: coverageResult.coveredPaths,
            uncoveredPaths: coverageResult.uncoveredPaths,
          },
        } as TestCoverageDetails,
      };
    }

    return {
      criterionId: 'tests',
      status: 'passed',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `All tests passing with 100% critical path coverage`,
        metadata: {
          coverage: coverageResult.coverage,
          threshold: 100,
          criticalPaths: coverageResult.coveredPaths,
          uncoveredPaths: [],
        },
      } as TestCoverageDetails,
    };
  } catch (error) {
    return {
      criterionId: 'tests',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `Test verification error: ${(error as Error).message}`,
        error: error as Error,
      },
    };
  }
}

/**
 * Run tests with coverage
 * @param timeout - Timeout in milliseconds
 * @returns Test result with coverage data
 */
async function runTestsWithCoverage(timeout: number): Promise<{
  success: boolean;
  error?: string;
  coverage?: number;
}> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['test', '--coverage'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Set timeout
    const timer = setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        error: `Test execution timeout after ${timeout}ms`,
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);

      // Parse coverage from output
      const coverage = parseCoverageFromOutput(output);

      resolve({
        success: code === 0,
        error: code !== 0 ? errorOutput || `Tests exited with code ${code}` : undefined,
        coverage,
      });
    });
  });
}

/**
 * Parse coverage percentage from test output
 * @param output - Test output
 * @returns Coverage percentage
 */
function parseCoverageFromOutput(output: string): number {
  // Look for coverage pattern like "Coverage: 85.5%"
  const match = output.match(/coverage[:\s]*(\d+\.?\d*)%/i);
  if (match) {
    return parseFloat(match[1]);
  }

  // Default to 0 if not found
  return 0;
}

/**
 * Check coverage for critical paths
 * @param overallCoverage - Overall coverage percentage
 * @returns Coverage check result
 */
async function checkCriticalPathCoverage(
  overallCoverage: number
): Promise<{
  passed: boolean;
  coverage: number;
  coveredPaths: string[];
  uncoveredPaths: string[];
}> {
  // In a real implementation, this would use Playwright or istanbul
  // to check per-file coverage for critical paths

  // For now, assume 100% coverage if overall coverage is 100%
  const coveredPaths: string[] = [];
  const uncoveredPaths: string[] = [];

  // Check each critical path
  for (const path of CRITICAL_PATHS) {
    // Simulate coverage check
    // In production, use actual coverage data
    coveredPaths.push(path);
  }

  // All critical paths covered
  const passed = overallCoverage >= 100;

  return {
    passed,
    coverage: overallCoverage,
    coveredPaths,
    uncoveredPaths,
  };
}

/**
 * Verify E2E tests specifically
 * @param timeout - Timeout in milliseconds
 * @returns Verification result
 */
export async function verifyE2ETests(timeout = 180000): Promise<VerificationResult> {
  const start = Date.now();

  try {
    const proc = spawn('bunx', ['playwright', 'test'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Set timeout
    const timer = setTimeout(() => {
      proc.kill();
    }, timeout);

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    clearTimeout(timer);

    if (exitCode !== 0) {
      return {
        criterionId: 'e2e-tests',
        status: 'failed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: `E2E tests failed`,
          metadata: {
            exitCode,
            output: errorOutput,
          },
        },
      };
    }

    // Parse passed test count
    const passedMatch = output.match(/(\d+)\s+passed/i);
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;

    return {
      criterionId: 'e2e-tests',
      status: 'passed',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `${passed} E2E tests passed`,
        metadata: { passed },
      },
    };
  } catch (error) {
    return {
      criterionId: 'e2e-tests',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `E2E test verification error: ${(error as Error).message}`,
        error: error as Error,
      },
    };
  }
}
