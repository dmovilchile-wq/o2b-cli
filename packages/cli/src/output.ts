// Small, dependency-free ANSI color helper. No chalk/picocolors — this is
// simple enough not to justify a new dependency (see docs/AUTONOMOUS-RUN.md
// Fase 4: "evitar dependencias innecesarias").

const CODES: Record<string, string> = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

export function shouldUseColor(noColorFlag: boolean): boolean {
  if (noColorFlag) return false;
  if (process.env.NO_COLOR) return false; // https://no-color.org
  return Boolean(process.stdout.isTTY);
}

export function colorize(text: string, code: keyof typeof CODES, enabled: boolean): string {
  if (!enabled) return text;
  return `${CODES[code]}${text}${CODES.reset}`;
}

const SEVERITY_COLOR: Record<string, keyof typeof CODES> = {
  critical: 'red',
  high: 'red',
  medium: 'yellow',
  low: 'gray',
  info: 'gray',
};

export function severityColor(severity: string): keyof typeof CODES {
  return SEVERITY_COLOR[severity] ?? 'gray';
}

export function methodTag(method: string): string {
  return `[${method.toUpperCase()}]`;
}
