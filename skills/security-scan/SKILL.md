---
name: security-scan
description: Run O2B's own security scanner (@o2b/scanner) over a project's AI-agent configuration — secrets (including ones passed as CLI args, not just env), permissions, hooks, MCP servers, and instruction-injection patterns. Use before shipping changes to agent/harness configuration, or whenever hardcoded secrets in CLAUDE.md/AGENTS.md/settings.json/.mcp.json need checking.
origin: O2B
version: 2.0.0
tags: [security, secrets, scanner]
---

## Purpose

Run the real O2B scanner instead of eyeballing config files for
secrets — a manual read misses things the scanner's rules catch
systematically (e.g. a token passed as a CLI arg instead of an env
var, which a human skim of "env values" easily misses).

## When to Activate

Before shipping changes to agent/harness configuration, or when
reviewing any CLAUDE.md/AGENTS.md/settings.json/.mcp.json/.claude.json
change for hardcoded secrets.

## Inputs

`o2b scan [rootDir] [--home <dir>]` (security-only) or `o2b doctor` for
the full picture including conflicts and context.

## Workflow

1. Run `o2b scan` (or `doctor` if conflicts/context are also relevant).
2. Report each finding with its rule ID, severity, and confidence
   (`measured` for exact-pattern rules, `heuristic` for the
   argument-shaped secret rules) — never collapse confidence levels
   together.
3. For MCP-specific findings, cross-check `mcp-review` — a secret
   inlined in an MCP server's `env` or `args` is both a `security-scan`
   finding and an MCP hygiene issue.

## Evidence Requirements

Quote the finding's already-redacted `evidence` field — never attempt
to un-redact it or guess the full secret from context.

## Confidence / Uncertainty

State each rule's `confidence` as reported. Heuristic rules (e.g.
secret-shaped CLI args) can miss unusual shapes — say so rather than
implying full coverage.

## Safety Rules

Never print, log, or reconstruct a secret's full value under any
circumstance, even if asked directly. Never fix a finding by writing
to the config file — O2B is read-only; report only.

## Anti-Patterns

- Treating a clean scan (0 findings) as proof of no secrets — it only
  means none of the current rules matched. O2B's own dogfood found 0
  findings before a coverage bug was fixed, then 6 real ones after —
  a clean scan is evidence of *coverage*, not necessarily of safety.
- Stopping at `env`-block secrets and ignoring `args` arrays — the
  most severe real secrets found in O2B's own dogfood were passed as
  CLI arguments, not env values.

## Expected Output

One entry per finding: rule, severity, confidence, file:line, redacted
evidence, remediation — never a bare pass/fail.

## Related O2B Skills

`mcp-review`, `hook-plugin-audit`, `instruction-conflict-analysis`.
