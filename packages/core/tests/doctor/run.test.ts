import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runDoctor } from '../../src/doctor/run.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, '..', 'fixtures');
const claudeProject = path.join(fixturesDir, 'claude-project');
const emptyDir = path.join(fixturesDir, 'nonexistent-home');

describe('runDoctor — end-to-end over fixtures (read-only)', () => {
  it('produces a full InventorySnapshot with all four scores present', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    expect(snapshot.scores.security).toBeDefined();
    expect(snapshot.scores.configuration).toBeDefined();
    expect(snapshot.scores.contextConfiguration).toBeDefined();
    expect(snapshot.scores.compatibility).toBeDefined();
  });

  it('detects the fixture agent and skill via the ClaudeCodeAdapter', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    expect(snapshot.agents.some((a) => a.name === 'planner')).toBe(true);
    expect(snapshot.skills.some((s) => s.name === 'demo-skill')).toBe(true);
  });

  it('finds no security findings in the clean fixture project', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    expect(snapshot.findings).toHaveLength(0);
    expect(snapshot.scores.security.value).toBe(100);
  });

  it('returns an empty snapshot (not a crash) when nothing is configured', async () => {
    const snapshot = await runDoctor(emptyDir, emptyDir);
    expect(snapshot.harnesses).toHaveLength(0);
    expect(snapshot.agents).toHaveLength(0);
    expect(snapshot.scores.security.value).toBe(100);
  });

  it('leaves recommendations empty — that is optimize\'s job, not doctor\'s', async () => {
    const snapshot = await runDoctor(claudeProject, emptyDir);
    expect(snapshot.recommendations).toHaveLength(0);
  });
});
