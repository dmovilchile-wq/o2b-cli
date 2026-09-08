import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runDoctor, buildDoctorReport, sanitizeDoctorReport } from '@o2b/core';
import { EXIT_EXECUTION_ERROR, EXIT_HEALTHY } from '../exit-codes.js';
import { parseDoctorArgs } from './doctor.js';

// `o2b report --sanitize` — the "send this to the maintainers" command.
// Same read-only doctor pipeline as `doctor`, but the output has every
// occurrence of the caller's home directory and project path replaced
// with stable placeholder tokens (<HOME>/<PROJECT>) — see
// packages/core/src/report/sanitize.ts for exactly what that does and
// does not touch. `--sanitize` is required, not a default, so a beta
// tester never accidentally shares an un-sanitized report by typing
// `o2b report` alone.
export async function runReportCommand(args: string[]): Promise<number> {
  const { rootDir, options } = parseDoctorArgs(args);
  const sanitize = args.includes('--sanitize');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : undefined;

  if (!sanitize) {
    console.error('o2b report requiere --sanitize (no existe un modo "sin sanitizar" para este comando).');
    console.error('Para un reporte completo sin sanitizar, usa "o2b doctor --json" en su lugar.');
    return EXIT_EXECUTION_ERROR;
  }

  const homeDir = options.homeDir ?? os.homedir();
  const snapshot = await runDoctor(rootDir, homeDir);
  const report = buildDoctorReport(snapshot, { rootDir });
  const sanitized = sanitizeDoctorReport(report, homeDir, path.resolve(rootDir));

  const json = JSON.stringify(sanitized, null, 2);

  if (outPath) {
    try {
      await fs.writeFile(outPath, json, 'utf8');
    } catch (err: any) {
      console.error(`No se pudo escribir el reporte sanitizado en "${outPath}": ${err.message}`);
      return EXIT_EXECUTION_ERROR;
    }
    if (!options.quiet) {
      console.log(`Reporte sanitizado guardado en ${outPath}.`);
      console.log('Revísalo antes de enviarlo — no debería contener tu home real ni la ruta del proyecto, pero revisar nunca está de más.');
    }
  } else {
    console.log(json);
  }

  return EXIT_HEALTHY;
}
