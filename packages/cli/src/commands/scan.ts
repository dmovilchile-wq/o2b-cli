// `o2b scan` — a focused, security-only view of `o2b doctor`. Runs the
// exact same read-only pipeline (no separate detection logic — this is
// deliberately a thin re-presentation, so it can never drift from what
// `doctor` finds) but prints only SECURITY FINDINGS, which is what a CI
// security gate usually wants without the rest of the report as noise.
import { runDoctor, buildDoctorReport } from '@o2b/core';
import { exitCodeForFindings } from '../exit-codes.js';
import { colorize, methodTag, severityColor, shouldUseColor } from '../output.js';
import { parseDoctorArgs } from './doctor.js';

export async function runScanCommand(args: string[]): Promise<number> {
  const { rootDir, options } = parseDoctorArgs(args);
  const snapshot = await runDoctor(rootDir, options.homeDir);
  const report = buildDoctorReport(snapshot, { rootDir });

  if (options.json) {
    console.log(JSON.stringify(report.security, null, 2));
    return exitCodeForFindings(report.security, options.strict);
  }

  const color = shouldUseColor(options.noColor);
  console.log('O2B SCAN (security-only)');
  if (!report.security.length) {
    console.log('  Sin hallazgos de seguridad en los archivos escaneados.');
    return exitCodeForFindings(report.security, options.strict);
  }
  for (const f of report.security) {
    const label = colorize(`[${f.severity.toUpperCase()}]`, severityColor(f.severity), color);
    console.log(`  - ${label} ${f.description} (${f.file}:${f.location.line ?? '?'}) ${methodTag(f.confidence)} — rule:${f.ruleId}`);
    if (!options.quiet) {
      console.log(`      evidencia: ${f.evidence}`);
      console.log(`      remediación: ${f.remediation}`);
    }
  }

  return exitCodeForFindings(report.security, options.strict);
}
