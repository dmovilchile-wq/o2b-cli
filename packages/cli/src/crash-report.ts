import os from 'node:os';

// Beta safety: if O2B crashes, a tester should be able to hand us
// something useful without pasting their real error verbatim (which
// could contain an absolute home path, or — in the worst case, e.g. a
// malformed-JSON parse error that happens to echo a fragment of the
// offending file — something secret-shaped). This builds that report;
// it never touches the filesystem beyond what the caller already read.

const SECRET_SHAPED = /(sk-ant-[a-zA-Z0-9_-]{10,}|sk-[a-zA-Z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{10,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)/g;

function sanitizeText(text: string, homeDir: string): string {
  let out = text;
  const homeVariants = [...new Set([homeDir, homeDir.replace(/\\/g, '/')])];
  for (const h of homeVariants) {
    if (h) out = out.split(h).join('<HOME>');
  }
  out = out.replace(SECRET_SHAPED, '[REDACTED]');
  return out;
}

export interface CrashReport {
  o2bVersion: string;
  nodeVersion: string;
  os: NodeJS.Platform;
  command: string;
  errorClass: string;
  errorMessage: string;
  stack?: string;
  harnessesDetected: string[];
}

export function buildCrashReport(
  err: unknown,
  opts: { o2bVersion: string; command: string; includeStack: boolean; harnessesDetected: string[] }
): CrashReport {
  const homeDir = os.homedir();
  const error = err instanceof Error ? err : new Error(String(err));
  return {
    o2bVersion: opts.o2bVersion,
    nodeVersion: process.version,
    os: os.platform(),
    command: opts.command,
    errorClass: error.constructor?.name ?? 'Error',
    errorMessage: sanitizeText(error.message ?? '', homeDir),
    stack: opts.includeStack && error.stack ? sanitizeText(error.stack, homeDir) : undefined,
    harnessesDetected: opts.harnessesDetected,
  };
}
