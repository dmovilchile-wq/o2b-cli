export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'measured' | 'heuristic' | 'estimated';
export type FindingCategory = 'secrets' | 'permissions' | 'hooks' | 'mcp' | 'instructions';

export interface RuleMatch {
  line?: number;
  rawEvidence: string; // pre-redaction; the engine redacts before it ever leaves scope
  confidence: Confidence;
}

export interface Rule {
  id: string;
  category: FindingCategory;
  severity: Severity;
  description: string;
  remediation: string;
  /** filePathHint lets a rule opt out of files it doesn't apply to (e.g. only .json). */
  appliesTo(filePath: string): boolean;
  check(content: string, filePath: string): RuleMatch[];
}

export interface SecurityFinding {
  id: string;
  ruleId: string;
  category: FindingCategory;
  severity: Severity;
  confidence: Confidence;
  file: string;
  location: { line?: number };
  description: string;
  evidence: string; // always redacted by the engine before this is populated
  remediation: string;
}
