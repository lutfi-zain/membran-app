import chalk from 'chalk';
import type { VerificationReport, ConsoleOutput, DODCriterion, VerificationResult, OutputFormat } from '../types';

/**
 * Format verification report for console output
 * @param report - Verification report
 * @param format - Output format (text, json, markdown)
 * @returns Formatted console output
 */
export function formatReport(
  report: VerificationReport,
  format: OutputFormat = 'text'
): ConsoleOutput {
  switch (format) {
    case 'json':
      return formatJsonReport(report);
    case 'markdown':
      return formatMarkdownReport(report);
    case 'text':
    default:
      return formatTextReport(report);
  }
}

/**
 * Format report as colored text
 * @param report - Verification report
 * @returns Formatted console output
 */
function formatTextReport(report: VerificationReport): ConsoleOutput {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('🔍 DOD Verification'));
  lines.push(chalk.gray('─'.repeat(60)));
  lines.push('');

  // Milestone info if specified
  if (report.milestone) {
    lines.push(chalk.bold(`Milestone ${report.milestone}`));
    lines.push('');
  }

  // Individual criterion results
  for (let i = 0; i < report.criteria.length; i++) {
    const criterion = report.criteria[i];
    const result = report.results.find((r) => r.criterionId === criterion.id);

    if (!result) continue;

    const status = result.status;
    const icon = getStatusIcon(status);
    const statusText = getStatusText(status, chalk);

    // Format: [icon] [id] criterion text (status)
    const idText = chalk.dim(`[${criterion.id}]`);
    const textTruncated = criterion.text.length > 60
      ? criterion.text.substring(0, 57) + '...'
      : criterion.text;

    lines.push(`${icon} ${idText} ${textTruncated} ${statusText}`);

    // Add details if verbose or failed
    if (result.details && (status !== 'passed')) {
      const detailIndent = '  ';
      lines.push(chalk.dim(`${detailIndent}${result.details.message}`));

      // Show specific details for failures
      if (result.details.metadata) {
        const metadata = result.details.metadata as Record<string, unknown>;

        if (metadata.findings && Array.isArray(metadata.findings)) {
          for (const finding of metadata.findings as Array<{ file?: string; line?: number; message?: string }>) {
            if (finding.file) {
              lines.push(chalk.dim(`${detailIndent}  ${chalk.red(finding.file)}:${finding.line || 0}`));
            }
            if (finding.message) {
              lines.push(chalk.dim(`${detailIndent}    ${finding.message}`));
            }
          }
        }
      }
    }
  }

  lines.push('');
  lines.push(chalk.gray('─'.repeat(60)));

  // Summary
  const { summary } = report;
  const summaryIcon = summary.failed === 0 ? chalk.green('✅') : chalk.red('❌');
  const percentageText = `${summary.percentage.toFixed(0)}%`;

  lines.push(
    `${summaryIcon} Summary: ${chalk.bold(`${summary.passed}/${summary.total}`)} passed (${percentageText})`
  );

  // Additional breakdown
  if (summary.failed > 0) {
    lines.push(chalk.red(`  Failed: ${summary.failed}`));
  }
  if (summary.skipped > 0) {
    lines.push(chalk.yellow(`  Skipped: ${summary.skipped}`));
  }
  if (summary.errors > 0) {
    lines.push(chalk.red(`  Errors: ${summary.errors}`));
  }

  // Duration
  lines.push(chalk.dim(`⏱  Duration: ${(report.duration / 1000).toFixed(2)}s`));

  lines.push('');

  // Determine exit code
  let exitCode = 0;
  if (summary.errors > 0) {
    exitCode = 2;
  } else if (summary.failed > 0) {
    exitCode = 1;
  }

  return {
    format: 'text',
    content: lines.join('\n'),
    exitCode,
  };
}

/**
 * Format report as JSON
 * @param report - Verification report
 * @returns Formatted console output
 */
