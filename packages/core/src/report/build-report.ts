import path from 'node:path';
import os from 'node:os';
import { DOCTOR_REPORT_SCHEMA_VERSION, type DoctorReport, type InventorySnapshot } from '../domain/types.js';

// Package version is read as a plain string constant rather than requiring
// package.json at runtime, to avoid coupling the report builder to a build
// step or JSON import assertion syntax that varies across Node versions.
// Bump this alongside packages/core/package.json's "version" field.
export const O2B_VERSION = '0.2.0-beta.1';

export interface BuildReportOptions {
  rootDir: string;
  generatedAt?: Date;
}

/**
 * Wraps an InventorySnapshot (the in-memory analysis result) into the
 * stable, versioned envelope that gets persisted/serialized. Privacy-first:
 * only the basename of rootDir is recorded, never a full path — see
 * docs/PRIVACY.md.
 */
export function buildDoctorReport(
  snapshot: InventorySnapshot,
  options: BuildReportOptions
): DoctorReport {
  return {
    schemaVersion: DOCTOR_REPORT_SCHEMA_VERSION,
    o2bVersion: O2B_VERSION,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    environment: {
      os: os.platform(),
      nodeVersion: process.version,
      rootDirLabel: path.basename(options.rootDir),
    },
    harnesses: snapshot.harnesses,
    inventory: {
      agents: snapshot.agents,
      skills: snapshot.skills,
      mcpServers: snapshot.mcpServers,
      hooks: snapshot.hooks,
      plugins: snapshot.plugins,
      instructionSources: snapshot.instructionSources,
    },
    security: snapshot.findings,
    conflicts: snapshot.conflicts,
    context: snapshot.contextBreakdown,
    recommendations: snapshot.recommendations,
    scores: snapshot.scores,
    warnings: snapshot.warnings,
  };
}
