# Contributing to O2B

Not published/accepting external contributions yet — this file exists so
the expectations are written down before that happens, not so PRs can be
filed today (there is no public repo yet).

## Ground rules

- **Read-only by default.** Any code that touches `~/.claude`, `~/.codex`,
  or a project's real config must only ever read (`fs.readFile`/`readdir`/
  `access`). No `writeFile`/`unlink`/`rename`/`mkdir` against a *scanned*
  environment, ever — see `docs/PRIVACY.md`. `o2b snapshot` is the one
  exception, and it only writes a file path the user names explicitly for
  O2B's own output, never into `~/.claude`/`~/.codex`.
- **Provenance on every claim.** Any score, finding, or recommendation
  must declare its `method`: `measured` (directly observed),
  `heuristic` (a rule with a real, stated threshold), `estimated`
  (a stated approximation, e.g. token counts), or `unknown` (genuinely
  can't be known offline — never fill this in with a guess).
- **No invented APIs/formats.** Before adding support for a new config
  file shape (a new harness, a new MCP config location, a new plugin
  manifest field), verify it against current official documentation or
  direct, reproducible observation of a real installation — cite the
  source in a code comment. `docs/CODEX-ADAPTER-NOTES.md` is the model
  for how to document what's verified vs. unknown.
- **Fixtures before fixes.** When fixing a bug found via real-world
  usage (dogfooding), add a fixture that reproduces it and a regression
  test *before* changing the detection logic — see
  `docs/DOGFOOD-BASELINE.md` → `docs/DOGFOOD-POST-HARDENING.md` for the
  pattern this project follows.
- **No content inflation.** O2B intentionally ships a small, curated set
  of bundled agents/skills/security rules — the product's value is
  Doctor/Inventory/Conflicts/Context/Optimize, not the size of a content
  library. Don't add more just to make a comparison table look bigger.

## Workflow

```bash
npm install
npm test              # all 3 workspaces
npm run test --workspace=packages/core -- --coverage
```

Every change should leave `npm test` green across all workspaces, and
(where the change touches detection logic) leave the golden demo
(`demo-environment/`, see `docs/GOLDEN-DEMO.md`) producing the same
documented findings.

## License

By contributing, you agree your contribution is licensed under the MIT
license in `LICENSE`.
