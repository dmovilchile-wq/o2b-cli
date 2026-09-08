// `o2b diff <before.json> <after.json>` — compares two DoctorReport JSON
// files previously saved with `o2b snapshot`. Purely local file reads and
// diffing (compareSnapshots from @o2b/core) — no network, no history
// storage.
import { promises as fs } from 'node:fs';
import { compareSnapshots } from '@o2b/core';
import type { DoctorReport } from '@o2b/core';
import { EXIT_EXECUTION_ERROR, EXIT_HEALTHY } from '../exit-codes.js';

async function readReport(filePath: string): Promise<DoctorReport> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as DoctorReport;
}

export async function runDiffCommand(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const positional = args.filter((a) => !a.startsWith('--'));
  const [beforePath, afterPath] = positional;

  if (!beforePath || !afterPath) {
    console.error('Uso: o2b diff <before.json> <after.json> [--json]');
    return EXIT_EXECUTION_ERROR;
  }

  let before: DoctorReport;
  let after: DoctorReport;
  try {
    [before, after] = await Promise.all([readReport(beforePath), readReport(afterPath)]);
  } catch (err: any) {
    console.error(`No se pudo leer uno de los snapshots: ${err.message}`);
    return EXIT_EXECUTION_ERROR;
  }

  const diff = compareSnapshots(after, before);

  if (json) {
    console.log(JSON.stringify(diff, null, 2));
    return EXIT_HEALTHY;
  }

  console.log('O2B DIFF');
  console.log(`  BEFORE: ${diff.baselineGeneratedAt}  (${beforePath})`);
  console.log(`  AFTER:  ${diff.currentGeneratedAt}  (${afterPath})`);
  console.log('');
  console.log('SCORES');
  for (const d of diff.scoreDeltas) {
    const sign = d.delta > 0 ? '+' : '';
    console.log(`  - ${d.metric}: ${d.before} -> ${d.after} (${sign}${d.delta})`);
  }
  console.log('');
  console.log('COUNTS');
  for (const d of diff.countDeltas) {
    const sign = d.delta > 0 ? '+' : '';
    console.log(`  - ${d.metric}: ${d.before} -> ${d.after} (${sign}${d.delta})`);
  }
  console.log('');
  console.log(
    `ALWAYS-LOADED tokens: ${diff.alwaysLoadedTokensDelta.before} -> ${diff.alwaysLoadedTokensDelta.after} (${diff.alwaysLoadedTokensDelta.delta > 0 ? '+' : ''}${diff.alwaysLoadedTokensDelta.delta})`
  );

  return EXIT_HEALTHY;
}
