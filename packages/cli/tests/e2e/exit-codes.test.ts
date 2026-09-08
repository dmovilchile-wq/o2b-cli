import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(here, '..', '..', 'bin', 'o2b.js');
const coreFixtures = path.join(here, '..', '..', '..', 'core', 'tests', 'fixtures');
const healthyProject = path.join(coreFixtures, 'claude-project');
const criticalProject = path.join(coreFixtures, 'privacy-project');
const warningProject = path.join(here, '..', 'fixtures', 'warning-only-project');
const emptyHome = path.join(coreFixtures, 'nonexistent-home');

function runO2b(args: string[]) {
  return spawnSync(process.execPath, [binPath, ...args], { encoding: 'utf8' });
}

// These are real, spawned CLI processes (not calling the command functions
// directly in-process) — the exit code contract only matters if the actual
// `node bin/o2b.js` invocation returns it.
describe('o2b CLI — exit code contract (real spawned processes)', () => {
  it('exit 0 (healthy) on a project with no security findings', () => {
    const result = runO2b(['doctor', healthyProject, '--home', emptyHome]);
    expect(result.status).toBe(0);
  }, 30000);

  it('exit 1 (warning) on a project with only medium/low findings', () => {
    const result = runO2b(['doctor', warningProject, '--home', emptyHome]);
    expect(result.status).toBe(1);
  }, 30000);

  it('exit 2 (critical) on a project with a critical secret finding', () => {
    const result = runO2b(['doctor', criticalProject, '--home', emptyHome]);
    expect(result.status).toBe(2);
  }, 30000);

  it('exit 3 (execution/config error) on an unknown command', () => {
    const result = runO2b(['this-command-does-not-exist']);
    expect(result.status).toBe(3);
  }, 30000);

  it('exit 0 on the no-args help output (not an error)', () => {
    const result = runO2b([]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('O2B');
  }, 30000);

  it('--strict escalates a warning-only project to exit 2', () => {
    const normal = runO2b(['doctor', warningProject, '--home', emptyHome]);
    expect(normal.status).toBe(1);
    const strict = runO2b(['doctor', warningProject, '--home', emptyHome, '--strict']);
    expect(strict.status).toBe(2);
  }, 30000);

  it('`o2b scan` prints only SECURITY FINDINGS, no INVENTORY/HEALTH sections', () => {
    const result = runO2b(['scan', criticalProject, '--home', emptyHome]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain('O2B SCAN');
    expect(result.stdout).not.toContain('INVENTORY');
    expect(result.stdout).not.toContain('HEALTH');
  }, 30000);

  it('`o2b inventory` exits 0 and lists sections regardless of security findings', () => {
    const result = runO2b(['inventory', criticalProject, '--home', emptyHome]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('O2B INVENTORY');
    expect(result.stdout).toContain('MCP SERVERS');
  }, 30000);

  it('never dumps a raw JS stack trace to a normal (non --verbose) user on error', () => {
    const result = runO2b(['diff', '/this/file/does/not/exist.json', '/neither/does/this.json']);
    expect(result.status).toBe(3);
    expect(result.stderr).not.toMatch(/at .*\.js:\d+:\d+/); // no stack frame lines
  }, 30000);

  it('`o2b report` without --sanitize refuses to run (no un-sanitized report mode)', () => {
    const result = runO2b(['report', healthyProject, '--home', emptyHome]);
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('--sanitize');
  }, 30000);

  it('`o2b report --sanitize` output never contains the real --home path', () => {
    const result = runO2b(['report', healthyProject, '--home', emptyHome, '--sanitize', '--json']);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(emptyHome);
    expect(result.stdout).not.toContain(emptyHome.replace(/\\/g, '/'));
  }, 30000);

  // Note: every CLI command already catches its own internal errors and
  // returns EXIT_EXECUTION_ERROR without re-throwing (by design — see
  // each commands/*.ts), so cli.ts's top-level catch (and therefore
  // --crash-report) only fires on a genuinely unanticipated bug, which
  // isn't something an e2e test should manufacture. `buildCrashReport`
  // itself (the sanitization logic that actually matters for beta
  // safety) is covered directly in tests/unit/crash-report.test.ts.
});
