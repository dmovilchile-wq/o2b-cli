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
});
