---
name: snapshot-diff-workflow
description: Capture a before/after snapshot of an AI environment with `o2b snapshot` and compare them with `o2b diff` to see exactly what changed — scores, MCP servers, hooks, plugins, instruction sources — after installing something or over time. Use before installing a new plugin/MCP server when the user wants proof of what changed, or when comparing environment health across two points in time.
origin: O2B
version: 1.0.0
tags: [snapshot, diff, observability]
---

## Purpose

Replace "I think this plugin added 3 hooks" with a diff that proves it
— entirely local, no history server, just two JSON files the user
already has.

## When to Activate

Before installing something the user wants to evaluate honestly
("what did that actually change"), or when comparing environment state
across two sessions/machines.

## Inputs

Two `o2b snapshot --out <file>.json` outputs (before and after the
change), or two existing `--json` doctor reports of the same schema
version.

## Workflow

1. Confirm a "before" snapshot exists — if not, take one now, before
   any change happens. A diff is only meaningful with a real before.
2. After the change, take an "after" snapshot.
3. Run `o2b diff before.json after.json` and read every section:
   `scoreDeltas`, `countDeltas` (findings/conflicts/agents/skills/
   mcpServers/hooks/plugins/instructionSources), and
   `alwaysLoadedTokensDelta`.
4. Explain deltas in context — a security score dropping after
   installing something is a real signal to flag prominently, not a
   footnote.

## Evidence Requirements

Quote the exact before/after numbers from `diff`'s output — never
estimate a delta from memory of what the "before" report said earlier
in the conversation.

## Confidence / Uncertainty

`diff` only compares what both snapshots directly measured
(`measured`/`estimated` per O2B's usual scoring) — it cannot explain
*why* something changed, only *that* it did. State causation only if
the user's own action (e.g. "I just installed X") is the only variable
between the two snapshots.

## Safety Rules

`snapshot`/`diff` never modify anything — the only files touched are
the ones the user names with `--out`, and only local file reads for
`diff`. Never suggest uploading a snapshot anywhere.

## Anti-Patterns

- Comparing snapshots taken with different `--home`/`rootDir` values
  and treating the diff as meaningful — the comparison only makes
  sense against the same environment at two points in time.
- Treating a zero delta as "nothing happened" without checking whether
  the "before" snapshot was actually taken before the change.

## Expected Output

A structured before→after summary organized the same way `diff`
already outputs it (scores, then counts, then context tokens) — never
a vague "things changed" statement.

## Related O2B Skills

`environment-inventory`, `context-budget-audit`.
