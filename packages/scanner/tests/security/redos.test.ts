import { describe, expect, it } from 'vitest';
import { scanFile } from '../../src/engine.js';

// Fase E of the second autonomous run: confirm the scanner's regex rules
// don't exhibit catastrophic backtracking against adversarial input
// crafted to look almost-but-not-quite like a match. Empirical (timed),
// not a static regex audit — the actual failure mode we care about.

describe('scanner regex rules — no catastrophic backtracking (ReDoS)', () => {
  it('scans a large file with many near-misses for secret patterns within a bounded time', () => {
    // ~200K chars of content that repeatedly almost matches several
    // rules (long runs of the trigger characters without ever closing
    // the pattern) — the classic shape that trips up naive `(a+)+`-style
    // regexes. None of O2B's scanner rules use nested quantifiers, so
    // this is expected to stay linear.
    const nearMiss = '"API_KEY_TOKEN_SECRET_KEY": "' + 'a'.repeat(5000) + '\n'.repeat(1);
    const content = nearMiss.repeat(40); // ~200K chars total

    const start = Date.now();
    const findings = scanFile('adversarial.json', content);
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(2000); // generous — real run is single-digit ms
    expect(Array.isArray(findings)).toBe(true);
  });

  it('scans deeply repeated CLI-flag-shaped near-misses (mcp.arg-secret-inlined) within a bounded time', () => {
    const content = '"--api-key-token-secret",\n'.repeat(20000);
    const start = Date.now();
    const findings = scanFile('adversarial.json', content);
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(2000);
    expect(Array.isArray(findings)).toBe(true);
  });
});
