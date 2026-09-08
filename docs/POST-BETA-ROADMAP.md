# O2B — Post-Beta Roadmap (registered, not implemented)

Date: 2026-09-08. This document formally registers the conclusions of
`docs/ENVIRONMENT-GOVERNANCE-DISCOVERY.md` and the earlier
`docs/SKILLS-BENCHMARK-ECC.md` as a roadmap, so they are not lost
between now and the return of external tester feedback.

**Nothing in this document is implemented.** O2B remains frozen at
**0.2.0-beta.1** for Private Beta (`docs/PRIVATE-BETA-FREEZE-REPORT.md`).
This is a record of *what to consider building next*, gated on evidence
that does not exist yet.

---

## P1 — Capability State Model

Conceptual model, not implemented:

```
INSTALLED
CONFIGURED
AVAILABLE
FUNCTIONALLY VERIFIED
OBSERVED USED
```

**Fundamental rule: UNKNOWN BY DEFAULT.** A capability is never promoted
to a higher state without sufficient evidence for that specific state.
Community would initially only ever populate the two static states
(`INSTALLED`, `CONFIGURED`) from file/config inspection — exactly what
`inventory`/`doctor` already do today, just made explicit as a labeled
state instead of an implicit assumption.

States that require execution, runtime behavior, or session observation
(`AVAILABLE`, `FUNCTIONALLY VERIFIED`, `OBSERVED USED`) MUST NOT be
inferred from static config. No heuristic, no "probably works because
the config looks well-formed" — those stay `UNKNOWN` until there is
actual evidence of that specific kind.

**Future hypothesis, not authorized**: Pro could fill in the runtime
states via local, explicitly-authorized observability (active probing
for `AVAILABLE`/`FUNCTIONALLY VERIFIED`; the `experimental/session-observability`
prototype, still opt-in and unimplemented in Community, for
`OBSERVED USED`). This is a hypothesis about where a seam could go, not
a commitment to build it.

## P2 — Instruction Governance

To explore after beta, not before:

- precedence
- provenance
- stale instructions
- duplicate instructions
- contradictory instructions
- cross-scope conflicts

**Must extend the existing Conflict Engine (`detectConflicts`), not
create a parallel system.** The engine already has `duplicate-name`,
`contradictory-instruction`, `orphaned-reference`, and
`similar-description` conflict types operating on real, inventoried
instruction sources — any of the concepts above that get built later
should become new conflict types or new fields on existing ones, not a
second detection pipeline.

## P3 — Cross-Harness Capability Analysis

To explore:

- duplicated capabilities
- security-sensitive capabilities
- the same capability exposed through multiple harnesses
- redundant MCP/tool surfaces

**Do not assume duplication = problem.** A user may deliberately
configure the same MCP server for both Claude Code and Cursor because
they genuinely use both. This stays a descriptive finding ("you have
the same capability configured twice, across two harnesses") until
there is a reason to believe it's unintentional.

## P4 — Context Cost Attribution

To explore: attributing context cost by

- instruction source
- skill metadata
- rules
- always-loaded configuration
- harness

**Must maintain strict separation between MEASURED / ESTIMATED /
HEURISTIC / UNKNOWN** at whatever granularity this ends up shipping at —
the same discipline the existing aggregate context breakdown already
applies, not a looser standard just because the numbers get smaller and
more specific.

## P5 — Fragmentation Clustering

**DO NOT IMPLEMENT until there is evidence from real testers.**

Hypothesis: detect groups of agents/skills/tools with very similar
functions that may be fragmenting the environment unnecessarily.

**Do not use absolute count as the criterion.** We need real data before
designing thresholds — this was the single largest false-positive risk
identified in the discovery pass, and O2B's own 8-skill catalog is not
a large enough or diverse enough validation set to design a general
threshold from.

---

## IMPORTANT — DO NOT BUILD

**Environment Governance Score.**

Current decision: **do not build a composite score** while no defensible
methodology exists. We do not want to turn multiple heuristics into a
number that looks precise. This applies to any future attempt to merge
Security/Configuration/Context/Compatibility (or any subset of P1-P5
above) into one figure — the four existing scores stay separate, each
independently confidence-labeled, unless a future session produces an
actual defensible methodology (published weighting, validated ranking
against real environments) — not just a formula that compiles.

---

## Roadmap gates

**None of the capabilities above enters development automatically.**

After Private Beta, each one gets classified as:

- **VALIDATED** — confirmed useful by real tester evidence.
- **SUPPORTED BY EVIDENCE** — some signal from testers, not yet conclusive.
- **STILL HYPOTHESIS** — no tester evidence either way, remains a documented idea.
- **REJECTED** — evidence against building it (false-positive-prone, not
  useful, or actively confusing to testers).

**Tester feedback has priority over this roadmap.** If testers reveal
different problems than the ones anticipated here, the roadmap changes
to follow the evidence — this document is a starting hypothesis set, not
a commitment.

---

## Private Beta — unchanged

- **VERSION**: `0.2.0-beta.1`
- **TEST BASELINE**: 168/168 PASS
- **TARBALL**: unchanged
- **CHECKSUM**: unchanged (`69a69313eb970960e48a0cb548fa394dc08d275e0d6da10873f0ec02acd65b3e`)

No artifact was regenerated for this document. Nothing under
`packages/`, `skills/`, the scanner, the CLI, or `beta-kit/` was
modified; version and tarball are untouched.

---

## Next authorized event

**TESTER 001 RESULT RECEIVED.**

When that happens: use the tester's `FEEDBACK-FORM` + `o2b report
--sanitize` output + optional sanitized crash report, and apply the
procedure already defined in `docs/BETA-TESTER-ANALYSIS-PROCEDURE.md`.

Until then: no new features, no new skills, no new adapters, no new
scores, no refactors, no speculative optimizations, no implementing
Capability State, no implementing Session Observability, no Pro
preparation, no `npm publish`, no `git push`.
