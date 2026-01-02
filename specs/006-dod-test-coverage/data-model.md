# Data Model: DOD Test Coverage

**Feature**: 006-dod-test-coverage
**Date**: 2026-01-01

## Overview

This document defines the data structures and types for the DOD verification system. The system is primarily stateless (file-based and in-memory) with no persistent database requirements.

---

## Core Types

### DODCriterion

Represents a single Definition of Done item extracted from prp.md.

```typescript
interface DODCriterion {
  id: string                    // Unique identifier (e.g., "m1-c03" for Milestone 1, Checkpoint 3)
  milestone: number             // Milestone number (1-4)
  text: string                  // Human-readable description
  category: CriterionCategory   // Type of criterion
  status: 'pending' | 'passed' | 'failed' | 'skipped'
  line: number                  // Line number in prp.md
  position: {                   // AST position for updating
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

type CriterionCategory =
  | 'tests'              // Test execution and coverage
  | 'typescript'         // TypeScript compilation
  | 'lint'              // Linting rules
  | 'security'          // Security basics
  | 'documentation'     // API docs
  | 'manual'            // Manual checks (peer review)
```

### Milestone

Represents a development phase with associated DOD criteria.

```typescript
interface Milestone {
  number: number              // Milestone number (1-4)
  name: string                // Milestone name (e.g., "Core Infrastructure")
  criteria: DODCriterion[]    // All criteria in this milestone
  status: MilestoneStatus
  verifiedAt?: Date           // Last verification timestamp
}

type MilestoneStatus =
  | 'not-started'    // No criteria checked yet
  | 'in-progress'    // Some criteria checked
  | 'passed'         // All criteria passed
  | 'failed'         // One or more criteria failed
```

### VerificationResult

Represents the outcome of checking a single DOD criterion.

```typescript
interface VerificationResult {
  criterionId: string
  status: 'passed' | 'failed' | 'skipped' | 'error'
  timestamp: Date
  duration: number            // Execution time in milliseconds
  details?: VerificationDetails
}

interface VerificationDetails {
  message: string             // Human-readable result message
  error?: Error               // Error if status is 'error'
  metadata?: Record<string, unknown>  // Additional context
}

// Specific detail types
interface TestCoverageDetails extends VerificationDetails {
  coverage: number            // Coverage percentage
  threshold: number           // Required threshold (100% for critical paths)
  criticalPaths: string[]     // Paths that are 100% covered
  uncoveredPaths: string[]    // Paths below threshold
}

interface SecretDetectionDetails extends VerificationDetails {
  findings: SecretFinding[]
}

interface SecretFinding {
  file: string
  line: number
  secret: string              // Redacted (show only first/last 4 chars)
  rule: string                // Gitleaks rule that matched
}

interface TypeScriptDetails extends VerificationDetails {
  errorCount: number
  warningCount: number
  files: string[]             // Files with errors
}

interface LintDetails extends VerificationDetails {
  errorCount: number
  warningCount: number
  files: { path: string; errors: number; warnings: number }[]
}
```

### VerificationReport

Aggregates all verification results for a session.

```typescript
interface VerificationReport {
  milestone?: number          // If specified, only this milestone
  criteria: DODCriterion[]    // All checked criteria
  results: VerificationResult[]  // Individual results
  summary: ReportSummary
  generatedAt: Date
  duration: number            // Total execution time (ms)
}

interface ReportSummary {
  total: number               // Total criteria checked
  passed: number
  failed: number
  skipped: number
  errors: number              // Verification errors (not DOD failures)
  percentage: number          // Pass percentage
}

interface ConsoleOutput {
  format: 'text' | 'json' | 'markdown'
  content: string             // Formatted output
  exitCode: number            // 0 = all pass, 1 = failures, 2 = errors
}
```

### SessionCache

In-memory cache for per-session result memoization.

```typescript
interface SessionCache {
  key: string                 // Cache key (milestone + content hash)
  results: Map<string, VerificationResult>  // criterionId -> result
  timestamp: Date
  sourceHashes: Map<string, string>  // filePath -> hash (for invalidation)
}

interface CacheKey {
  milestone?: number
  prpHash: string             // Hash of prp.md content
  sourceHashes: Map<string, string>
}
```

