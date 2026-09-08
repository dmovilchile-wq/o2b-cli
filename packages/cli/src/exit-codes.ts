// Stable exit-code contract so `o2b doctor`/`o2b scan` can be dropped into
// CI (GitHub Actions, GitLab, etc.) without redesigning them later.
export const EXIT_HEALTHY = 0; // no blocking findings
export const EXIT_WARNINGS = 1; // findings/conflicts at or above a warning threshold, none critical
export const EXIT_CRITICAL = 2; // at least one critical/high security finding
export const EXIT_EXECUTION_ERROR = 3; // O2B itself failed to run (bad args, I/O error, etc.)

import type { SecurityFinding } from '@o2b/core';

// `strict`: for CI gates that want zero tolerance — any finding at all
// (not just critical/high) is treated as a hard failure (EXIT_CRITICAL),
// rather than the default EXIT_WARNINGS. Purely a CLI-layer policy choice;
// the underlying findings and their severities are never altered by it.
export function exitCodeForFindings(findings: SecurityFinding[], strict = false): number {
  const hasCritical = findings.some((f) => f.severity === 'critical' || f.severity === 'high');
  if (hasCritical) return EXIT_CRITICAL;
  if (findings.length > 0) return strict ? EXIT_CRITICAL : EXIT_WARNINGS;
  return EXIT_HEALTHY;
}
