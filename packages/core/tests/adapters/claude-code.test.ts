import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/adapters/claude-code/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureProject = path.join(here, '..', 'fixtures', 'claude-project');
const emptyHome = path.join(here, '..', 'fixtures', 'nonexistent-home');
const claudeHomeFixture = path.join(here, '..', 'fixtures', 'claude-home');

// The plugin fixture's `installPath` must be an absolute path that
// actually exists on disk (the adapter checks it to derive
// providedCapabilities), so it can't be committed as a static fixture
// value. Copy the fixture to a scratch temp dir per test run and patch
// the placeholder to the real, resolved path. Optionally also injects a
// `projects.<localScopeProjectDir>.mcpServers` entry into `.claude.json`
// (same reason: the key must be an absolute path resolved at test time).
async function materializeClaudeHomeFixture(localScopeProjectDir?: string): Promise<string> {
  const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'o2b-claude-home-'));
  await fs.cp(claudeHomeFixture, tmpHome, { recursive: true });
  const pluginInstallPath = path.join(
    tmpHome,
    '.claude',
    'plugins',
    'cache',
    'demo-plugin',
    'demo-plugin',
    '1.0.0'
  );
  const installedPluginsPath = path.join(
    tmpHome,
    '.claude',
    'plugins',
    'installed_plugins.json'
  );
  const raw = await fs.readFile(installedPluginsPath, 'utf8');
  await fs.writeFile(
    installedPluginsPath,
    raw.replace('FIXTURE_INSTALL_PATH_PLACEHOLDER', pluginInstallPath.replace(/\\/g, '\\\\')),
    'utf8'
  );

  if (localScopeProjectDir) {
    const claudeJsonPath = path.join(tmpHome, '.claude.json');
    const config = JSON.parse(await fs.readFile(claudeJsonPath, 'utf8'));
    config.projects = {
      [path.resolve(localScopeProjectDir)]: {
        mcpServers: {
          'fixture-local-scope-server': { command: 'npx', args: ['-y', 'fixture-local-mcp@1.0.0'] },
        },
      },
    };
    await fs.writeFile(claudeJsonPath, JSON.stringify(config, null, 2), 'utf8');
  }

  return tmpHome;
}

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

  it('collects the project .mcp.json at the project root (not inside .claude/)', async () => {
    // Regression test for Fase 2 dogfood bug #2 (docs/DOGFOOD-BASELINE.md):
    // the adapter used to look for .mcp.json inside .claude/, which is
    // not where Claude Code's docs say project-scope MCP config lives.
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const server = collected.mcpServers.find((m) => m.scope === 'project');
    expect(server).toBeDefined();
    expect(server?.sourcePath).toBe(path.join(fixtureProject, '.mcp.json'));
  });

  describe('with a populated home fixture (claude-home)', () => {
    it('collects the global CLAUDE.md from ~/.claude/CLAUDE.md, not ~/CLAUDE.md', async () => {
      // Regression test for Fase 2 dogfood bug #1.
      const tmpHome = await materializeClaudeHomeFixture();
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      const globalClaudeMd = collected.instructionSources.find(
        (i) => i.kind === 'CLAUDE.md' && i.scope === 'global'
      );
      expect(globalClaudeMd).toBeDefined();
      expect(globalClaudeMd?.path).toBe(path.join(tmpHome, '.claude', 'CLAUDE.md'));
      expect(globalClaudeMd?.sizeBytes).toBeGreaterThan(0);
    });

    it('collects user-scope MCP servers from ~/.claude.json', async () => {
      // Regression test for Fase 2 dogfood bug #2.
      const tmpHome = await materializeClaudeHomeFixture();
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      const server = collected.mcpServers.find((m) => m.name === 'fixture-user-scope-server');
      expect(server).toBeDefined();
      expect(server?.scope).toBe('global');
      expect(server?.sourcePath).toBe(path.join(tmpHome, '.claude.json'));
      // Never leaks env var values, only names — privacy-first, unchanged.
      expect(server?.envVarNames).toEqual([]);
    });

    it('collects installed plugins with filesystem-derived capabilities', async () => {
      // Regression test for Fase 2 dogfood bug #3.
      const tmpHome = await materializeClaudeHomeFixture();
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      const plugin = collected.plugins.find((p) => p.name === 'demo-plugin@demo-marketplace');
      expect(plugin).toBeDefined();
      expect(plugin?.sourceHarness).toBe('claude-code');
      expect(plugin?.providedCapabilities).toContain('agents');
      expect(plugin?.providedCapabilities).toContain('hooks');
    });

    it('does not report a plugin warning when the plugin is listed in enabledPlugins', async () => {
      const tmpHome = await materializeClaudeHomeFixture();
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      expect(collected.warnings.some((w) => w.includes('demo-plugin@demo-marketplace'))).toBe(false);
    });

    it('collects hooks bundled inside a plugin package (hooks/hooks.json)', async () => {
      // Fase A point 2: hooks provided by plugins, confirmed official
      // (code.claude.com/docs/en/hooks-guide).
      const tmpHome = await materializeClaudeHomeFixture();
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      const pluginHook = collected.hooks.find((h) => h.event === 'SessionStart' && h.command.includes('plugin-hook-ran'));
      expect(pluginHook).toBeDefined();
      expect(pluginHook?.id).toContain('demo-plugin');
    });

    it('flags provider routing when settings.json sets ANTHROPIC_BASE_URL', async () => {
      // Fase A point 4: generic detection by env var NAME, not by
      // recognizing any particular vendor's tool.
      const tmpHome = await materializeClaudeHomeFixture();
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      const warning = collected.warnings.find((w) => w.includes('ANTHROPIC_BASE_URL'));
      expect(warning).toBeDefined();
      expect(warning).not.toMatch(/127\.0\.0\.1|9999/); // name only, never the value
    });

    it('collects local-scope MCP servers from ~/.claude.json -> projects.<path>', async () => {
      // Fase A point 1: MCP "local scope", per-project entries in
      // ~/.claude.json's `projects` map, confirmed official + against a
      // real ~/.claude.json during this Fase.
      const tmpHome = await materializeClaudeHomeFixture(fixtureProject);
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(fixtureProject, tmpHome);
      const server = collected.mcpServers.find((m) => m.name === 'fixture-local-scope-server');
      expect(server).toBeDefined();
      expect(server?.scope).toBe('project');
    });

    it('does NOT match a local-scope entry for an unrelated rootDir', async () => {
      const tmpHome = await materializeClaudeHomeFixture(fixtureProject);
      const adapter = new ClaudeCodeAdapter();
      const collected = await adapter.collect(emptyHome, tmpHome);
      expect(collected.mcpServers.find((m) => m.name === 'fixture-local-scope-server')).toBeUndefined();
    });
  });

  it('collects a project-local settings.local.json hook, separate from settings.json', async () => {
    // Fase A: `.claude/settings.local.json` — confirmed official
    // (code.claude.com/docs/en/settings), previously not read at all.
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const localHook = collected.hooks.find((h) => h.command.includes('local-only-hook'));
    expect(localHook).toBeDefined();
    expect(localHook?.sourcePath).toBe(path.join(fixtureProject, '.claude', 'settings.local.json'));
  });

  it('collects .claude/rules/*.md, marking path-scoped rules as not alwaysLoaded', async () => {
    // Fase A point 3.
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(fixtureProject, emptyHome);
    const rules = collected.instructionSources.filter((i) => i.kind === 'rules');
    expect(rules.length).toBe(2);
    const unconditional = rules.find((r) => r.path.endsWith('unconditional.md'));
    const pathScoped = rules.find((r) => r.path.endsWith('path-scoped.md'));
    expect(unconditional?.alwaysLoaded).not.toBe(false);
    expect(pathScoped?.alwaysLoaded).toBe(false);
  });
});
