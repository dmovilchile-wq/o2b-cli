// O2B domain model — harness-agnostic entities.
// No file in this module may import anything from adapters/claude-code or adapters/codex.

export type HarnessKind = 'claude-code' | 'codex';
export type Scope = 'global' | 'project';
export type Confidence = 'measured' | 'heuristic' | 'estimated' | 'unknown';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface EntityRef {
  type: 'agent' | 'skill' | 'mcpServer' | 'hook' | 'plugin' | 'instructionSource';
  id: string;
}

export interface Harness {
  id: string;
  kind: HarnessKind;
  version?: string;
  configRoots: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model?: string;
  sourceHarness: HarnessKind;
  sourcePath: string;
  scope: Scope;
  bodyBytes: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  sourceHarness: HarnessKind;
  sourcePath: string;
  scope: Scope;
  frontmatterBytes: number;
  bodyBytes: number;
}

export interface MCPServer {
  id: string;
  name: string;
  transport: 'stdio' | 'http' | 'sse' | 'unknown';
  command?: string;
  url?: string;
  envVarNames: string[];
  scope: Scope;
  sourcePath: string;
  deferred?: boolean;
}

export interface Hook {
  id: string;
  event: string;
  command: string;
  sourcePath: string;
  scope: Scope;
  riskFlags: string[];
}

export interface Plugin {
  id: string;
  name: string;
  sourceHarness: HarnessKind;
  sourcePath: string;
  providedCapabilities: string[];
}

export type InstructionKind = 'CLAUDE.md' | 'AGENTS.md' | 'settings.json';

export interface InstructionSource {
  id: string;
  kind: InstructionKind;
  scope: Scope;
  path: string;
  sizeBytes: number;
  estimatedTokens: number;
}

export interface SecurityFindingLocation {
  line?: number;
}

export interface SecurityFinding {
  id: string;
  ruleId: string;
  category: 'secrets' | 'permissions' | 'hooks' | 'mcp' | 'instructions';
  severity: Severity;
  confidence: Confidence;
  file: string;
  location: SecurityFindingLocation;
  description: string;
  evidence: string;
  remediation: string;
}

export type ConflictType =
  | 'duplicate-name'
  | 'similar-description'
  | 'contradictory-instruction'
  | 'redundant-mcp'
  | 'colliding-hook'
  | 'contradictory-permission'
  | 'orphaned-reference';

export interface Conflict {
  id: string;
  type: ConflictType;
  involves: EntityRef[];
  description: string;
  severity: Severity;
  confidence: Confidence;
}

export type RecommendationKind = 'add' | 'remove' | 'review';

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  targetType: EntityRef['type'] | 'mcpServer' | 'skillTag';
  targetId?: string;
  reason: string;
  matchedProfile: string;
  confidence: Confidence;
}

export interface ProjectProfile {
  id: string;
  detectedStack: string[];
  matchedProfileFiles: string[];
}

export interface ContextBreakdownEntry {
  label: string;
  method: Confidence;
  estimatedTokens?: number;
  sizeBytes?: number;
  note?: string;
}

export interface ContextBreakdown {
  installed: ContextBreakdownEntry;
  discoverable: ContextBreakdownEntry;
  alwaysLoaded: ContextBreakdownEntry;
  onDemandPotential: ContextBreakdownEntry;
  loadedActive: ContextBreakdownEntry; // always method: 'unknown' in Phase 1
}

export interface ScoreEntry {
  value: number; // 0-100
  method: Confidence | 'measured+heuristic';
  breakdown?: string;
}

export interface HealthScores {
  security: ScoreEntry;
  configuration: ScoreEntry;
  /**
   * Deliberately NOT called "contextEfficiency": there is no validated
   * evidence that a given always-loaded token count corresponds to a
   * specific efficiency loss for any model. This measures configuration
   * size against an arbitrary, documented reference budget — see
   * docs/CONTEXT-SCORING.md and packages/core/src/doctor/scoring.ts.
   */
  contextConfiguration: ScoreEntry;
  compatibility: ScoreEntry;
}

export interface InventorySnapshot {
  harnesses: Harness[];
  agents: Agent[];
  skills: Skill[];
  mcpServers: MCPServer[];
  hooks: Hook[];
  plugins: Plugin[];
  instructionSources: InstructionSource[];
  findings: SecurityFinding[];
  conflicts: Conflict[];
  recommendations: Recommendation[];
  contextBreakdown: ContextBreakdown;
  scores: HealthScores;
}

// --- Versioned, storable report shape -------------------------------------
// This is what `o2b doctor --json` actually emits, and what a future O2B
// Pro backend would persist as a historical snapshot. Wrapping
// InventorySnapshot (the in-memory analysis result) in a stable envelope
// means the core analysis code never needs to change just because
// persistence is added later — only `report/build-report.ts` would.

export const DOCTOR_REPORT_SCHEMA_VERSION = 1;

export interface ReportEnvironment {
  /** Anonymized by default: absolute paths are never included here. */
  os: NodeJS.Platform;
  nodeVersion: string;
  rootDirLabel: string; // basename only, never a full path — see docs/PRIVACY.md
}

export interface DoctorReport {
  schemaVersion: number;
  o2bVersion: string;
  generatedAt: string; // ISO 8601
  environment: ReportEnvironment;
  harnesses: Harness[];
  inventory: {
    agents: Agent[];
    skills: Skill[];
    mcpServers: MCPServer[];
    hooks: Hook[];
    plugins: Plugin[];
    instructionSources: InstructionSource[];
  };
  security: SecurityFinding[];
  conflicts: Conflict[];
  context: ContextBreakdown;
  recommendations: Recommendation[];
  scores: HealthScores;
}

// --- Baseline comparison (local-only in Phase 1; no history persistence) --

export interface ScoreDelta {
  metric: keyof HealthScores;
  before: number;
  after: number;
  delta: number;
}

export interface CountDelta {
  metric: 'findings' | 'conflicts' | 'agents' | 'skills' | 'mcpServers' | 'hooks';
  before: number;
  after: number;
  delta: number;
}

export interface SnapshotDiff {
  baselineGeneratedAt: string;
  currentGeneratedAt: string;
  scoreDeltas: ScoreDelta[];
  countDeltas: CountDelta[];
  alwaysLoadedTokensDelta: { before: number; after: number; delta: number };
}
