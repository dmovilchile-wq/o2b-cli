import type { ContextBreakdown, ContextBreakdownEntry } from '../domain/types.js';
import type { RawInventory } from '../inventory/collect.js';
import { estimateTokens } from './estimate-tokens.js';

// Approximate per-skill "discoverable" cost: the name+description shown in
// the skill index at session start. Documented in Claude's Agent Skills
// docs as "a few dozen tokens per skill" — we compute it directly from the
// frontmatter bytes we actually parsed, rather than hardcoding "a few dozen".
const AVG_FRONTMATTER_CHARS_PER_TOKEN = 4;

export function analyzeContext(inventory: RawInventory): ContextBreakdown {
  const installedCount =
    inventory.agents.length +
    inventory.skills.length +
    inventory.mcpServers.length +
    inventory.hooks.length +
    inventory.plugins.length;

  const installed: ContextBreakdownEntry = {
    label: `${installedCount} elementos instalados (agents+skills+mcp+hooks+plugins)`,
    method: 'measured',
  };

  const discoverableBytes = inventory.skills.reduce((sum, s) => sum + s.frontmatterBytes, 0);
  const discoverable: ContextBreakdownEntry = {
    label: 'Índice de nombre+descripción de skills, cargado siempre al iniciar sesión',
    method: 'estimated',
    sizeBytes: discoverableBytes,
    estimatedTokens: Math.ceil(discoverableBytes / AVG_FRONTMATTER_CHARS_PER_TOKEN),
    note: 'Costo bajo por diseño (progressive disclosure) — no crece linealmente de forma peligrosa con la cantidad de skills.',
  };

  // `alwaysLoaded === false` marks a source Claude Code only loads on
  // demand (e.g. a path-scoped rule in `.claude/rules/`) — it must NOT
  // count toward the always-loaded budget, or the score would punish a
  // pattern (path-scoped rules) that exists specifically to *reduce*
  // context cost.
  const unconditionalSources = inventory.instructionSources.filter((i) => i.alwaysLoaded !== false);
  const onDemandRuleSources = inventory.instructionSources.filter((i) => i.alwaysLoaded === false);

  const alwaysLoadedBytes = unconditionalSources.reduce((sum, i) => sum + i.sizeBytes, 0);
  const alwaysLoadedTokens = unconditionalSources.reduce((sum, i) => sum + i.estimatedTokens, 0);
  const alwaysLoaded: ContextBreakdownEntry = {
    label: 'CLAUDE.md / AGENTS.md / settings.json (global + proyecto) — se leen completos en cada sesión',
    method: 'estimated',
    sizeBytes: alwaysLoadedBytes,
    estimatedTokens: alwaysLoadedTokens,
    note: 'Tamaño en disco es MEDIDO; el conteo de tokens es ESTIMADO (heurística ~4 caracteres/token, no el tokenizer real). Excluye reglas de .claude/rules/ con "paths:" (esas cargan bajo demanda, no siempre).',
  };

  const onDemandRuleBytes = onDemandRuleSources.reduce((sum, i) => sum + i.sizeBytes, 0);
  const onDemandBytes =
    inventory.agents.reduce((sum, a) => sum + a.bodyBytes, 0) +
    inventory.skills.reduce((sum, s) => sum + s.bodyBytes, 0) +
    onDemandRuleBytes;
  const onDemandPotential: ContextBreakdownEntry = {
    label: 'Cuerpo completo de agents/skills — costo SI se activan, no confirmado que se activen',
    method: 'estimated',
    sizeBytes: onDemandBytes,
    estimatedTokens: estimateTokens('x'.repeat(onDemandBytes)),
    note: 'No se puede saber, con un escaneo offline, cuáles de estos se invocan realmente en una sesión.',
  };

  const loadedActive: ContextBreakdownEntry = {
    label: 'Uso real (LOADED/ACTIVE) durante una sesión en curso',
    method: 'unknown',
    note: 'Un CLI offline no tiene acceso a telemetría de sesión — requiere un hook de sesión opcional (ver roadmap Pro). Nunca se rellena con una suposición.',
  };

  return { installed, discoverable, alwaysLoaded, onDemandPotential, loadedActive };
}
