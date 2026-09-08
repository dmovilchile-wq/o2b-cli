import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/adapters/claude-code/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureProject = path.join(here, '..', 'fixtures', 'claude-project');
const emptyHome = path.join(here, '..', 'fixtures', 'nonexistent-home');

describe('ClaudeCodeAdapter', () => {
  it('detects a project with a .claude directory', async () => {
    const adapter = new ClaudeCodeAdapter();
    await expect(adapter.detect(fixtureProject, emptyHome)).resolves.toBe(true);
  });

  it('does not detect a project with no .claude directory and no global config', async () => {
    const adapter = new ClaudeCodeAdapter();
    await expect(adapter.detect(emptyHome, emptyHome)).resolves.toBe(false);
  });

  it('collects the fixture agent with parsed frontmatter', async () => {
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const planner = collected.agents.find((a) => a.name === 'planner');
    expect(planner).toBeDefined();
    expect(planner?.description).toBe('Breaks a task into verifiable steps before coding.');
    expect(planner?.model).toBe('opus');
    expect(planner?.scope).toBe('project');
  });

  it('collects the fixture skill with parsed frontmatter', async () => {
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const skill = collected.skills.find((s) => s.name === 'demo-skill');
    expect(skill).toBeDefined();
    expect(skill?.description).toContain('tiny demo skill');
  });

  it('collects the project CLAUDE.md as an instruction source', async () => {
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const claudeMd = collected.instructionSources.find(
      (i) => i.kind === 'CLAUDE.md' && i.scope === 'project'
    );
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.sizeBytes).toBeGreaterThan(0);
  });
});
