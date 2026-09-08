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

  for (const profile of matched) {
    for (const mcpName of profile.recommends?.mcpServers ?? []) {
      if (installedMcpNames.has(mcpName)) continue;
      recommendations.push({
        id: nextId(),
        kind: 'add',
        targetType: 'mcpServer',
        targetId: mcpName,
        reason: `El stack detectado (${profile.matchers.anyTag.join(', ')}) suele beneficiarse de "${mcpName}".`,
        matchedProfile: profile.id,
        confidence: 'heuristic',
      });
    }
  }

  // "Possibly unnecessary": installed MCP servers that no matched profile
  // recommends or marks on-demand. Conservative — only fires when at least
  // one profile matched (otherwise we have no basis to judge relevance).
  if (matched.length > 0) {
    const relevantNames = new Set<string>();
    for (const profile of matched) {
      for (const n of profile.recommends?.mcpServers ?? []) relevantNames.add(n);
      for (const n of profile.onDemand?.mcpServers ?? []) relevantNames.add(n);
    }
    for (const server of inventory.mcpServers) {
      if (relevantNames.has(server.name)) continue;
      const discouragingProfile = matched.find((p) => p.discourages?.mcpServers?.includes(server.name));
      recommendations.push({
        id: nextId(),
        kind: 'review',
        targetType: 'mcpServer',
        targetId: server.name,
        reason: discouragingProfile?.discourages?.reason
          ?? `No detectado como relevante para el stack actual (${detectedTags.join(', ') || 'sin stack detectado'}).`,
        matchedProfile: discouragingProfile?.id ?? matched[0].id,
        confidence: 'heuristic',
      });
    }
  }

  return {
    detectedTags,
    matchedProfiles: matched.map((p) => p.id),
    recommendations,
  };
}
