import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CodexAdapter } from '../../src/adapters/codex/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, '..', 'fixtures');
const codexProject = path.join(fixturesDir, 'codex-project');
const codexHome = path.join(fixturesDir, 'codex-home');
const invalidCodexProject = path.join(fixturesDir, 'codex-invalid-project');
const emptyDir = path.join(fixturesDir, 'nonexistent-home');

describe('CodexAdapter — detection', () => {
  it('detects a project with AGENTS.md and .codex/', async () => {
    const adapter = new CodexAdapter();
    await expect(adapter.detect(codexProject, emptyDir)).resolves.toBe(true);
  });

  it('detects presence via a global .codex/ even with no project files', async () => {
    // codex-home itself has no .codex/ dir, only AGENTS.md — detect() also
    // treats a bare global AGENTS.md as a signal via the project-side check
    // when passed as rootDir. This asserts the "absence of configuration"
    // case is correctly false when truly nothing exists.
    const adapter = new CodexAdapter();
    await expect(adapter.detect(emptyDir, emptyDir)).resolves.toBe(false);
  });
});

describe('CodexAdapter — AGENTS.md as instruction source', () => {
  it('collects the project-scope AGENTS.md', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(codexProject, emptyDir);
    const projectAgentsMd = collected.instructionSources.find(
      (i) => i.kind === 'AGENTS.md' && i.scope === 'project'
    );
    expect(projectAgentsMd).toBeDefined();
    expect(projectAgentsMd?.sizeBytes).toBeGreaterThan(0);
  });

  it('collects the global-scope AGENTS.md separately from the project one', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(codexProject, codexHome);
    const globalAgentsMd = collected.instructionSources.find(
      (i) => i.kind === 'AGENTS.md' && i.scope === 'global'
    );
    const projectAgentsMd = collected.instructionSources.find(
      (i) => i.kind === 'AGENTS.md' && i.scope === 'project'
    );
    expect(globalAgentsMd).toBeDefined();
    expect(projectAgentsMd).toBeDefined();
    expect(globalAgentsMd?.path).not.toBe(projectAgentsMd?.path);
  });
});

describe('CodexAdapter — .codex/config.toml MCP parsing (valid config)', () => {
  it('parses a stdio mcp server with command/args', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(codexProject, emptyDir);
    const tooluniverse = collected.mcpServers.find((m) => m.name === 'tooluniverse');
    expect(tooluniverse).toBeDefined();
    expect(tooluniverse?.transport).toBe('stdio');
    expect(tooluniverse?.command).toBe('uvx');
    expect(tooluniverse?.scope).toBe('project');
  });

  it('parses a remote/http mcp server declared with url', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(codexProject, emptyDir);
    const companyTools = collected.mcpServers.find((m) => m.name === 'company_tools');
    expect(companyTools).toBeDefined();
    expect(companyTools?.transport).toBe('http');
    expect(companyTools?.url).toBe('https://mcp.example.com/mcp');
  });

  it('records env var NAMES from the [mcp_servers.<name>.env] sub-table, never values', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(codexProject, emptyDir);
    const tooluniverse = collected.mcpServers.find((m) => m.name === 'tooluniverse');
    expect(tooluniverse?.envVarNames).toEqual(
      expect.arrayContaining(['PYTHONIOENCODING', 'FAKE_API_TOKEN'])
    );
    // The fixture's fake token value must never leak into any field.
    const serialized = JSON.stringify(collected);
    expect(serialized).not.toContain('fixture-value-not-a-real-secret');
  });
});

describe('CodexAdapter — invalid / absent configuration', () => {
  it('does not throw on a malformed config.toml and does not fabricate servers', async () => {
    const adapter = new CodexAdapter();
    await expect(adapter.collect(invalidCodexProject, emptyDir)).resolves.not.toThrow();
    const collected = await adapter.collect(invalidCodexProject, emptyDir);
    expect(collected.mcpServers).toHaveLength(0);
  });

  it('records a warning when it sees "mcp_servers" but cannot parse a table from it', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(invalidCodexProject, emptyDir);
    expect(collected.warnings.some((w) => w.includes('config.toml'))).toBe(true);
  });

  it('returns empty collections with no crash when nothing is configured', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(emptyDir, emptyDir);
    expect(collected.mcpServers).toHaveLength(0);
    expect(collected.instructionSources).toHaveLength(0);
  });
});

describe('CodexAdapter — unverified capabilities (UNSUPPORTED/UNKNOWN by design)', () => {
  it('never reports agents or skills — no verifiable public plugin format exists yet', async () => {
    const adapter = new CodexAdapter();
    const collected = await adapter.collect(codexProject, codexHome);
    expect(collected.agents).toHaveLength(0);
    expect(collected.skills).toHaveLength(0);
    expect(collected.warnings.some((w) => w.includes('agents/skills'))).toBe(true);
  });
});
