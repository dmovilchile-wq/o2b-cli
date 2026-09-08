# Golden demo — intentional problems catalog

`demo-environment/` is a reproducible fixture project with deliberately
planted, **entirely fake** problems, used to demonstrate `o2b doctor` and
`o2b optimize`. No real secrets, no real vulnerable code — everything here
exists only for O2B's own fixtures/tests.

Run it:
```bash
cd demo-environment
node ../packages/cli/bin/o2b.js doctor . --home ./fake-home
node ../packages/cli/bin/o2b.js optimize . --home ./fake-home
```

## Planted issues

| # | Issue | Where | Detector |
|---|---|---|---|
| 1 | Duplicate skill name (`code-review`) | `.claude/skills/code-review-a` and `-b` | `duplicate-name` conflict |
| 2 | Contradictory global/project instruction | `fake-home/.claude/CLAUDE.md` ("nunca instalar...") vs. project `CLAUDE.md` ("siempre instalar...") | `contradictory-instruction` conflict |
| 3 | Broken hook reference | `.claude/settings.json` PostToolUse → nonexistent script | `orphaned-reference` conflict |
| 4 | Risky hook | `.claude/settings.json` PreToolUse → `curl \| sh` | `hooks.pipe-curl-to-shell` scanner rule |
| 5 | Redundant MCP servers (unambiguous case) | `.mcp.json` (raíz del proyecto): `github-mcp` vs. `github-mcp-server` | `redundant-mcp` conflict (HEURISTIC, above the 0.6 similarity threshold) |
| 5b | Redundant MCP servers (conservative case — NOT flagged) | `.mcp.json`: `playwright` vs. `playwright-mcp-extra` | Intentionally **not** flagged — only 1/3 name-words shared, below threshold. Demonstrates the scanner would rather miss a weak signal than produce a false positive. |
| 6 | Inlined MCP secret | `.mcp.json` `blender.env.BLENDER_API_KEY` (fake value) | `mcp.env-secret-inlined` scanner rule |
| 7 | Fake hardcoded API key | project `CLAUDE.md` | `secrets.anthropic-api-key` scanner rule |
| 8 | Measurable context overhead | project `CLAUDE.md` inflated to ~275,978 estimated tokens | `contextConfiguration` score (drops to 0/100 — see `docs/CONTEXT-SCORING.md`) |
| 9 | Possibly-unnecessary component for the detected stack | `blender` MCP vs. the `express`/`node` stack `package.json` declares | `o2b optimize` → `POSSIBLY UNNECESSARY` (`node-web` profile explicitly discourages `blender`/`n8n-mcp`) |

## Why issue 5b exists on purpose

Phase 1.1 explicitly asked to avoid lowering the similarity threshold just
to make a demo pass. Issue 5b is kept as a **negative** example: it proves
the `redundant-mcp` heuristic has a real, principled cutoff rather than
flagging any two MCP servers that merely both mention a common tool.

## Why `playwright-mcp-extra`/`github-mcp-server` are NOT flagged as "possibly unnecessary" (since the second autonomous run, Fase B)

`optimize` used to flag ANY installed MCP server not explicitly listed in
a matched profile's `recommends`/`onDemand` as "possibly unnecessary" —
which meant a bare stack match (e.g. just "node") would flag *everything*
installed, including servers that simply had no opinion written about
them yet. That produced exactly the kind of low-confidence, "absurd"
recommendation the second autonomous run's Fase B was tasked with
eliminating for ambiguous/combined projects. `optimize` now only flags a
server as `POSSIBLY UNNECESSARY` when a matched profile's `discourages`
list names it explicitly — silence (no opinion) no longer means
"irrelevant". `node-web`'s `discourages` only names `blender`/`n8n-mcp`,
so `github-mcp`/`github-mcp-server`/`playwright-mcp-extra` no longer
appear under `POSSIBLY UNNECESSARY` even though they're unrelated to the
express/node stack — this is intentional precision, not a regression.
