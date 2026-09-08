import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { HarnessAdapter, CollectedEntities } from '../harness-adapter.js';
import { emptyCollectedEntities } from '../harness-adapter.js';
import type { Scope } from '../../domain/types.js';
import { estimateTokens } from '../../context/estimate-tokens.js';

// Cursor read-only adapter.
//
// Deliberately conservative, same policy as CodexAdapter: only reads
// sources confirmed by current official Cursor documentation
// (cursor.com/docs, fetched live 2026-09-08 — see
// docs/ADAPTER-RESEARCH-CURSOR-GEMINI-OPENCODE.md for the full
// verification table). Cursor does NOT have a documented, verifiable
// installable agents/skills marketplace format (unlike Claude Code's
// plugins) and no hooks documentation was found in what was verified —
// this adapter reports `agents: []` / `skills: []` / `hooks: []` with an
// explicit warning rather than inventing a format. Never writes to any
// Cursor file.

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

// Confirmed shape: {"mcpServers": {"name": {"command","args","env"|"url"}}}
// — identical inner shape to Claude Code's .mcp.json, confirmed
// independently against Cursor's own docs (not assumed from Claude Code).
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
      id: `cursor:${scope}:mcp:${name}`,
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

// `.cursor/rules/*.mdc` — confirmed official location and extension.
// Plain `.md` files without frontmatter are documented as ignored by
// Cursor's own rules system, so only `.mdc` files are counted here.
async function collectRules(
  rulesDir: string,
  scope: Scope,
  warnings: string[]
): Promise<CollectedEntities['instructionSources']> {
  if (!(await pathExists(rulesDir))) return [];
  const sources: CollectedEntities['instructionSources'] = [];
  async function walk(dir: string): Promise<void> {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true } as any);
    } catch (err: any) {
      warnings.push(`No se pudo leer ${dir}: ${err.message}`);
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.mdc')) {
        try {
          const stat = await fs.stat(full);
          const content = await fs.readFile(full, 'utf8');
          sources.push({
            id: `cursor:${scope}:instruction:rules:${full}`,
            kind: 'rules',
            scope,
            path: full,
            sizeBytes: stat.size,
            estimatedTokens: estimateTokens(content),
          });
        } catch (err: any) {
          warnings.push(`No se pudo leer la regla ${full}: ${err.message}`);
        }
      }
    }
  }
  await walk(rulesDir);
  return sources;
}

async function collectInstructionFile(
  filePath: string,
  kind: 'CLAUDE.md' | 'AGENTS.md',
  scope: Scope,
  idTag: string
): Promise<CollectedEntities['instructionSources'][number] | null> {
  if (!(await pathExists(filePath))) return null;
  try {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return {
      id: `cursor:${scope}:instruction:${kind}:${idTag}`,
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

export class CursorAdapter implements HarnessAdapter {
  readonly kind = 'cursor' as const;

  async detect(rootDir: string, homeDir: string): Promise<boolean> {
    const candidates = [
      path.join(rootDir, '.cursor'),
      path.join(rootDir, '.cursorrules'),
      path.join(homeDir, '.cursor'),
    ];
    for (const c of candidates) {
      if (await pathExists(c)) return true;
    }
    return false;
  }

  async collect(rootDir: string, homeDir: string): Promise<CollectedEntities> {
    const result = emptyCollectedEntities();
    result.warnings.push(
      'CursorAdapter: agents/skills instalables y hooks no se reportan — no se encontró, en la documentación oficial verificada, un formato de plugin/marketplace ni de hooks equivalente al de Claude Code (ver docs/ADAPTER-RESEARCH-CURSOR-GEMINI-OPENCODE.md).'
    );

    const globalCursor = path.join(homeDir, '.cursor');
    const projectCursor = path.join(rootDir, '.cursor');

    const [globalMcp, projectMcp] = await Promise.all([
      collectMcpServers(path.join(globalCursor, 'mcp.json'), 'global'),
      collectMcpServers(path.join(projectCursor, 'mcp.json'), 'project'),
    ]);
    result.mcpServers = [...globalMcp, ...projectMcp];

    const [globalRules, projectRules] = await Promise.all([
      collectRules(path.join(globalCursor, 'rules'), 'global', result.warnings),
      collectRules(path.join(projectCursor, 'rules'), 'project', result.warnings),
    ]);

    const instructionFiles = await Promise.all([
      collectInstructionFile(path.join(rootDir, 'AGENTS.md'), 'AGENTS.md', 'project', 'root'),
      collectInstructionFile(path.join(rootDir, '.cursorrules'), 'AGENTS.md', 'project', 'legacy-cursorrules'),
    ]);

    result.instructionSources = [
      ...globalRules,
      ...projectRules,
      ...instructionFiles.filter((x): x is NonNullable<typeof x> => x !== null),
    ];

    return result;
  }
}
