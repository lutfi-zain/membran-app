# Quickstart: DOD Verification Tool

**Feature**: 006-dod-test-coverage
**Last Updated**: 2026-01-01

## Overview

The DOD (Definition of Done) verification tool automatically checks all DOD criteria from prp.md section 7. It parses checkpoints, runs verification (tests, TypeScript, lint, security), displays pass/fail reports, and updates prp.md when all criteria pass.

---

## Installation

### 1. Install Dependencies

```bash
bun install
```

This installs:
- Core dependencies: gray-matter, remark, chalk, fast-glob, zod
- Dev dependencies: typescript, playwright, gitleaks

### 2. Install Gitleaks

```bash
# Via npm (recommended)
npm install -g gitleaks

# Or via system package manager
# macOS
brew install gitleaks

# Linux
wget https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz
tar xvzf gitleaks_linux_x64.tar.gz
sudo mv gitleaks /usr/bin/
```

Verify installation:
```bash
gitleaks --version
```

### 3. Add npm Script

Already added to `package.json`:
```json
{
  "scripts": {
    "dod:verify": "bun run scripts/dod-verify/index.ts",
    "dod:verify:milestone": "bun run scripts/dod-verify/index.ts --milestone",
    "dod:verify:fresh": "bun run scripts/dod-verify/index.ts --fresh"
  }
}
```

---

## Usage

### Basic Verification

Verify all DOD criteria for current state:

```bash
bun run dod:verify
```

Expected output:
```
🔍 DOD Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ TypeScript compilation (0 errors, 2 warnings)
✓ Linting (0 errors, 5 warnings)
✓ Tests (45/45 passing)
✓ Test coverage (100% for critical paths)
✓ Security basics (no secrets detected)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: 5/5 passed (100%) ✅

✓ Updated prp.md checkpoints
```

### Milestone-Specific Verification

Verify only specific milestone:

```bash
# Milestone 1: Core Infrastructure
bun run dod:verify:milestone 1

# Milestone 2: Midtrans Payment Flow
bun run dod:verify:milestone 2

# Milestone 3: Discord Bot Integration
bun run dod:verify:milestone 3

# Milestone 4: MVP Release
bun run dod:verify:milestone 4
```

### Force Fresh Verification

Bypass cache and re-run all checks:

```bash
bun run dod:verify:fresh
```

### JSON Output

Get machine-readable output:

```bash
bun run dod:verify --format json > dod-results.json
```

### Markdown Output

Generate formatted report:

```bash
bun run dod:verify --format markdown > dod-report.md
```

---

## Configuration

### Gitleaks Configuration

Create `gitleaks.toml` in repo root:

```toml
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
  "process\\.env\\.",
  "\\$\\{[A-Z_]+\\}",
  "\"?SK_TEST_|\"?PK_TEST_"
]
```

### Critical Paths Configuration

Create `coverage.config.ts`:

```typescript
export const CRITICAL_PATHS = [
  'apps/api/src/routes/auth.ts',
  'apps/api/src/routes/bot.ts',
  'apps/api/src/routes/payments.ts',
  'packages/db/src/schema/*.ts',
];

export const COVERAGE_THRESHOLD = 100;  // 100% for critical paths
```

---

## prp.md Integration

### Checkpoint Format

Section 7 of prp.md should use this format:

```markdown
## 7) Checkpoints & Definition of Done

### MVP Development Order

#### Step 1: Backend - Midtrans Integration
- [ ] Hono API scaffolded with Bun
- [ ] D1 database + Drizzle ORM configured
- [ ] Midtrans SDK integrated (create transaction)
- [ ] POST /api/payment/create endpoint
- [ ] Midtrans webhook handler (signature verification)
- [ ] Test payment flow end-to-end
- [ ] Scalar API documentation generated

#### Step 2: Backend - Discord Integration
- [ ] Discord bot application created
- [ ] Discordeno/discord.js integrated (Bun-compatible)
- [ ] Bot invite flow + permissions setup
- [ ] POST /api/discord/assign-role endpoint
- [ ] POST /api/discord/remove-role endpoint
- [ ] Test role assignment/removal
```

### Automatic Updates

When all DOD criteria pass, the tool automatically updates prp.md:

```markdown
#### Step 1: Backend - Midtrans Integration
- [x] Hono API scaffolded with Bun
- [x] D1 database + Drizzle ORM configured
- [x] Midtrans SDK integrated (create transaction)
- [x] POST /api/payment/create endpoint
- [x] Midtrans webhook handler (signature verification)
- [x] Test payment flow end-to-done
- [x] Scalar API documentation generated
```

---

## Troubleshooting

### Issue: "Gitleaks not found"

**Solution**: Install Gitleaks globally or add to PATH:
```bash
npm install -g gitleaks
```

### Issue: "Cannot parse prp.md"

**Solution**: Ensure prp.md has valid section 7 with checklist items:
```markdown
## 7) Checkpoints & Definition of Done
- [ ] Checkpoint text here
```

### Issue: "Coverage below threshold"

**Solution**: Write tests for uncovered critical paths:
```bash
# View coverage report
bun test --coverage

# Identify uncovered files
# Add tests to those files
# Re-run verification
```

### Issue: "Secrets detected"

**Solution**:
1. Check the output for file and line number
2. Move secrets to environment variables
3. Update gitleaks.toml allowlist if false positive
4. Re-run verification

### Issue: "TypeScript compilation failed"

**Solution**:
```bash
# Check specific errors
bunx tsc --noEmit

# Fix type errors
# Re-run verification
```

---

## Development

### Running Tests

```bash
# Test the verification tool itself
bunx playwright test tests/dod-verification/

# With coverage
bunx playwright test tests/dod-verification/ --coverage
```

### Adding New Verifiers

Create new verifier in `scripts/dod-verify/verifiers/`:

```typescript
// scripts/dod-verify/verifiers/custom.ts
import { VerificationResult } from '../types';

export async function verifyCustom(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Run your verification logic
    const passed = await checkCustomCriteria();

    return {
      criterionId: 'custom-check',
      status: passed ? 'passed' : 'failed',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: passed ? 'Custom check passed' : 'Custom check failed'
      }
    };
  } catch (error) {
    return {
      criterionId: 'custom-check',
      status: 'error',
      timestamp: new Date(),
      duration: Date.now() - start,
      details: {
        message: 'Custom check error',
        error: error as Error
      }
    };
  }
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: DOD Verification

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

jobs:
  dod-verify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Install Gitleaks
        run: npm install -g gitleaks

      - name: Run DOD verification
        run: bun run dod:verify

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: dod-results
          path: dod-results.json
```

---

## Exit Codes

- `0`: All criteria passed
- `1`: One or more criteria failed
- `2`: Verification error (parsing, execution, etc.)

---

## See Also

- [Data Model](data-model.md) - Type definitions and schemas
- [Research](research.md) - Technology choices and rationale
- [Implementation Plan](plan.md) - Full project structure
