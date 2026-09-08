---
name: optimize-tool-relevance
description: Interpret `o2b optimize`'s RECOMMENDED/ON-DEMAND/POSSIBLY UNNECESSARY output correctly — stack detection is a fact, tool recommendation is a separate judgment call that must cite a reason, expected effect, and confidence. Use when deciding whether to install/remove an MCP server based on the detected project stack, or when a recommendation seems arbitrary and needs its rationale checked.
origin: O2B
version: 1.0.0
tags: [optimize, profiles, mcp]
---

## Purpose

Prevent "detected React, therefore install X" reasoning — O2B's own
profiles deliberately don't recommend anything for several detected
stacks (e.g. plain Flutter/Python/Docker), and this skill explains why
that's correct, not a gap.

## When to Activate

Before acting on an `optimize` recommendation, or when a user asks why
nothing was recommended for a detected stack.

## Inputs

`o2b optimize [rootDir] --json` output: `detectedTags`,
`matchedProfiles`, `recommendations` (each with `kind`, `reason`,
`matchedProfile`, `confidence`, `expectedEffect`).

## Workflow

1. Report `detectedTags` as facts (what manifests were found) —
   separately from `recommendations` (judgment calls).
2. Group recommendations by `kind`: `add` (RECOMMENDED) only when the
   detected stack IS the tool's own domain (e.g. Supabase deps →
   Supabase MCP); `on-demand` for situational value (e.g. Playwright
   for a web stack); `review` (POSSIBLY UNNECESSARY) only when a
   matched profile explicitly discourages that server by name.
3. Always surface `reason` and `expectedEffect` verbatim — never
   summarize a recommendation without them; a recommendation without a
   stated reason isn't one O2B should have produced.
4. If `recommendations` is empty despite a matched profile, say so
   explicitly as a correct outcome, not a missing feature — several
   O2B profiles are intentionally empty (see `docs/SKILLS-CATALOG-
   V0.3.md` for why: detecting a stack doesn't automatically justify a
   tool).

## Evidence Requirements

Every claim about "why O2B recommends X" must quote the `reason` field
from the actual `optimize` run — never invent a rationale.

## Confidence / Uncertainty

`confidence` is per-recommendation (`heuristic`/`estimated`) — surface
it, especially for `estimated` ones like a Next.js→Vercel on-demand
suggestion, which is a plausible-but-unconfirmed guess about
deployment target.

## Safety Rules

`optimize` never installs anything — there is no `--apply`. This skill
only interprets output for a human decision.

## Anti-Patterns

- Treating "no recommendations" as O2B having failed to analyze the
  project — for several stacks (Flutter, Python, Docker, bare
  TypeScript) that's the evidence-based, correct outcome.
- Recommending a tool because a *different* profile matched (e.g.
  recommending Playwright to a Python project because React happens to
  be in a monorepo sibling) — combined/ambiguous projects were
  specifically tested to avoid this (`packages/core/tests/optimize/
  profiles-real.test.ts`).

## Expected Output

Three labeled sections (RECOMMENDED / ON-DEMAND / POSSIBLY UNNECESSARY)
each with reason + expected effect + confidence, or an explicit
"nothing to recommend, and here's why" when empty.

## Related O2B Skills

`environment-inventory`, `mcp-review`.
