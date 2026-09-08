import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectConflicts } from '../../src/conflicts/detect.js';
import type { RawInventory } from '../../src/inventory/collect.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, '..', 'fixtures', 'conflict-fixtures');

function emptyInventory(): RawInventory {
  return {
    harnesses: [],
    agents: [],
    skills: [],
    mcpServers: [],
    hooks: [],
    plugins: [],
    instructionSources: [],
    warnings: [],
  };
}

describe('detectConflicts', () => {
  it('flags a duplicate agent name across scopes as measured', () => {
    const inv = emptyInventory();
    inv.agents = [
      { id: 'a1', name: 'reviewer', description: 'x', sourceHarness: 'claude-code', sourcePath: '/global/reviewer.md', scope: 'global', bodyBytes: 10 },
      { id: 'a2', name: 'reviewer', description: 'y', sourceHarness: 'claude-code', sourcePath: '/project/reviewer.md', scope: 'project', bodyBytes: 10 },
    ];
    const conflicts = detectConflicts(inv);
    const dup = conflicts.find((c) => c.type === 'duplicate-name');
    expect(dup).toBeDefined();
    expect(dup?.confidence).toBe('measured');
    expect(dup?.involves).toHaveLength(2);
  });

  it('does not flag two agents with different names', () => {
    const inv = emptyInventory();
    inv.agents = [
      { id: 'a1', name: 'reviewer', description: 'x', sourceHarness: 'claude-code', sourcePath: '/a.md', scope: 'global', bodyBytes: 10 },
      { id: 'a2', name: 'planner', description: 'y', sourceHarness: 'claude-code', sourcePath: '/b.md', scope: 'project', bodyBytes: 10 },
    ];
    const conflicts = detectConflicts(inv);
    expect(conflicts.find((c) => c.type === 'duplicate-name')).toBeUndefined();
  });

  it('flags two skills with near-identical descriptions as heuristic', () => {
    const inv = emptyInventory();
    inv.skills = [
      { id: 's1', name: 'code-review-a', description: 'review pull requests for style and correctness issues', sourceHarness: 'claude-code', sourcePath: '/a', scope: 'global', frontmatterBytes: 5, bodyBytes: 5 },
      { id: 's2', name: 'code-review-b', description: 'review pull requests for style and correctness problems', sourceHarness: 'claude-code', sourcePath: '/b', scope: 'project', frontmatterBytes: 5, bodyBytes: 5 },
    ];
    const conflicts = detectConflicts(inv);
    const similar = conflicts.find((c) => c.type === 'similar-description');
    expect(similar).toBeDefined();
    expect(similar?.confidence).toBe('heuristic');
  });

  it('flags an identical hook command declared in two sources as a collision', () => {
    const inv = emptyInventory();
    inv.hooks = [
      { id: 'h1', event: 'PreToolUse', command: 'echo hi', sourcePath: '/global/settings.json', scope: 'global', riskFlags: [] },
      { id: 'h2', event: 'PreToolUse', command: 'echo hi', sourcePath: '/project/settings.json', scope: 'project', riskFlags: [] },
    ];
    const conflicts = detectConflicts(inv);
    const collision = conflicts.find((c) => c.type === 'colliding-hook');
    expect(collision).toBeDefined();
    expect(collision?.confidence).toBe('measured');
  });

  it('does not flag a single hook with no duplicate source', () => {
    const inv = emptyInventory();
    inv.hooks = [
      { id: 'h1', event: 'PreToolUse', command: 'echo hi', sourcePath: '/project/settings.json', scope: 'project', riskFlags: [] },
    ];
    const conflicts = detectConflicts(inv);
    expect(conflicts.find((c) => c.type === 'colliding-hook')).toBeUndefined();
  });

  // --- redundant-mcp: conservative-vs-unambiguous, Phase 1.1 item 3 -------
  it('HEURISTIC — NOT ENOUGH EVIDENCE: does not flag "playwright" vs "playwright-mcp-extra" (below threshold)', () => {
    const inv = emptyInventory();
    inv.mcpServers = [
      { id: 'm1', name: 'playwright', transport: 'stdio', envVarNames: [], scope: 'project', sourcePath: '/x' },
      { id: 'm2', name: 'playwright-mcp-extra', transport: 'stdio', envVarNames: [], scope: 'project', sourcePath: '/x' },
    ];
    const conflicts = detectConflicts(inv);
    expect(conflicts.find((c) => c.type === 'redundant-mcp')).toBeUndefined();
  });

  it('flags "github-mcp" vs "github-mcp-server" as redundant-mcp (unambiguous under the current threshold)', () => {
    const inv = emptyInventory();
    inv.mcpServers = [
      { id: 'm1', name: 'github-mcp', transport: 'stdio', envVarNames: [], scope: 'project', sourcePath: '/x' },
      { id: 'm2', name: 'github-mcp-server', transport: 'stdio', envVarNames: [], scope: 'project', sourcePath: '/x' },
    ];
    const conflicts = detectConflicts(inv);
    const redundant = conflicts.find((c) => c.type === 'redundant-mcp');
    expect(redundant).toBeDefined();
    expect(redundant?.confidence).toBe('heuristic');
    expect(redundant?.involves).toHaveLength(2);
  });

  // --- orphaned-reference ---------------------------------------------
  it('flags a hook script reference that does not exist relative to its config file', () => {
    const inv = emptyInventory();
    inv.hooks = [
      {
        id: 'h1', event: 'PostToolUse', command: 'bash ./scripts/does-not-exist.sh',
        sourcePath: path.join(fixturesDir, 'settings.json'), scope: 'project', riskFlags: [],
      },
    ];
    const conflicts = detectConflicts(inv);
    const orphaned = conflicts.find((c) => c.type === 'orphaned-reference');
    expect(orphaned).toBeDefined();
    expect(orphaned?.confidence).toBe('measured');
  });

  it('does not flag a hook script reference that does exist', () => {
    const inv = emptyInventory();
    inv.hooks = [
      {
        id: 'h1', event: 'PostToolUse', command: 'bash ./existing-script.sh',
        sourcePath: path.join(fixturesDir, 'settings.json'), scope: 'project', riskFlags: [],
      },
    ];
    const conflicts = detectConflicts(inv);
    expect(conflicts.find((c) => c.type === 'orphaned-reference')).toBeUndefined();
  });

  it('does not flag a hook with no recognizable script-file argument', () => {
    const inv = emptyInventory();
    inv.hooks = [
      { id: 'h1', event: 'PreToolUse', command: 'echo "no script here"', sourcePath: path.join(fixturesDir, 'settings.json'), scope: 'project', riskFlags: [] },
    ];
    const conflicts = detectConflicts(inv);
    expect(conflicts.find((c) => c.type === 'orphaned-reference')).toBeUndefined();
  });

  // --- contradictory-instruction ---------------------------------------
  it('flags an explicit "nunca X" (global) vs "siempre X" (project) contradiction', () => {
    const inv = emptyInventory();
    inv.instructionSources = [
      { id: 'g1', kind: 'CLAUDE.md', scope: 'global', path: path.join(fixturesDir, 'global-CLAUDE.md'), sizeBytes: 1, estimatedTokens: 1 },
      { id: 'p1', kind: 'CLAUDE.md', scope: 'project', path: path.join(fixturesDir, 'project-CLAUDE.md'), sizeBytes: 1, estimatedTokens: 1 },
    ];
    const conflicts = detectConflicts(inv);
    const contradiction = conflicts.find((c) => c.type === 'contradictory-instruction');
    expect(contradiction).toBeDefined();
    expect(contradiction?.confidence).toBe('measured');
    expect(contradiction?.description).toContain('instalar');
  });

  it('does not flag two instruction files with no opposite markers', () => {
    const inv = emptyInventory();
    inv.instructionSources = [
      { id: 'g1', kind: 'CLAUDE.md', scope: 'global', path: path.join(fixturesDir, 'existing-script.sh'), sizeBytes: 1, estimatedTokens: 1 },
      { id: 'p1', kind: 'CLAUDE.md', scope: 'project', path: path.join(fixturesDir, 'existing-script.sh'), sizeBytes: 1, estimatedTokens: 1 },
    ];
    const conflicts = detectConflicts(inv);
    expect(conflicts.find((c) => c.type === 'contradictory-instruction')).toBeUndefined();
  });
});
