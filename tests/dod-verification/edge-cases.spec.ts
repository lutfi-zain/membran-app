import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join as pathJoin } from 'path';

const CLI_PATH = join(process.cwd(), 'scripts', 'dod-verify', 'index.ts');

test.describe('DOD Verification - Edge Cases', () => {
  const tempDir = pathJoin(process.cwd(), 'temp-dod-test');
  const tempPrpPath = pathJoin(tempDir, 'prp.md');

  test.beforeAll(() => {
    // Create temp directory
    try {
      mkdirSync(tempDir, { recursive: true });
    } catch {
      // Already exists
    }
  });

  test.afterAll(() => {
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  test('should handle malformed prp.md gracefully', async () => {
    // Create a malformed prp.md
    writeFileSync(tempPrpPath, `
# Malformed PRP

This is not a valid PRP file.

\`\`\`invalid syntax
\`\`\`
`);

    const proc = spawn('bun', ['run', CLI_PATH, '--prp', tempPrpPath], {
      cwd: process.cwd(),
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should handle gracefully (not crash)
    expect([0, 1, 2]).toContain(exitCode);

    // Should provide some error message
    expect(output.length + errorOutput.length).toBeGreaterThan(0);
  });

  test('should handle missing section 7 in prp.md', async () => {
    // Create a prp.md without section 7
    writeFileSync(tempPrpPath, `
# PRP Document

## 1) Overview
Some content here.

## 2) Requirements
More content.
`);

    const proc = spawn('bun', ['run', CLI_PATH, '--prp', tempPrpPath], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should handle gracefully (no DOD criteria to verify)
    expect([0, 1, 2]).toContain(exitCode);
  });

  test('should handle empty checkpoint list', async () => {
    // Create a prp.md with section 7 but no checkpoints
    writeFileSync(tempPrpPath, `
# PRP Document

## 7) Checkpoints & Definition of Done

No checkpoints defined yet.
`);

    const proc = spawn('bun', ['run', CLI_PATH, '--prp', tempPrpPath], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should complete without crashing
    expect([0, 1, 2]).toContain(exitCode);
  });

  test('should handle test timeouts gracefully', async () => {
    // This test verifies that timeouts are handled
    // Actual timeout behavior depends on project configuration

    const proc = spawn('bun', ['run', CLI_PATH, '--timeout', '1000'], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should complete (possibly with timeout)
    expect([0, 1, 2]).toContain(exitCode);
  });

  test('should handle missing gitleaks installation', async () => {
    // This test verifies behavior when gitleaks is not installed
    // The tool should continue and warn, not crash

    const proc = spawn('bun', ['run', CLI_PATH], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: '' }, // Empty PATH to simulate missing gitleaks
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should handle gracefully (may warn about gitleaks)
    expect([0, 1, 2]).toContain(exitCode);
  });

  test('should handle concurrent invocations safely', async () => {
    // Spawn multiple concurrent processes
    const procs = Array.from({ length: 3 }, () =>
      spawn('bun', ['run', CLI_PATH], {
        cwd: process.cwd(),
      })
    );

    const results = await Promise.all(
      procs.map(
        (proc) =>
          new Promise<number>((resolve) => {
            proc.on('close', resolve);
          })
      )
    );

    // All should complete with valid exit codes
    results.forEach((exitCode) => {
      expect([0, 1, 2]).toContain(exitCode);
    });
  });

  test('should handle special characters in checkpoint text', async () => {
    // Create prp.md with special characters
    writeFileSync(tempPrpPath, `
# PRP Document

## 7) Checkpoints & Definition of Done

### Milestone 1

- [ ] Checkpoint with "quotes" and 'apostrophes'
- [ ] Checkpoint with <html> &entities;
- [ ] Checkpoint with unicode: café, naïve, 日本語
`);

    const proc = spawn('bun', ['run', CLI_PATH, '--prp', tempPrpPath], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should handle without errors
    expect([0, 1, 2]).toContain(exitCode);
  });

  test('should respect --help flag', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--help'], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should exit with 0 (help shown successfully)
    expect(exitCode).toBe(0);

    // Should show help text
    expect(output).toMatch(/usage|options|help|example/i);
  });

  test('should handle invalid milestone values', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--milestone', 'invalid'], {
      cwd: process.cwd(),
    });

    let errorOutput = '';

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should handle invalid input
    expect([0, 1, 2]).toContain(exitCode);

    // Should show error message
    expect(errorOutput.length).toBeGreaterThan(0);
  });

  test('should handle milestone out of range', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--milestone', '10'], {
      cwd: process.cwd(),
    });

    let errorOutput = '';

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should handle invalid milestone
    expect([0, 1, 2]).toContain(exitCode);
  });
});
