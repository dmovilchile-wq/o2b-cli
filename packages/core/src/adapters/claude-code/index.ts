import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { HarnessAdapter, CollectedEntities } from '../harness-adapter.js';
import { emptyCollectedEntities } from '../harness-adapter.js';
import type { Scope } from '../../domain/types.js';
import { parseFrontmatterMarkdown } from './frontmatter.js';
import { estimateTokens } from '../../context/estimate-tokens.js';

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJsonSafe(filePath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function collectAgentsFrom(
  dir: string,
  scope: Scope,
  warnings: string[]
): Promise<CollectedEntities['agents']> {
  const agents: CollectedEntities['agents'] = [];
  if (!(await pathExists(dir))) return agents;
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch (err: any) {
    warnings.push(`No se pudo leer agentes en ${dir}: ${err.message}`);
    return agents;
  }
  for (const file of entries) {
    const fullPath = path.join(dir, file);
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      const parsed = parseFrontmatterMarkdown(raw);
      const name = parsed.frontmatter.name || path.basename(file, '.md');
      agents.push({
        id: `claude-code:${scope}:agent:${name}`,
        name,
        description: parsed.frontmatter.description || '',
        model: parsed.frontmatter.model,
        sourceHarness: 'claude-code',
        sourcePath: fullPath,
        scope,
        bodyBytes: parsed.bodyBytes,
      });
    } catch (err: any) {
      warnings.push(`No se pudo leer el agente ${fullPath}: ${err.message}`);
    }
  }
  return agents;
}

async function collectSkillsFrom(
  dir: string,
  scope: Scope,
  warnings: string[]
): Promise<CollectedEntities['skills']> {
  const skills: CollectedEntities['skills'] = [];
  if (!(await pathExists(dir))) return skills;
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true } as any).then((list: any[]) =>
      list.filter((d) => d.isDirectory()).map((d) => d.name)
    );
  } catch (err: any) {
    warnings.push(`No se pudo leer skills en ${dir}: ${err.message}`);
    return skills;
  }
  for (const skillDir of entries) {
    const skillFile = path.join(dir, skillDir, 'SKILL.md');
    if (!(await pathExists(skillFile))) continue;
    try {
      const raw = await fs.readFile(skillFile, 'utf8');
      const parsed = parseFrontmatterMarkdown(raw);
      const name = parsed.frontmatter.name || skillDir;
      skills.push({
        id: `claude-code:${scope}:skill:${name}`,
        name,
        description: parsed.frontmatter.description || '',
        sourceHarness: 'claude-code',
        sourcePath: skillFile,
        scope,
        frontmatterBytes: parsed.frontmatterBytes,
        bodyBytes: parsed.bodyBytes,
      });
    } catch (err: any) {
      warnings.push(`No se pudo leer el skill ${skillFile}: ${err.message}`);
    }
  }
  return skills;
}

function riskFlagsForCommand(command: string): string[] {
  const flags: string[] = [];
  if (/--dangerously-skip-permissions/.test(command)) flags.push('skips-permission-checks');
  if (/\brm\s+-rf\b/.test(command)) flags.push('recursive-delete');
  if (/curl|wget/.test(command) && /\|\s*(sh|bash)\b/.test(command)) flags.push('pipe-to-shell');
  return flags;
}

// Shared by settings.json / settings.local.json (`hooks: {...}` block)
// and a plugin's own `hooks/hooks.json` (`{ hooks: {...} }` — same inner
// shape, confirmed empirically against 3 real installed plugins during
// Fase 2/3 dogfood: ecc, headroom, claude-mem all use this structure).
function parseHooksConfig(
  hooksConfig: Record<string, any>,
  sourcePath: string,
  scope: Scope,
  idPrefix: string
): CollectedEntities['hooks'] {
  const hooks: CollectedEntities['hooks'] = [];
  let hookIndex = 0;
  for (const [event, entries] of Object.entries<any>(hooksConfig)) {
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      const matchers = entry?.hooks || (entry?.command ? [entry] : []);
      for (const h of matchers) {
        const command = h?.command || '';
        if (!command) continue;
        hookIndex += 1;
        hooks.push({
          id: `${idPrefix}:${scope}:hook:${event}:${hookIndex}`,
          event,
          command,
          sourcePath,
          scope,
          riskFlags: riskFlagsForCommand(command),
        });
      }
    }
  }
  return hooks;
}

