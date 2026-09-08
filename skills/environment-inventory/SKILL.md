---
name: environment-inventory
description: Read and interpret a full cross-harness AI environment inventory (agents, skills, MCP servers, hooks, plugins, instruction sources) produced by `o2b inventory`. Use when the user asks what's installed across their Claude Code/Codex/Cursor setup, or before making any judgment about redundancy or risk that needs the full picture first.
origin: O2B
version: 1.0.0
tags: [inventory, observability, cross-harness]
---

## Purpose

Turn `o2b inventory`'s raw output into an answer to "what do I actually
have installed, and where does it come from" — across every harness at
once, not one config file at a time.

## When to Activate

Before judging anything as redundant, risky, or missing. Never assume
what's installed from memory or a single `.claude/settings.json` read —
run the command.

## Inputs

`o2b inventory [rootDir] [--home <dir>] [--json]` output. Optionally
`o2b doctor --json` if scores/conflicts are also needed.

## Workflow

1. Run `o2b inventory` (or reuse a recent `--json` output if the user
   already has one).
2. Group findings by harness (`claude-code`/`codex`/`cursor`) and by
   scope (`global`/`project`) — never collapse scope, a global MCP
   server and a project one with the same name are different things.
3. Flag anything with `scope: global` explicitly — global config
   affects every project, not just the one being worked on.
4. Note any adapter `warnings` in the report (e.g. "agents/skills not
   reported for Codex") as an honest coverage gap, not a bug.

## Evidence Requirements

Cite the exact `sourcePath`/count from the inventory output. Never
state "you have N MCP servers" without the number actually coming from
this run's output.

## Confidence / Uncertainty

Inventory is `measured` (files that exist, read directly) — never
present it as "what's actually loaded/used in a session" (that's
`LOADED`/`ACTIVE`, always `unknown` without a deployed observability
hook — see `context-budget-audit`).

## Safety Rules

Read-only. Never suggest editing `~/.claude`, `~/.codex`, or
`~/.cursor` directly from this skill — O2B has no `--apply` mode.

## Anti-Patterns

- Inferring installed content from a single project's `.claude/`
  directory when the user asked about their whole environment.
- Treating plugin-provided capabilities (`providedCapabilities`) as
  proof that a plugin's agents/skills are actually enabled — it's a
  filesystem signal, not a runtime guarantee.

## Expected Output

A grouped summary (by harness, by scope) plus explicit callouts for
anything global or unusual, never a raw dump of the JSON.

## Related O2B Skills

`hook-plugin-audit`, `mcp-review`, `instruction-conflict-analysis`.
