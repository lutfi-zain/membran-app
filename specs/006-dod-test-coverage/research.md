# Research: DOD Test Coverage

**Feature**: 006-dod-test-coverage
**Date**: 2026-01-01

## Overview

This document consolidates research findings for implementing the DOD (Definition of Done) verification system. Research focused on three key areas: prp.md parsing, test coverage verification, and secret detection.

---

## 1. prp.md Parsing and Checkpoint Management

### Decision: gray-matter + remark

**Selected**: gray-matter + remark + remark-stringify

**Rationale**:
- gray-matter is the industry standard for frontmatter parsing (YAML, JSON)
- remark provides AST-based markdown manipulation with precise positioning
- remark-stringify preserves original formatting when writing back to files
- Combined approach gives maximum flexibility for complex parsing needs

**Alternatives Considered**:
- markedjs/marked: Simpler API but less control over formatting preservation
- markdown-it: Good performance but more complex for AST manipulation
- Pure regex: Too fragile for maintaining markdown structure

**Implementation Pattern**:

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import grayMatter from 'gray-matter'

interface CheckpointItem {
  text: string
  checked: boolean
  line: number
  position: { start: number; end: number }
}

function parsePRPSection7(filePath: string): CheckpointItem[] {
  const content = readFileSync(filePath, 'utf8')
  const { content: markdownContent } = grayMatter(content)

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify)

  const tree = processor.parse(markdownContent)

  // Walk AST to find checklist items in section 7
  // Extract items with line numbers and positions

  return checkpoints
}

async function updateCheckpointStatus(
  filePath: string,
  checkpointId: number,
  checked: boolean
): Promise<void> {
  const content = readFileSync(filePath, 'utf8')
  const tree = processor.parse(content)

  // Find and update specific checklist node in AST
  // Use position tracking to preserve formatting

  const result = processor.stringify(tree)
  writeFileSync(filePath, result.toString())
}
```

**Dependencies**:
- `gray-matter` - Frontmatter parsing
- `unified` - Plugin architecture
- `remark-parse` - Markdown to AST
- `remark-stringify` - AST to markdown
- `remark-gfm` - GitHub Flavored Markdown support

---

## 2. Test Coverage Verification

### Decision: Playwright Built-in Coverage + Bun Coverage

**Selected**: Dual approach using Playwright's native coverage for E2E and Bun's built-in coverage for unit/integration tests

**Rationale**:
- Playwright has built-in V8 coverage engine that generates Istanbul-style reports
- Bun provides native `--coverage` flag with threshold checking
- Both tools produce compatible coverage formats
- Allows separate coverage tracking for E2E vs unit tests

**Alternatives Considered**:
- C8: Good option but Bun's native coverage is more integrated
- Istanbul: Older tool, superseded by V8 coverage in modern runtimes

**Critical Path Identification Strategy**:

```typescript
// Configuration-driven approach
// coverage.config.ts
export const CRITICAL_PATHS = [
  'apps/api/src/routes/auth.ts',      // Authentication flows
  'apps/api/src/routes/bot.ts',       // Discord bot integration
  'apps/api/src/routes/payments.ts',  // Payment processing
  'packages/db/src/schema/*.ts',      // Database schema
];

export const NON_CRITICAL_PATHS = [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
  'src/types/**',
  'src/utils/logger.ts',
];
```

**Implementation Pattern**:

```typescript
// Using Playwright coverage for E2E
import { test, expect } from '@playwright/test';

test('verify critical path coverage', async ({ page }) => {
  await page.coverage.startJSCoverage();

  // Run critical path tests
  await page.goto('http://localhost:8787/auth/login');
  // ... test flows ...

  const coverage = await page.coverage.stopJSCoverage();

  // Filter for critical paths only
  const criticalCoverage = filterCriticalPaths(coverage);

  // Calculate coverage percentage
  const result = calculateCoverage(criticalCoverage);

  // Require 100% for critical paths
  expect(result.percentage).toBeGreaterThanOrEqual(100);
});

// Using Bun coverage for unit tests
// In package.json:
{
  "scripts": {
    "test:coverage": "bun test --coverage",
    "test:coverage:critical": "bun test --coverage --coverage-threshold 100"
  }
}
```

**Dependencies**:
- Playwright (already in project) - Built-in coverage API
- Bun (already in project) - Native `--coverage` flag

---

## 3. Hardcoded Secret Detection

### Decision: Gitleaks

**Selected**: Gitleaks as external binary, integrated via npm script

**Rationale**:
- Industry standard with excellent false positive rate (<5% with proper config)
- Supports TOML configuration for custom rules
- Scans filesystems with JSON output including file paths and line numbers
- Fast performance suitable for monorepo scanning
- Can be invoked via child_process from TypeScript

**Alternatives Considered**:
- TruffleHog: More comprehensive (800+ secret types) but heavier
- @bytehide/secrets-scanner: TypeScript-native but less mature
- Custom regex: Would require extensive pattern library and testing

**Implementation Pattern**:

```typescript
// scripts/dod-verify/verifiers/secrets.ts
import { spawn } from 'child_process';

interface SecretFinding {
  file: string
  line: number
  secret: string
  rule: string
}

