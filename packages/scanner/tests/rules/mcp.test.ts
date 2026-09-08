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
});
