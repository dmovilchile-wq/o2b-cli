import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Fase 9 (Skills Expansion) — validates O2B's OWN skills/*/SKILL.md
// catalog: frontmatter completeness, no duplicate names, valid origin,
// no broken "Related O2B Skills" references, no near-duplicate
// descriptions (activation overlap risk). This is O2B auditing its
// own skill catalog with the same rigor it asks of a user's — see
// docs/SKILLS-CATALOG-V0.3.md.

const here = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.join(here, '..', '..', '..', '..', 'skills');
const VALID_ORIGINS = new Set(['O2B', 'O2B-CONTRIBUTOR']);

interface ParsedSkill {
  dir: string;
  name?: string;
  description?: string;
  origin?: string;
  version?: string;
  body: string;
}

function parseFrontmatter(content: string): { fm: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: content };
  const fm: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body: match[2] };
}

async function loadCatalog(): Promise<ParsedSkill[]> {
  const dirs = (await fs.readdir(skillsDir, { withFileTypes: true } as any))
    .filter((d: any) => d.isDirectory())
    .map((d: any) => d.name);
  const skills: ParsedSkill[] = [];
  for (const dir of dirs) {
    const filePath = path.join(skillsDir, dir, 'SKILL.md');
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      skills.push({ dir, body: '' });
      continue;
    }
    const { fm, body } = parseFrontmatter(content);
    skills.push({ dir, name: fm.name, description: fm.description, origin: fm.origin, version: fm.version, body });
  }
  return skills;
}

// Cheap lexical similarity (shared-word ratio) — same spirit as O2B's
// own conflict detector, deliberately simple, not a semantic model.
function wordSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const wb = new Set(b.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size);
}

describe('O2B skills catalog — self-validation', () => {
  it('every skill directory has a SKILL.md with frontmatter', async () => {
    const skills = await loadCatalog();
    for (const s of skills) {
      expect(s.name, `${s.dir}: missing SKILL.md or frontmatter`).toBeTruthy();
    }
  });

  it('every skill has a non-empty description', async () => {
    const skills = await loadCatalog();
    for (const s of skills) {
      expect(s.description, `${s.dir}: missing description`).toBeTruthy();
      expect(s.description!.length, `${s.dir}: description too short`).toBeGreaterThan(20);
    }
  });

  it('no duplicate skill names', async () => {
    const skills = await loadCatalog();
    const names = skills.map((s) => s.name);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const n of names) {
      if (n && seen.has(n)) dupes.push(n);
      if (n) seen.add(n);
    }
    expect(dupes, `duplicate names: ${dupes.join(', ')}`).toEqual([]);
  });

  it('every skill has a valid origin (O2B or O2B-CONTRIBUTOR)', async () => {
    const skills = await loadCatalog();
    for (const s of skills) {
      expect(VALID_ORIGINS.has(s.origin ?? ''), `${s.dir}: invalid origin "${s.origin}"`).toBe(true);
    }
  });

  it('every "Related O2B Skills" reference points at a real skill in the catalog', async () => {
    const skills = await loadCatalog();
    const knownNames = new Set(skills.map((s) => s.name).filter(Boolean));
    for (const s of skills) {
      const relatedSection = s.body.split(/## Related O2B Skills/i)[1];
      if (!relatedSection) continue; // contributor skills don't have this section
      const referenced = [...relatedSection.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
      for (const ref of referenced) {
        expect(knownNames.has(ref), `${s.dir}: "Related O2B Skills" references unknown skill "${ref}"`).toBe(true);
      }
    }
  });

  it('no two skills have near-duplicate descriptions (activation overlap risk)', async () => {
    const skills = await loadCatalog();
    const withDesc = skills.filter((s) => s.description);
    const overlaps: string[] = [];
    for (let i = 0; i < withDesc.length; i += 1) {
      for (let j = i + 1; j < withDesc.length; j += 1) {
        const sim = wordSimilarity(withDesc[i].description!, withDesc[j].description!);
        if (sim > 0.6) overlaps.push(`${withDesc[i].dir} <-> ${withDesc[j].dir} (${(sim * 100).toFixed(0)}%)`);
      }
    }
    expect(overlaps, `near-duplicate descriptions: ${overlaps.join('; ')}`).toEqual([]);
  });
});
