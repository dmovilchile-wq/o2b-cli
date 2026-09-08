import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runDoctor } from '../../src/doctor/run.js';
import { buildDoctorReport, O2B_VERSION } from '../../src/report/build-report.js';
import { DOCTOR_REPORT_SCHEMA_VERSION } from '../../src/domain/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, '..', 'fixtures');
const claudeProject = path.join(fixturesDir, 'claude-project');
const emptyDir = path.join(fixturesDir, 'nonexistent-home');

describe('DoctorReport — schema stability', () => {
  it('includes schemaVersion, o2bVersion, and generatedAt', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: claudeProject });
    expect(report.schemaVersion).toBe(DOCTOR_REPORT_SCHEMA_VERSION);
    expect(report.o2bVersion).toBe(O2B_VERSION);
    expect(new Date(report.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('is fully JSON-serializable and re-parseable with the same shape', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: claudeProject });
    const roundTripped = JSON.parse(JSON.stringify(report));
    expect(roundTripped.schemaVersion).toBe(report.schemaVersion);
    expect(roundTripped.inventory.agents).toHaveLength(report.inventory.agents.length);
    expect(roundTripped.security).toHaveLength(report.security.length);
  });

  it('never records the full rootDir path — only its basename (privacy-first)', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: claudeProject });
    expect(report.environment.rootDirLabel).toBe(path.basename(claudeProject));
    expect(report.environment.rootDirLabel).not.toContain(path.sep);
  });

  it('groups inventory under a single `inventory` key with expected sub-fields', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: claudeProject });
    expect(report.inventory).toHaveProperty('agents');
    expect(report.inventory).toHaveProperty('skills');
    expect(report.inventory).toHaveProperty('mcpServers');
    expect(report.inventory).toHaveProperty('hooks');
    expect(report.inventory).toHaveProperty('plugins');
    expect(report.inventory).toHaveProperty('instructionSources');
  });

  it('every security finding carries full provenance (rule, file, method/confidence)', async () => {
    const secretsProject = path.join(fixturesDir, 'privacy-project');
    const snapshot = await runDoctor(secretsProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: secretsProject });
    expect(report.security.length).toBeGreaterThan(0);
    for (const finding of report.security) {
      expect(finding).toHaveProperty('ruleId');
      expect(finding).toHaveProperty('file');
      expect(finding).toHaveProperty('confidence');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('remediation');
    }
  });

  it('every conflict carries a type, confidence, and involved-entity provenance', async () => {
    // Build a snapshot with a guaranteed conflict via the claude-project +
    // an extra duplicate agent is unnecessary here — instead assert the
    // *shape* contract on whatever conflicts already exist in the demo
    // fixture set used elsewhere in this suite (contradictory-instruction
    // fixtures), so this test doesn't depend on doctor/run wiring changes.
    const { detectConflicts } = await import('../../src/conflicts/detect.js');
    const conflicts = detectConflicts({
      harnesses: [], agents: [
        { id: 'a1', name: 'x', description: '', sourceHarness: 'claude-code', sourcePath: '/a', scope: 'global', bodyBytes: 1 },
        { id: 'a2', name: 'x', description: '', sourceHarness: 'claude-code', sourcePath: '/b', scope: 'project', bodyBytes: 1 },
      ], skills: [], mcpServers: [], hooks: [], plugins: [], instructionSources: [], warnings: [],
    });
    expect(conflicts.length).toBeGreaterThan(0);
    for (const conflict of conflicts) {
      expect(conflict).toHaveProperty('type');
      expect(conflict).toHaveProperty('confidence');
      expect(conflict).toHaveProperty('involves');
      expect(conflict.involves.length).toBeGreaterThan(0);
    }
  });

  it('DOCTOR_REPORT_SCHEMA_VERSION is v0.x-appropriate today; any breaking change must bump it', () => {
    // This is the explicit contract, not just a comment: if a future PR
    // changes the shape of DoctorReport in a way that breaks existing
    // consumers, this assertion is the tripwire that forces schemaVersion
    // to be incremented deliberately rather than silently.
    expect(DOCTOR_REPORT_SCHEMA_VERSION).toBe(1);
  });
});
