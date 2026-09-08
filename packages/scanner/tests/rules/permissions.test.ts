import { describe, expect, it } from 'vitest';
import { scanFile } from '../../src/engine.js';
import { permissionRules } from '../../src/rules/permissions.js';

function idsOf(findings: ReturnType<typeof scanFile>) {
  return findings.map((f) => f.ruleId);
}

describe('permissions rules', () => {
  it('flags --dangerously-skip-permissions', () => {
    const content = 'claude --dangerously-skip-permissions "do the task"';
    const findings = scanFile('run.md', content, permissionRules);
    expect(idsOf(findings)).toContain('permissions.dangerously-skip-permissions');
  });

  it('does not flag a normal claude invocation', () => {
    const content = 'claude "do the task"';
    const findings = scanFile('run.md', content, permissionRules);
    expect(idsOf(findings)).not.toContain('permissions.dangerously-skip-permissions');
  });

  it('flags a Bash(*) wildcard permission in settings.json', () => {
    const content = '{"permissions":{"allow":["Bash(*)"]}}';
    const findings = scanFile('settings.json', content, permissionRules);
    expect(idsOf(findings)).toContain('permissions.wildcard-bash');
  });

  it('does not flag a scoped Bash permission', () => {
    const content = '{"permissions":{"allow":["Bash(npm test *)"]}}';
    const findings = scanFile('settings.json', content, permissionRules);
    expect(idsOf(findings)).not.toContain('permissions.wildcard-bash');
  });

  it('flags git commit --no-verify', () => {
    const content = 'git commit -m "wip" --no-verify';
    const findings = scanFile('hook.sh', content, permissionRules);
    expect(idsOf(findings)).toContain('permissions.no-verify-git-hook');
  });

  it('does not flag a normal git commit', () => {
    const content = 'git commit -m "wip"';
    const findings = scanFile('hook.sh', content, permissionRules);
    expect(idsOf(findings)).not.toContain('permissions.no-verify-git-hook');
  });
});
