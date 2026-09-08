import os from 'node:os';
import type { HarnessAdapter } from '../adapters/harness-adapter.js';
import { ClaudeCodeAdapter } from '../adapters/claude-code/index.js';
import { CodexAdapter } from '../adapters/codex/index.js';
import { CursorAdapter } from '../adapters/cursor/index.js';
import type {
  Agent,
  Harness,
  Hook,
  InstructionSource,
  MCPServer,
  Plugin,
  Skill,
} from '../domain/types.js';

export interface RawInventory {
  harnesses: Harness[];
  agents: Agent[];
  skills: Skill[];
  mcpServers: MCPServer[];
  hooks: Hook[];
  plugins: Plugin[];
  instructionSources: InstructionSource[];
  warnings: string[];
}

const ALL_ADAPTERS: HarnessAdapter[] = [new ClaudeCodeAdapter(), new CodexAdapter(), new CursorAdapter()];

export async function collectInventory(
  rootDir: string,
  homeDir: string = os.homedir()
): Promise<RawInventory> {
  const raw: RawInventory = {
    harnesses: [],
    agents: [],
    skills: [],
    mcpServers: [],
    hooks: [],
    plugins: [],
    instructionSources: [],
    warnings: [],
  };

  for (const adapter of ALL_ADAPTERS) {
    const detected = await adapter.detect(rootDir, homeDir);
    if (!detected) continue;
    raw.harnesses.push({
      id: adapter.kind,
      kind: adapter.kind,
      configRoots: [rootDir, homeDir],
    });
    const collected = await adapter.collect(rootDir, homeDir);
    raw.agents.push(...collected.agents);
    raw.skills.push(...collected.skills);
    raw.mcpServers.push(...collected.mcpServers);
    raw.hooks.push(...collected.hooks);
    raw.plugins.push(...collected.plugins);
    raw.instructionSources.push(...collected.instructionSources);
    raw.warnings.push(...collected.warnings);
  }

  return raw;
}
