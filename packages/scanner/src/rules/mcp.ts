import type { Rule } from '../types.js';

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

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
      const re = /npx\s+-y\s+([a-zA-Z0-9@/_-]+)(?!@)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        if (/@[\d.]/.test(m[0])) continue; // already pinned
        matches.push({ line: lineNumberAt(content, m.index), rawEvidence: m[0], confidence: 'measured' });
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
      const re = /"[A-Z_]*(KEY|TOKEN|SECRET)[A-Z_]*"\s*:\s*"([^"$]{12,})"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        matches.push({ line: lineNumberAt(content, m.index), rawEvidence: m[0], confidence: 'measured' });
      }
      return matches;
    },
  },
];
