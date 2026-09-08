// Never expose a full secret in a finding's evidence. Show a short prefix
// and suffix with a masked middle, and cap total shown length.

export function redactSecret(raw: string): string {
  if (raw.length <= 8) return '*'.repeat(raw.length);
  const prefix = raw.slice(0, 4);
  const suffix = raw.slice(-4);
  return `${prefix}${'*'.repeat(Math.min(raw.length - 8, 20))}${suffix}`;
}

export function redactLine(line: string, secretMatch: string): string {
  const redacted = redactSecret(secretMatch);
  return line.replace(secretMatch, redacted).trim().slice(0, 200);
}