// Generic, non-hardcoded detection of API provider routing: any of these
// env var NAMES (not values) being set in settings.json's `env` block
// means Anthropic API traffic may be routed through something other
// than the default endpoint (a corporate proxy, Bedrock/Vertex, a local
// gateway, etc.) — legitimate in many setups, but worth surfacing as a
// compatibility note since it changes what "the API" means for this
// session. Names are documented Claude Code / Anthropic SDK env vars,
// not any specific vendor's tool.
const PROVIDER_ROUTING_ENV_VARS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
] as const;

function detectProviderRoutingWarnings(
  settings: any,
  sourcePath: string,
  warnings: string[]
): void {
  const env = settings?.env;
  if (!env || typeof env !== 'object') return;
  const present = PROVIDER_ROUTING_ENV_VARS.filter((name) => name in env);
  if (present.length) {
    warnings.push(
      `${sourcePath}: define ${present.join(', ')} — el tráfico a la API puede estar enrutado a través de un proxy/gateway/proveedor distinto al endpoint por defecto de Anthropic. No es necesariamente un problema; verificar que sea intencional (nombres de variable únicamente, nunca sus valores).`
    );
  }
}

async function collectHooksAndPlugins(
  settingsPath: string,
  scope: Scope,
  warnings: string[]
): Promise<{ hooks: CollectedEntities['hooks']; mcpServers: CollectedEntities['mcpServers'] }> {
  const hooks: CollectedEntities['hooks'] = [];
  const mcpServers: CollectedEntities['mcpServers'] = [];
  const settings = await readJsonSafe(settingsPath);
  if (!settings) return { hooks, mcpServers };

  detectProviderRoutingWarnings(settings, settingsPath, warnings);
  hooks.push(...parseHooksConfig(settings.hooks || {}, settingsPath, scope, 'claude-code'));
  return { hooks, mcpServers };
}

// Shared by both sources of MCP server config:
//   - `.mcp.json` at the project root (project scope, checked into VCS)
//   - `~/.claude.json` -> top-level `mcpServers` (user scope, added via
//     `claude mcp add --scope user`)
// Never reads env var *values*, only names (privacy-first).
function parseMcpServersConfig(
  mcpServersConfig: Record<string, any> | undefined,
  scope: Scope,
  sourcePath: string
): CollectedEntities['mcpServers'] {
  const servers: CollectedEntities['mcpServers'] = [];
  if (!mcpServersConfig) return servers;
  for (const [name, def] of Object.entries<any>(mcpServersConfig)) {
    const envVarNames = def?.env ? Object.keys(def.env) : [];
    servers.push({
      id: `claude-code:${scope}:mcp:${name}`,
      name,
      transport: def?.url ? 'http' : def?.command ? 'stdio' : 'unknown',
      command: def?.command,
      url: def?.url,
      envVarNames,
      scope,
      sourcePath,
    });
  }
  return servers;
}

async function collectMcpServers(
  mcpJsonPath: string,
  scope: Scope
): Promise<CollectedEntities['mcpServers']> {
  const config = await readJsonSafe(mcpJsonPath);
  return parseMcpServersConfig(config?.mcpServers, scope, mcpJsonPath);
}

