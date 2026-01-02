# Internal Contracts: DOD Verifiers

**Feature**: 006-dod-test-coverage
**Last Updated**: 2026-01-01

## Overview

This document defines the internal contracts for DOD verification functions. Each verifier implements a common interface for consistency.

---

## Verifier Interface

```typescript
interface Verifier {
  name: string                    // Human-readable name
  category: CriterionCategory
  verify(input: VerifierInput): Promise<VerificationResult>
}

interface VerifierInput {
  cacheKey?: string               // For memoization
  options?: VerifierOptions
}

interface VerifierOptions {
  timeout?: number                // Milliseconds (default: 30000)
  verbose?: boolean               // Log details
}

type CriterionCategory =
  | 'tests'
  | 'typescript'
  | 'lint'
  | 'security'
  | 'documentation'
  | 'manual'
```

---

## Test Verifier

### Contract

```typescript
interface TestVerifierInput extends VerifierInput {
  criticalPaths?: string[]        // Paths requiring 100% coverage
  threshold?: number              // Coverage percentage (default: 100)
}

interface TestVerifierOutput extends VerificationResult {
  details: TestCoverageDetails
}

interface TestCoverageDetails extends VerificationDetails {
  message: string
  coverage: number                // Overall coverage percentage
  threshold: number
  criticalPaths: string[]
  uncoveredPaths: string[]
  criticalCoverage: number        // Coverage for critical paths only
}

// Implementation signature
async function verifyTests(input: TestVerifierInput): Promise<TestVerifierOutput>
```

### Expected Behavior

1. Runs Playwright tests: `bunx playwright test`
2. Generates coverage report
3. Filters coverage by critical paths
4. Calculates coverage percentage
5. Returns `passed` if critical paths >= threshold (100%)
6. Returns `failed` if critical paths < threshold
7. Returns `error` if test execution fails

### Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Tests timeout | `error` | "Tests timed out after {timeout}ms" |
| No tests found | `failed` | "No test files found" |
| Coverage generation failed | `error` | "Failed to generate coverage report" |
| Critical path not found | `warning` | "Critical path {path} not found in coverage" |

---

## TypeScript Verifier

### Contract

```typescript
interface TypeScriptVerifierInput extends VerifierInput {
  tsconfig?: string               // Path to tsconfig.json (default: ./tsconfig.json)
}

interface TypeScriptVerifierOutput extends VerificationResult {
  details: TypeScriptDetails
}

interface TypeScriptDetails extends VerificationDetails {
  message: string
  errorCount: number
  warningCount: number
  files: string[]
  errors: {
    file: string
    line: number
    column: number
    code: string
    message: string
  }[]
}

// Implementation signature
async function verifyTypeScript(input: TypeScriptVerifierInput): Promise<TypeScriptVerifierOutput>
```

### Expected Behavior

1. Runs TypeScript compiler: `bunx tsc --noEmit`
2. Parses diagnostics
3. Returns `passed` if 0 errors
4. Returns `failed` if >0 errors
5. Returns `error` if compilation crashes

### Error Handling

| Error | Status | Message |
|-------|--------|---------|
| tsconfig not found | `error` | "Cannot find tsconfig.json at {path}" |
| Compilation timeout | `error` | "TypeScript compilation timed out" |
| Invalid TypeScript syntax | `failed` | "{errorCount} TypeScript errors found" |

---

## Lint Verifier

### Contract

```typescript
interface LintVerifierInput extends VerifierInput {
  config?: string                 // Path to config (default: auto-detect)
  ruleSet?: 'biome' | 'eslint'    // Linter to use (default: auto-detect)
}

interface LintVerifierOutput extends VerificationResult {
  details: LintDetails
}

interface LintDetails extends VerificationDetails {
  message: string
  errorCount: number
  warningCount: number
  files: {
    path: string
    errors: number
    warnings: number
  }[]
}

// Implementation signature
async function verifyLint(input: LintVerifierInput): Promise<LintVerifierOutput>
```

