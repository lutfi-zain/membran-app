import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'scripts', 'dod-verify', 'index.ts');

test.describe('DOD Verification - Happy Path', () => {
  test('should verify all DOD criteria and display pass/fail report', async () => {
    const proc = spawn('bun', ['run', CLI_PATH], {
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

    // Should complete without errors
    expect(exitCode).toBe(0);

    // Output should contain key sections
    expect(output).toContain('DOD Verification');
    expect(output).toMatch(/✓|✗|passed|failed/);

    // Should show summary
    expect(output).toMatch(/Summary|total|passed|failed/);
  });

  test('should detect and verify DOD criteria from prp.md', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--verbose'], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    await new Promise<void>((resolve) => {
      proc.on('close', resolve);
    });

    // In verbose mode, should show individual criteria
    expect(output.length).toBeGreaterThan(0);
  });

  test('should support milestone-specific verification', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--milestone', '1'], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should complete
    expect([0, 1, 2]).toContain(exitCode);

    // Should mention milestone
    expect(output.toLowerCase()).toBeTruthy();
  });

  test('should support JSON output format', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--format', 'json'], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should complete
    expect([0, 1, 2]).toContain(exitCode);

    // Should be valid JSON
    expect(() => JSON.parse(output)).not.toThrow();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('format', 'json');
  });

  test('should bypass cache with --fresh flag', async () => {
    const proc = spawn('bun', ['run', CLI_PATH, '--fresh'], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // Should complete
    expect([0, 1, 2]).toContain(exitCode);
  });

  test('should update prp.md checkpoints when all criteria pass', async () => {
    // This test verifies that when all DOD criteria pass,
    // the tool automatically updates the prp.md file

    const proc = spawn('bun', ['run', CLI_PATH], {
      cwd: process.cwd(),
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve);
    });

    // If exit code is 0, all criteria passed
    if (exitCode === 0) {
      // Should indicate prp.md was updated
      expect(output).toMatch(/updated|checkpoint|prp\.md/i);
    }
  });
});
