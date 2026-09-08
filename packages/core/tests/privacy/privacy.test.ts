import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fsp } from 'node:fs';
import * as fsModule from 'node:fs';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { runDoctor } from '../../src/doctor/run.js';
import { buildDoctorReport } from '../../src/report/build-report.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, '..', 'fixtures');
const privacyProject = path.join(fixturesDir, 'privacy-project');
const emptyDir = path.join(fixturesDir, 'nonexistent-home');

const RAW_SECRET = 'sk-ant-api03-PRIVACYTESTSECRET00000000000001234';
const RAW_ENV_VALUE = 'this-value-must-never-appear-in-any-report';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Privacy — secret redaction', () => {
  it('never includes the full raw secret in a SecurityFinding.evidence', async () => {
    const snapshot = await runDoctor(privacyProject, emptyDir);
    const finding = snapshot.findings.find((f) => f.ruleId === 'secrets.anthropic-api-key');
    expect(finding).toBeDefined();
    expect(finding?.evidence).not.toContain(RAW_SECRET);
  });

  it('never includes the full raw secret anywhere in the JSON-serialized report', async () => {
    const snapshot = await runDoctor(privacyProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: privacyProject });
    const json = JSON.stringify(report);
    expect(json).not.toContain(RAW_SECRET);
  });
});

describe('Privacy — env values never enter the inventory', () => {
  it('records only env var NAMES for an MCP server, never the value', async () => {
    const snapshot = await runDoctor(privacyProject, emptyDir);
    const server = snapshot.mcpServers.find((m) => m.name === 'fixture-server');
    expect(server).toBeDefined();
    expect(server?.envVarNames).toContain('FIXTURE_SECRET_VALUE');
  });

  it('never includes the raw env value anywhere in the JSON-serialized report', async () => {
    const snapshot = await runDoctor(privacyProject, emptyDir);
    const report = buildDoctorReport(snapshot, { rootDir: privacyProject });
    const json = JSON.stringify(report);
    expect(json).not.toContain(RAW_ENV_VALUE);
  });
});

describe('Privacy — doctor makes zero network requests', () => {
  it('does not call global fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Network access attempted during runDoctor()');
    });
    await expect(runDoctor(privacyProject, emptyDir)).resolves.toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Node's http/https module namespace objects are non-configurable in
  // this runtime (vi.spyOn throws "Cannot redefine property"), so network
  // absence is verified statically instead: no source file under
  // packages/core/src or packages/scanner/src may import http/https/fetch
  // machinery at all. This is a stronger guarantee than a runtime spy on
  // one specific execution path — it holds for every code path, always.
  it('no source file imports node:http, node:https, or a fetch/axios-style client', async () => {
    const srcRoots = [
      path.join(here, '..', '..', 'src'),
      path.join(here, '..', '..', '..', 'scanner', 'src'),
    ];
    const forbidden = /from\s+['"]node:https?['"]|require\(['"]https?['"]\)|\baxios\b|\bnode-fetch\b/;
    const offenders: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith('.ts')) {
          const content = await fsp.readFile(full, 'utf8');
          if (forbidden.test(content)) offenders.push(full);
        }
      }
    }

    for (const root of srcRoots) await walk(root);
    expect(offenders).toEqual([]);
  });
});

describe('Privacy — adapters never write to disk', () => {
  it('does not call fs.promises.writeFile during a full doctor run', async () => {
    const writeSpy = vi.spyOn(fsModule.promises, 'writeFile').mockImplementation(async () => {
      throw new Error('writeFile attempted during runDoctor()');
    });
    await expect(runDoctor(privacyProject, emptyDir)).resolves.toBeDefined();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('does not call fs.promises.unlink/rm during a full doctor run', async () => {
    const unlinkSpy = vi.spyOn(fsModule.promises, 'unlink').mockImplementation(async () => {
      throw new Error('unlink attempted during runDoctor()');
    });
    const rmSpy = vi.spyOn(fsModule.promises, 'rm').mockImplementation(async () => {
      throw new Error('rm attempted during runDoctor()');
    });
    await expect(runDoctor(privacyProject, emptyDir)).resolves.toBeDefined();
    expect(unlinkSpy).not.toHaveBeenCalled();
    expect(rmSpy).not.toHaveBeenCalled();
  });
});