async function detectSecrets(): Promise<SecretFinding[]> {
  return new Promise((resolve, reject) => {
    const gitleaks = spawn('gitleaks', [
      '--config=gitleaks.toml',
      '--report-format=json',
      '--report-path=-',  // stdout
      '--source=.'
    ]);

    let output = '';

    gitleaks.stdout.on('data', (data) => {
      output += data.toString();
    });

    gitleaks.on('close', (code) => {
      if (code === 0) {
        resolve([]);  // No secrets found
      } else if (code === 1) {
        // Secrets found - parse JSON
        const findings = JSON.parse(output);
        resolve(findings);
      } else {
        reject(new Error(`Gitleaks failed: ${code}`));
      }
    });
  });
}
```

**Gitleaks Configuration**:

```toml
# gitleaks.toml
title = "membran-app-secret-scanner"

[extend]
useDefault = true

[[rules]]
description = "Discord Bot Tokens"
id = "discord-bot-token"
regex = '''(?i)bot\.[a-zA-Z0-9_-]{23,}\.[a-zA-Z0-9_-]{6,}\.[a-zA-Z0-9_-]{27}'''

[[rules]]
description = "Midtrans API Keys"
id = "midtrans-api-key"
regex = '''(?i)(?:midtrans|server_key|client_key)[\s]*[:=][\s]*["']([a-z0-9_-]{20,})["']'''

[[rules]]
description = "Database URLs"
id = "database-url"
regex = '''(?i)(?:mongodb|mysql|postgresql|d1)://[^:]+:[^@]+@'''

[rules.allowlist]
paths = [
  "node_modules/",
  ".turbo/",
  "dist/",
  "build/",
  "coverage/",
  ".git/"
]

regexes = [
  "process\\.env\\.",      # Environment variable references
  "\\$\\{[A-Z_]+\\}",      # Template literals
  "\"?SK_TEST_|\"?PK_TEST_",  # Test keys
]
```

**Dependencies**:
- Gitleaks (external binary, installed via npm or system package manager)
- No additional npm packages needed (use built-in child_process)

---

## 4. Additional Tools Selected

### Terminal Output: chalk

```typescript
import chalk from 'chalk';

console.log(chalk.green('✓ All tests pass'));
console.log(chalk.red('✗ Tests failed'));
console.log(chalk.yellow('⚠ Warning: coverage below threshold'));
```

### File Matching: fast-glob

```typescript
import fastGlob from 'fast-glob';

const files = await fastGlob([
  'apps/**/*.ts',
  'packages/**/*.ts',
  '!**/*.test.ts',
  '!**/*.spec.ts'
]);
```

### TypeScript Compilation: tsc API

```typescript
import * as tsc from 'typescript';

const program = tsc.createProgram(files, tsConfig);
const result = tsc.emit(program);

const diagnostics = tsc.getPreEmitDiagnostics(program);
if (diagnostics.length > 0) {
  // Type errors found
}
```

### Linting: Execute Biome/ESLint CLI

```typescript
import { spawn } from 'child_process';

async function runLint(): Promise<boolean> {
  const biome = spawn('bun', ['run', 'lint'], {
    stdio: 'pipe'
  });

  // Wait for exit and check exit code
  return biome.exitCode === 0;
}
```

---

## 5. Summary of Selected Dependencies

| Purpose | Package | Version | Notes |
|---------|---------|---------|-------|
| Markdown parsing | gray-matter | ^4.0.0 | Frontmatter extraction |
| AST manipulation | unified | ^11.0.0 | Plugin architecture |
| Markdown to AST | remark-parse | ^11.0.0 | Parse markdown |
| AST to Markdown | remark-stringify | ^11.0.0 | Preserve formatting |
| GFM support | remark-gfm | ^4.0.0 | GitHub Flavored Markdown |
| Terminal colors | chalk | ^5.3.0 | CLI output formatting |
| File matching | fast-glob | ^3.3.0 | Pattern matching |
| Secret detection | gitleaks | ^8.18.0 | External binary |
| Test coverage | playwright | (existing) | Built-in coverage |
| Test coverage | bun | (existing) | Native --coverage |
| TypeScript | typescript | ^5.3.0 | tsc API |
| Validation | zod | ^3.22.0 | Runtime validation |

---

## 6. Implementation Risks and Mitigations

### Risk: Markdown Formatting Loss

**Mitigation**: Use remark-stringify which preserves formatting through AST position tracking

### Risk: Secret Detection False Positives

**Mitigation**:
- Comprehensive allowlist configuration
- Exclude test keys and environment variable references
- Entropy analysis for high-randomness strings

### Risk: Coverage Performance

**Mitigation**:
- Use per-session caching (memoize results)
- Only scan critical paths for 100% requirement
- Parallelize independent checks

### Risk: prp.md Corruption

**Mitigation**:
- Create backup before modification
- Use Git to verify changes
- Provide `--dry-run` flag for preview

---

## 7. References

- [gray-matter npm package](https://www.npmjs.com/package/gray-matter)
- [remarkjs/remark](https://github.com/remarkjs/remark)
- [Playwright Coverage API](https://playwright.dev/docs/api/class-coverage)
- [Bun Test Coverage](https://bun.com/docs/guides/test/coverage)
- [Gitleaks GitHub](https://github.com/gitleaks/gitleaks)
- [Secret Patterns Database](https://swissskyrepo.github.io/PayloadsAllTheThings/API%20Key%20Leaks/)
