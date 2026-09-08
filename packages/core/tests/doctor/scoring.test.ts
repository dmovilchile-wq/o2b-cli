import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  computeCompatibilityScore,
  computeConfigurationScore,
  computeContextConfigurationScore,
  computeSecurityScore,
  CONTEXT_BUDGET_TOKENS,
} from '../../src/doctor/scoring.js';
import { estimateTokens } from '../../src/context/estimate-tokens.js';
import type { ContextBreakdown, SecurityFinding, Conflict } from '../../src/domain/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sizesDir = path.join(here, '..', 'fixtures', 'context-sizes');

function breakdownForTokens(tokens: number): ContextBreakdown {
  return {
    installed: { label: '', method: 'measured' },
    discoverable: { label: '', method: 'estimated' },
    alwaysLoaded: { label: '', method: 'estimated', estimatedTokens: tokens },
    onDemandPotential: { label: '', method: 'estimated' },
    loadedActive: { label: '', method: 'unknown' },
  };
}

// This is the documented fixture -> tokens -> score table required by
// Phase 1.1 item 4. Regenerate the source fixtures (packages/core/tests/
// fixtures/context-sizes/*) if this table needs to change — never hand-edit
// expected values without re-measuring the real files.
describe('computeContextConfigurationScore — fixture -> tokens -> score table', () => {
  const sizes = ['minimal', 'small', 'medium', 'large', 'extreme'] as const;

  it('produces a monotonically non-increasing score as always-loaded size grows', async () => {
    const rows: { size: string; tokens: number; score: number }[] = [];
    for (const size of sizes) {
      const filePath = path.join(sizesDir, size, 'CLAUDE.md');
      const content = await fs.readFile(filePath, 'utf8');
      const tokens = estimateTokens(content);
      const score = computeContextConfigurationScore(breakdownForTokens(tokens));
      rows.push({ size, tokens, score: score.value });
    }

    // eslint-disable-next-line no-console
    console.table(rows);

    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].score).toBeLessThanOrEqual(rows[i - 1].score);
    }
    expect(rows[0]).toMatchObject({ size: 'minimal', tokens: 0, score: 100 });
    expect(rows[rows.length - 1].score).toBe(0);
  });

  it('never returns a value outside [0, 100] across the full size range, including extreme', async () => {
    for (const size of sizes) {
      const content = await fs.readFile(path.join(sizesDir, size, 'CLAUDE.md'), 'utf8');
      const score = computeContextConfigurationScore(breakdownForTokens(estimateTokens(content)));
      expect(score.value).toBeGreaterThanOrEqual(0);
      expect(score.value).toBeLessThanOrEqual(100);
    }
  });
});

describe('computeContextConfigurationScore — edge cases', () => {
  it('returns exactly 100 for zero always-loaded tokens', () => {
    expect(computeContextConfigurationScore(breakdownForTokens(0)).value).toBe(100);
  });

  it('returns exactly 100 at precisely the reference budget', () => {
    expect(computeContextConfigurationScore(breakdownForTokens(CONTEXT_BUDGET_TOKENS)).value).toBe(100);
  });

  it('returns 0, not negative, far past the reference budget', () => {
    const value = computeContextConfigurationScore(breakdownForTokens(CONTEXT_BUDGET_TOKENS * 1000)).value;
    expect(value).toBe(0);
    expect(value).toBeGreaterThanOrEqual(0);
  });

  it('handles an undefined estimatedTokens (missing data) as zero, not a crash', () => {
    const breakdown: ContextBreakdown = {
      installed: { label: '', method: 'measured' },
      discoverable: { label: '', method: 'estimated' },
      alwaysLoaded: { label: '', method: 'estimated' }, // no estimatedTokens field
      onDemandPotential: { label: '', method: 'estimated' },
      loadedActive: { label: '', method: 'unknown' },
    };
    expect(() => computeContextConfigurationScore(breakdown)).not.toThrow();
    expect(computeContextConfigurationScore(breakdown).value).toBe(100);
  });

  it('is always labeled "estimated" — never claims to be measured', () => {
    expect(computeContextConfigurationScore(breakdownForTokens(50_000)).method).toBe('estimated');
  });
});

describe('other scores — bounds sanity (not the focus of item 4, but same [0,100] contract)', () => {
  it('security score never goes below 0 even with many critical findings', () => {
    const manyFindings: SecurityFinding[] = Array.from({ length: 50 }, (_, i) => ({
      id: `f${i}`,
      ruleId: 'x',
      category: 'secrets',
      severity: 'critical',
      confidence: 'measured',
      file: 'x',
      location: {},
      description: '',
      evidence: '',
      remediation: '',
    }));
    expect(computeSecurityScore(manyFindings).value).toBe(0);
  });

  it('configuration score never goes below 0 even with many conflicts', () => {
    const manyConflicts: Conflict[] = Array.from({ length: 50 }, (_, i) => ({
      id: `c${i}`,
      type: 'duplicate-name',
      involves: [],
      description: '',
      severity: 'medium',
      confidence: 'measured',
    }));
    expect(computeConfigurationScore(manyConflicts).value).toBe(0);
  });

  it('compatibility score never goes below 0 with many warnings', () => {
    const manyWarnings = Array.from({ length: 50 }, (_, i) => `warning ${i}`);
    expect(computeCompatibilityScore(manyWarnings).value).toBe(0);
  });

  it('all scores return exactly 100 with no issues at all', () => {
    expect(computeSecurityScore([]).value).toBe(100);
    expect(computeConfigurationScore([]).value).toBe(100);
    expect(computeCompatibilityScore([]).value).toBe(100);
  });
});
