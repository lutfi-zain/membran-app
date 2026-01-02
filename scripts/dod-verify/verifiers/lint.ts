import { spawn } from 'child_process';
import type { VerificationResult, LintDetails } from '../types';

/**
 * Verify linting rules
 * @param timeout - Timeout in milliseconds (default: 60000)
 * @returns Verification result
 */
export async function verifyLint(timeout = 60000): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Detect which linter is being used (Biome or ESLint)
    const linter = detectLinter();

    if (linter === 'biome') {
      return await verifyBiomeLint(timeout, start);
    } else if (linter === 'eslint') {
      return await verifyEslint(timeout, start);
    } else {
      return {
        criterionId: 'lint',
        status: 'skipped',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: 'No linter detected (Biome or ESLint)',
        },
      };
    }
  } catch (error) {
    return {
      criterionId: 'lint',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `Lint verification error: ${(error as Error).message}`,
        error: error as Error,
      },
    };
  }
}

/**
 * Detect which linter is configured
 * @returns 'biome', 'eslint', or undefined
 */
function detectLinter(): 'biome' | 'eslint' | undefined {
  try {
    const { existsSync, readFileSync } = require('node:fs');

    // Check for Biome
    if (existsSync('biome.json') || existsSync('.biomerc')) {
      return 'biome';
    }

    // Check for ESLint
    if (
      existsSync('.eslintrc.js') ||
      existsSync('.eslintrc.cjs') ||
      existsSync('.eslintrc.json') ||
      existsSync('.eslintrc.yaml') ||
      existsSync('eslint.config.js') ||
      existsSync('eslint.config.mjs')
    ) {
      return 'eslint';
    }

    // Check package.json for lint script
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      const lintScript = pkg.scripts?.lint || '';

      if (lintScript.includes('biome')) {
        return 'biome';
      } else if (lintScript.includes('eslint')) {
        return 'eslint';
      }
    } catch {
      // Ignore
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verify using Biome
 * @param timeout - Timeout in milliseconds
 * @param startTime - Start time for duration calculation
 * @returns Verification result
 */
async function verifyBiomeLint(
  timeout: number,
  startTime: number
): Promise<VerificationResult> {
  const proc = spawn('bun', ['run', 'lint'], {
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

  // Parse Biome output
  const diagnostics = parseBiomeOutput(output + errorOutput);

  if (diagnostics.errors.length > 0) {
    return {
      criterionId: 'lint',
      status: 'failed',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      details: {
        message: `Linting failed with ${diagnostics.errors.length} errors`,
        metadata: diagnostics,
      } as LintDetails,
    };
  }

  return {
    criterionId: 'lint',
    status: diagnostics.warnings.length > 0 ? 'passed' : 'passed',
    timestamp: new Date(),
    duration: Date.now() - startTime,
    details: {
      message: `Linting passed (${diagnostics.warnings.length} warnings)`,
      metadata: diagnostics,
    } as LintDetails,
  };
}

/**
 * Verify using ESLint
 * @param timeout - Timeout in milliseconds
 * @param startTime - Start time for duration calculation
 * @returns Verification result
 */
async function verifyEslint(
  timeout: number,
  startTime: number
): Promise<VerificationResult> {
  const proc = spawn('bun', ['run', 'lint'], {
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

  // Parse ESLint output
  const diagnostics = parseEslintOutput(output + errorOutput);

  if (diagnostics.errors.length > 0) {
    return {
      criterionId: 'lint',
      status: 'failed',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      details: {
        message: `Linting failed with ${diagnostics.errors.length} errors`,
        metadata: diagnostics,
      } as LintDetails,
    };
  }

  return {
    criterionId: 'lint',
    status: 'passed',
    timestamp: new Date(),
    duration: Date.now() - startTime,
    details: {
      message: `Linting passed (${diagnostics.warnings.length} warnings)`,
      metadata: diagnostics,
    } as LintDetails,
  };
}

/**
 * Parse Biome output
 * @param output - Combined stdout and stderr
 * @returns Parsed diagnostics
 */
function parseBiomeOutput(output: string): LintDetails {
  const files: Array<{ path: string; errors: number; warnings: number }> = [];
  let errorCount = 0;
  let warningCount = 0;

  // Biome JSON output format (if using --json)
  // Or text format with "error", "warning"
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.toLowerCase().includes('error')) {
      errorCount++;
    }
    if (line.toLowerCase().includes('warn')) {
      warningCount++;
    }

    // Extract file paths
    const fileMatch = line.match(/^([^\s]+:\d+:\d+)/);
    if (fileMatch) {
      const path = fileMatch[1];
      const existing = files.find((f) => f.path === path);

      if (existing) {
        if (line.toLowerCase().includes('error')) existing.errors++;
        if (line.toLowerCase().includes('warn')) existing.warnings++;
      } else {
        files.push({
          path,
          errors: line.toLowerCase().includes('error') ? 1 : 0,
          warnings: line.toLowerCase().includes('warn') ? 1 : 0,
        });
      }
    }
  }

  return {
    errorCount,
    warningCount,
    files,
  };
}

/**
 * Parse ESLint output
 * @param output - Combined stdout and stderr
 * @returns Parsed diagnostics
 */
function parseEslintOutput(output: string): LintDetails {
  const files: Array<{ path: string; errors: number; warnings: number }> = [];
  let errorCount = 0;
  let warningCount = 0;

  // ESLint output format
  // /path/to/file.ts:line:col: error Message
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/^([^\s]+:\d+:\d+):\s*(error|warning)/);

    if (match) {
      const path = match[1];
      const severity = match[2];

      if (severity === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }

      const existing = files.find((f) => f.path === path);

      if (existing) {
        if (severity === 'error') existing.errors++;
        else existing.warnings++;
      } else {
        files.push({
          path,
          errors: severity === 'error' ? 1 : 0,
          warnings: severity === 'warning' ? 1 : 0,
        });
      }
    }
  }

  return {
    errorCount,
    warningCount,
    files,
  };
}