### Expected Behavior

1. Detects linter (Biome or ESLint)
2. Runs linter: `bun run lint`
3. Parses output
4. Returns `passed` if 0 errors (warnings allowed)
5. Returns `failed` if >0 errors
6. Returns `error` if linter crashes

### Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Linter not found | `error` | "No linter configured (Biome or ESLint required)" |
| Config not found | `warning` | "Using default linter configuration" |
| Lint timeout | `error` | "Linting timed out" |

---

## Secret Detection Verifier

### Contract

```typescript
interface SecretDetectionInput extends VerifierInput {
  gitleaksConfig?: string         // Path to gitleaks.toml (default: ./gitleaks.toml)
  allowlist?: string[]            // Additional regex patterns to ignore
}

interface SecretDetectionOutput extends VerificationResult {
  details: SecretDetectionDetails
}

interface SecretDetectionDetails extends VerificationDetails {
  message: string
  findings: SecretFinding[]
}

interface SecretFinding {
  file: string
  line: number
  secret: string                  // Redacted
  rule: string
  severity: 'high' | 'medium' | 'low'
}

// Implementation signature
async function verifySecrets(input: SecretDetectionInput): Promise<SecretDetectionOutput>
```

### Expected Behavior

1. Runs Gitleaks: `gitleaks --config={config} --report-format=json`
2. Parses JSON output
3. Redacts secrets in output (show only first/last 4 chars)
4. Returns `passed` if 0 findings
5. Returns `failed` if >0 findings
6. Returns `error` if Gitleaks crashes

### Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Gitleaks not found | `error` | "Gitleaks not installed. Run: npm install -g gitleaks" |
| Config not found | `warning` | "Using default Gitleaks configuration" |
| Scan timeout | `error` | "Secret detection timed out" |
| Invalid JSON output | `error` | "Failed to parse Gitleaks output" |

---

## Security Basics Verifier

### Contract

```typescript
interface SecurityBasicsInput extends VerifierInput {
  checks?: SecurityCheck[]        // Which checks to run (default: all)
}

type SecurityCheck =
  | 'rate-limiting'               // Verify rate limiting configured
  | 'input-validation'            // Verify Zod validation on API inputs
  | 'no-hardcoded-secrets'        // Alias for secret detection
  | 'https-only'                  // Verify no HTTP endpoints
  | 'auth-on-protected'           // Verify auth middleware on protected routes

interface SecurityBasicsOutput extends VerificationResult {
  details: SecurityBasicsDetails
}

interface SecurityBasicsDetails extends VerificationDetails {
  message: string
  checks: {
    name: SecurityCheck
    status: 'passed' | 'failed' | 'skipped'
    findings: string[]
  }[]
}

// Implementation signature
async function verifySecurityBasics(input: SecurityBasicsInput): Promise<SecurityBasicsOutput>
```

### Expected Behavior

1. Parses API route files
2. Checks for security patterns
3. Returns `passed` if all checks pass
4. Returns `failed` if any check fails
5. Returns `skipped` if check not applicable

### Check Implementations

#### Rate Limiting Check

- Scans for rate limiting middleware usage
- Looks for Cloudflare Workers rate limiting configuration
- Checks API endpoints for rate limiting decorators

#### Input Validation Check

- Scans for Zod schemas on API routes
- Verifies request body validation
- Checks query parameter validation

#### HTTPS-Only Check

- Scans for HTTP protocol usage
- Verifies redirect to HTTPS
- Checks Cloudflare Workers configuration

#### Auth-on-Protected Check

- Identifies protected routes (from route config)
- Verifies auth middleware presence
- Checks for public route annotation

---

## Parser Contracts

### PRP Parser

