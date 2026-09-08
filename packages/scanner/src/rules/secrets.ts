import type { Rule } from '../types.js';
import { createLineIndex } from '../line-index.js';

function makeRegexSecretRule(opts: {
  id: string;
  description: string;
  remediation: string;
  pattern: RegExp;
  severity: Rule['severity'];
}): Rule {
  return {
    id: opts.id,
    category: 'secrets',
    severity: opts.severity,
    description: opts.description,
    remediation: opts.remediation,
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const re = new RegExp(opts.pattern.source, opts.pattern.flags.includes('g') ? opts.pattern.flags : opts.pattern.flags + 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({
          line: lineAt(m.index),
          rawEvidence: m[0],
          confidence: 'measured',
        });
      }
      return matches;
    },
  };
}

export const secretRules: Rule[] = [
  makeRegexSecretRule({
    id: 'secrets.anthropic-api-key',
    description: 'Posible API key de Anthropic hardcodeada en el archivo.',
    remediation: 'Mover la clave a una variable de entorno y revocarla si ya fue expuesta.',
    pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/,
    severity: 'critical',
  }),
  makeRegexSecretRule({
    id: 'secrets.openai-api-key',
    description: 'Posible API key de OpenAI hardcodeada en el archivo.',
    remediation: 'Mover la clave a una variable de entorno y revocarla si ya fue expuesta.',
    pattern: /sk-[a-zA-Z0-9]{20,}/,
    severity: 'critical',
  }),
  makeRegexSecretRule({
    id: 'secrets.aws-access-key-id',
    description: 'Posible AWS Access Key ID hardcodeado.',
    remediation: 'Usar un rol/perfil de AWS o variables de entorno; rotar la clave si fue expuesta.',
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: 'critical',
  }),
  makeRegexSecretRule({
    id: 'secrets.github-token',
    description: 'Posible token de GitHub (personal access token) hardcodeado.',
    remediation: 'Revocar el token y moverlo a un secret manager o variable de entorno.',
    // Classic PATs (ghp_/gho_/ghu_/ghs_/ghr_) plus the current
    // fine-grained format (github_pat_...), confirmed against GitHub's
    // documented token prefixes. Verified against a real fine-grained
    // token during O2B's Fase 2 dogfood (docs/DOGFOOD-BASELINE.md, bug
    // #4) that the classic-only pattern missed.
    pattern: /(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/,
    severity: 'critical',
  }),
  makeRegexSecretRule({
    id: 'secrets.generic-private-key-block',
    description: 'Bloque de clave privada (PEM) presente en el archivo.',
    remediation: 'Nunca commitear claves privadas; moverlas a un secret manager.',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    severity: 'critical',
  }),
  makeRegexSecretRule({
    id: 'secrets.slack-token',
    description: 'Posible token de Slack hardcodeado.',
    remediation: 'Revocar el token y moverlo a variable de entorno.',
    pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/,
    severity: 'high',
  }),
];
