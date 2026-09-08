---
name: instruction-conflict-analysis
description: Detect and reason about conflicts O2B's Conflict Engine surfaces — contradictory global-vs-project instructions, duplicate agent/skill names, and lexically-similar (possibly redundant) MCP servers or skill descriptions. Use when a project's global and project-level instructions seem to disagree, or before trusting `o2b doctor`'s Configuration score at face value.
origin: O2B
version: 1.0.0
tags: [conflicts, instructions, observability]
---

## Purpose

Turn `o2b doctor`'s `conflicts` array into an explanation of *why* two
sources of instruction disagree, and how confident that finding really
is — never just repeat the raw finding text.

## When to Activate

When a project behaves inconsistently with what the user expects from
their global CLAUDE.md, or before treating the Configuration score as
a simple pass/fail number.

## Inputs

`o2b doctor --json` → `conflicts` array. Each entry has `type`
(`contradictory-instruction`/`duplicate-name`/`redundant-mcp`/
`similar-description`/`orphaned-reference`), `severity`, `confidence`,
and the involved entities.

## Workflow

1. Group conflicts by `type` — each type means something structurally
   different and shouldn't be summarized together.
2. For `contradictory-instruction`: quote both sides (which file said
   what) — never assert a contradiction exists without pointing at
   both sources.
3. For `similar-description`/`redundant-mcp`: report the confidence
   as `heuristic` explicitly — these are lexical-similarity signals,
   not confirmed duplicates. A human still has to confirm intent.
4. For `orphaned-reference`: verify the referenced file/script really
   doesn't exist relative to the hook's source file before reporting
   it as broken (the scanner already did this, but restate the exact
   path it checked).

## Evidence Requirements

Quote the conflict's `description` field verbatim and cite both
entity IDs involved — never paraphrase away the specific files.

## Confidence / Uncertainty

Every conflict already carries `measured` or `heuristic` — surface
that label, don't strip it. A `heuristic` similarity match (e.g. 69%
lexical similarity) is a prompt to look closer, not a verdict.

## Safety Rules

Never propose auto-resolving a conflict (deleting one of two
duplicates, rewriting a CLAUDE.md) — O2B has no `--apply`; this skill
only explains, the user decides and acts.

## Anti-Patterns

- Treating every `similar-description` hit as a real duplicate — O2B's
  own dogfood found 3 true positives and 0 false positives at the
  current threshold, but the threshold is a deliberate cutoff, not
  proof of semantic equivalence.
- Ignoring `orphaned-reference` conflicts because they seem cosmetic —
  a hook pointing at a missing script silently does nothing, which can
  hide a broken safety check.

## Expected Output

One finding per conflict, each with: type, severity, confidence, the
exact sources involved, and a plain-language explanation of the
disagreement — never a bare restatement of the JSON.

## Related O2B Skills

`environment-inventory`, `mcp-review`.
