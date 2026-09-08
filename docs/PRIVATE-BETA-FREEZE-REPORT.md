# O2B — Private Beta Freeze Report

Date: 2026-09-08
Frozen baseline: **0.2.0-beta.1**

This report is the record of the freeze verification pass. It does not
introduce new functionality — only verification, documentation, and
tester-handoff scaffolding, per the explicit freeze scope.

## VERSION

`0.2.0-beta.1` (root `package.json`, `packages/cli/package.json`,
`O2B_VERSION` constant in `packages/core/src/report/build-report.ts`).

## TESTS

168/168 PASS, re-run from scratch this session:

- `@o2b/cli`: 15/15 (2 test files)
- `@o2b/core`: 113/113 (15 test files)
- `@o2b/scanner`: 40/40 (7 test files)

## COVERAGE

Re-run this session with `vitest run --coverage` per workspace:

- `@o2b/core`: 95.97% statements / 81.38% branch / 98.57% functions
- `@o2b/scanner`: 99.19% statements / 94.11% branch / 96.96% functions
- `@o2b/cli`: low in-process v8 coverage numbers (command files show
  0% because the CLI's own tests exercise it via real spawned
  subprocesses — `tests/e2e/exit-codes.test.ts` — which v8's coverage
  instrumentation does not attribute back to the parent process). This
  is a known, honest limitation of the coverage measurement method for
  the CLI package, not evidence the CLI commands are untested — they
  are exercised end-to-end via `--json`/exit-code assertions instead.

## TARBALL

`beta-package/o2b-cli-0.2.0-beta.1.tgz` and `beta-kit/o2b-cli-0.2.0-beta.1.tgz`
— **unchanged, not rebuilt**. Verified: every file under `packages/core/src`,
`packages/scanner/src`, `packages/cli/src`, and `profiles/` has an mtime
older than the tarball, confirming no source drift since it was built.
The `git commit` made earlier this session did not alter any file
content or mtime — it only recorded already-existing on-disk state.

## CHECKSUM

```
69a69313eb970960e48a0cb548fa394dc08d275e0d6da10873f0ec02acd65b3e  o2b-cli-0.2.0-beta.1.tgz
```

Identical in `beta-package/CHECKSUMS.txt` and `beta-kit/CHECKSUMS.txt`.

## CLEAN INSTALL

Verified fresh this session in an isolated sandbox
(`%TEMP%\claude\o2b-freeze-sandbox`, outside the repo):

- `npm install <tgz>` → 1 package added, 0 vulnerabilities.
- `o2b --help` → correct.
- `o2b doctor .` (real home, no `--home` override) → correctly detected
  claude-code + codex on the real machine and surfaced a real, previously
  known/handled finding (GitHub PAT in `~/.claude.json`) with proper
  redaction (`gith********************KHoh`) — no raw secret value was
  printed or persisted anywhere in this session.
- `o2b inventory / scan / optimize` (against `demo-environment` +
  `demo-environment/fake-home`, to avoid unnecessarily re-touching the
  real environment) → output matches the documented golden-demo
  findings exactly.
- `o2b snapshot` (x2) → valid JSON files written.
- `o2b diff` on the two snapshots → correct zero-delta comparison.
- `o2b report --sanitize` → output verified to contain zero occurrences
  of the real username/home path (`grep -c vvald` → 0); paths correctly
  replaced with `<PROJECT>` tokens.

All 8 documented commands verified working from the packaged tarball,
not just from source.

## CLEAN UNINSTALL

`npm uninstall @o2b/cli` → package and bin shim removed (`node_modules/.bin/o2b`
confirmed gone). The empty `node_modules/@o2b/` scope directory persisting
after uninstall is a known cosmetic npm artifact (not an O2B file), already
observed and documented in an earlier session. Sandbox directory deleted
after verification.

## PRODUCT SKILLS (8, origin: O2B)

`environment-inventory`, `hook-plugin-audit`, `instruction-conflict-analysis`,
`snapshot-diff-workflow`, `optimize-tool-relevance`, `security-scan`,
`mcp-review`, `context-budget-audit`.

Re-verified this session:
- All pass `packages/core/tests/skills/catalog.test.ts` (frontmatter
  completeness, no duplicate names, valid `origin`, no broken "Related
  O2B Skills" references, no near-duplicate descriptions/activation
  overlap).
- `grep` across `skills/` for secret-shaped strings (GitHub/Anthropic/AWS
  key patterns): zero matches.
- `grep` across `skills/` for ECC/"epic-context-compression" references:
  zero matches.
