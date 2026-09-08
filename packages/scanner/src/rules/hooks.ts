import type { Rule } from '../types.js';
import { createLineIndex } from '../line-index.js';

export const hookRules: Rule[] = [
  {
    id: 'hooks.pipe-curl-to-shell',
    category: 'hooks',
    severity: 'critical',
    description: 'Un hook descarga contenido remoto y lo ejecuta directamente en shell (curl|sh o wget|bash).',
    remediation: 'Descargar a un archivo, verificar su contenido/checksum, y ejecutar explícitamente después.',
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const re = /(curl|wget)[^\n]*\|\s*(sh|bash|zsh)\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
  {
    id: 'hooks.recursive-delete',
    category: 'hooks',
    severity: 'high',
    description: 'Un hook contiene un comando de borrado recursivo (rm -rf o equivalente).',
    remediation: 'Revisar si el borrado recursivo es realmente necesario en un hook automático; acotar la ruta objetivo.',
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const re = /\brm\s+-rf\b[^\n]*/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
  {
    id: 'hooks.eval-of-external-input',
    category: 'hooks',
    severity: 'high',
    description: 'Un hook usa eval sobre una variable, lo que puede permitir inyección de comandos.',
    remediation: 'Evitar eval; usar arrays de argumentos o funciones dedicadas en vez de construir comandos como texto.',
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const re = /\beval\s+"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
];
