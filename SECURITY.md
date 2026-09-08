# Security policy

O2B is a local, read-only diagnostic tool for AI coding environments
(Claude Code, Codex). It never writes to `~/.claude`, `~/.codex`, or any
project configuration, and never sends data over the network — see
`docs/PRIVACY.md` for the enforced (test-backed) privacy guarantees.

## Reporting a vulnerability

This project is not published yet (no npm package, no public GitHub
repo). Until it is, report any security concern directly to the
maintainer rather than opening a public issue. Once published, this
file will be updated with a proper disclosure channel (e-mail or GitHub
Security Advisories) before the repo goes public — see
`docs/AUTONOMOUS-RUN.md` (Fase 18, RC checklist) for the exact gate.

## What "security" means for O2B specifically

O2B's own attack surface is unusually narrow: it reads files (JSON,
TOML, Markdown frontmatter) from the local filesystem and prints
redacted findings. The security properties that matter most are:

- **Read-only guarantee**: no `writeFile`/`unlink`/`rename`/`mkdir` calls
  against the environment being scanned. Enforced by
  `packages/core/tests/privacy/` and re-verified by grep during Fase 3/14
  of `docs/AUTONOMOUS-RUN.md`.
- **Secret redaction**: every `SecurityFinding.evidence` is redacted
  (`packages/scanner/src/redact.ts`) before it can reach a report, a log,
  or stdout. Never disable this to "see the full secret for debugging" —
  fix the rule, don't bypass the redactor.
- **No network calls**: `doctor`/`optimize`/`scan`/`inventory` do not
  perform any HTTP/DNS/socket operation. `snapshot`/`diff` only touch
  local files the user names explicitly.
- **Malformed input resilience**: JSON/TOML parsing failures degrade to
  "skip this file, log a warning" rather than crashing or producing a
  false report — see `readJsonSafe` in the Claude Code adapter and the
  Codex adapter's best-effort TOML table extractor.

## Known, accepted limitations (not vulnerabilities)

- O2B does not currently read `~/.claude.json`'s per-project ("local
  scope") MCP servers, hooks embedded inside a plugin's own package, or
  `.claude/rules/*.md`. These are inventory *gaps* (false negatives in
  what gets scanned), documented in `docs/DOGFOOD-POST-HARDENING.md`,
  not exploitable vulnerabilities in O2B itself.
- The `mcp.arg-secret-inlined` and `mcp.env-secret-inlined` scanner rules
  are heuristic pattern matches, not a guarantee that every possible
  secret shape is caught — see `packages/scanner/src/rules/mcp.ts`.

## Dependency vulnerabilities

`npm audit` (run 2026-09-08): 0 vulnerabilities in production
dependencies. 6 vulnerabilities (dev-only, `esbuild`/`vite`/`vitest`'s
own dev server) — moderate/high/critical severity but scoped to the
local dev server used while *developing* O2B itself, not to anything
shipped or run against a user's real environment. Not force-upgraded in
this pass because the fix (`vitest@5`) is a breaking major-version change
that needs its own verification pass before being adopted — tracked as a
follow-up, not silently deferred.