- `grep` across `skills/` for auto-install-into-`~/.claude` language:
  zero matches.
- None of the 8 skills are installed into any tester's `~/.claude` for
  this beta round (see CLI-FIRST decision below).

## CONTRIBUTOR SKILLS (4, origin: O2B-CONTRIBUTOR)

`code-review`, `git-workflow`, `plan-first`, `verification-loop`.

Each carries `origin: O2B-CONTRIBUTOR` and `tags: [contributor,
engineering-practice]` in frontmatter — a clear, machine-checkable and
human-readable marker that these are internal engineering-practice
skills, not O2B product capabilities. They are not referenced anywhere
in `beta-kit/` or `docs/BETA-QUICKSTART.md` as things a tester would use.

## SUPPORTED HARNESSES

Claude Code (full: agents/skills/hooks/plugins/MCP/rules/settings.local),
Codex (config.toml + AGENTS.md, deliberately conservative — no
agents/skills claimed, no public format to verify them against), Cursor
(mcp.json, rules/*.mdc, AGENTS.md/.cursorrules — new this cycle,
conservative, same honesty pattern as Codex).

## CLI-FIRST DECISION FOR THIS ROUND

Per explicit instruction: **no skill is installed on any tester's
machine for round 1.** Testers receive the CLI tarball only
(`beta-kit/`). This measures how much value the CLI alone delivers
before skills are added to the picture.

A second experiment is left conceptually defined, not implemented:

- **Experiment A — CLI ONLY** (this round, 0.2.0-beta.1): tester installs
  only the npm-packaged CLI. No `skills/` directory is copied to their
  machine.
- **Experiment B — CLI + OPTIONAL O2B SKILLS** (future, not this round):
  a tester who already ran Experiment A optionally copies the 8 product
  skills into their own `~/.claude/skills/` (manually, with their own
  consent) and reports whether the skills change how they use O2B day to
  day, or add value the CLI output didn't already carry.

No automatic-install mechanism exists or was built for Experiment B —
that remains an explicit non-goal of this freeze.

## KNOWN LIMITATIONS

See `docs/BETA-QUICKSTART.md` § "KNOWN LIMITATIONS (beta)" for the full,
already-documented list (config-precedence not resolved, `detectConflicts`
O(n²) on very large near-duplicate sets, provider-routing detection
limited to a short documented env-var list, only 3 harnesses supported,
`LOADED`/`ACTIVE` session usage always `unknown` without an optional
hook). Unchanged this session — no new limitations were introduced, none
of the existing ones were resolved (out of scope for a freeze pass).

## BETA SUCCESS CRITERIA

See `docs/BETA-SUCCESS-CRITERIA.md` (defined and locked before any tester
result exists — primary signal, secondary signals, and 4 experimental
thresholds: TECHNICAL SUCCESS 4/5, VALUE SUCCESS 2/5, QUALITY WARNING
≥2/5, COMMERCIAL SIGNAL ≥1/5).

## CHANGE POLICY DURING BETA

See `docs/BETA-CHANGE-POLICY.md` (P0 immediate fix, P1 immediate fix +
beta patch with a new version/checksum, P2 record-and-watch, P3 no
implementation during beta, P4 backlog) and
`docs/BETA-TESTER-ANALYSIS-PROCEDURE.md` (how the next session should
process an incoming tester's feedback form + sanitized report into a
TESTER ANALYSIS, without acting immediately on any single request).

---

# PRIVATE BETA FREEZE: PASS

# READY FOR TESTER 001: YES

## Files to hand to Tester 001

From `beta-kit/`:
- `README-BETA.md`
- `INSTALL-WINDOWS.md` (or `INSTALL-MAC-LINUX.md`, depending on the
  tester's OS)
- `TEST-CHECKLIST.md`
- `FEEDBACK-FORM.md`
- `SEND-BACK.md`
- `o2b-cli-0.2.0-beta.1.tgz`
- `CHECKSUMS.txt`

Nothing outside `beta-kit/` should be sent — it has already been
re-verified this session to contain no personal paths, emails, secrets,
dogfood reports, real snapshots, or `~/.claude` data.

## Files Tester 001 must send back

Exactly, per `beta-kit/SEND-BACK.md`:
1. Completed `FEEDBACK-FORM.md`
2. Output of `o2b report --sanitize` (sanitized JSON)
3. Optional: a sanitized crash report, only if a command failed
   (`--crash-report <file>`)

Never request or accept from a tester: `.claude.json`, full
`settings.json`, `.env`, tokens/API keys, full `CLAUDE.md`, or private
source code.
