// `o2b snapshot` — runs the same read-only doctor pipeline and saves the
// full DoctorReport JSON to a file, so it can be diffed later with
// `o2b diff`. No history storage, no background process — this only
// writes the one file the user asks for, inside the project it's run
// against (or wherever --out points).
import { promises as fs } from 'node:fs';
import { runDoctor, buildDoctorReport } from '@o2b/core';
import { EXIT_EXECUTION_ERROR, EXIT_HEALTHY } from '../exit-codes.js';
import { parseDoctorArgs } from './doctor.js';

export async function runSnapshotCommand(args: string[]): Promise<number> {
  const { rootDir, options } = parseDoctorArgs(args);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : 'o2b-snapshot.json';

  const snapshot = await runDoctor(rootDir, options.homeDir);
  const report = buildDoctorReport(snapshot, { rootDir });

  try {
    await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
  } catch (err: any) {
    console.error(`No se pudo escribir el snapshot en "${outPath}": ${err.message}`);
    return EXIT_EXECUTION_ERROR;
  }

  if (!options.quiet) {
    console.log(`Snapshot guardado en ${outPath} (schemaVersion ${report.schemaVersion}).`);
  }
  return EXIT_HEALTHY;
}
