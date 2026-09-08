import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CursorAdapter } from '../../src/adapters/cursor/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureProject = path.join(here, '..', 'fixtures', 'cursor-project');
const emptyHome = path.join(here, '..', 'fixtures', 'nonexistent-home');

describe('CursorAdapter', () => {
  it('detects a project with a .cursor directory', async () => {
    const adapter = new CursorAdapter();
    await expect(adapter.detect(fixtureProject, emptyHome)).resolves.toBe(true);
  });

  it('does not detect a project with no .cursor/.cursorrules and no global config', async () => {
    const adapter = new CursorAdapter();
    await expect(adapter.detect(emptyHome, emptyHome)).resolves.toBe(false);
  });

  it('collects the project .cursor/mcp.json server', async () => {
    const adapter = new CursorAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const server = collected.mcpServers.find((m) => m.name === 'fixture-cursor-mcp');
    expect(server).toBeDefined();
    expect(server?.scope).toBe('project');
    expect(server?.envVarNames).toEqual([]);
  });

  it('collects .cursor/rules/*.mdc as instruction sources', async () => {
    const adapter = new CursorAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const rule = collected.instructionSources.find((i) => i.path.endsWith('style.mdc'));
    expect(rule).toBeDefined();
    expect(rule?.kind).toBe('rules');
  });

  it('collects the project AGENTS.md', async () => {
    const adapter = new CursorAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const agentsMd = collected.instructionSources.find((i) => i.kind === 'AGENTS.md' && i.path.endsWith('AGENTS.md'));
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.sizeBytes).toBeGreaterThan(0);
  });

  it('reports empty agents/skills/hooks with an explicit warning, never invents a format', async () => {
    const adapter = new CursorAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    expect(collected.agents).toEqual([]);
    expect(collected.skills).toEqual([]);
    expect(collected.hooks).toEqual([]);
    expect(collected.warnings.some((w) => w.includes('CursorAdapter'))).toBe(true);
  });
});