```typescript
interface PRPParserInput {
  filePath: string                // Path to prp.md
}

interface PRPParserOutput {
  milestones: Milestone[]
  criteria: DODCriterion[]
  metadata: {
    parsedAt: Date
    version: string               // From frontmatter
  }
}

interface PRPParserError {
  line: number
  column: number
  message: string
  code: 'missing-section' | 'invalid-format' | 'parse-error'
}

// Implementation signature
async function parsePRP(input: PRPParserInput): Promise<PRPParserOutput>
```

### Checkpoint Updater

```typescript
interface CheckpointUpdateInput {
  filePath: string                // Path to prp.md
  criterionId: string             // Criterion to update
  status: 'passed' | 'failed'
  dryRun?: boolean                // Preview changes only
}

interface CheckpointUpdateOutput {
  success: boolean
  changes: CheckpointChange[]
  preview?: string                // Diff if dryRun
}

interface CheckpointChange {
  line: number
  before: string                  // "- [ ] Text"
  after: string                   // "- [x] Text"
}

// Implementation signature
async function updateCheckpoint(input: CheckpointUpdateInput): Promise<CheckpointUpdateOutput>
```

---

## Reporter Contracts

### Console Reporter

```typescript
interface ReporterInput {
  report: VerificationReport
  format: 'text' | 'json' | 'markdown'
  color?: boolean                 // Enable chalk colors (default: true)
}

interface ReporterOutput {
  content: string
  exitCode: number
}

// Implementation signature
function formatReport(input: ReporterInput): ReporterOutput
```

### Format Specifications

#### Text Format

```
🔍 DOD Verification: Milestone 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ TypeScript compilation (0 errors, 2 warnings)
✗ Tests (42/45 passing, 3 failed)
✓ Linting (0 errors, 5 warnings)
✓ Test coverage (100% for critical paths)
✓ Security basics (no secrets detected)

Failed Tests:
  - tests/auth/login.spec.ts:15 - Login should redirect on invalid credentials
  - tests/api/payments.spec.ts:42 - Payment should handle Midtrans timeout
  - tests/bot/role.spec.ts:8 - Bot should assign role on subscription

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: 4/5 passed (80%) ❌

Fix the above issues and run again:
  bun run dod:verify --milestone 1
```

#### JSON Format

```json
{
  "milestone": 1,
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0,
    "errors": 0,
    "percentage": 80
  },
  "criteria": [
    {
      "id": "m1-c01",
      "status": "passed",
      "duration": 1250,
      "details": { "message": "TypeScript compilation (0 errors, 2 warnings)" }
    }
  ],
  "generatedAt": "2026-01-01T12:00:00Z",
  "duration": 8500
}
```

#### Markdown Format

```markdown
# DOD Verification Report: Milestone 1

**Generated**: 2026-01-01 12:00:00 UTC
**Duration**: 8.5s

## Summary

| Metric | Count |
|--------|-------|
| Total | 5 |
| Passed | 4 |
| Failed | 1 |
| Skipped | 0 |
| Percentage | 80% |

## Results

### ✅ TypeScript Compilation
- Status: Passed
- Duration: 1.25s
- Details: 0 errors, 2 warnings

### ❌ Tests
- Status: Failed
- Duration: 5.2s
- Details: 42/45 passing

**Failed Tests**:
1. `tests/auth/login.spec.ts:15` - Login should redirect on invalid credentials
2. `tests/api/payments.spec.ts:42` - Payment should handle Midtrans timeout
3. `tests/bot/role.spec.ts:8` - Bot should assign role on subscription
```

---

## Cache Contracts

### Session Cache

```typescript
interface SessionCache {
  get(key: string): VerificationResult | undefined
  set(key: string, result: VerificationResult): void
  has(key: string): boolean
  clear(): void
  invalidate(pattern: string): void
}

interface CacheKey {
  milestone?: number
  prpHash: string
  sourceHashes: Map<string, string>
}

// Implementation signature
function createSessionCache(): SessionCache
```

### Hash Function

```typescript
async function hashFile(filePath: string): Promise<string>
async function hashContent(content: string): Promise<string>
```
