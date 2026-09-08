import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { Conflict, EntityRef } from '../domain/types.js';
import type { RawInventory } from '../inventory/collect.js';

// Opposite-polarity marker pairs used by the intentionally conservative
// contradictory-instruction check below. English + Spanish only in Phase 1.
const OPPOSITE_MARKERS: [RegExp, RegExp][] = [
  [/\bnunca\s+([a-záéíóúñ]{3,})/gi, /\bsiempre\s+([a-záéíóúñ]{3,})/gi],
  [/\bnever\s+([a-z]{3,})/gi, /\balways\s+([a-z]{3,})/gi],
];

function extractMarkerWords(content: string, pattern: RegExp): Set<string> {
  const words = new Set<string>();
  const re = new RegExp(pattern.source, pattern.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) words.add(m[1].toLowerCase());
  return words;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection += 1;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

const SIMILAR_DESCRIPTION_THRESHOLD = 0.6;

/**
 * Detects conflicts across an already-collected RawInventory. Read-only:
 * never mutates the inventory, and the only filesystem access is a plain
 * existence check (orphaned-hook-reference) — never a write.
 */
export function detectConflicts(inventory: RawInventory): Conflict[] {
  const conflicts: Conflict[] = [];
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${(seq += 1)}`;

  // 1. Duplicate names — MEASURED (exact string match).
  function findDuplicateNames(
    entities: { id: string; name: string }[],
    entityType: EntityRef['type']
  ) {
    const byName = new Map<string, { id: string; name: string }[]>();
    for (const e of entities) {
      const list = byName.get(e.name) || [];
      list.push(e);
      byName.set(e.name, list);
    }
    for (const [name, list] of byName) {
      if (list.length < 2) continue;
      conflicts.push({
        id: nextId('conflict'),
        type: 'duplicate-name',
        involves: list.map((e) => ({ type: entityType, id: e.id })),
        description: `"${name}" está definido ${list.length} veces (${entityType}).`,
        severity: 'medium',
        confidence: 'measured',
      });
    }
  }

  findDuplicateNames(inventory.agents, 'agent');
  findDuplicateNames(inventory.skills, 'skill');
  findDuplicateNames(inventory.mcpServers, 'mcpServer');

  // 2. Similar skill descriptions — HEURISTIC (lexical similarity, not semantic).
  for (let i = 0; i < inventory.skills.length; i += 1) {
    for (let j = i + 1; j < inventory.skills.length; j += 1) {
      const a = inventory.skills[i];
      const b = inventory.skills[j];
      if (a.name === b.name) continue; // already reported as duplicate-name
      const similarity = jaccardSimilarity(a.description, b.description);
      if (similarity >= SIMILAR_DESCRIPTION_THRESHOLD) {
        conflicts.push({
          id: nextId('conflict'),
          type: 'similar-description',
          involves: [
            { type: 'skill', id: a.id },
            { type: 'skill', id: b.id },
          ],
          description: `"${a.name}" y "${b.name}" tienen descripciones muy similares (similitud léxica ${(similarity * 100).toFixed(0)}%) — posible solapamiento, no confirmado.`,
          severity: 'low',
          confidence: 'heuristic',
        });
      }
    }
  }

  // 3. Colliding hooks — MEASURED (same event + identical command from two sources).
  const byEventCommand = new Map<string, { id: string; sourcePath: string }[]>();
  for (const h of inventory.hooks) {
    const key = `${h.event}::${h.command}`;
    const list = byEventCommand.get(key) || [];
    list.push({ id: h.id, sourcePath: h.sourcePath });
    byEventCommand.set(key, list);
  }
  for (const [key, list] of byEventCommand) {
    const uniqueSources = new Set(list.map((x) => x.sourcePath));
    if (uniqueSources.size < 2) continue;
    conflicts.push({
      id: nextId('conflict'),
      type: 'colliding-hook',
      involves: list.map((h) => ({ type: 'hook', id: h.id })),
      description: `El mismo hook (${key.split('::')[0]}) con comando idéntico está declarado en más de una fuente de configuración.`,
      severity: 'low',
      confidence: 'measured',
    });
  }

  // 4. Redundant MCP servers — HEURISTIC (name/purpose similarity, not a
  // guarantee they are truly redundant — two servers can share a word in
  // their name and still serve different purposes).
  for (let i = 0; i < inventory.mcpServers.length; i += 1) {
    for (let j = i + 1; j < inventory.mcpServers.length; j += 1) {
      const a = inventory.mcpServers[i];
      const b = inventory.mcpServers[j];
      if (a.name === b.name) continue; // already reported as duplicate-name
      const similarity = jaccardSimilarity(a.name.replace(/[-_]/g, ' '), b.name.replace(/[-_]/g, ' '));
      if (similarity >= SIMILAR_DESCRIPTION_THRESHOLD) {
        conflicts.push({
          id: nextId('conflict'),
          type: 'redundant-mcp',
          involves: [
            { type: 'mcpServer', id: a.id },
            { type: 'mcpServer', id: b.id },
          ],
          description: `Los servidores MCP "${a.name}" y "${b.name}" tienen nombres muy similares — posible redundancia, no confirmada.`,
          severity: 'low',
          confidence: 'heuristic',
        });
      }
    }
  }

  // 5. Orphaned hook reference — MEASURED: a hook command that runs a local
  // script file (via a recognizable "run this file" shape) whose path does
  // not exist relative to the hook's own config file. Intentionally
  // conservative: only flags commands matching a simple, unambiguous
  // "interpreter <relative-path>" shape to avoid false positives on
  // one-liners with no file argument at all.
  for (const hook of inventory.hooks) {
    const scriptMatch = hook.command.match(/\b(?:bash|sh|node|python3?)\s+(\.[\w./-]+\.[a-zA-Z0-9]+)/);
    if (!scriptMatch) continue;
    const relativeScriptPath = scriptMatch[1];
    const configDir = path.dirname(hook.sourcePath);
    const resolvedScriptPath = path.resolve(configDir, relativeScriptPath);
    if (existsSync(resolvedScriptPath)) continue;
    conflicts.push({
      id: nextId('conflict'),
      type: 'orphaned-reference',
      involves: [{ type: 'hook', id: hook.id }],
      description: `El hook de ${hook.event} referencia "${relativeScriptPath}", que no existe relativo a ${hook.sourcePath}.`,
      severity: 'medium',
      confidence: 'measured',
    });
  }

  // 6. Contradictory global vs. project instructions — MEASURED, but
  // intentionally narrow: only fires on an explicit "never X" in one file
  // and "always X" (same X) in the other. Real semantic contradiction
  // detection needs an LLM-as-judge and is out of scope for Phase 1 — see
  // docs/ARCHITECTURE.md.
  const globalInstructions = inventory.instructionSources.filter(
    (i) => i.scope === 'global' && (i.kind === 'CLAUDE.md' || i.kind === 'AGENTS.md')
  );
  const projectInstructions = inventory.instructionSources.filter(
    (i) => i.scope === 'project' && (i.kind === 'CLAUDE.md' || i.kind === 'AGENTS.md')
  );
  for (const g of globalInstructions) {
    for (const p of projectInstructions) {
      let globalContent = '';
      let projectContent = '';
      try {
        globalContent = readFileSync(g.path, 'utf8');
        projectContent = readFileSync(p.path, 'utf8');
      } catch {
        continue;
      }
      for (const [neverPattern, alwaysPattern] of OPPOSITE_MARKERS) {
        const neverInGlobal = extractMarkerWords(globalContent, neverPattern);
        const alwaysInProject = extractMarkerWords(projectContent, alwaysPattern);
        const neverInProject = extractMarkerWords(projectContent, neverPattern);
        const alwaysInGlobal = extractMarkerWords(globalContent, alwaysPattern);
        const contradictingWords = new Set(
          [...neverInGlobal].filter((w) => alwaysInProject.has(w)).concat(
            [...neverInProject].filter((w) => alwaysInGlobal.has(w))
          )
        );
        for (const word of contradictingWords) {
          conflicts.push({
            id: nextId('conflict'),
            type: 'contradictory-instruction',
            involves: [
              { type: 'instructionSource', id: g.id },
              { type: 'instructionSource', id: p.id },
            ],
            description: `Instrucción contradictoria sobre "${word}" entre ${g.path} (global) y ${p.path} (proyecto).`,
            severity: 'medium',
            confidence: 'measured',
          });
        }
      }
    }
  }

  return conflicts;
}
