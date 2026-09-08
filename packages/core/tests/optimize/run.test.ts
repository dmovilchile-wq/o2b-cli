import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runOptimize } from '../../src/optimize/run.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureProject = path.join(here, '..', 'fixtures', 'optimize-project');
const fixtureProfilesDir = path.join(here, '..', 'fixtures', 'optimize-profiles');
const emptyHome = path.join(here, '..', 'fixtures', 'nonexistent-home');

describe('runOptimize', () => {
  it('detects the express/node stack from package.json', async () => {
    const result = await runOptimize(fixtureProject, emptyHome, fixtureProfilesDir);
    expect(result.detectedTags).toContain('express');
    expect(result.matchedProfiles).toContain('node-web-test');
  });

  it('recommends an mcp server the matched profile suggests and is not installed', async () => {
    const result = await runOptimize(fixtureProject, emptyHome, fixtureProfilesDir);
    const add = result.recommendations.find((r) => r.kind === 'add' && r.targetId === 'some-recommended-mcp');
    expect(add).toBeDefined();
    expect(add?.matchedProfile).toBe('node-web-test');
  });

  it('flags an installed mcp server the profile discourages as "review"', async () => {
    const result = await runOptimize(fixtureProject, emptyHome, fixtureProfilesDir);
    const review = result.recommendations.find((r) => r.kind === 'review' && r.targetId === 'blender');
    expect(review).toBeDefined();
    expect(review?.reason).toContain('not related to the express stack');
  });

  it('does not recommend anything when no profile matches', async () => {
    const result = await runOptimize(emptyHome, emptyHome, fixtureProfilesDir);
    expect(result.matchedProfiles).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
  });
});
