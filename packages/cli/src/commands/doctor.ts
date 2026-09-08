import { runDoctor, buildDoctorReport } from '@o2b/core';
import type { DoctorReport } from '@o2b/core';
import { exitCodeForFindings } from '../exit-codes.js';
import { colorize, methodTag, severityColor, shouldUseColor } from '../output.js';

function printReport(report: DoctorReport, color: boolean, quiet: boolean): void {
  const harnessLines = report.harnesses.length
    ? report.harnesses.map((h) => `  ${h.kind.padEnd(14)} detected`).join('\n')
    : '  (ninguno detectado)';

  if (!quiet) {
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
  }

  if (report.security.length) {
    console.log('SECURITY FINDINGS');
    for (const f of report.security) {
      const label = colorize(`[${f.severity.toUpperCase()}]`, severityColor(f.severity), color);
      console.log(`  - ${label} ${f.description} (${f.file}:${f.location.line ?? '?'}) ${methodTag(f.confidence)} — rule:${f.ruleId}`);
      if (!quiet) {
        console.log(`      evidencia: ${f.evidence}`);
        console.log(`      remediación: ${f.remediation}`);
      }
    }
    console.log('');
  }

  if (quiet) return;

  if (report.conflicts.length) {
    console.log('CONFLICTS');
    for (const c of report.conflicts) {
      const label = colorize(`[${c.severity.toUpperCase()}]`, severityColor(c.severity), color);
      console.log(`  - ${label} (${c.type}) ${c.description} ${methodTag(c.confidence)}`);
    }
    console.log('');
  }

  console.log('CONTEXT BREAKDOWN');
  for (const entry of Object.values(report.context)) {
    const tokens = entry.estimatedTokens !== undefined ? `, ~${entry.estimatedTokens} tokens` : '';
    console.log(`  - ${entry.label}: ${methodTag(entry.method)}${tokens}`);
    if (entry.note) console.log(`      nota: ${entry.note}`);
  }

  if (report.warnings.length) {
    console.log('');
    console.log('WARNINGS');
    for (const w of report.warnings) console.log(`  - ${w}`);
  }
}

export interface DoctorCommandOptions {
  json: boolean;
  homeDir?: string;
  quiet: boolean;
  strict: boolean;
  noColor: boolean;
}

export function parseDoctorArgs(args: string[]): { rootDir: string; options: DoctorCommandOptions } {
  const options: DoctorCommandOptions = {
    json: args.includes('--json'),
    quiet: args.includes('--quiet'),
    strict: args.includes('--strict'),
    noColor: args.includes('--no-color'),
  };
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
    printReport(report, shouldUseColor(options.noColor), options.quiet);
  }

  return exitCodeForFindings(report.security, options.strict);
}
