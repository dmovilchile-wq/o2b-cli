import { describe, expect, it } from 'vitest';
import { scanFile } from '../../src/engine.js';
import { mcpRules } from '../../src/rules/mcp.js';

function idsOf(findings: ReturnType<typeof scanFile>) {
  return findings.map((f) => f.ruleId);
}

describe('mcp rules', () => {
  it('flags npx -y without a pinned version', () => {
    const findings = scanFile('.mcp.json', 'npx -y some-mcp-server', mcpRules);
    expect(idsOf(findings)).toContain('mcp.npx-auto-install-latest');
  });

  it('does not flag npx -y with a pinned version', () => {
    const findings = scanFile('.mcp.json', 'npx -y some-mcp-server@1.2.3', mcpRules);
    expect(idsOf(findings)).not.toContain('mcp.npx-auto-install-latest');
  });

  it('flags an inlined secret-shaped env value', () => {
    const content = '{"env":{"OPENAI_API_KEY":"sk-abcdefghijklmnop1234"}}';
    const findings = scanFile('.mcp.json', content, mcpRules);
    expect(idsOf(findings)).toContain('mcp.env-secret-inlined');
  });

  it('does not flag an env value that references a shell variable', () => {
    const content = '{"env":{"OPENAI_API_KEY":"$OPENAI_API_KEY"}}';
    const findings = scanFile('.mcp.json', content, mcpRules);
    expect(idsOf(findings)).not.toContain('mcp.env-secret-inlined');
  });

  // Regression tests for Fase 2 dogfood bug #5 (docs/DOGFOOD-BASELINE.md):
  // secrets passed as CLI args (not "env") were invisible to the scanner.
  // Values below are synthetic, shaped like the real ones found but not
  // derived from them.
  it('flags a secret-shaped value inlined in a single "--flag=value" arg', () => {
    const content = '{"args":["-y","@supabase/mcp-server-supabase@latest","--access-token=sbp_exampleSyntheticToken0000000000"]}';
    const findings = scanFile('.mcp.json', content, mcpRules);
    expect(idsOf(findings)).toContain('mcp.arg-secret-inlined');
  });

  it('flags a secret-shaped value in the arg adjacent to its "--flag"', () => {
    const content = '{"args":["--api-key","exampleSyntheticApiKeyValue00000000"]}';
    const findings = scanFile('.mcp.json', content, mcpRules);
    expect(idsOf(findings)).toContain('mcp.arg-secret-inlined');
  });

  it('does not flag an args array with no key/token/secret-shaped flag', () => {
    const content = '{"args":["--host","localhost","--port","9621"]}';
    const findings = scanFile('.mcp.json', content, mcpRules);
    expect(idsOf(findings)).not.toContain('mcp.arg-secret-inlined');
  });
});
