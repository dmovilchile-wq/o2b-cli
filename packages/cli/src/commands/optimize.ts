import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOptimize } from '@o2b/core';
import type { Recommendation } from '@o2b/core';

const here = path.dirname(fileURLToPath(import.meta.url));
// Two possible layouts depending on how this file is running:
//   - bundled (packages/cli/dist/o2b.mjs): profiles are copied alongside
//     it at build time -> dist/profiles (see scripts/build.mjs).
//   - dev, via tsx (packages/cli/src/commands/optimize.ts): profiles
//     live at the repo root, 4 levels up.
// Picking whichever actually exists avoids silently resolving to a
// nonexistent directory — confirmed as a real bug during Fase J's clean
// install test (the bundle used to always compute the dev-mode path,
// which doesn't exist once bundled, so `optimize` matched zero profiles
// even against an obviously-matching project).
const BUNDLED_PROFILES_DIR = path.join(here, 'profiles');
const DEV_PROFILES_DIR = path.join(here, '..', '..', '..', '..', 'profiles');
const DEFAULT_PROFILES_DIR = existsSync(BUNDLED_PROFILES_DIR) ? BUNDLED_PROFILES_DIR : DEV_PROFILES_DIR;

function printRecommendations(title: string, items: Recommendation[]): void {
  if (!items.length) return;
  console.log(title);
  for (const r of items) {
    console.log(`  - ${r.targetType}:${r.targetId ?? '(n/a)'} [${r.confidence.toUpperCase()}] — ${r.reason} [profile: ${r.matchedProfile}]`);
    console.log(`      efecto esperado: ${r.expectedEffect}`);
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
  console.log(`Detected (stack facts): ${result.detectedTags.join(', ') || '(sin stack detectado)'}`);
  console.log(`Matched profiles: ${result.matchedProfiles.join(', ') || '(ninguno)'}`);
  console.log('');
  printRecommendations('RECOMMENDED', result.recommendations.filter((r) => r.kind === 'add'));
  printRecommendations('ON-DEMAND (situacional, no una recomendación firme)', result.recommendations.filter((r) => r.kind === 'on-demand'));
  printRecommendations('POSSIBLY UNNECESSARY', result.recommendations.filter((r) => r.kind === 'review'));
  if (!result.recommendations.length) {
    console.log('Sin recomendaciones: o no hay stack detectado, o el stack detectado no tiene ninguna herramienta específica que justificar (esto es correcto, no un fallo — ver docs/AUTONOMOUS-RUN.md, Fase B).');
    console.log('');
  }
  console.log('Modo solo-recomendación: no se modificó nada. `--apply` todavía no existe (ver docs/ARCHITECTURE.md).');

  return 0;
}
