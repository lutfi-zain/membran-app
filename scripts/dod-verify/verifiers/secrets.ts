import { spawn } from 'child_process';
import type { VerificationResult, SecretFinding, SecretDetectionDetails } from '../types';

/**
 * Verify no hardcoded secrets in codebase
 * @param timeout - Timeout in milliseconds (default: 120000)
 * @returns Verification result
 */
export async function verifySecrets(timeout = 120000): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Check if gitleaks is installed
    const gitleaksInstalled = await checkGitleaksInstalled();

    if (!gitleaksInstalled) {
      return {
        criterionId: 'secrets',
        status: 'skipped',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: 'Gitleaks not installed. Run: npm install -g gitleaks',
        },
      };
    }

    // Run gitleaks
    const findings = await runGitleaks(timeout);

    if (findings.length > 0) {
      return {
        criterionId: 'secrets',
        status: 'failed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: `Found ${findings.length} hardcoded secret(s) in codebase`,
          metadata: {
            findings: redactSecrets(findings),
            count: findings.length,
          },
        } as SecretDetectionDetails,
      };
    }

    return {
      criterionId: 'secrets',
      status: 'passed',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: 'No hardcoded secrets detected',
        metadata: {
          findings: [],
          count: 0,
        },
      } as SecretDetectionDetails,
    };
  } catch (error) {
    return {
      criterionId: 'secrets',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `Secret detection error: ${(error as Error).message}`,
        error: error as Error,
      },
    };
  }
}

/**
 * Check if gitleaks is installed
 * @returns True if gitleaks is available
 */
async function checkGitleaksInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('gitleaks', ['--version'], {
      stdio: 'pipe',
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Run gitleaks and parse findings
 * @param timeout - Timeout in milliseconds
 * @returns Array of secret findings
 */
async function runGitleaks(timeout: number): Promise<SecretFinding[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gitleaks', [
      '--config=gitleaks.toml',
      '--report-format=json',
      '--report-path=-',
      '--source=.',
    ], {
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
      reject(new Error(`Gitleaks timeout after ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (code === 0) {
        // No secrets found
        resolve([]);
      } else if (code === 1) {
        // Secrets found - parse JSON
        try {
          const findings = parseGitleaksOutput(output);
          resolve(findings);
        } catch (error) {
          reject(new Error(`Failed to parse gitleaks output: ${(error as Error).message}`));
        }
      } else {
        // Gitleaks error
        reject(new Error(`Gitleaks exited with code ${code}: ${errorOutput}`));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Parse gitleaks JSON output
 * @param output - JSON string from gitleaks
 * @returns Array of secret findings
 */
function parseGitleaksOutput(output: string): SecretFinding[] {
  if (!output.trim()) {
    return [];
  }

  try {
    const data = JSON.parse(output);
    const findings: SecretFinding[] = [];

    // Gitleaks output format
    if (Array.isArray(data)) {
      for (const item of data) {
        findings.push({
          file: item?.file || 'unknown',
          line: item?.startLine || 0,
          secret: item?.secret || '',
          rule: item?.ruleID || 'unknown',
        });
      }
    } else if (data.findings && Array.isArray(data.findings)) {
      for (const item of data.findings) {
        findings.push({
          file: item?.file || 'unknown',
          line: item?.startLine || 0,
          secret: item?.secret || '',
          rule: item?.ruleID || 'unknown',
        });
      }
    }

    return findings;
  } catch {
    return [];
  }
}

/**
 * Redact secrets showing only first/last 4 characters
 * @param findings - Array of secret findings
 * @returns Findings with redacted secrets
 */
function redactSecrets(findings: SecretFinding[]): SecretFinding[] {
  return findings.map((finding) => {
    const secret = finding.secret;

    if (secret.length <= 8) {
      return {
        ...finding,
        secret: '****',
      };
    }

    const start = secret.substring(0, 4);
    const end = secret.substring(secret.length - 4);
    const middle = '*'.repeat(Math.min(secret.length - 8, 20));

    return {
      ...finding,
      secret: `${start}${middle}${end}`,
    };
  });
}

/**
 * Get detailed findings for US3 (security compliance)
 * @param timeout - Timeout in milliseconds
 * @returns Array of detailed secret findings with file/line
 */
export async function getDetailedSecretFindings(
  timeout = 120000
): Promise<SecretFinding[]> {
  try {
    const gitleaksInstalled = await checkGitleaksInstalled();

    if (!gitleaksInstalled) {
      return [];
    }

    const findings = await runGitleaks(timeout);
    return redactSecrets(findings);
  } catch {
    return [];
  }
}