---

## Zod Schemas

Runtime validation schemas for external data.

```typescript
import { z } from 'zod';

// DODCriterion schema
const DODCriterionSchema = z.object({
  id: z.string(),
  milestone: z.number().int().min(1).max(4),
  text: z.string(),
  category: z.enum(['tests', 'typescript', 'lint', 'security', 'documentation', 'manual']),
  status: z.enum(['pending', 'passed', 'failed', 'skipped']),
  line: z.number().int().positive(),
  position: z.object({
    start: z.object({
      line: z.number().int().positive(),
      column: z.number().int().nonnegative()
    }),
    end: z.object({
      line: z.number().int().positive(),
      column: z.number().int().nonnegative()
    })
  })
});

// VerificationResult schema
const VerificationResultSchema = z.object({
  criterionId: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'error']),
  timestamp: z.date(),
  duration: z.number().nonnegative(),
  details: z.object({
    message: z.string(),
    error: z.instanceof(Error).optional(),
    metadata: z.record(z.unknown()).optional()
  }).optional()
});

// Report summary schema
const ReportSummarySchema = z.object({
  total: z.number().nonnegative(),
  passed: z.number().nonnegative(),
  failed: z.number().nonnegative(),
  skipped: z.number().nonnegative(),
  errors: z.number().nonnegative(),
  percentage: z.number().min(0).max(100)
});

// Console output schema
const ConsoleOutputSchema = z.object({
  format: z.enum(['text', 'json', 'markdown']),
  content: z.string(),
  exitCode: z.number().int().min(0).max(2)
});
```

---

## Data Flow

### 1. Parsing Flow

```
prp.md file
    ↓ gray-matter (extract frontmatter)
    ↓ remark-parse (markdown → AST)
    ↓ AST traversal (find section 7)
    ↓ Extract checklist items
    ↓ Map to DODCriterion[]
    ↓ Group by milestone
    ↓ Milestone[]
```

### 2. Verification Flow

```
User runs `bun run dod:verify`
    ↓ Parse CLI arguments (milestone, fresh, format)
    ↓ Load session cache (if not --fresh)
    ↓ For each criterion:
    ↓   Check cache (skip if cached and source unchanged)
    ↓   Run verification (tests, typescript, lint, security)
    ↓   Store result in cache
    ↓ Aggregate results
    ↓ Generate report (text/json/markdown)
    ↓ Output to console
    ↓ Optionally update prp.md (if all passed)
```

### 3. Cache Invalidation Flow

```
Session starts
    ↓ Compute hashes of source files
    ↓ Store in session cache
    ↓ On next verification:
    ↓   Recompute hashes
    ↓   Compare with cache
    ↓   Invalidate changed file results
    ↓   Re-run only invalid criteria
```

---

## Relationships

```
Milestone (1) ──────── (*) DODCriterion
    │                        │
    │                        │
    └────────────────────────┘
                │
                │ verified
                ↓
        VerificationResult
                │
                │ aggregated into
                ↓
        VerificationReport
                │
                │ formatted as
                ↓
          ConsoleOutput
```

---

## State Management

### Stateless Components

- **Parser**: Pure function, no state
- **Verifiers**: Pure functions, take input → return result
- **Reporters**: Pure functions, format results → output

### Stateful Components

- **Session Cache**: In-memory Map, cleared on session end
- **CLI Args**: Parsed once at startup, immutable
- **Source Hashes**: Computed per file, cached for invalidation

### No Persistence Required

All state is transient:
- Cache lives only for terminal session
- prp.md is the source of truth
- No database or file-based state needed

---

## Constraints

### Performance

- Milestone verification: <60 seconds
- Full DOD verification: <2 minutes
- Cache hit: <1 second per criterion

### Memory

- Session cache: ~10MB for full monorepo
- AST in memory: ~5MB for prp.md
- Peak memory: <50MB

### Scalability

- Supports 4 milestones, ~50 criteria
- Scans entire monorepo (apps/, packages/)
- Parallel verification within milestones