// User-scope MCP servers (`claude mcp add --scope user ...`) persist in
// `~/.claude.json` under a top-level `mcpServers` key — confirmed against
// current Claude Code docs (code.claude.com/docs/en/mcp) and against a
// real user's `~/.claude.json` during Fase 2 dogfood (see
// docs/DOGFOOD-BASELINE.md, bug #2). This is a *different* file from
// `~/.claude/settings.json` and from `~/.claude/.mcp.json`.
//
// `~/.claude.json` also has a `projects.<absolutePath>.mcpServers` shape
// for "local" scope (per-project, not shared) — confirmed against
// current docs AND against a real `~/.claude.json` (Fase A of the
// second autonomous run): keys are the project's absolute path, stored
// with forward slashes even on Windows. Both slash styles are tried so
// this works regardless of platform path separator.
async function collectClaudeJsonMcpServers(
  homeDir: string,
  rootDir: string
): Promise<CollectedEntities['mcpServers']> {
  const claudeJsonPath = path.join(homeDir, '.claude.json');
  const config = await readJsonSafe(claudeJsonPath);
  if (!config) return [];

  const userScope = parseMcpServersConfig(config.mcpServers, 'global', claudeJsonPath);

  const absoluteRoot = path.resolve(rootDir);
  const candidateKeys = [absoluteRoot, absoluteRoot.replace(/\\/g, '/')];
  const projects = config.projects || {};
  const projectKey = candidateKeys.find((k) => k in projects);
  const localScope = projectKey
    ? parseMcpServersConfig(projects[projectKey].mcpServers, 'project', claudeJsonPath)
    : [];

  return [...userScope, ...localScope];
}

// Plugins installed via `claude plugin install` / the plugin marketplace
// flow are recorded in two places, both under the user's global
// `~/.claude/`:
//   - `plugins/installed_plugins.json` -> which plugins/versions are
//     installed and where (`installPath`).
//   - `settings.json` -> `enabledPlugins` -> whether each is currently
//     enabled for this user.
// `providedCapabilities` is a best-effort, filesystem-only signal (which
// of the conventional subdirectories the plugin package ships), not a
// parse of the plugin's own manifest — kept intentionally shallow to
// avoid guessing at an unspecified plugin manifest format.
const PLUGIN_CAPABILITY_DIRS = ['agents', 'skills', 'hooks', 'commands'] as const;

async function detectPluginCapabilities(installPath: string): Promise<string[]> {
  const capabilities: string[] = [];
  for (const dir of PLUGIN_CAPABILITY_DIRS) {
    if (await pathExists(path.join(installPath, dir))) capabilities.push(dir);
  }
  return capabilities;
}

async function collectPlugins(
  globalRoot: string,
  homeDir: string,
  warnings: string[]
): Promise<{ plugins: CollectedEntities['plugins']; hooks: CollectedEntities['hooks'] }> {
  const plugins: CollectedEntities['plugins'] = [];
  const pluginHooks: CollectedEntities['hooks'] = [];
  const installedPath = path.join(globalRoot, 'plugins', 'installed_plugins.json');
  const installed = await readJsonSafe(installedPath);
  if (!installed?.plugins) return { plugins, hooks: pluginHooks };

  const settings = await readJsonSafe(path.join(globalRoot, 'settings.json'));
  const enabledPlugins: Record<string, boolean> = settings?.enabledPlugins ?? {};

  for (const [pluginKey, entries] of Object.entries<any>(installed.plugins)) {
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      const installPath: string | undefined = entry?.installPath;
      const capabilities = installPath
        ? await detectPluginCapabilities(installPath)
        : [];
      plugins.push({
        id: `claude-code:plugin:${pluginKey}`,
        name: pluginKey,
        sourceHarness: 'claude-code',
        sourcePath: installPath ?? installedPath,
        providedCapabilities: capabilities,
        // `enabled` is not part of the current Plugin domain type; kept
        // out of scope for this pass rather than widening the schema
        // mid-fix (see docs/AUTONOMOUS-RUN.md).
      });
      if (!(pluginKey in enabledPlugins)) {
        warnings.push(
          `Plugin "${pluginKey}" está instalado (${installedPath}) pero no aparece en enabledPlugins de ${path.join(globalRoot, 'settings.json')} — estado de activación desconocido.`
        );
      }

      // A plugin's own `hooks/hooks.json` is bundled with it and active
      // when the plugin is enabled — confirmed against current Claude
      // Code docs (code.claude.com/docs/en/hooks-guide: "Plugin
      // hooks/hooks.json ... Yes, bundled with the plugin"). Same inner
      // shape as settings.json's `hooks` block.
      if (installPath && capabilities.includes('hooks')) {
        const hooksJsonPath = path.join(installPath, 'hooks', 'hooks.json');
        const hooksConfig = await readJsonSafe(hooksJsonPath);
        if (hooksConfig?.hooks) {
          pluginHooks.push(
            ...parseHooksConfig(hooksConfig.hooks, hooksJsonPath, 'global', `claude-code:plugin:${pluginKey}`)
          );
        }
      }
    }
  }
  return { plugins, hooks: pluginHooks };
}

