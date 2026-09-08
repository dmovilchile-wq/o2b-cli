#!/usr/bin/env node
// Fase F of the second autonomous run — reproducible performance
// benchmark, NOT part of the vitest suite (perf numbers shouldn't gate
// CI pass/fail on absolute wall-clock, which varies by machine). Run
// manually: `node packages/core/tests/perf/benchmark.mjs`.
//
// Generates synthetic homes with N skills (100/500/1000) plus a
// proportional number of MCP servers/hooks/instruction sources, then
// times collectInventory / runDoctor / detectConflicts for each.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { runDoctor } from '../../src/doctor/run.js';
import { collectInventory } from '../../src/inventory/collect.js';
import { detectConflicts } from '../../src/conflicts/detect.js';

async function buildSyntheticHome(skillCount) {
  const home = await mkdtemp(path.join(os.tmpdir(), 'o2b-bench-'));
  const skillsDir = path.join(home, '.claude', 'skills');
  await mkdir(skillsDir, { recursive: true });

  for (let i = 0; i < skillCount; i += 1) {
    const dir = path.join(skillsDir, `bench-skill-${i}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, 'SKILL.md'),
      `---\nname: bench-skill-${i}\ndescription: Synthetic benchmark skill number ${i}, used only to measure O2B's own performance at scale.\n---\n\nBody content for skill ${i}.\n`,
      'utf8'
    );
  }

  // Proportional MCP servers (via ~/.claude.json, one every 10 skills)
  // and hooks (via settings.json), so the benchmark also stresses those
  // paths, not just skill parsing.
  const mcpCount = Math.max(1, Math.floor(skillCount / 10));
  const mcpServers = {};
  for (let i = 0; i < mcpCount; i += 1) {
    mcpServers[`bench-mcp-${i}`] = { command: 'npx', args: ['-y', `bench-mcp-${i}@1.0.0`] };
  }
  await writeFile(path.join(home, '.claude.json'), JSON.stringify({ mcpServers }), 'utf8');

  const hookCount = Math.max(1, Math.floor(skillCount / 20));
  const preToolUseHooks = [];
  for (let i = 0; i < hookCount; i += 1) {
    preToolUseHooks.push({ hooks: [{ command: `echo bench-hook-${i}` }] });
  }
  await writeFile(
    path.join(home, '.claude', 'settings.json'),
    JSON.stringify({ hooks: { PreToolUse: preToolUseHooks } }),
    'utf8'
  );

  // A moderately large CLAUDE.md (not "extreme" — that's already covered
  // by packages/core/tests/fixtures/context-sizes/extreme).
  await writeFile(path.join(home, '.claude', 'CLAUDE.md'), '# Bench\n' + 'Some instruction line.\n'.repeat(500), 'utf8');

  return home;
}

async function timeIt(label, fn) {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = performance.now() - start;
  return { label, elapsedMs, result };
}

async function main() {
  console.log('O2B performance benchmark — Fase F');
  console.log(`Node ${process.version}, platform ${os.platform()}, ${os.cpus().length} CPUs, ${Math.round(os.totalmem() / 1e9)}GB RAM`);
  console.log('');

  const rootDir = path.join(os.tmpdir(), 'o2b-bench-empty-project');
  await mkdir(rootDir, { recursive: true });

  for (const skillCount of [100, 500, 1000]) {
    const home = await buildSyntheticHome(skillCount);
    const memBefore = process.memoryUsage().heapUsed;

    const inventoryTiming = await timeIt('collectInventory', () => collectInventory(rootDir, home));
    const conflictsTiming = await timeIt('detectConflicts', () => detectConflicts(inventoryTiming.result));
    const doctorTiming = await timeIt('runDoctor (full)', () => runDoctor(rootDir, home));

    const memAfter = process.memoryUsage().heapUsed;

    console.log(`--- ${skillCount} skills ---`);
    console.log(`  inventory (skills=${inventoryTiming.result.skills.length}, mcp=${inventoryTiming.result.mcpServers.length}, hooks=${inventoryTiming.result.hooks.length}): ${inventoryTiming.elapsedMs.toFixed(1)}ms`);
    console.log(`  conflicts (${conflictsTiming.result.length} found): ${conflictsTiming.elapsedMs.toFixed(1)}ms`);
    console.log(`  doctor (full pipeline, incl. scanner): ${doctorTiming.elapsedMs.toFixed(1)}ms`);
    console.log(`  approx heap delta: ${((memAfter - memBefore) / 1e6).toFixed(1)}MB`);
    console.log('');

    await rm(home, { recursive: true, force: true });
  }

  await rm(rootDir, { recursive: true, force: true });
}

main();
