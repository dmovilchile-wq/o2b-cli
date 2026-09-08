import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Confidence } from '../domain/types.js';

// A single MCP server suggestion within a profile. `reason`/`expectedEffect`
// are required so every Recommendation `optimize` produces can explain WHAT
// it's suggesting, WHY (tied to what was actually detected), and WHAT
// CHANGES if you follow it — never a bare tool name with no justification.
export interface ProfileMcpSuggestion {
  name: string;
  reason: string;
  expectedEffect: string;
  confidence: Confidence;
}

export interface OptimizeProfile {
  id: string;
  matchers: { anyTag: string[] };
  /**
   * Directly relevant, install-if-missing suggestions. Kept intentionally
   * short/empty for most profiles — detecting a stack does not by itself
   * justify recommending a specific tool; only stacks whose domain IS the
   * tool's domain (e.g. Supabase-in-deps -> the Supabase MCP) get one.
   */
  recommends?: ProfileMcpSuggestion[];
  /** Situationally useful, never pushed — printed as ON-DEMAND, not RECOMMENDED. */
  onDemand?: ProfileMcpSuggestion[];
  /** Installed servers this profile considers irrelevant to the detected stack. */
  discourages?: { mcpServers?: string[]; reason: string };
}

/** Loads every `*.profile.json` file in a directory. Data, not code — this
 * is what makes `optimize` extensible without touching the engine. */
export async function loadProfiles(profilesDir: string): Promise<OptimizeProfile[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(profilesDir)).filter((f) => f.endsWith('.profile.json'));
  } catch {
    return [];
  }
  const profiles: OptimizeProfile[] = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(path.join(profilesDir, file), 'utf8');
      profiles.push(JSON.parse(raw) as OptimizeProfile);
    } catch {
      // Malformed profile file — skip it rather than crash optimize.
    }
  }
  return profiles;
}

export function matchesProfile(profile: OptimizeProfile, detectedTags: string[]): boolean {
  return profile.matchers.anyTag.some((tag) => detectedTags.includes(tag));
}
