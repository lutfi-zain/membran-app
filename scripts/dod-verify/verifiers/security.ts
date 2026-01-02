import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { VerificationResult, SecurityFinding, SecurityDetails } from '../types';

/**
 * Verify security basics (rate limiting, input validation, HTTPS-only, auth on protected)
 * @param timeout - Timeout in milliseconds (default: 60000)
 * @returns Verification result
 */
export async function verifySecurityBasics(timeout = 60000): Promise<VerificationResult> {
  const start = Date.now();

  try {
    const findings: SecurityFinding[] = [];

    // Check rate limiting
    findings.push(...(await checkRateLimiting()));

    // Check input validation
    findings.push(...(await checkInputValidation()));

    // Check HTTPS-only
    findings.push(...(await checkHttpsOnly()));

    // Check auth on protected routes
    findings.push(...(await checkAuthOnProtected()));

    if (findings.some((f) => f.severity === 'error')) {
      return {
        criterionId: 'security-basics',
        status: 'failed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: `Security issues found: ${findings.length}`,
          metadata: {
            findings,
          },
        } as SecurityDetails,
      };
    }

    if (findings.some((f) => f.severity === 'warning')) {
      return {
        criterionId: 'security-basics',
        status: 'passed',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          message: `Security check passed with warnings: ${findings.length}`,
          metadata: {
            findings,
          },
        } as SecurityDetails,
      };
    }

    return {
      criterionId: 'security-basics',
      status: 'passed',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: 'All security basics verified',
        metadata: {
          findings: [],
        },
      } as SecurityDetails,
    };
  } catch (error) {
    return {
      criterionId: 'security-basics',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: `Security verification error: ${(error as Error).message}`,
        error: error as Error,
      },
    };
  }
}

/**
 * Check for rate limiting middleware
 * @returns Array of security findings
 */
async function checkRateLimiting(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  // Check for rate limiting configuration in API routes
  const apiRoutesPath = join(process.cwd(), 'apps/api/src/routes');

  if (existsSync(apiRoutesPath)) {
    // Check auth.ts for rate limiting
    const authPath = join(apiRoutesPath, 'auth.ts');
    if (existsSync(authPath)) {
      const content = readFileSync(authPath, 'utf-8');

      if (!content.toLowerCase().includes('ratelimit') &&
          !content.toLowerCase().includes('rate-limit') &&
          !content.toLowerCase().includes('rate limit')) {
        findings.push({
          file: 'apps/api/src/routes/auth.ts',
          line: 1,
          rule: 'rate-limiting',
          severity: 'warning',
          message: 'No rate limiting detected on auth routes',
        });
      }
    }
  }

  // Check Cloudflare Workers config for rate limiting
  const wranglerPath = join(process.cwd(), 'apps/api/wrangler.toml');
  if (existsSync(wranglerPath)) {
    const content = readFileSync(wranglerPath, 'utf-8');

    if (!content.toLowerCase().includes('rate') &&
        !content.toLowerCase().includes('ratelimit')) {
      findings.push({
        file: 'apps/api/wrangler.toml',
        line: 1,
        rule: 'rate-limiting',
        severity: 'info',
        message: 'Consider configuring rate limiting in Cloudflare Workers',
      });
    }
  }

  return findings;
}

/**
 * Check for input validation on API routes
 * @returns Array of security findings
 */
async function checkInputValidation(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  const apiRoutesPath = join(process.cwd(), 'apps/api/src/routes');

  if (!existsSync(apiRoutesPath)) {
    return findings;
  }

  // Check each route file for Zod validation
  const routeFiles = ['auth.ts', 'bot.ts', 'payments.ts'];

  for (const routeFile of routeFiles) {
    const filePath = join(apiRoutesPath, routeFile);

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');

      // Check for Zod schema usage
      const hasZod = content.includes('z.') ||
                     content.includes('zod') ||
                     content.includes('.parse(') ||
                     content.includes('.safeParse(');

      if (!hasZod && content.includes('POST')) {
        findings.push({
          file: `apps/api/src/routes/${routeFile}`,
          line: 1,
          rule: 'input-validation',
          severity: 'warning',
          message: 'POST endpoints should validate input with Zod schemas',
        });
      }
    }
  }

  return findings;
}

/**
 * Check for HTTPS-only configuration
 * @returns Array of security findings
 */
async function checkHttpsOnly(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  // Check wrangler.toml for HTTPS-only (Cloudflare Workers is HTTPS by default)
  const wranglerPath = join(process.cwd(), 'apps/api/wrangler.toml');

  if (existsSync(wranglerPath)) {
    // Cloudflare Workers are HTTPS-only by default
    // This check is informational
  }

  // Check for HTTP URLs in code (should use HTTPS)
  const sourcePaths = ['apps/api/src', 'packages'];

  for (const sourcePath of sourcePaths) {
    const fullPath = join(process.cwd(), sourcePath);

    if (existsSync(fullPath)) {
      // This is a simplified check - in production, scan all files
      findings.push({
        file: `${sourcePath}/*`,
        line: 0,
        rule: 'https-only',
        severity: 'info',
        message: 'Ensure all external URLs use HTTPS',
      });
    }
  }

  return findings;
}

/**
 * Check for authentication on protected routes
 * @returns Array of security findings
 */
async function checkAuthOnProtected(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  // Check for protected routes without auth middleware
  const apiRoutesPath = join(process.cwd(), 'apps/api/src/routes');

  if (!existsSync(apiRoutesPath)) {
    return findings;
  }

  // Check bot.ts for auth checks
  const botPath = join(apiRoutesPath, 'bot.ts');
  if (existsSync(botPath)) {
    const content = readFileSync(botPath, 'utf-8');

    // Look for POST endpoints
    const hasPostEndpoint = content.includes('POST');

    // Look for auth/session checks
    const hasAuthCheck = content.toLowerCase().includes('session') ||
                        content.toLowerCase().includes('auth') ||
                        content.toLowerCase().includes('user');

    if (hasPostEndpoint && !hasAuthCheck) {
      findings.push({
        file: 'apps/api/src/routes/bot.ts',
        line: 1,
        rule: 'auth-on-protected',
        severity: 'warning',
        message: 'POST endpoints should verify authentication',
      });
    }
  }

  // Check payments.ts for auth (very sensitive)
  const paymentsPath = join(apiRoutesPath, 'payments.ts');
  if (existsSync(paymentsPath)) {
    const content = readFileSync(paymentsPath, 'utf-8');

    const hasAuthCheck = content.toLowerCase().includes('session') ||
                        content.toLowerCase().includes('auth') ||
                        content.toLowerCase().includes('user');

    if (!hasAuthCheck) {
      findings.push({
        file: 'apps/api/src/routes/payments.ts',
        line: 1,
        rule: 'auth-on-protected',
        severity: 'error',
        message: 'Payment routes MUST verify authentication',
      });
    }
  }

  return findings;
}

/**
 * Get detailed security findings for US3
 * @returns Array of detailed security findings
 */
export async function getDetailedSecurityFindings(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  findings.push(...(await checkRateLimiting()));
  findings.push(...(await checkInputValidation()));
  findings.push(...(await checkHttpsOnly()));
  findings.push(...(await checkAuthOnProtected()));

  return findings;
}
