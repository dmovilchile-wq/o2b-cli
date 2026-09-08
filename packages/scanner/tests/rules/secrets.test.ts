import { describe, expect, it } from 'vitest';
import { scanFile } from '../../src/engine.js';
import { secretRules } from '../../src/rules/secrets.js';

function idsOf(findings: ReturnType<typeof scanFile>) {
  return findings.map((f) => f.ruleId);
}

describe('secrets rules', () => {
  it('flags an Anthropic-shaped API key', () => {
    const content = 'const key = "sk-ant-api03-abcdefghijklmnopqrstuvwx1234";';
    const findings = scanFile('config.ts', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.anthropic-api-key');
  });

  it('does not flag a docs example placeholder', () => {
    const content = 'Set ANTHROPIC_API_KEY to your own key, e.g. sk-ant-<your-key-here>';
    const findings = scanFile('README.md', content, secretRules);
    expect(idsOf(findings)).not.toContain('secrets.anthropic-api-key');
  });

  it('flags an AWS access key id', () => {
    const content = 'AWS_ACCESS_KEY_ID=AKIAABCDEFGHIJKLMNOP';
    const findings = scanFile('.env', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.aws-access-key-id');
  });

  it('does not flag ordinary uppercase text as an AWS key', () => {
    const content = 'AKIA is not always a real key, e.g. AKIA_PLACEHOLDER_TOO_SHORT';
    const findings = scanFile('notes.md', content, secretRules);
    expect(idsOf(findings)).not.toContain('secrets.aws-access-key-id');
  });

  it('flags a GitHub personal access token', () => {
    const content = 'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
    const findings = scanFile('settings.json', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.github-token');
  });

  it('does not flag a short ghp_-like string below the length threshold', () => {
    const content = 'ghp_short';
    const findings = scanFile('settings.json', content, secretRules);
    expect(idsOf(findings)).not.toContain('secrets.github-token');
  });

  it('flags a fine-grained GitHub PAT (github_pat_ prefix)', () => {
    // Regression test for Fase 2 dogfood bug #4 (docs/DOGFOOD-BASELINE.md):
    // the classic-prefix-only regex missed this real, currently-issued
    // format. Value below is entirely synthetic, not derived from any
    // real token.
    const content = '"GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_ZZ00exampleSyntheticValueOnly1234567890"';
    const findings = scanFile('settings.json', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.github-token');
  });

  it('flags a PEM private key block', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIB...\n-----END RSA PRIVATE KEY-----';
    const findings = scanFile('id_rsa', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.generic-private-key-block');
  });

  it('does not flag a PEM public key block', () => {
    const content = '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----';
    const findings = scanFile('id_rsa.pub', content, secretRules);
    expect(idsOf(findings)).not.toContain('secrets.generic-private-key-block');
  });

  it('flags a Slack token', () => {
    const content = 'SLACK_BOT_TOKEN=xoxb-123456789012-abcdefghijklmnop';
    const findings = scanFile('.env', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.slack-token');
  });

  it('does not flag unrelated text mentioning "xox"', () => {
    const content = 'the variable prefix xox is reserved';
    const findings = scanFile('notes.md', content, secretRules);
    expect(idsOf(findings)).not.toContain('secrets.slack-token');
  });

  it('flags an OpenAI-shaped key', () => {
    const content = 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456';
    const findings = scanFile('.env', content, secretRules);
    expect(idsOf(findings)).toContain('secrets.openai-api-key');
  });

  it('redacts the evidence — never shows the full secret', () => {
    const content = 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456';
    const findings = scanFile('.env', content, secretRules);
    const finding = findings.find((f) => f.ruleId === 'secrets.openai-api-key');
    expect(finding?.evidence).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
    expect(finding?.evidence).toMatch(/\*{3,}/);
  });
});
