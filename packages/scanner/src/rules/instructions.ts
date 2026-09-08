import type { Rule } from '../types.js';

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

// Zero-width / bidi-control / invisible-format Unicode code points sometimes
// used to hide text from a human reviewer while an LLM still parses it.
// Written as explicit \u escapes (never as literal invisible characters) so
// this source file itself stays plain ASCII and unambiguous.
const HIDDEN_UNICODE_PATTERN = new RegExp(
  '[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'g'
);

export const instructionRules: Rule[] = [
  {
    id: 'instructions.hidden-unicode-directive',
    category: 'instructions',
    severity: 'high',
    description:
      'El archivo contiene caracteres Unicode de control/formato invisibles (posible instrucción oculta a simple vista).',
    remediation:
      'Eliminar los caracteres de control no imprimibles del archivo y verificar el origen del contenido.',
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const re = new RegExp(HIDDEN_UNICODE_PATTERN.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({
          line: lineNumberAt(content, m.index),
          rawEvidence: `U+${m[0].codePointAt(0)!.toString(16).toUpperCase()}`,
          confidence: 'measured',
        });
      }
      return matches;
    },
  },
  {
    id: 'instructions.ignore-previous-instructions',
    category: 'instructions',
    severity: 'medium',
    description:
      'El archivo contiene una frase típica de intento de "jailbreak" ("ignore previous instructions" o equivalente).',
    remediation:
      'Revisar el origen y contexto del archivo; si es contenido de terceros no confiable, tratarlo como dato, no como instrucción.',
    appliesTo: () => true,
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const re = /ignor[ae]\s+(all\s+)?(previous|prior|above)\s+instructions?/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineNumberAt(content, m.index), rawEvidence: m[0], confidence: 'heuristic' });
      }
      return matches;
    },
  },
];
