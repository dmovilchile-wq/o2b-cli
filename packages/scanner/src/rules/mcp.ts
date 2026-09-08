import type { Rule } from '../types.js';
import { createLineIndex } from '../line-index.js';

export const mcpRules: Rule[] = [
  {
    id: 'mcp.npx-auto-install-latest',
    category: 'mcp',
    severity: 'medium',
    description: 'Un servidor MCP se instala con "npx -y" sin fijar versión, ejecutando código de terceros sin pin.',
    remediation: 'Fijar una versión exacta del paquete (ej. paquete@1.2.3) en vez de resolver "latest" en cada arranque.',
    appliesTo: (filePath) => filePath.endsWith('.json') || filePath.endsWith('.toml'),
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const re = /npx\s+-y\s+([a-zA-Z0-9@/_-]+)(?!@)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        if (/@[\d.]/.test(m[0])) continue; // already pinned
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
  {
    id: 'mcp.env-secret-inlined',
    category: 'mcp',
    severity: 'high',
    description: 'La configuración de un servidor MCP tiene un valor de variable de entorno con forma de secreto en texto plano (en vez de referenciarlo desde el entorno del sistema).',
    remediation: 'No incluir valores de secretos directamente en el JSON/TOML de configuración; usar variables de entorno del sistema.',
    appliesTo: (filePath) => filePath.endsWith('.json') || filePath.endsWith('.toml'),
    check(content) {
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const re = /"[A-Z_]*(KEY|TOKEN|SECRET)[A-Z_]*"\s*:\s*"([^"$]{12,})"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
  {
    id: 'mcp.arg-secret-inlined',
    category: 'mcp',
    severity: 'high',
    description: 'La configuración de un servidor MCP pasa lo que parece ser un secreto en texto plano como argumento de línea de comandos ("args"), en vez de referenciarlo desde el entorno del sistema.',
    remediation: 'No pasar valores de secretos como argumentos CLI en la config del servidor MCP; usar variables de entorno del sistema en vez de "args".',
    appliesTo: (filePath) => filePath.endsWith('.json') || filePath.endsWith('.toml'),
    check(content) {
      // Heuristic, not structural JSON parsing (rules operate on raw
      // text). Covers two real shapes seen during Fase 2 dogfood
      // (docs/DOGFOOD-BASELINE.md, bug #5):
      //   1. "--flag=value" in one arg string (e.g. Supabase's
      //      "--access-token=sbp_...").
      //   2. "--flag" and its value as two adjacent array entries
      //      (e.g. LightRAG's "--api-key", "<key>").
      const matches: ReturnType<Rule['check']> = [];
      const lineAt = createLineIndex(content);
      const inlineRe = /--[a-zA-Z-]*(?:key|token|secret)[a-zA-Z-]*=([A-Za-z0-9_.\/-]{12,})/gi;
      let m: RegExpExecArray | null;
      while ((m = inlineRe.exec(content)) !== null) {
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'heuristic' });
      }
      const adjacentRe = /"--[a-zA-Z-]*(?:key|token|secret)[a-zA-Z-]*"\s*,\s*\n?\s*"([A-Za-z0-9_.\/-]{12,})"/gi;
      while ((m = adjacentRe.exec(content)) !== null) {
        matches.push({ line: lineAt(m.index), rawEvidence: m[0], confidence: 'heuristic' });
      }
      return matches;
    },
  },
];
