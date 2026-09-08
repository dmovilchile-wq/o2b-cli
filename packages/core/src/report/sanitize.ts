import type { DoctorReport } from '../domain/types.js';

// Fase "Beta Safety" (private beta prep): produces a DoctorReport safe to
// hand to O2B's own maintainers as feedback from a beta tester, without
// asking that tester to share their real config.
//
// What the DoctorReport ALREADY never contains (verified against the
// adapters/scanner, not assumed):
//   - Raw CLAUDE.md/AGENTS.md/settings.json file CONTENTS — only
//     path/size/estimatedTokens metadata is ever recorded.
//   - Env var VALUES — only names (envVarNames).
//   - Full prompt/conversation content — O2B never reads that at all.
//   - Un-redacted secret values — packages/scanner/src/redact.ts redacts
//     every SecurityFinding.evidence before it leaves the scanner.
//
// What THIS module removes on top of that: the beta tester's real
// absolute filesystem paths (which embed their OS username / home
// directory layout), by replacing every occurrence of their homeDir and
// project rootDir with stable placeholder tokens across every string
// field in the report — sourcePath, file, path, warnings text, etc.
const HOME_TOKEN = '<HOME>';
const PROJECT_TOKEN = '<PROJECT>';

function bothSlashStyles(p: string): string[] {
  const normalized = p.replace(/\\/g, '/');
  return [...new Set([p, normalized])];
}

function replaceAllOccurrences(text: string, needle: string, token: string): string {
  if (!needle) return text;
  return text.split(needle).join(token);
}

function sanitizeString(value: string, projectNeedles: string[], homeNeedles: string[]): string {
  let out = value;
  // Project path first: it's normally nested inside the home directory
  // (e.g. ~/some/project), so replacing home first would corrupt the
  // project-path occurrences before the project needle ever matches.
  for (const needle of projectNeedles) out = replaceAllOccurrences(out, needle, PROJECT_TOKEN);
  for (const needle of homeNeedles) out = replaceAllOccurrences(out, needle, HOME_TOKEN);
  return out;
}

function walk(value: unknown, projectNeedles: string[], homeNeedles: string[]): unknown {
  if (typeof value === 'string') return sanitizeString(value, projectNeedles, homeNeedles);
  if (Array.isArray(value)) return value.map((v) => walk(v, projectNeedles, homeNeedles));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, projectNeedles, homeNeedles);
    return out;
  }
  return value;
}

/**
 * Returns a new DoctorReport with every occurrence of `rootDir` and
 * `homeDir` (in either path-separator style) replaced by stable
 * placeholder tokens across all string fields. Does not mutate the
 * input.
 */
export function sanitizeDoctorReport(report: DoctorReport, homeDir: string, rootDir: string): DoctorReport {
  const homeNeedles = bothSlashStyles(homeDir);
  const projectNeedles = bothSlashStyles(rootDir);
  return walk(report, projectNeedles, homeNeedles) as DoctorReport;
}
