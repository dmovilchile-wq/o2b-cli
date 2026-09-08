import { runDoctor, buildDoctorReport } from '@o2b/core';
import type { DoctorReport } from '@o2b/core';
import { exitCodeForFindings } from '../exit-codes.js';

function methodTag(method: string): string {
  return `[${method.toUpperCase()}]`;
}

function printReport(report: DoctorReport): void {
  const harnessLines = report.harnesses.length
    ? report.harnesses.map((h) => `  ${h.kind.padEnd(14)} detected`).join('\n')
    : '  (ninguno detectado)';

  console.log('O2B DOCTOR');
  console.log(`  schemaVersion ${report.schemaVersion}   o2bVersion ${report.o2bVersion}   generatedAt ${report.generatedAt}`);
  console.log('AI ENVIRONMENT');
  console.log(harnessLines);
  console.log('');
  console.log('INVENTORY');
  console.log(
    `  MCP Servers ${report.inventory.mcpServers.length}   Skills ${report.inventory.skills.length}   Agents ${report.inventory.agents.length}   Hooks ${report.inventory.hooks.length}   Plugins ${report.inventory.plugins.length}   Instruction sources ${report.inventory.instructionSources.length}`
  );
  console.log('');
  console.log('HEALTH');
  console.log(`  Security             ${report.scores.security.value}/100   ${methodTag(report.scores.security.method)}`);
  console.log(`  Configuration        ${report.scores.configuration.value}/100   ${methodTag(report.scores.configuration.method)}`);
  console.log(`  Context Configuration ${report.scores.contextConfiguration.value}/100   ${methodTag(report.scores.contextConfiguration.method)}`);
  console.log(`  Compatibility        ${report.scores.compatibility.value}/100   ${methodTag(report.scores.compatibility.method)}`);
  console.log('');

  if (report.security.length) {
    console.log('SECURITY FINDINGS');
    for (const f of report.security) {
      console.log(`  - [${f.severity.toUpperCase()}] ${f.description} (${f.file}:${f.location.line ?? '?'}) ${methodTag(f.confidence)} — rule:${f.ruleId}`);
      console.log(`      evidencia: ${f.evidence}`);
      console.log(`      remediación: ${f.remediation}`);
    }
    console.log('');
  }

  if (report.conflicts.length) {
    console.log('CONFLICTS');
    for (const c of report.conflicts) {
      console.log(`  - [${c.severity.toUpperCase()}] (${c.type}) ${c.description} ${methodTag(c.confidence)}`);
    }
    console.log('');
  }

  console.log('CONTEXT BREAKDOWN');
  for (const entry of Object.values(report.context)) {
    const tokens = entry.estimatedTokens !== undefined ? `, ~${entry.estimatedTokens} tokens` : '';
    console.log(`  - ${entry.label}: ${methodTag(entry.method)}${tokens}`);
    if (entry.note) console.log(`      nota: ${entry.note}`);
  }
}

export interface DoctorCommandOptions {
  json: boolean;
  homeDir?: string;
}

export function parseDoctorArgs(args: string[]): { rootDir: string; options: DoctorCommandOptions } {
  const options: DoctorCommandOptions = { json: args.includes('--json') };
  const homeIdx = args.indexOf('--home');
  if (homeIdx !== -1 && args[homeIdx + 1]) options.homeDir = args[homeIdx + 1];
  const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--home');
  const rootDir = positional[0] ?? process.cwd();
  return { rootDir, options };
}

export async function runDoctorCommand(args: string[]): Promise<number> {
  const { rootDir, options } = parseDoctorArgs(args);
  const snapshot = await runDoctor(rootDir, options.homeDir);
  const report = buildDoctorReport(snapshot, { rootDir });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  return exitCodeForFindings(report.security);
}
