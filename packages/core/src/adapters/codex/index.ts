import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { HarnessAdapter, CollectedEntities } from '../harness-adapter.js';
import { emptyCollectedEntities } from '../harness-adapter.js';
import type { Scope } from '../../domain/types.js';
import { estimateTokens } from '../../context/estimate-tokens.js';

// Codex read-only adapter.
//
// Deliberately conservative: only reads sources confirmed by current public
// documentation (2026) — AGENTS.md (now a cross-tool standard stewarded by
// the Agentic AI Foundation) and `.codex/config.toml`. Codex's "enterprise
// plugin system" (announced March 2026) has no verifiable public spec as of
// this writing, so this adapter does NOT report agents/skills for Codex —
// it reports `agents: []` / `skills: []` with an explicit warning instead
// of inventing a format. Never writes to any Codex file.

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function collectAgentsMd(
  filePath: string,
  scope: Scope
): Promise<CollectedEntities['instructionSources'][number] | null> {
  if (!(await pathExists(filePath))) return null;
  try {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return {
      id: `codex:${scope}:instruction:AGENTS.md`,
      kind: 'AGENTS.md',
      scope,
      path: filePath,
      sizeBytes: stat.size,
      estimatedTokens: estimateTokens(content),
    };
  } catch {
    return null;
  }
}

// Best-effort, intentionally narrow extraction of `[mcp_servers.<name>]`
// TOML tables (and their `[mcp_servers.<name>.env]` sub-tables). This is
// NOT a general TOML parser — it only recognizes the exact shape confirmed
// against current public Codex documentation:
//   [mcp_servers.tooluniverse]
//   command = "uvx"
//   args = ["--refresh", "tooluniverse"]
//   [mcp_servers.tooluniverse.env]
//   PYTHONIOENCODING = "utf-8"
// ...and the remote/HTTP shape:
//   [mcp_servers.company_tools]
//   url = "https://mcp.example.com/mcp"
// Anything else is skipped with a warning rather than guessed at. Env var
// NAMES only are ever recorded — never values (privacy-first, matches the
// ClaudeCodeAdapter's envVarNames contract).
function extractMcpServersFromToml(
  toml: string,
  sourcePath: string,
  scope: Scope,
  warnings: string[]
): CollectedEntities['mcpServers'] {
  const servers: CollectedEntities['mcpServers'] = [];
  const envVarNamesByServer = new Map<string, string[]>();

  const mainTableRegex = /\[mcp_servers\.([a-zA-Z0-9_-]+)\](?!\.)([\s\S]*?)(?=\n\[|$)/g;
  let match: RegExpExecArray | null;
  while ((match = mainTableRegex.exec(toml)) !== null) {
    const [, name, body] = match;
    const commandMatch = body.match(/^\s*command\s*=\s*"([^"]*)"/m);
    const urlMatch = body.match(/^\s*url\s*=\s*"([^"]*)"/m);
    servers.push({
      id: `codex:${scope}:mcp:${name}`,
      name,
      transport: commandMatch ? 'stdio' : urlMatch ? 'http' : 'unknown',
      command: commandMatch?.[1],
      url: urlMatch?.[1],
      envVarNames: [],
      scope,
      sourcePath,
    });
  }

  const envTableRegex = /\[mcp_servers\.([a-zA-Z0-9_-]+)\.env\]([\s\S]*?)(?=\n\[|$)/g;
  while ((match = envTableRegex.exec(toml)) !== null) {
    const [, name, body] = match;
    const keys = [...body.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((m) => m[1]);
    envVarNamesByServer.set(name, keys);
  }
  for (const server of servers) {
    server.envVarNames = envVarNamesByServer.get(server.name) ?? [];
  }

  if (servers.length === 0 && /mcp_servers/.test(toml)) {
    warnings.push(
      `${sourcePath}: se detectó "mcp_servers" pero el parseo best-effort no reconoció ninguna tabla — revisar formato manualmente.`
    );
  }
  return servers;
}

export class CodexAdapter implements HarnessAdapter {
  readonly kind = 'codex' as const;

  async detect(rootDir: string, homeDir: string): Promise<boolean> {
    const candidates = [
      path.join(rootDir, 'AGENTS.md'),
      path.join(rootDir, '.codex'),
      path.join(homeDir, '.codex'),
    ];
    for (const c of candidates) {
      if (await pathExists(c)) return true;
    }
    return false;
  }

  async collect(rootDir: string, homeDir: string): Promise<CollectedEntities> {
    const result = emptyCollectedEntities();
    result.warnings.push(
      'CodexAdapter: agents/skills instalables no se reportan — Codex no tiene, a la fecha, un formato de plugin público y verificable equivalente al de Claude Code (ver docs/CODEX-ADAPTER-NOTES.md).'
    );

    const instructionCandidates = await Promise.all([
      collectAgentsMd(path.join(homeDir, 'AGENTS.md'), 'global'),
      collectAgentsMd(path.join(rootDir, 'AGENTS.md'), 'project'),
    ]);
    result.instructionSources = instructionCandidates.filter(
      (x): x is NonNullable<typeof x> => x !== null
    );

    const projectConfigToml = path.join(rootDir, '.codex', 'config.toml');
    const globalConfigToml = path.join(homeDir, '.codex', 'config.toml');
    for (const [configPath, scope] of [
      [projectConfigToml, 'project'],
      [globalConfigToml, 'global'],
    ] as const) {
      if (!(await pathExists(configPath))) continue;
      try {
        const toml = await fs.readFile(configPath, 'utf8');
        result.mcpServers.push(
          ...extractMcpServersFromToml(toml, configPath, scope, result.warnings)
        );
      } catch (err: any) {
        result.warnings.push(`No se pudo leer ${configPath}: ${err.message}`);
      }
    }

    return result;
  }
}
