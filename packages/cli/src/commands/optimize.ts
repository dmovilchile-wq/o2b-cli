import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOptimize } from '@o2b/core';
import type { Recommendation } from '@o2b/core';

const here = path.dirname(fileURLToPath(import.meta.url));
// packages/cli/src/commands -> repo root /profiles
const DEFAULT_PROFILES_DIR = path.join(here, '..', '..', '..', '..', 'profiles');

function printRecommendations(title: string, items: Recommendation[]): void {
  if (!items.length) return;
  console.log(title);
  for (const r of items) {
    console.log(`  - ${r.targetType}:${r.targetId ?? '(n/a)'} — ${r.reason} [profile: ${r.matchedProfile}]`);
  }
  console.log('');
}

export interface OptimizeCommandOptions {
  json: boolean;
  homeDir?: string;
  profilesDir: string;
}

export function parseOptimizeArgs(args: string[]): { rootDir: string; options: OptimizeCommandOptions } {
  const options: OptimizeCommandOptions = { json: args.includes('--json'), profilesDir: DEFAULT_PROFILES_DIR };
  const homeIdx = args.indexOf('--home');
  if (homeIdx !== -1 && args[homeIdx + 1]) options.homeDir = args[homeIdx + 1];
  const profilesIdx = args.indexOf('--profiles-dir');
  if (profilesIdx !== -1 && args[profilesIdx + 1]) options.profilesDir = args[profilesIdx + 1];
  const skipNext = new Set([homeIdx + 1, profilesIdx + 1]);
  const positional = args.filter((a, i) => !a.startsWith('--') && !skipNext.has(i));
  const rootDir = positional[0] ?? process.cwd();
  return { rootDir, options };
}

export async function runOptimizeCommand(args: string[]): Promise<number> {
  const { rootDir, options } = parseOptimizeArgs(args);
  const result = await runOptimize(rootDir, options.homeDir, options.profilesDir);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.log('O2B OPTIMIZE');
  console.log(`Detected: ${result.detectedTags.join(', ') || '(sin stack detectado)'}`);
  console.log(`Matched profiles: ${result.matchedProfiles.join(', ') || '(ninguno)'}`);
  console.log('');
  printRecommendations('RECOMMENDED', result.recommendations.filter((r) => r.kind === 'add'));
  printRecommendations('POSSIBLY UNNECESSARY', result.recommendations.filter((r) => r.kind === 'review'));
  console.log('Modo solo-recomendación: no se modificó nada. `--apply` todavía no existe (ver docs/ARCHITECTURE.md).');

  return 0;
}
