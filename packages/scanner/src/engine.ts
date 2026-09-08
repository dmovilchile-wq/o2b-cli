import type { Rule, SecurityFinding } from './types.js';
import { redactLine } from './redact.js';
import { secretRules } from './rules/secrets.js';
import { permissionRules } from './rules/permissions.js';
import { hookRules } from './rules/hooks.js';
import { mcpRules } from './rules/mcp.js';
import { instructionRules } from './rules/instructions.js';

export const ALL_RULES: Rule[] = [
  ...secretRules,
  ...permissionRules,
  ...hookRules,
  ...mcpRules,
  ...instructionRules,
];

let findingSeq = 0;

export function scanFile(filePath: string, content: string, rules: Rule[] = ALL_RULES): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const rule of rules) {
    if (!rule.appliesTo(filePath)) continue;
    const matches = rule.check(content, filePath);
    for (const match of matches) {
      const lineText = match.line ? (content.split('\n')[match.line - 1] || '') : match.rawEvidence;
      findingSeq += 1;
      findings.push({
        id: `finding-${findingSeq}`,
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        confidence: match.confidence,
        file: filePath,
        location: { line: match.line },
        description: rule.description,
        evidence: redactLine(lineText, match.rawEvidence),
        remediation: rule.remediation,
      });
    }
  }
  return findings;
}

export interface FileInput {
  path: string;
  content: string;
}

export function scanFiles(files: FileInput[], rules: Rule[] = ALL_RULES): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const file of files) {
    findings.push(...scanFile(file.path, file.content, rules));
  }
  return findings;
}
