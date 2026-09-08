import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface OptimizeProfile {
  id: string;
  matchers: { anyTag: string[] };
  recommends?: { mcpServers?: string[]; skillTags?: string[] };
  onDemand?: { mcpServers?: string[] };
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