function formatJsonReport(report: VerificationReport): ConsoleOutput {
  const json = {
    format: 'json' as const,
    milestone: report.milestone,
    criteria: report.criteria.map((c) => ({
      id: c.id,
      milestone: c.milestone,
      text: c.text,
      category: c.category,
      status: c.status,
    })),
    results: report.results.map((r) => ({
      criterionId: r.criterionId,
      status: r.status,
      duration: r.duration,
      details: r.details,
    })),
    summary: report.summary,
    duration: report.duration,
    generatedAt: report.generatedAt.toISOString(),
  };

  let exitCode = 0;
  if (report.summary.errors > 0) {
    exitCode = 2;
  } else if (report.summary.failed > 0) {
    exitCode = 1;
  }

  return {
    format: 'json',
    content: JSON.stringify(json, null, 2),
    exitCode,
  };
}

/**
 * Format report as Markdown
 * @param report - Verification report
 * @returns Formatted console output
 */
function formatMarkdownReport(report: VerificationReport): ConsoleOutput {
  const lines: string[] = [];

  lines.push('# DOD Verification Report');
  lines.push('');

  if (report.milestone) {
    lines.push(`**Milestone:** ${report.milestone}`);
    lines.push('');
  }

  lines.push('## Results');
  lines.push('');

  for (const criterion of report.criteria) {
    const result = report.results.find((r) => r.criterionId === criterion.id);

    if (!result) continue;

    const statusIcon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '○';
    const statusText = result.status.toUpperCase();

    lines.push(`- ${statusIcon} **${criterion.id}** ${criterion.text} (${statusText})`);

    if (result.details) {
      lines.push(`  - ${result.details.message}`);
    }
  }

  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total:** ${report.summary.total}`);
  lines.push(`- **Passed:** ${report.summary.passed}`);
  lines.push(`- **Failed:** ${report.summary.failed}`);
  lines.push(`- **Skipped:** ${report.summary.skipped}`);
  lines.push(`- **Errors:** ${report.summary.errors}`);
  lines.push(`- **Percentage:** ${report.summary.percentage.toFixed(0)}%`);
  lines.push('');
  lines.push(`*Duration: ${(report.duration / 1000).toFixed(2)}s*`);
  lines.push('');

  let exitCode = 0;
  if (report.summary.errors > 0) {
    exitCode = 2;
  } else if (report.summary.failed > 0) {
    exitCode = 1;
  }

  return {
    format: 'markdown',
    content: lines.join('\n'),
    exitCode,
  };
}

/**
 * Get status icon for a verification result
 * @param status - Verification status
 * @returns Icon character
 */
function getStatusIcon(status: VerificationResult['status']): string {
  switch (status) {
    case 'passed':
      return chalk.green('✓');
    case 'failed':
      return chalk.red('✗');
    case 'skipped':
      return chalk.yellow('○');
    case 'error':
      return chalk.red('!');
    default:
      return '?';
  }
}

/**
 * Get status text with color
 * @param status - Verification status
 * @param chalk - Chalk instance for colors
 * @returns Colored status text
 */
function getStatusText(
  status: VerificationResult['status'],
  chalkInstance: typeof chalk
): string {
  switch (status) {
    case 'passed':
      return chalkInstance.green('PASSED');
    case 'failed':
      return chalkInstance.red('FAILED');
    case 'skipped':
      return chalkInstance.yellow('SKIPPED');
    case 'error':
      return chalkInstance.red('ERROR');
    default:
      return 'UNKNOWN';
  }
}

/**
 * Print report to console
 * @param output - Console output to print
 */
export function printReport(output: ConsoleOutput): void {
  console.log(output.content);
}

/**
 * Format security findings table (for US3)
 * @param findings - Security findings
 * @returns Formatted table string
 */
export function formatSecurityFindingsTable(
  findings: Array<{ file: string; line: number; rule: string; severity: string; message: string }>
): string {
  if (findings.length === 0) {
    return chalk.dim('No security findings');
  }

  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold.red('Security Findings:'));
  lines.push('');

  for (const finding of findings) {
    const severityColor =
      finding.severity === 'error'
        ? chalk.red
        : finding.severity === 'warning'
        ? chalk.yellow
        : chalk.gray;

    lines.push(
      `${severityColor(finding.severity.toUpperCase())} ${finding.file}:${finding.line}`
    );
    lines.push(chalk.dim(`  Rule: ${finding.rule}`));
    lines.push(chalk.dim(`  ${finding.message}`));
    lines.push('');
  }

  return lines.join('\n');
}
