import type { Rule } from '../types.js';

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

export const permissionRules: Rule[] = [
  {
    id: 'permissions.dangerously-skip-permissions',
    category: 'permissions',
    severity: 'critical',
    description: 'La configuración usa --dangerously-skip-permissions, que desactiva las confirmaciones de seguridad.',
    remediation: 'Quitar esta flag salvo en entornos sandbox controlados y documentados.',
    appliesTo: (filePath) => filePath.endsWith('.json') || filePath.endsWith('.md'),
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const re = /--dangerously-skip-permissions/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineNumberAt(content, m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
  {
    id: 'permissions.wildcard-bash',
    category: 'permissions',
    severity: 'high',
    description: 'Permiso Bash(*) — permite ejecutar cualquier comando sin restricción.',
    remediation: 'Reemplazar por permisos específicos (ej. Bash(npm test *)) en vez de un wildcard total.',
    appliesTo: (filePath) => filePath.endsWith('.json'),
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const re = /"Bash\(\*\)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineNumberAt(content, m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
  {
    id: 'permissions.no-verify-git-hook',
    category: 'permissions',
    severity: 'medium',
    description: 'Comando de git con --no-verify, que salta hooks de commit/push (posible bypass de checks de seguridad).',
    remediation: 'Evitar --no-verify salvo justificación explícita y documentada.',
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const re = /git\s+(commit|push)[^\n]*--no-verify/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineNumberAt(content, m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
];
