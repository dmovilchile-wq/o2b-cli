import { describe, expect, it } from 'vitest';
import { runDoctor } from '../../src/doctor/run.js';
import { buildDoctorReport } from '../../src/report/build-report.js';
import { sanitizeDoctorReport } from '../../src/report/sanitize.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureProject = path.join(here, '..', 'fixtures', 'claude-project');
const claudeHomeFixture = path.join(here, '..', 'fixtures', 'claude-home');

describe('sanitizeDoctorReport — beta safety', () => {
  it('replaces every occurrence of homeDir and rootDir in the report with placeholder tokens', async () => {
    const snapshot = await runDoctor(fixtureProject, claudeHomeFixture);
    const report = buildDoctorReport(snapshot, { rootDir: fixtureProject });
    const sanitized = sanitizeDoctorReport(report, claudeHomeFixture, fixtureProject);

    const json = JSON.stringify(sanitized);
    expect(json.includes(claudeHomeFixture)).toBe(false);
    expect(json.includes(claudeHomeFixture.replace(/\\/g, '/'))).toBe(false);
    expect(json.includes(fixtureProject)).toBe(false);
    expect(json.includes(fixtureProject.replace(/\\/g, '/'))).toBe(false);
    expect(json).toContain('<HOME>');
  });

  it('does not mutate the input report', async () => {
    const snapshot = await runDoctor(fixtureProject, claudeHomeFixture);
    const report = buildDoctorReport(snapshot, { rootDir: fixtureProject });
    const before = JSON.stringify(report);
    sanitizeDoctorReport(report, claudeHomeFixture, fixtureProject);
    expect(JSON.stringify(report)).toBe(before);
  });

  it('still redacts security finding evidence (already true before sanitize, must remain true after)', async () => {
    const secretsProject = path.join(here, '..', 'fixtures', 'privacy-project');
    const emptyHome = path.join(here, '..', 'fixtures', 'nonexistent-home');
    const snapshot = await runDoctor(secretsProject, emptyHome);
    const report = buildDoctorReport(snapshot, { rootDir: secretsProject });
    const sanitized = sanitizeDoctorReport(report, emptyHome, secretsProject);
    for (const finding of sanitized.security) {
      expect(finding.evidence).not.toContain('this-value-must-never-appear-in-any-report');
    }
  });

  it('never contains raw env var values, only names, before or after sanitizing', async () => {
    const secretsProject = path.join(here, '..', 'fixtures', 'privacy-project');
    const emptyHome = path.join(here, '..', 'fixtures', 'nonexistent-home');
    const snapshot = await runDoctor(secretsProject, emptyHome);
    const report = buildDoctorReport(snapshot, { rootDir: secretsProject });
    const sanitized = sanitizeDoctorReport(report, emptyHome, secretsProject);
    expect(JSON.stringify(sanitized)).not.toContain('this-value-must-never-appear-in-any-report');
  });
});
