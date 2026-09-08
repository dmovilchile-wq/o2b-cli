import { describe, expect, it } from 'vitest';
import { analyzeContext } from '../../src/context/analyze.js';
import type { RawInventory } from '../../src/inventory/collect.js';

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

describe('analyzeContext', () => {
  it('reports zero installed/loaded when the inventory is empty', () => {
    const breakdown = analyzeContext(emptyInventory());
    expect(breakdown.alwaysLoaded.estimatedTokens).toBe(0);
    expect(breakdown.alwaysLoaded.sizeBytes).toBe(0);
  });

  it('always reports loadedActive as UNKNOWN, never a fabricated value', () => {
    const breakdown = analyzeContext(emptyInventory());
    expect(breakdown.loadedActive.method).toBe('unknown');
    expect(breakdown.loadedActive.estimatedTokens).toBeUndefined();
  });

  it('sums alwaysLoaded across a global instruction source and a project one', () => {
    const inv = emptyInventory();
    inv.instructionSources = [
      { id: 'i1', kind: 'CLAUDE.md', scope: 'global', path: '/g/CLAUDE.md', sizeBytes: 1000, estimatedTokens: 250 },
      { id: 'i2', kind: 'CLAUDE.md', scope: 'project', path: '/p/CLAUDE.md', sizeBytes: 2000, estimatedTokens: 500 },
    ];
    const breakdown = analyzeContext(inv);
    expect(breakdown.alwaysLoaded.sizeBytes).toBe(3000);
    expect(breakdown.alwaysLoaded.estimatedTokens).toBe(750);
  });

  it('sums across more than two instruction sources (multiple sources, mixed kinds)', () => {
    const inv = emptyInventory();
    inv.instructionSources = [
      { id: 'i1', kind: 'CLAUDE.md', scope: 'global', path: '/g/CLAUDE.md', sizeBytes: 100, estimatedTokens: 25 },
      { id: 'i2', kind: 'AGENTS.md', scope: 'project', path: '/p/AGENTS.md', sizeBytes: 200, estimatedTokens: 50 },
      { id: 'i3', kind: 'settings.json', scope: 'project', path: '/p/settings.json', sizeBytes: 300, estimatedTokens: 75 },
    ];
    const breakdown = analyzeContext(inv);
    expect(breakdown.alwaysLoaded.estimatedTokens).toBe(150);
  });

  it('computes discoverable cost from skill frontmatter bytes only, not body bytes', () => {
    const inv = emptyInventory();
    inv.skills = [
      {
        id: 's1', name: 'a', description: 'x', sourceHarness: 'claude-code',
        sourcePath: '/a', scope: 'project', frontmatterBytes: 80, bodyBytes: 5000,
      },
    ];
    const breakdown = analyzeContext(inv);
    expect(breakdown.discoverable.sizeBytes).toBe(80);
    expect(breakdown.discoverable.sizeBytes).not.toBe(5000);
  });

  it('computes onDemandPotential from agent+skill body bytes, separate from discoverable', () => {
    const inv = emptyInventory();
    inv.agents = [
      { id: 'a1', name: 'x', description: '', sourceHarness: 'claude-code', sourcePath: '/a', scope: 'project', bodyBytes: 400 },
    ];
    inv.skills = [
      { id: 's1', name: 'y', description: '', sourceHarness: 'claude-code', sourcePath: '/b', scope: 'project', frontmatterBytes: 10, bodyBytes: 600 },
    ];
    const breakdown = analyzeContext(inv);
    expect(breakdown.onDemandPotential.sizeBytes).toBe(1000);
  });

  it('counts installed items across every entity type', () => {
    const inv = emptyInventory();
    inv.agents = [{ id: 'a1', name: 'x', description: '', sourceHarness: 'claude-code', sourcePath: '/a', scope: 'project', bodyBytes: 1 }];
    inv.skills = [{ id: 's1', name: 'y', description: '', sourceHarness: 'claude-code', sourcePath: '/b', scope: 'project', frontmatterBytes: 1, bodyBytes: 1 }];
    inv.mcpServers = [{ id: 'm1', name: 'z', transport: 'stdio', envVarNames: [], scope: 'project', sourcePath: '/c' }];
    inv.hooks = [{ id: 'h1', event: 'PreToolUse', command: 'echo', sourcePath: '/d', scope: 'project', riskFlags: [] }];
    const breakdown = analyzeContext(inv);
    expect(breakdown.installed.label).toContain('4 elementos');
  });
});
