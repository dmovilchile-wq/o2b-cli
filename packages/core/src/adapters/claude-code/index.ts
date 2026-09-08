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

async function collectHooksAndPlugins(
  settingsPath: string,
  scope: Scope,
  warnings: string[]
): Promise<{ hooks: CollectedEntities['hooks']; mcpServers: CollectedEntities['mcpServers'] }> {
  const hooks: CollectedEntities['hooks'] = [];
  const mcpServers: CollectedEntities['mcpServers'] = [];
  const settings = await readJsonSafe(settingsPath);
  if (!settings) return { hooks, mcpServers };

  const hooksConfig = settings.hooks || {};
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
          id: `claude-code:${scope}:hook:${event}:${hookIndex}`,
          event,
          command,
          sourcePath: settingsPath,
          scope,
          riskFlags: riskFlagsForCommand(command),
        });
      }
    }
  }
  return { hooks, mcpServers };
}

async function collectMcpServers(
  mcpJsonPath: string,
  scope: Scope
): Promise<CollectedEntities['mcpServers']> {
  const servers: CollectedEntities['mcpServers'] = [];
  const config = await readJsonSafe(mcpJsonPath);
  if (!config?.mcpServers) return servers;
  for (const [name, def] of Object.entries<any>(config.mcpServers)) {
    const envVarNames = def?.env ? Object.keys(def.env) : [];
    servers.push({
      id: `claude-code:${scope}:mcp:${name}`,
      name,
      transport: def?.url ? 'http' : def?.command ? 'stdio' : 'unknown',
      command: def?.command,
      url: def?.url,
      envVarNames,
      scope,
      sourcePath: mcpJsonPath,
    });
  }
  return servers;
}

async function collectInstructionSource(
  filePath: string,
  kind: 'CLAUDE.md' | 'settings.json',
  scope: Scope
): Promise<CollectedEntities['instructionSources'][number] | null> {
  if (!(await pathExists(filePath))) return null;
  try {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return {
      id: `claude-code:${scope}:instruction:${kind}`,
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

    const [globalHooks, projectHooks] = await Promise.all([
      collectHooksAndPlugins(path.join(globalRoot, 'settings.json'), 'global', result.warnings),
      collectHooksAndPlugins(path.join(projectRoot, 'settings.json'), 'project', result.warnings),
    ]);
    result.hooks = [...globalHooks.hooks, ...projectHooks.hooks];

    const [globalMcp, projectMcp] = await Promise.all([
      collectMcpServers(path.join(globalRoot, '.mcp.json'), 'global'),
      collectMcpServers(path.join(projectRoot, '.mcp.json'), 'project'),
    ]);
    result.mcpServers = [...globalMcp, ...projectMcp];

    const instructionCandidates = await Promise.all([
      collectInstructionSource(path.join(homeDir, 'CLAUDE.md'), 'CLAUDE.md', 'global'),
      collectInstructionSource(path.join(rootDir, 'CLAUDE.md'), 'CLAUDE.md', 'project'),
      collectInstructionSource(path.join(globalRoot, 'settings.json'), 'settings.json', 'global'),
      collectInstructionSource(path.join(projectRoot, 'settings.json'), 'settings.json', 'project'),
    ]);
    result.instructionSources = instructionCandidates.filter(
      (x): x is NonNullable<typeof x> => x !== null
    );

    return result;
  }
}
