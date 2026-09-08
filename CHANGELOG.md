# Changelog

Not published yet — versions below are internal development milestones,
not npm releases. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [0.2.0-beta.1] — 2026-09-08 (private beta package, not published)

### Added
- `o2b report --sanitize` — diagnostic export with home/project paths
  replaced by placeholder tokens, safe to share as beta feedback.
- `--crash-report <file>` — sanitized crash report on any command
  failure (version/OS/command/error class+message, no secrets/env/full
  home paths).
- `CursorAdapter` (read-only: `.cursor/mcp.json`, `.cursor/rules/*.mdc`,
  `AGENTS.md`/`.cursorrules`).
- Claude Code adapter: MCP "local scope" (`~/.claude.json` →
  `projects.<path>`), hooks bundled inside installed plugins,
  `.claude/rules/*.md` (with `alwaysLoaded` distinguishing path-scoped
  rules from unconditional ones), `.claude/settings.local.json`,
  generic provider-routing detection (by env var name only).
- `optimize` recommendations now carry `expectedEffect`; new
  `on-demand` kind; 8 real profiles (node-web, react, nextjs,
  node-typescript, python, flutter-dart, docker, supabase) with stack
  detection kept strictly separate from tool recommendation.
- Single-file CLI bundle (`packages/cli/dist/o2b.mjs`, esbuild) —
  installable from a tarball outside the monorepo.
- `docs/BETA-QUICKSTART.md`, `docs/BETA-FEEDBACK.md`,
  `docs/BETA-TEST-MATRIX.md`.

### Fixed
- Scanner engine + 5 rules: O(n²) line-lookup on files with many
  findings (`content.split('\n')` per match) — fixed with a
  precomputed line index, confirmed 6.2s → 55ms on an adversarial
  20,000-line file.
- `DoctorReport`/`InventorySnapshot` now expose `warnings` (previously
  computed for the Compatibility score but never shown to the user).
- `optimize`'s "possibly unnecessary" flag no longer fires for every
  installed MCP server a matched profile doesn't mention — only for
  ones a profile explicitly discourages (avoids false positives on
  ambiguous/monorepo projects).

## [0.2.0] — 2026-09-08 (local RC, not published)

### Added
- `o2b inventory` and `o2b scan` CLI commands (focused re-presentations
  of `doctor`'s inventory/security sections).
- `o2b snapshot` and `o2b diff` CLI commands, backed by the existing
  `compareSnapshots` core function (now also covering plugin and
  instruction-source count deltas).
- `--quiet`, `--strict`, `--no-color`, `--verbose` CLI flags.
- Claude Code adapter now reads user-scope MCP servers from
  `~/.claude.json`, and detects installed plugins
  (`plugins/installed_plugins.json` + `settings.json`'s
  `enabledPlugins`), with filesystem-derived `providedCapabilities`.
- Scanner rule `mcp.arg-secret-inlined` — flags secret-shaped values
  passed as CLI `args` (not just `env`) in MCP server configs.
- `docs/DOGFOOD-BASELINE.md`, `docs/DOGFOOD-POST-HARDENING.md`,
  `docs/AUTONOMOUS-RUN.md`, `docs/ORIGINALITY-REVIEW.md`, `SECURITY.md`,
  `CONTRIBUTING.md`.

### Fixed
- Global `CLAUDE.md` was read from `~/CLAUDE.md` instead of the real
  location, `~/.claude/CLAUDE.md`.
- Project-scope `.mcp.json` was read from `<project>/.claude/.mcp.json`
  instead of the real location, `<project>/.mcp.json`.
- `secrets.github-token` scanner rule missed the current fine-grained
  PAT format (`github_pat_...`), matching only classic prefixes.
- `npm run scan` was broken (pointed at a CLI command that didn't exist
  until this pass).
- `npm pack` on `@o2b/core` included `tests/` (1.3MB unpacked, including
  a 1.1MB synthetic fixture) with no `files` field to exclude it. All 3
  publishable packages now declare `files` (core/scanner: 59KB/17KB
  unpacked, cli: 21KB — verified with `npm pack --dry-run`).
- All 3 subpackages (`@o2b/core`, `@o2b/scanner`, `@o2b/cli`) now
  declare `"license": "MIT"` individually (previously only the root
  `package.json` did).

All four fixes above were found via a real, authorized, read-only
dogfood run against a live Claude Code + Codex installation — see
`docs/DOGFOOD-BASELINE.md` for how they were found and
`docs/DOGFOOD-POST-HARDENING.md` for verification that the fixes work
against the same real environment.

## Phase 1.1 (hardening) — prior to this changelog's start

112/112 tests passing, coverage ~92%/~97% (core/scanner), golden demo,
privacy regression tests, CLI E2E exit-code tests. See `STATUS.md` for
the full historical summary — this changelog starts tracking from the
post-dogfood hardening pass onward.
