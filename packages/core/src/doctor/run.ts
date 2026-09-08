import { promises as fs } from 'node:fs';
import os from 'node:os';
import { scanFile, type SecurityFinding as ScannerFinding } from '@o2b/scanner';
import { collectInventory } from '../inventory/collect.js';
import { detectConflicts } from '../conflicts/detect.js';
import { analyzeContext } from '../context/analyze.js';
import {
  computeSecurityScore,
  computeConfigurationScore,
  computeContextConfigurationScore,
  computeCompatibilityScore,
} from './scoring.js';
import type { InventorySnapshot, SecurityFinding } from '../domain/types.js';

function toDomainFinding(f: ScannerFinding): SecurityFinding {
  return { ...f };
}

async function readFilesSafely(paths: string[]): Promise<{ path: string; content: string }[]> {
  const unique = Array.from(new Set(paths));
  const results: { path: string; content: string }[] = [];
  for (const p of unique) {
    try {
      const content = await fs.readFile(p, 'utf8');
      results.push({ path: p, content });
    } catch {
      // Unreadable file: skip silently from scanning, but it is still
      // reported elsewhere via adapter warnings if relevant.
    }
  }
  return results;
}

export async function runDoctor(
  rootDir: string,
  homeDir: string = os.homedir()
): Promise<InventorySnapshot> {
  const raw = await collectInventory(rootDir, homeDir);

  const scannablePaths = [
    ...raw.agents.map((a) => a.sourcePath),
    ...raw.skills.map((s) => s.sourcePath),
    ...raw.hooks.map((h) => h.sourcePath),
    ...raw.mcpServers.map((m) => m.sourcePath),
    ...raw.instructionSources.map((i) => i.path),
  ];
  const files = await readFilesSafely(scannablePaths);

  const findings: SecurityFinding[] = [];
  for (const file of files) {
    findings.push(...scanFile(file.path, file.content).map(toDomainFinding));
  }

  const conflicts = detectConflicts(raw);
  const contextBreakdown = analyzeContext(raw);

  const scores = {
    security: computeSecurityScore(findings),
    configuration: computeConfigurationScore(conflicts),
    contextConfiguration: computeContextConfigurationScore(contextBreakdown),
    compatibility: computeCompatibilityScore(raw.warnings),
  };

  return {
    harnesses: raw.harnesses,
    agents: raw.agents,
    skills: raw.skills,
    mcpServers: raw.mcpServers,
    hooks: raw.hooks,
    plugins: raw.plugins,
    instructionSources: raw.instructionSources,
    findings,
    conflicts,
    recommendations: [], // populated by optimize, not doctor
    contextBreakdown,
    scores,
  };
}
