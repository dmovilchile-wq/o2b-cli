import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/adapters/claude-code/index.js';
import { runDoctor } from '../../src/doctor/run.js';

// Fase E of the second autonomous run: targeted hardening tests, not a
// fuzzing framework — each test reproduces one specific malformed-input
// scenario a real filesystem can present, not a random corpus.

async function mktmp(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

const emptyHome = path.join(__dirname, '..', 'fixtures', 'nonexistent-home');

describe('hardening — malformed / adversarial filesystem inputs', () => {
  it('malformed JSON in settings.json does not crash collect(), just skips it', async () => {
    const home = await mktmp('o2b-hardening-json-');
    await fs.mkdir(path.join(home, '.claude'), { recursive: true });
    await fs.writeFile(path.join(home, '.claude', 'settings.json'), '{ this is not valid JSON ][', 'utf8');
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(emptyHome, home);
    expect(collected.hooks).toEqual([]);
  });

  it('malformed JSON in installed_plugins.json does not crash, plugins stays empty', async () => {
    const home = await mktmp('o2b-hardening-plugins-');
    await fs.mkdir(path.join(home, '.claude', 'plugins'), { recursive: true });
    await fs.writeFile(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), 'not json at all', 'utf8');
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(emptyHome, home);
    expect(collected.plugins).toEqual([]);
  });

  it('binary (invalid UTF-8) content as CLAUDE.md does not crash the read/estimate pipeline', async () => {
    const home = await mktmp('o2b-hardening-binary-');
    await fs.mkdir(path.join(home, '.claude'), { recursive: true });
    // Random bytes, deliberately invalid as UTF-8 (lone continuation bytes).
    const binary = Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x80, 0x81, 0x82, 0xc3, 0x28]);
    await fs.writeFile(path.join(home, '.claude', 'CLAUDE.md'), binary);
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(emptyHome, home);
    const claudeMd = collected.instructionSources.find((i) => i.kind === 'CLAUDE.md' && i.scope === 'global');
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.sizeBytes).toBeGreaterThan(0);
    expect(Number.isFinite(claudeMd?.estimatedTokens)).toBe(true);
  });

  it('a plugin installPath containing ".." does not escape into unexpected writes (read-only, so worst case is a misdirected read)', async () => {
    const home = await mktmp('o2b-hardening-traversal-');
    await fs.mkdir(path.join(home, '.claude', 'plugins'), { recursive: true });
    await fs.writeFile(
      path.join(home, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({
        plugins: {
          'evil@marketplace': [{ scope: 'user', installPath: path.join(home, '..', '..', 'nonexistent-traversal-target'), version: '1.0.0' }],
        },
      }),
      'utf8'
    );
    await fs.writeFile(path.join(home, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'evil@marketplace': true } }), 'utf8');
    const adapter = new ClaudeCodeAdapter();
    // Must not throw, regardless of what the traversal path resolves to.
    const collected = await adapter.collect(emptyHome, home);
    const plugin = collected.plugins.find((p) => p.name === 'evil@marketplace');
    expect(plugin).toBeDefined();
    // No fs.access failures propagate as exceptions — capabilities just come back empty.
    expect(Array.isArray(plugin?.providedCapabilities)).toBe(true);
  });

  it('a symlinked skills directory pointing outside the project does not crash collection', async () => {
    const home = await mktmp('o2b-hardening-symlink-');
    const outsideTarget = await mktmp('o2b-hardening-symlink-target-');
    await fs.mkdir(path.join(outsideTarget, 'demo-skill'), { recursive: true });
    await fs.writeFile(path.join(outsideTarget, 'demo-skill', 'SKILL.md'), '---\nname: linked-skill\n---\nbody', 'utf8');
    await fs.mkdir(path.join(home, '.claude'), { recursive: true });
    try {
      await fs.symlink(outsideTarget, path.join(home, '.claude', 'skills'), 'dir');
    } catch {
      // Symlink creation can require elevated privileges on some Windows
      // configurations — skip gracefully rather than fail the suite for
      // an environment permission issue unrelated to O2B's own code.
      return;
    }
    const adapter = new ClaudeCodeAdapter();
    const collected = await adapter.collect(emptyHome, home);
    expect(collected.skills.some((s) => s.name === 'linked-skill')).toBe(true);
  });

  it('runDoctor completes without throwing against a home with several malformed sources at once', async () => {
    const home = await mktmp('o2b-hardening-combo-');
    await fs.mkdir(path.join(home, '.claude', 'plugins'), { recursive: true });
    await fs.writeFile(path.join(home, '.claude', 'settings.json'), '{{{not json', 'utf8');
    await fs.writeFile(path.join(home, '.claude.json'), '[not, an, object]', 'utf8');
    await fs.writeFile(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), 'null', 'utf8');
    await expect(runDoctor(emptyHome, home)).resolves.toBeDefined();
  });
});
