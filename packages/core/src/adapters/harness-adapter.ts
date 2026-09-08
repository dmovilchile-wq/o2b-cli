import type {
  Agent,
  Hook,
  HarnessKind,
  InstructionSource,
  MCPServer,
  Plugin,
  Skill,
} from '../domain/types.js';

export interface CollectedEntities {
  agents: Agent[];
  skills: Skill[];
  mcpServers: MCPServer[];
  hooks: Hook[];
  plugins: Plugin[];
  instructionSources: InstructionSource[];
  warnings: string[];
}

export interface HarnessAdapter {
  readonly kind: HarnessKind;
  detect(rootDir: string, homeDir: string): Promise<boolean>;
  collect(rootDir: string, homeDir: string): Promise<CollectedEntities>;
}

export function emptyCollectedEntities(): CollectedEntities {
  return {
    agents: [],
    skills: [],
    mcpServers: [],
    hooks: [],
    plugins: [],
    instructionSources: [],
    warnings: [],
  };
}