// `.claude/rules/*.md` — an additional instructions mechanism confirmed
// against current Claude Code docs (code.claude.com/docs/en/memory,
// "Organize rules with .claude/rules/"): markdown files discovered
// recursively, each either loaded unconditionally at launch (no `paths`
// frontmatter) or only when Claude reads a file matching its `paths`
// glob (on-demand — see the `alwaysLoaded` field this sets).
async function walkMarkdownFiles(dir: string, warnings: string[]): Promise<string[]> {
  const results: string[] = [];
  let entries: any[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true } as any);
  } catch (err: any) {
    warnings.push(`No se pudo leer ${dir}: ${err.message}`);
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkMarkdownFiles(full, warnings)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

async function collectRules(
  rulesDir: string,
  scope: Scope,
  warnings: string[]
): Promise<CollectedEntities['instructionSources']> {
  if (!(await pathExists(rulesDir))) return [];
  const files = await walkMarkdownFiles(rulesDir, warnings);
  const sources: CollectedEntities['instructionSources'] = [];
  for (const filePath of files) {
    try {
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = parseFrontmatterMarkdown(content);
      const isPathScoped = 'paths' in parsed.frontmatter;
      sources.push({
        id: `claude-code:${scope}:instruction:rules:${filePath}`,
        kind: 'rules',
        scope,
        path: filePath,
        sizeBytes: stat.size,
        estimatedTokens: estimateTokens(content),
        alwaysLoaded: !isPathScoped,
      });
    } catch (err: any) {
      warnings.push(`No se pudo leer la regla ${filePath}: ${err.message}`);
    }
  }
  return sources;
}

async function collectInstructionSource(
  filePath: string,
  kind: 'CLAUDE.md' | 'settings.json' | 'settings.local.json',
  scope: Scope,
  // Disambiguates the two possible project-CLAUDE.md locations
  // (`<root>/CLAUDE.md` vs `<root>/.claude/CLAUDE.md`), which otherwise
  // share the same scope+kind and would collide on id if both exist.
  idTag = 'default'
): Promise<CollectedEntities['instructionSources'][number] | null> {
  if (!(await pathExists(filePath))) return null;
  try {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return {
      id: `claude-code:${scope}:instruction:${kind}:${idTag}`,
      kind,
      scope,
      path: filePath,
      sizeBytes: stat.size,
      estimatedTokens: estimateTokens(content),
    };
  } catch {
    return null;
  }
}

export class ClaudeCodeAdapter implements HarnessAdapter {
  readonly kind = 'claude-code' as const;

  async detect(rootDir: string, homeDir: string): Promise<boolean> {
    const projectClaude = path.join(rootDir, '.claude');
    const globalClaude = path.join(homeDir, '.claude');
    return (await pathExists(projectClaude)) || (await pathExists(globalClaude));
  }

  async collect(rootDir: string, homeDir: string): Promise<CollectedEntities> {
    const result = emptyCollectedEntities();
    const globalRoot = path.join(homeDir, '.claude');
    const projectRoot = path.join(rootDir, '.claude');

    const [globalAgents, projectAgents] = await Promise.all([
      collectAgentsFrom(path.join(globalRoot, 'agents'), 'global', result.warnings),
      collectAgentsFrom(path.join(projectRoot, 'agents'), 'project', result.warnings),
    ]);
    result.agents = [...globalAgents, ...projectAgents];

    const [globalSkills, projectSkills] = await Promise.all([
      collectSkillsFrom(path.join(globalRoot, 'skills'), 'global', result.warnings),
      collectSkillsFrom(path.join(projectRoot, 'skills'), 'project', result.warnings),
    ]);
    result.skills = [...globalSkills, ...projectSkills];

    // `.claude/settings.local.json` (project-local, gitignored personal
    // overrides — e.g. permission approvals, personal hook additions)
    // sits ABOVE shared `.claude/settings.json` in Claude Code's own
    // precedence, but O2B is an inventory tool, not a runtime resolver:
    // it reports every source it finds rather than computing one
    // "winning" merged config, so both are collected as separate,
    // labeled entries — never silently combined into a claim about what
    // "the" effective config is.
    const [globalHooks, projectHooks, projectLocalHooks] = await Promise.all([
      collectHooksAndPlugins(path.join(globalRoot, 'settings.json'), 'global', result.warnings),
      collectHooksAndPlugins(path.join(projectRoot, 'settings.json'), 'project', result.warnings),
      collectHooksAndPlugins(path.join(projectRoot, 'settings.local.json'), 'project', result.warnings),
    ]);

    const pluginsResult = await collectPlugins(globalRoot, homeDir, result.warnings);
    result.plugins = pluginsResult.plugins;
    result.hooks = [
      ...globalHooks.hooks,
      ...projectHooks.hooks,
      ...projectLocalHooks.hooks,
      ...pluginsResult.hooks,
    ];

    // Project-scope `.mcp.json` lives at the project ROOT (checked into
    // VCS), not inside `.claude/` — confirmed against current Claude
    // Code docs (code.claude.com/docs/en/mcp). User-scope AND
    // per-project "local scope" servers both live in `~/.claude.json`, a
    // separate file from anything under `~/.claude/`.
    const [projectMcp, claudeJsonMcp] = await Promise.all([
      collectMcpServers(path.join(rootDir, '.mcp.json'), 'project'),
      collectClaudeJsonMcpServers(homeDir, rootDir),
    ]);
    result.mcpServers = [...claudeJsonMcp, ...projectMcp];

    // Global CLAUDE.md lives at `~/.claude/CLAUDE.md`, NOT `~/CLAUDE.md`
    // — confirmed against current Claude Code docs
    // (code.claude.com/docs/en/memory). Project CLAUDE.md can live at
    // either `<root>/CLAUDE.md` or `<root>/.claude/CLAUDE.md`; both are
    // read (docs list them as equivalent locations).
    const [instructionCandidates, globalRules, projectRules] = await Promise.all([
      Promise.all([
        collectInstructionSource(path.join(globalRoot, 'CLAUDE.md'), 'CLAUDE.md', 'global', 'home-dotclaude'),
        collectInstructionSource(path.join(rootDir, 'CLAUDE.md'), 'CLAUDE.md', 'project', 'root'),
        collectInstructionSource(path.join(projectRoot, 'CLAUDE.md'), 'CLAUDE.md', 'project', 'dotclaude'),
        collectInstructionSource(path.join(globalRoot, 'settings.json'), 'settings.json', 'global', 'home-dotclaude'),
        collectInstructionSource(path.join(projectRoot, 'settings.json'), 'settings.json', 'project', 'dotclaude'),
        collectInstructionSource(
          path.join(projectRoot, 'settings.local.json'),
          'settings.local.json',
          'project',
          'dotclaude'
        ),
      ]),
      collectRules(path.join(globalRoot, 'rules'), 'global', result.warnings),
      collectRules(path.join(projectRoot, 'rules'), 'project', result.warnings),
    ]);
    result.instructionSources = [
      ...instructionCandidates.filter((x): x is NonNullable<typeof x> => x !== null),
      ...globalRules,
      ...projectRules,
    ];

    return result;
  }
}
