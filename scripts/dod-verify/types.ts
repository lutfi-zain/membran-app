import { z } from 'zod';

// ============================================================================
// TypeScript Types
// ============================================================================

export type CriterionCategory =
  | 'tests'
  | 'typescript'
  | 'lint'
  | 'security'
  | 'documentation'
  | 'manual';

export type CriterionStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export type MilestoneStatus =
  | 'not-started'
  | 'in-progress'
  | 'passed'
  | 'failed';

export type VerificationStatus = 'passed' | 'failed' | 'skipped' | 'error';

export type OutputFormat = 'text' | 'json' | 'markdown';

export interface DODCriterion {
  id: string;
  milestone: number;
  text: string;
  category: CriterionCategory;
  status: CriterionStatus;
  line: number;
  position: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface Milestone {
  number: number;
  name: string;
  criteria: DODCriterion[];
  status: MilestoneStatus;
  verifiedAt?: Date;
}

export interface VerificationDetails {
  message: string;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface TestCoverageDetails extends VerificationDetails {
  coverage: number;
  threshold: number;
  criticalPaths: string[];
  uncoveredPaths: string[];
}

export interface SecretFinding {
  file: string;
  line: number;
  secret: string;
  rule: string;
}

export interface SecretDetectionDetails extends VerificationDetails {
  findings: SecretFinding[];
}

export interface TypeScriptDetails extends VerificationDetails {
  errorCount: number;
  warningCount: number;
  files: string[];
}

export interface LintDetails extends VerificationDetails {
  errorCount: number;
  warningCount: number;
  files: { path: string; errors: number; warnings: number }[];
}

export interface SecurityFinding {
  file: string;
  line: number;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface SecurityDetails extends VerificationDetails {
  findings: SecurityFinding[];
}

export interface VerificationResult {
  criterionId: string;
  status: VerificationStatus;
  timestamp: Date;
  duration: number;
  details?: VerificationDetails;
}

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  percentage: number;
}

export interface VerificationReport {
  milestone?: number;
  criteria: DODCriterion[];
  results: VerificationResult[];
  summary: ReportSummary;
  generatedAt: Date;
  duration: number;
}

export interface ConsoleOutput {
  format: OutputFormat;
  content: string;
  exitCode: number;
}

export interface CacheKey {
  milestone?: number;
  prpHash: string;
  sourceHashes: Map<string, string>;
}

export interface SessionCache {
  key: string;
  results: Map<string, VerificationResult>;
  timestamp: Date;
  sourceHashes: Map<string, string>;
}

export interface CLIOptions {
  milestone?: number;
  fresh: boolean;
  format: OutputFormat;
  verbose: boolean;
  timeout?: number;
  prpPath?: string;
}

export interface Position {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface CheckpointItem {
  text: string;
  checked: boolean;
  line: number;
  position: Position;
  milestone?: number;
  category?: CriterionCategory;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CriterionCategorySchema = z.enum([
  'tests',
  'typescript',
  'lint',
  'security',
  'documentation',
  'manual',
]);

export const CriterionStatusSchema = z.enum([
  'pending',
  'passed',
  'failed',
  'skipped',
]);

export const MilestoneStatusSchema = z.enum([
  'not-started',
  'in-progress',
  'passed',
  'failed',
]);

export const VerificationStatusSchema = z.enum([
  'passed',
  'failed',
  'skipped',
  'error',
]);

export const OutputFormatSchema = z.enum(['text', 'json', 'markdown']);

export const PositionSchema = z.object({
  start: z.object({
    line: z.number().int().positive(),
    column: z.number().int().nonnegative(),
  }),
  end: z.object({
    line: z.number().int().positive(),
    column: z.number().int().nonnegative(),
  }),
});

export const DODCriterionSchema = z.object({
  id: z.string(),
  milestone: z.number().int().min(1).max(4),
  text: z.string(),
  category: CriterionCategorySchema,
  status: CriterionStatusSchema,
  line: z.number().int().positive(),
  position: PositionSchema,
});

export const MilestoneSchema = z.object({
  number: z.number().int().min(1).max(4),
  name: z.string(),
  criteria: z.array(DODCriterionSchema),
  status: MilestoneStatusSchema,
  verifiedAt: z.date().optional(),
});

export const VerificationDetailsSchema = z.object({
  message: z.string(),
  error: z.instanceof(Error).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SecretFindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  secret: z.string(),
  rule: z.string(),
});

export const SecretDetectionDetailsSchema = VerificationDetailsSchema.extend({
  findings: z.array(SecretFindingSchema),
});

export const TypeScriptDetailsSchema = VerificationDetailsSchema.extend({
  errorCount: z.number().nonnegative(),
  warningCount: z.number().nonnegative(),
  files: z.array(z.string()),
});

export const LintDetailsSchema = VerificationDetailsSchema.extend({
  errorCount: z.number().nonnegative(),
  warningCount: z.number().nonnegative(),
  files: z.array(
    z.object({
      path: z.string(),
      errors: z.number().nonnegative(),
      warnings: z.number().nonnegative(),
    })
  ),
});

export const SecurityFindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string(),
});

export const SecurityDetailsSchema = VerificationDetailsSchema.extend({
  findings: z.array(SecurityFindingSchema),
});

export const VerificationResultSchema = z.object({
  criterionId: z.string(),
  status: VerificationStatusSchema,
  timestamp: z.date(),
  duration: z.number().nonnegative(),
  details: VerificationDetailsSchema.optional(),
});

export const ReportSummarySchema = z.object({
  total: z.number().nonnegative(),
  passed: z.number().nonnegative(),
  failed: z.number().nonnegative(),
  skipped: z.number().nonnegative(),
  errors: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const VerificationReportSchema = z.object({
  milestone: z.number().int().min(1).max(4).optional(),
  criteria: z.array(DODCriterionSchema),
  results: z.array(VerificationResultSchema),
  summary: ReportSummarySchema,
  generatedAt: z.date(),
  duration: z.number().nonnegative(),
});

export const ConsoleOutputSchema = z.object({
  format: OutputFormatSchema,
  content: z.string(),
  exitCode: z.number().int().min(0).max(2),
});

export const CLIOptionsSchema = z.object({
  milestone: z.number().int().min(1).max(4).optional(),
  fresh: z.boolean(),
  format: OutputFormatSchema,
  verbose: z.boolean(),
  timeout: z.number().positive().optional(),
  prpPath: z.string().optional(),
});
