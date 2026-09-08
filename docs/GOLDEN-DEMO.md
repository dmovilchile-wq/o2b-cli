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
| 2 | Contradictory global/project instruction | `fake-home/CLAUDE.md` ("nunca instalar...") vs. project `CLAUDE.md` ("siempre instalar...") | `contradictory-instruction` conflict |
| 3 | Broken hook reference | `.claude/settings.json` PostToolUse → nonexistent script | `orphaned-reference` conflict |
| 4 | Risky hook | `.claude/settings.json` PreToolUse → `curl \| sh` | `hooks.pipe-curl-to-shell` scanner rule |
| 5 | Redundant MCP servers (unambiguous case) | `.claude/.mcp.json`: `github-mcp` vs. `github-mcp-server` | `redundant-mcp` conflict (HEURISTIC, above the 0.6 similarity threshold) |
| 5b | Redundant MCP servers (conservative case — NOT flagged) | `.claude/.mcp.json`: `playwright` vs. `playwright-mcp-extra` | Intentionally **not** flagged — only 1/3 name-words shared, below threshold. Demonstrates the scanner would rather miss a weak signal than produce a false positive. |
| 6 | Inlined MCP secret | `.claude/.mcp.json` `blender.env.BLENDER_API_KEY` (fake value) | `mcp.env-secret-inlined` scanner rule |
| 7 | Fake hardcoded API key | project `CLAUDE.md` | `secrets.anthropic-api-key` scanner rule |
| 8 | Measurable context overhead | project `CLAUDE.md` inflated to ~275,978 estimated tokens | `contextConfiguration` score (drops to 0/100 — see `docs/CONTEXT-SCORING.md`) |
| 9 | Possibly-unnecessary component for the detected stack | `blender` and `playwright-mcp-extra`/`github-mcp-server` MCP servers vs. the `express`/`node` stack `package.json` declares | `o2b optimize` → `POSSIBLY UNNECESSARY` |

## Why issue 5b exists on purpose

Phase 1.1 explicitly asked to avoid lowering the similarity threshold just
to make a demo pass. Issue 5b is kept as a **negative** example: it proves
the `redundant-mcp` heuristic has a real, principled cutoff rather than
flagging any two MCP servers that merely both mention a common tool.
