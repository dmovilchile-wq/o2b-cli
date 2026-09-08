import { describe, expect, it } from 'vitest';
import { compareSnapshots } from '../../src/report/compare.js';
import type { DoctorReport } from '../../src/domain/types.js';

function makeReport(overrides: Partial<DoctorReport>): DoctorReport {
  return {
    schemaVersion: 1,
    o2bVersion: '0.1.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    environment: { os: 'win32', nodeVersion: 'v20.0.0', rootDirLabel: 'demo' },
    harnesses: [],
    inventory: { agents: [], skills: [], mcpServers: [], hooks: [], plugins: [], instructionSources: [] },
    security: [],
    conflicts: [],
    context: {
      installed: { label: '', method: 'measured' },
      discoverable: { label: '', method: 'estimated' },
      alwaysLoaded: { label: '', method: 'estimated', estimatedTokens: 1000 },
      onDemandPotential: { label: '', method: 'estimated' },
      loadedActive: { label: '', method: 'unknown' },
    },
    recommendations: [],
    scores: {
      security: { value: 82, method: 'measured' },
      configuration: { value: 90, method: 'measured+heuristic' },
      contextConfiguration: { value: 70, method: 'estimated' },
      compatibility: { value: 100, method: 'heuristic' },
    },
    ...overrides,
  };
}

describe('compareSnapshots', () => {
  it('computes a positive score delta when security improves', () => {
    const baseline = makeReport({
      generatedAt: '2026-01-01T00:00:00.000Z',
      scores: {
        security: { value: 82, method: 'measured' },
        configuration: { value: 90, method: 'measured+heuristic' },
        contextConfiguration: { value: 70, method: 'estimated' },
        compatibility: { value: 100, method: 'heuristic' },
      },
    });
    const current = makeReport({
      generatedAt: '2026-02-01T00:00:00.000Z',
      scores: {
        security: { value: 94, method: 'measured' },
        configuration: { value: 90, method: 'measured+heuristic' },
        contextConfiguration: { value: 70, method: 'estimated' },
        compatibility: { value: 100, method: 'heuristic' },
      },
    });
    const diff = compareSnapshots(current, baseline);
    const securityDelta = diff.scoreDeltas.find((d) => d.metric === 'security');
    expect(securityDelta).toEqual({ metric: 'security', before: 82, after: 94, delta: 12 });
  });

  it('computes count deltas for findings and conflicts', () => {
    const baseline = makeReport({
      security: [{ id: 'f1' } as any, { id: 'f2' } as any],
      conflicts: [{ id: 'c1' } as any],
    });
    const current = makeReport({ security: [], conflicts: [] });
    const diff = compareSnapshots(current, baseline);
    expect(diff.countDeltas.find((d) => d.metric === 'findings')).toEqual({
      metric: 'findings',
      before: 2,
      after: 0,
      delta: -2,
    });
    expect(diff.countDeltas.find((d) => d.metric === 'conflicts')).toEqual({
      metric: 'conflicts',
      before: 1,
      after: 0,
      delta: -1,
    });
  });

  it('computes count deltas for plugins and instructionSources', () => {
    const baseline = makeReport({
      inventory: { agents: [], skills: [], mcpServers: [], hooks: [], plugins: [], instructionSources: [] },
    });
    const current = makeReport({
      inventory: {
        agents: [],
        skills: [],
        mcpServers: [],
        hooks: [],
        plugins: [{ id: 'p1' } as any],
        instructionSources: [{ id: 'i1' } as any, { id: 'i2' } as any],
      },
    });
    const diff = compareSnapshots(current, baseline);
    expect(diff.countDeltas.find((d) => d.metric === 'plugins')).toEqual({
      metric: 'plugins',
      before: 0,
      after: 1,
      delta: 1,
    });
    expect(diff.countDeltas.find((d) => d.metric === 'instructionSources')).toEqual({
      metric: 'instructionSources',
      before: 0,
      after: 2,
      delta: 2,
    });
  });

  it('computes the always-loaded token delta', () => {
    const baseline = makeReport({
      context: {
        installed: { label: '', method: 'measured' },
        discoverable: { label: '', method: 'estimated' },
        alwaysLoaded: { label: '', method: 'estimated', estimatedTokens: 18000 },
        onDemandPotential: { label: '', method: 'estimated' },
        loadedActive: { label: '', method: 'unknown' },
      },
    });
    const current = makeReport({
      context: {
        installed: { label: '', method: 'measured' },
        discoverable: { label: '', method: 'estimated' },
        alwaysLoaded: { label: '', method: 'estimated', estimatedTokens: 11000 },
        onDemandPotential: { label: '', method: 'estimated' },
        loadedActive: { label: '', method: 'unknown' },
      },
    });
    const diff = compareSnapshots(current, baseline);
    expect(diff.alwaysLoadedTokensDelta).toEqual({ before: 18000, after: 11000, delta: -7000 });
  });
});
