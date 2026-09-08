import type { Conflict, HealthScores, SecurityFinding, ContextBreakdown } from '../domain/types.js';

const SEVERITY_WEIGHT: Record<SecurityFinding['severity'], number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeSecurityScore(findings: SecurityFinding[]): HealthScores['security'] {
  const penalty = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] || 0), 0);
  return {
    value: clampScore(100 - penalty),
    method: 'measured',
    breakdown: `${findings.length} hallazgo(s) de seguridad ponderados por severidad.`,
  };
}

export function computeConfigurationScore(conflicts: Conflict[]): HealthScores['configuration'] {
  const measured = conflicts.filter((c) => c.confidence === 'measured');
  const heuristic = conflicts.filter((c) => c.confidence === 'heuristic');
  const penalty = measured.length * 10 + heuristic.length * 4;
  return {
    value: clampScore(100 - penalty),
    method: 'measured+heuristic',
    breakdown: `${measured.length} conflicto(s) medido(s), ${heuristic.length} heurístico(s) (posible redundancia).`,
  };
}

// BUDGET_TOKENS is an ARBITRARY reference point, not an empirically derived
// threshold — there is no study backing "20,000 always-loaded tokens is
// where things get bad" for any given model/context-window combination.
// That is exactly why this is called a "Context Configuration" score, not
// a "Context Efficiency" score: "efficiency" would imply a validated
// cost/benefit relationship we do not have evidence for. What this score
// DOES measure honestly: how large the always-loaded instruction set is
// relative to a documented, adjustable reference budget — nothing more.
// See docs/CONTEXT-SCORING.md for the full validation writeup (monotonicity,
// bounds, edge cases) and an explicit list of what remains unvalidated.
export const CONTEXT_BUDGET_TOKENS = 20_000;

export function computeContextConfigurationScore(
  breakdown: ContextBreakdown
): HealthScores['contextConfiguration'] {
  // Penalizes only the ALWAYS-LOADED tokens (the one category confirmed to
  // load in every session per Claude's documented progressive-disclosure
  // behavior). Never penalizes ON-DEMAND POTENTIAL, since that cost is not
  // confirmed to be incurred in any given session.
  const alwaysLoadedTokens = breakdown.alwaysLoaded.estimatedTokens ?? 0;
  const overBudgetRatio = Math.max(0, (alwaysLoadedTokens - CONTEXT_BUDGET_TOKENS) / CONTEXT_BUDGET_TOKENS);
  const value = clampScore(100 - overBudgetRatio * 100);
  return {
    value,
    method: 'estimated',
    breakdown: `${alwaysLoadedTokens} tokens estimados siempre-cargados vs. presupuesto de referencia (arbitrario, no validado empíricamente) de ${CONTEXT_BUDGET_TOKENS}.`,
  };
}

export function computeCompatibilityScore(warnings: string[]): HealthScores['compatibility'] {
  const penalty = warnings.length * 5;
  return {
    value: clampScore(100 - penalty),
    method: 'heuristic',
    breakdown: `${warnings.length} advertencia(s) de compatibilidad/lectura durante la recolección.`,
  };
}
