import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runOptimize } from '../../src/optimize/run.js';

// Exercises the REAL, shipped profiles under /profiles (not a test-local
// fixture profile) — Fase B of the second autonomous run: verify combined
// stacks and ambiguous/monorepo cases against the actual production
// profile set, not a synthetic stand-in.
const here = path.dirname(fileURLToPath(import.meta.url));
const realProfilesDir = path.join(here, '..', '..', '..', '..', 'profiles');
const fixturesDir = path.join(here, '..', 'fixtures');
const emptyHome = path.join(fixturesDir, 'nonexistent-home');

describe('runOptimize against real /profiles — combined & ambiguous stacks', () => {
  it('Flutter + Supabase: recommends the Supabase MCP, nothing Flutter-specific', async () => {
    const project = path.join(fixturesDir, 'stack-flutter-supabase');
    const result = await runOptimize(project, emptyHome, realProfilesDir);
    expect(result.detectedTags).toEqual(expect.arrayContaining(['flutter', 'supabase']));
    expect(result.matchedProfiles).toEqual(expect.arrayContaining(['flutter-dart', 'supabase']));
    const add = result.recommendations.filter((r) => r.kind === 'add');
    expect(add).toHaveLength(1);
    expect(add[0].targetId).toBe('supabase');
    expect(add[0].matchedProfile).toBe('supabase');
  });

  it('Next.js + Supabase: recommends Supabase MCP, offers playwright/vercel on-demand', async () => {
    const project = path.join(fixturesDir, 'stack-nextjs-supabase');
    const result = await runOptimize(project, emptyHome, realProfilesDir);
    expect(result.detectedTags).toEqual(expect.arrayContaining(['nextjs', 'react', 'supabase']));
    const add = result.recommendations.filter((r) => r.kind === 'add').map((r) => r.targetId);
    expect(add).toEqual(['supabase']);
    const onDemand = result.recommendations.filter((r) => r.kind === 'on-demand').map((r) => r.targetId);
    expect(onDemand).toEqual(expect.arrayContaining(['playwright', 'vercel']));
  });

  it('Python + Docker: no MCP has a defensible reason — zero recommendations, not silence-as-bug', async () => {
    const project = path.join(fixturesDir, 'stack-python-docker');
    const result = await runOptimize(project, emptyHome, realProfilesDir);
    expect(result.detectedTags).toEqual(expect.arrayContaining(['python', 'docker']));
    expect(result.matchedProfiles).toEqual(expect.arrayContaining(['python', 'docker']));
    expect(result.recommendations).toHaveLength(0);
  });

  it('Node + React: offers playwright on-demand only, nothing forced', async () => {
    const project = path.join(fixturesDir, 'stack-node-react');
    const result = await runOptimize(project, emptyHome, realProfilesDir);
    expect(result.detectedTags).toEqual(expect.arrayContaining(['node', 'react']));
    const kinds = result.recommendations.map((r) => `${r.kind}:${r.targetId}`);
    expect(kinds).toEqual(['on-demand:playwright']);
  });

  it('ambiguous monorepo (React + Flutter at the same root): no duplicate/absurd recommendations', async () => {
    const project = path.join(fixturesDir, 'stack-ambiguous-monorepo');
    const result = await runOptimize(project, emptyHome, realProfilesDir);
    expect(result.detectedTags).toEqual(expect.arrayContaining(['react', 'flutter']));
    expect(result.matchedProfiles).toEqual(expect.arrayContaining(['react', 'flutter-dart']));
    // Only the one legitimate signal (react -> playwright on-demand);
    // flutter-dart contributes nothing because it has nothing to say.
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({ kind: 'on-demand', targetId: 'playwright' });
  });

  it('every recommendation carries reason, source(profile), confidence, and expectedEffect', async () => {
    const project = path.join(fixturesDir, 'stack-nextjs-supabase');
    const result = await runOptimize(project, emptyHome, realProfilesDir);
    expect(result.recommendations.length).toBeGreaterThan(0);
    for (const r of result.recommendations) {
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.matchedProfile.length).toBeGreaterThan(0);
      expect(['measured', 'heuristic', 'estimated', 'unknown']).toContain(r.confidence);
      expect(r.expectedEffect.length).toBeGreaterThan(0);
    }
  });
});
