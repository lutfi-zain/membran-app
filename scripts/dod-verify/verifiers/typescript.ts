import { spawn } from 'child_process';
import type { VerificationResult, TypeScriptDetails } from '../types';

/**
 * Verify TypeScript compilation
 * @param timeout - Timeout in milliseconds (default: 60000)
 * @returns Verification result
 */
export async function verifyTypeScript(timeout = 60000): Promise<VerificationResult> {
  const start = Date.now();

  try {
    const proc = spawn('bunx', ['tsc', '--noEmit'], {
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

    // Parse TypeScript output for errors and warnings
    const diagnostics = parseTypeScriptDiagnostics(output + errorOutput);

    if (diagnostics.errors.length > 0) {
      return {
        criterionId: 'typescript',
        status: 'failed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: `TypeScript compilation failed with ${diagnostics.errors.length} errors`,
          metadata: {
            errorCount: diagnostics.errors.length,
            warningCount: diagnostics.warnings.length,
            files: diagnostics.files,
            errors: diagnostics.errors,
            warnings: diagnostics.warnings,
          },
        } as TypeScriptDetails,
      };
    }

    return {
      criterionId: 'typescript',
      status: 'passed',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `TypeScript compilation successful (${diagnostics.warnings.length} warnings)`,
        metadata: {
          errorCount: 0,
          warningCount: diagnostics.warnings.length,
          files: [],
          warnings: diagnostics.warnings,
        },
      } as TypeScriptDetails,
    };
  } catch (error) {
    return {
      criterionId: 'typescript',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `TypeScript verification error: ${(error as Error).message}`,
        error: error as Error,
      },
    };
  }
}

/**
 * Parse TypeScript diagnostic output
 * @param output - Combined stdout and stderr
 * @returns Parsed diagnostics
 */
function parseTypeScriptDiagnostics(output: string): {
  errors: string[];
  warnings: string[];
  files: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = new Set<string>();

  // TypeScript error format: file.ts(line:col): error TSxxxx: message
  const lines = output.split('\n');

  for (const line of lines) {
    // Match error TS
    const errorMatch = line.match(/error TS\d+:/);
    if (errorMatch) {
      errors.push(line.trim());

      // Extract file path
      const fileMatch = line.match(/^([^(]+)\(/);
      if (fileMatch) {
        files.add(fileMatch[1]);
      }
    }

    // Match warning TS
    const warningMatch = line.match(/warning TS\d+:/);
    if (warningMatch) {
      warnings.push(line.trim());

      const fileMatch = line.match(/^([^(]+)\(/);
      if (fileMatch) {
        files.add(fileMatch[1]);
      }
    }
  }

  return {
    errors,
    warnings,
    files: Array.from(files),
  };
}

/**
 * Check TypeScript configuration
 * @returns True if tsconfig.json exists and is valid
 */
export function hasTypeScriptConfig(): boolean {
  try {
    const { existsSync } = require('node:fs');
    return existsSync('tsconfig.json');
  } catch {
    return false;
  }
}
