# CodexAdapter — verified vs. unknown capabilities

This adapter only implements what current public Codex documentation
confirms. Anything not confirmed is explicitly marked `UNKNOWN`/
`UNSUPPORTED` rather than guessed at.

## VERIFIED (implemented, tested against synthetic fixtures)

- **`AGENTS.md`** — confirmed cross-tool standard (stewarded by the Agentic
  AI Foundation, Linux Foundation, since 2026 Q2), read by Codex, Claude
  Code, Cursor, and others. Read at both global (`~/AGENTS.md`) and project
  (`<root>/AGENTS.md`) scope. Reported as an `InstructionSource`.
- **`.codex/config.toml`** — confirmed location for Codex config, at both
  `~/.codex/config.toml` (global) and `<project>/.codex/config.toml`
  (project-scoped, for trusted projects). Read-only.
- **MCP server declarations in `config.toml`** — confirmed shape:
  ```toml
  [mcp_servers.<name>]
  command = "uvx"
  args = ["--refresh", "tooluniverse"]

  [mcp_servers.<name>.env]
  SOME_VAR = "value"
  ```
  and the remote/HTTP shape:
  ```toml
  [mcp_servers.<name>]
  url = "https://mcp.example.com/mcp"
  ```
  Only env var **names** are ever recorded (`envVarNames`), never values —
  matches the privacy-first contract in `docs/PRIVACY.md`.
- **Detection** — a project or home directory is treated as "Codex present"
  if `AGENTS.md`, `.codex/`, or a home-level `.codex/` exists.
- **Read-only behavior** — the adapter never calls any `fs.write*`/`unlink`
  function; verified by the same grep-based check used for the whole
  codebase (see `docs/PRIVACY.md`).

## UNKNOWN / UNSUPPORTED (deliberately not implemented)

- **Agents/skills as installable content** — Codex announced an
  "enterprise plugin system" in March 2026, but as of this writing there is
  no verifiable public specification for an agents/skills format analogous
  to Claude Code's `.claude/agents/*.md` / `.claude/skills/*/SKILL.md`.
  `CodexAdapter.collect()` always returns `agents: []` and `skills: []`
  with an explicit warning — never an invented format.
- **Hooks** — no confirmed public Codex hook system was found; not
  implemented. If Codex documents one, add it as a new, separately tested
  capability rather than reusing Claude Code's hook shape.
- **Plugins** — same as above: `plugins: []`, not fabricated.
- **TOML parsing is intentionally partial.** `extractMcpServersFromToml` in
  `packages/core/src/adapters/codex/index.ts` is a narrow regex-based
  reader for the two documented shapes above — it is not a general TOML
  parser. Any `mcp_servers` table it cannot confidently parse is skipped
  with a warning, never silently misreported.

## Sources consulted

- Codex CLI Official Documentation Guide (2026)
- "AGENTS.md for OpenAI Codex: Complete Setup and Configuration Guide (2026)"
- Codex CLI MCP setup guides (Tembo, ToolUniverse, Verdent, Prompt Architects)
  showing the `[mcp_servers.<name>]` / `[mcp_servers.<name>.env]` TOML shape
