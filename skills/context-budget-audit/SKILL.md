---
name: context-budget-audit
description: Check how large the always-loaded instructions (CLAUDE.md/AGENTS.md/settings.json) have grown, using O2B's context breakdown. Use when a project's CLAUDE.md or AGENTS.md keeps growing.
---

Read the `context` section of an `o2b doctor` report. Only the
`alwaysLoaded` figure is a real per-session cost; `onDemandPotential` is a
cost that may never be incurred. Never claim `loadedActive` is known — it
is `unknown` unless a session-usage hook is installed.
