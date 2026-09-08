import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { buildCrashReport } from '../../src/crash-report.js';

describe('buildCrashReport — beta safety', () => {
  it('redacts the caller home directory from the error message and stack', () => {
    const home = os.homedir();
    const err = new Error(`ENOENT: no such file or directory, open '${home}/.claude/settings.json'`);
    err.stack = `Error: boom\n    at ${home}/some/file.js:1:1`;
    const report = buildCrashReport(err, {
      o2bVersion: '0.2.0-beta.1',
      command: 'doctor',
      includeStack: true,
      harnessesDetected: ['claude-code'],
    });
    expect(report.errorMessage).not.toContain(home);
    expect(report.errorMessage).toContain('<HOME>');
    expect(report.stack).not.toContain(home);
  });

  it('redacts secret-shaped substrings from the error message', () => {
    const err = new Error('failed parsing token github_pat_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    const report = buildCrashReport(err, {
      o2bVersion: '0.2.0-beta.1',
      command: 'doctor',
      includeStack: false,
      harnessesDetected: [],
    });
    expect(report.errorMessage).not.toContain('github_pat_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    expect(report.errorMessage).toContain('[REDACTED]');
  });

  it('omits the stack entirely when includeStack is false', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at somewhere';
    const report = buildCrashReport(err, {
      o2bVersion: '0.2.0-beta.1',
      command: 'doctor',
      includeStack: false,
      harnessesDetected: [],
    });
    expect(report.stack).toBeUndefined();
  });

  it('never includes env var values (report has no such field at all)', () => {
    const err = new Error('boom');
    const report = buildCrashReport(err, {
      o2bVersion: '0.2.0-beta.1',
      command: 'doctor',
      includeStack: false,
      harnessesDetected: [],
    });
    expect(Object.keys(report)).not.toContain('env');
  });
});
