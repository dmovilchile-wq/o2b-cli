import type { DoctorReport, SnapshotDiff, HealthScores } from '../domain/types.js';

const SCORE_METRICS: (keyof HealthScores)[] = [
  'security',
  'configuration',
  'contextConfiguration',
  'compatibility',
];

/**
 * Compares two DoctorReport snapshots (CURRENT vs. BASELINE). Purely local
 * and synchronous — no history storage in Phase 1, just the diff shape that
 * a future O2B Pro history feature would compute the same way over stored
 * snapshots.
 */
export function compareSnapshots(current: DoctorReport, baseline: DoctorReport): SnapshotDiff {
  const scoreDeltas = SCORE_METRICS.map((metric) => {
    const before = baseline.scores[metric].value;
    const after = current.scores[metric].value;
    return { metric, before, after, delta: after - before };
  });

  const countDeltas = (
    [
      ['findings', baseline.security.length, current.security.length],
      ['conflicts', baseline.conflicts.length, current.conflicts.length],
      ['agents', baseline.inventory.agents.length, current.inventory.agents.length],
      ['skills', baseline.inventory.skills.length, current.inventory.skills.length],
      ['mcpServers', baseline.inventory.mcpServers.length, current.inventory.mcpServers.length],
      ['hooks', baseline.inventory.hooks.length, current.inventory.hooks.length],
    ] as const
  ).map(([metric, before, after]) => ({ metric, before, after, delta: after - before }));

  const beforeTokens = baseline.context.alwaysLoaded.estimatedTokens ?? 0;
  const afterTokens = current.context.alwaysLoaded.estimatedTokens ?? 0;

  return {
    baselineGeneratedAt: baseline.generatedAt,
    currentGeneratedAt: current.generatedAt,
    scoreDeltas,
    countDeltas,
    alwaysLoadedTokensDelta: { before: beforeTokens, after: afterTokens, delta: afterTokens - beforeTokens },
  };
}
