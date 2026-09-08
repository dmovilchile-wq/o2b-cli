// `o2b inventory` — a focused view of `o2b doctor` showing only what was
// discovered (agents/skills/mcp servers/hooks/plugins/instruction
// sources), without scores, conflicts or security findings. Same
// underlying read-only pipeline as `doctor`, just a narrower print.
import { runDoctor, buildDoctorReport } from '@o2b/core';
import { EXIT_HEALTHY } from '../exit-codes.js';
import { parseDoctorArgs } from './doctor.js';

export async function runInventoryCommand(args: string[]): Promise<number> {
  const { rootDir, options } = parseDoctorArgs(args);
  const snapshot = await runDoctor(rootDir, options.homeDir);
  const report = buildDoctorReport(snapshot, { rootDir });

  if (options.json) {
    console.log(JSON.stringify(report.inventory, null, 2));
    return EXIT_HEALTHY;
  }

  console.log('O2B INVENTORY');
  console.log(`  AI harnesses: ${report.harnesses.map((h) => h.kind).join(', ') || '(ninguno)'}`);
  console.log('');

  const printSection = (title: string, items: any[], toLine: (x: any) => string) => {
    console.log(`${title} (${items.length})`);
    if (!items.length) {
      console.log('  (ninguno)');
    } else {
      for (const item of items) console.log(`  - ${toLine(item)}`);
    }
    console.log('');
  };

  printSection('AGENTS', report.inventory.agents, (a) => `${a.name} [${a.scope}] — ${a.sourcePath}`);
  printSection('SKILLS', report.inventory.skills, (s) => `${s.name} [${s.scope}] — ${s.sourcePath}`);
  printSection(
    'MCP SERVERS',
    report.inventory.mcpServers,
    (m) => `${m.name} [${m.scope}] transport=${m.transport} — ${m.sourcePath}`
  );
  printSection('HOOKS', report.inventory.hooks, (h) => `${h.event} [${h.scope}] — ${h.sourcePath}`);
  printSection(
    'PLUGINS',
    report.inventory.plugins,
    (p) => `${p.name} — capabilities: ${p.providedCapabilities.join(', ') || '(none detected)'}`
  );
  printSection(
    'INSTRUCTION SOURCES',
    report.inventory.instructionSources,
    (i) => `${i.kind} [${i.scope}] ${i.sizeBytes}B ~${i.estimatedTokens} tokens — ${i.path}`
  );

  return EXIT_HEALTHY;
}
