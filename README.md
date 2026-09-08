# O2B — AI Coding Environment Manager

O2B observes, secures, and helps rationalize the environment where AI
coding agents actually run — global config, per-project config, and
multiple harnesses at once — instead of adding more agents/skills to any
one of them.

**Status: Phase 1.1 (hardening), pre-release.** Not published to npm/GitHub
yet. Not yet run against any real user configuration — every command below
has been exercised only against synthetic fixtures and the bundled
`demo-environment/`.

## What problem this solves

A harness like Claude Code or Codex can be extended with more agents,
skills, hooks, and MCP servers — but nothing tells you, across everything
you've already installed (possibly from several sources, possibly in both
a global and a project scope), whether it's secure, non-redundant, and
actually relevant to the project you're in. O2B is that layer, independent
of who authored the content it's looking at.

## Scope: Claude Code + Codex

- **Claude Code**: full read support — agents, skills, hooks, MCP servers
  (`.mcp.json`), `CLAUDE.md`/`settings.json`, global and project scope.
- **Codex**: read support for what's currently documented and verifiable —
  `AGENTS.md` (the cross-tool instruction-file standard) and
  `.codex/config.toml` (including its `[mcp_servers.*]` tables). Codex does
  not yet have a public, verifiable agents/skills plugin format, so O2B
  reports `agents: []`/`skills: []` for Codex rather than inventing one.
  See `docs/CODEX-ADAPTER-NOTES.md` for the exact verified-vs-unknown list.

## Capabilities

- **Universal Inventory** — a harness-agnostic model (`Harness`, `Agent`,
  `Skill`, `MCPServer`, `Hook`, `Plugin`, `InstructionSource`) that both
  adapters normalize into.
- **`o2b doctor`** — aggregates inventory + security findings + conflicts +
  context breakdown into one report, with four scores (Security,
  Configuration, Context Configuration, Compatibility), each labeled
  `MEASURED` / `HEURISTIC` / `ESTIMATED` / `UNKNOWN` so you know how much to
  trust it.
- **Scanner (`@o2b/scanner`)** — 16 original, tested rules across secrets,
  permissions, hooks, MCP config, and prompt-injection-shaped instructions.
  Every finding's evidence is redacted before it leaves the scanner —
  secrets are never shown in full.
- **Conflict Engine** — duplicate names, similar skill descriptions,
  colliding/duplicated hooks, redundant MCP servers, orphaned hook
  references, and explicit global-vs-project instruction contradictions.
- **Context Analysis** — distinguishes what's *installed*, what's cheaply
  *discoverable* (skill name+description at session start), what's
  *always-loaded* (the real, measured per-session cost), what's merely
  *on-demand potential*, and what's *unknown* (real runtime usage — a
  static scan cannot see this; see `docs/CONTEXT-SCORING.md`).
- **`o2b optimize`** — detects your project's stack from its manifest
  (`package.json`, `pubspec.yaml`) and, via data-only `profiles/*.json`
  (never hardcoded logic), recommends what's likely relevant and flags
  what's installed but doesn't seem to match — recommendation only, never
  auto-applied.

## Privacy-first (see `docs/PRIVACY.md`)

100% local processing. Zero telemetry, zero uploads, zero network calls
required for `doctor`/`optimize`/`scan`. Secrets are always redacted before
they reach a report. Environment variables are recorded by **name only**,
never by value. These are enforced with regression tests, not just stated
in docs — see `packages/core/tests/privacy/`.

## Read-only by default

Every Phase 1 command only reads (`fs.readFile`/`readdir`/`access`). No
command writes, deletes, or modifies anything in `~/.claude`, `~/.codex`,
or any real project configuration. `o2b optimize` only recommends; nothing
is auto-applied.

## Install (local development only — not published yet)

```bash
git clone <this-repo>
cd O2B
npm install
npm test
```

## Commands

```bash
node packages/cli/bin/o2b.js doctor [rootDir] [--json] [--home <dir>]
node packages/cli/bin/o2b.js optimize [rootDir] [--json] [--home <dir>] [--profiles-dir <dir>]
```

Exit codes (stable, CI-ready — see `packages/cli/src/exit-codes.ts`):

| Code | Meaning |
|---|---|
| 0 | Healthy — no blocking findings |
| 1 | Warnings — findings/conflicts present, none critical/high |
| 2 | Critical — at least one critical/high security finding |
| 3 | Execution/configuration error (bad command, bad args) |

## Golden demo

`demo-environment/` is a fixture project with deliberately planted, fake
problems (duplicate skill, contradictory instructions, a broken hook, a
redundant MCP pair, an inlined fake secret, an inflated `CLAUDE.md` to
demonstrate the context score, and a component irrelevant to the detected
stack). See `docs/GOLDEN-DEMO.md` for the full catalog, or just run:

```bash
cd demo-environment
node ../packages/cli/bin/o2b.js doctor . --home ./fake-home
node ../packages/cli/bin/o2b.js optimize . --home ./fake-home
```

## Limitations (stated, not hidden)

- Context scoring uses a `chars/4` token estimate and an explicitly
  arbitrary reference budget — see `docs/CONTEXT-SCORING.md`. It is called
  "Context Configuration Score", not "Efficiency", on purpose.
- `LOADED`/`ACTIVE` real session usage is always `UNKNOWN` — a static,
  offline scan cannot observe what a live session actually invoked.
- Codex support is read-only and limited to documented capabilities;
  agents/skills are not supported there because no verifiable public
  format exists yet.
- `redundant-mcp`/`similar-description` conflicts are lexical-similarity
  heuristics, not semantic understanding — see `docs/GOLDEN-DEMO.md` for a
  worked example of a case deliberately left undetected.
- Contradictory-instruction detection only catches explicit
  "never X"/"always X" opposite markers (English/Spanish), not general
  semantic contradiction.
- Not yet run against any real Claude Code/Codex installation — see
  `docs/CONTEXT-SCORING.md` and the project's internal Phase plan for the
  planned read-only dogfood step.

## Roadmap (not implemented — planned only)

- **O2B Pro** (not built): score history over time, multi-device sync,
  safe auto-apply with rollback for `optimize`, advanced/updated rule
  packs, real session-usage telemetry via an opt-in hook.
- **O2B Team** (not built): shared profiles/policies, GitHub integration,
  audit trail.
- **O2B Enterprise** (not built): SSO, RBAC, fleet management.

The Community/Pro/Team/Enterprise feature boundary already exists as a
typed, inert list in `packages/core/src/edition.ts` — nothing beyond
Community is implemented; the type exists so adding a real Pro backend
later doesn't require reshaping the core engine.

## License

MIT — see `LICENSE`.
