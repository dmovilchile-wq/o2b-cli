import os from 'node:os';
import { collectInventory } from '../inventory/collect.js';
import { detectStackTags } from './detectors.js';
import { loadProfiles, matchesProfile, type OptimizeProfile } from './profiles.js';
import type { Recommendation } from '../domain/types.js';

export interface OptimizeResult {
  detectedTags: string[];
  matchedProfiles: string[];
  recommendations: Recommendation[];
}

let seq = 0;
const nextId = () => `recommendation-${(seq += 1)}`;

/**
 * Recommendation-only in Phase 1: never modifies anything. `applyRecommendations`
 * is intentionally not implemented — see docs/ARCHITECTURE.md §Optimize.
 *
 * STACK DETECTION (`detectStackTags`) is deliberately separate from TOOL
 * RECOMMENDATION (everything below): detecting a stack is a fact; deciding
 * something is worth adding is a judgment call that must cite a `reason`
 * and `expectedEffect` from a profile — never inferred here from the tag
 * alone. When more than one profile matches (a monorepo, or a project
 * mixing stacks), each matched profile still speaks only for its own
 * suggestions — nothing here tries to rank or merge profiles into a single
 * "best" answer, which is what would produce absurd recommendations for
 * ambiguous/combined projects.
 */
export async function runOptimize(
  rootDir: string,
  homeDir: string = os.homedir(),
  profilesDir: string
): Promise<OptimizeResult> {
  const [inventory, detectedTags, allProfiles] = await Promise.all([
    collectInventory(rootDir, homeDir),
    detectStackTags(rootDir),
    loadProfiles(profilesDir),
  ]);

  const matched: OptimizeProfile[] = allProfiles.filter((p) => matchesProfile(p, detectedTags));
  const recommendations: Recommendation[] = [];
  const installedMcpNames = new Set(inventory.mcpServers.map((m) => m.name));
  // When more than one matched profile suggests the same server (e.g. a
  // React+Vite project matching both a "react" and a "node-web" profile),
  // keep only the first mention rather than repeating it — the union of
  // legitimate signals should read as one clear list, not noise.
  const seenAddOrOnDemand = new Set<string>();

  for (const profile of matched) {
    for (const suggestion of profile.recommends ?? []) {
      if (installedMcpNames.has(suggestion.name)) continue;
      const dedupeKey = `add:${suggestion.name}`;
      if (seenAddOrOnDemand.has(dedupeKey)) continue;
      seenAddOrOnDemand.add(dedupeKey);
      recommendations.push({
        id: nextId(),
        kind: 'add',
        targetType: 'mcpServer',
        targetId: suggestion.name,
        reason: suggestion.reason,
        matchedProfile: profile.id,
        confidence: suggestion.confidence,
        expectedEffect: suggestion.expectedEffect,
      });
    }
    for (const suggestion of profile.onDemand ?? []) {
      if (installedMcpNames.has(suggestion.name)) continue;
      const dedupeKey = `on-demand:${suggestion.name}`;
      if (seenAddOrOnDemand.has(dedupeKey)) continue;
      seenAddOrOnDemand.add(dedupeKey);
      recommendations.push({
        id: nextId(),
        kind: 'on-demand',
        targetType: 'mcpServer',
        targetId: suggestion.name,
        reason: suggestion.reason,
        matchedProfile: profile.id,
        confidence: suggestion.confidence,
        expectedEffect: suggestion.expectedEffect,
      });
    }
  }

  // "Possibly unnecessary": ONLY installed MCP servers a matched profile
  // EXPLICITLY discourages by name. Deliberately NOT "anything not in
  // recommends/onDemand" — that would flag every installed server the
  // instant any generic profile matched (e.g. bare "node"), which is
  // exactly the kind of absurd, low-confidence recommendation that
  // shows up when several manifests coexist (a monorepo, a project
  // mixing stacks). Silence (no recommendation) is the correct output
  // when there's no specific, stated reason to doubt a server.
  for (const profile of matched) {
    if (!profile.discourages?.mcpServers?.length) continue;
    for (const server of inventory.mcpServers) {
      if (!profile.discourages.mcpServers.includes(server.name)) continue;
      recommendations.push({
        id: nextId(),
        kind: 'review',
        targetType: 'mcpServer',
        targetId: server.name,
        reason: profile.discourages.reason,
        matchedProfile: profile.id,
        confidence: 'heuristic',
        expectedEffect: `Revisar si "${server.name}" sigue siendo necesario para este proyecto; si no, desinstalarlo reduce superficie de configuración y contexto siempre-cargado.`,
      });
    }
  }

  return {
    detectedTags,
    matchedProfiles: matched.map((p) => p.id),
    recommendations,
  };
}
