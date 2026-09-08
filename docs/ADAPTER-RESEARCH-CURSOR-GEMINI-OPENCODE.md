# Investigación de adapters adicionales — Cursor, Gemini CLI, OpenCode

Fecha: 2026-09-08. Fase C del segundo run autónomo. Investigación
únicamente contra documentación oficial vigente (fetch en vivo). No se
instaló ninguna de estas 3 herramientas ni se leyó configuración real de
usuario para esta fase — solo documentación pública.

## Criterio de decisión (dado explícitamente por el usuario)

Solo implementar un adapter si: (1) existe documentación oficial
suficiente, (2) se puede detectar configuración útil, (3) aporta
información real al Environment Manager, (4) se pueden escribir
fixtures/tests fiables. "2 adapters correctos" es mejor que "5 adapters
ficticios".

## Tabla comparativa

| | **Cursor** | **Gemini CLI** | **OpenCode** |
|---|---|---|---|
| CONFIG SOURCE | `.cursor/` (proyecto), `~/.cursor/` (global) | `.gemini/settings.json` (proyecto), `~/.gemini/settings.json` (global) | `opencode.json` (proyecto), `~/.config/opencode/opencode.json` (global) — JSON o JSONC |
| GLOBAL SCOPE | `~/.cursor/mcp.json`, `~/.cursor/rules/` (confirmado) | `~/.gemini/settings.json` (confirmado) | `~/.config/opencode/opencode.json`, `~/.config/opencode/AGENTS.md` (confirmado) |
| PROJECT SCOPE | `.cursor/mcp.json`, `.cursor/rules/*.mdc`, `AGENTS.md` (confirmado) | `.gemini/settings.json`, `GEMINI.md` (confirmado conceptualmente, ruta exacta de `GEMINI.md` de usuario NO confirmada con precisión) | `opencode.json`, `AGENTS.md` (confirmado; además lee `~/.claude/CLAUDE.md` como compatibilidad — confirmado) |
| MCP | `.cursor/mcp.json` / `~/.cursor/mcp.json`, shape JSON `{"mcpServers": {"name": {"command","args","env"}}}` — **shape exacto confirmado**, incluye interpolación `${env:...}`/`${workspaceFolder}`/`${userHome}` | Existe (`docs/tools/mcp-server/`), shape exacto dentro de `settings.json` **NO confirmado** en esta sesión (no se llegó a esa página en el tiempo disponible) | Clave `"mcp"` dentro de `opencode.json` — existencia confirmada, **shape/ejemplo exacto NO confirmado** en esta sesión |
| INSTRUCTIONS | `AGENTS.md` (alternativa simple) — confirmado | `GEMINI.md`, jerarquía de "context files" — confirmado conceptualmente | `AGENTS.md` (principal), + campo `"instructions"` en `opencode.json` (globs/URLs remotas) — confirmado |
| RULES | `.cursor/rules/*.mdc` (frontmatter requerido; un `.md` plano sin frontmatter es ignorado) + `.cursorrules` legado — confirmado | No documentado como mecanismo separado de `GEMINI.md` en lo investigado | `AGENTS.md` cumple este rol; sin directorio `rules/` separado confirmado |
| AGENTS/SKILLS | No se encontró un sistema de agentes/skills instalables (marketplace) documentado en las páginas investigadas | "Agent Skills" y "Extensions" existen como secciones de docs — formato/ubicación exactos **NO confirmados** en esta sesión | "Agent Skills" y "Plugins" existen como secciones de docs — formato/ubicación exactos **NO confirmados** en esta sesión |
| HOOKS | No se encontró documentación de hooks en lo investigado (posible ausencia real, o simplemente no se llegó a la página correcta — **NO VERIFICADO en ningún sentido**) | Sección "Hooks" existe (`docs/hooks/`, `docs/hooks/reference/`) — formato/ubicación exactos **NO confirmados** en esta sesión | No confirmado |
| OFFICIAL DOCUMENTATION | `cursor.com/docs/context/rules`, `cursor.com/docs/context/mcp` | `geminicli.com/docs/*` | `opencode.ai/docs/*` |
| STATICALLY OBSERVABLE | **Sí, con alta confianza** para MCP + rules/AGENTS.md (shape JSON confirmado, ubicaciones confirmadas en ambos scopes) | **Parcial** — ubicaciones de `settings.json`/`GEMINI.md` confirmadas, pero el shape interno de MCP dentro de `settings.json` no se verificó | **Parcial** — ubicaciones confirmadas, shape de la clave `"mcp"` no verificado |

## Decisión

**Se implementa un adapter READ-ONLY para Cursor únicamente en esta
sesión.** Es el único de los 3 donde el shape JSON completo de MCP
(la pieza más valiosa para el Environment Manager) está confirmado con
precisión suficiente para no tener que adivinar nada, además de rutas
confirmadas para rules/AGENTS.md en ambos scopes.

**Gemini CLI y OpenCode: `NOT IMPLEMENTED — insufficient verified
specification`** para esta sesión específicamente por el shape exacto
de su configuración MCP (la fuente de mayor valor real para O2B) — no
por falta de interés ni por limitación arquitectónica. Ambos son
candidatos razonables para una sesión futura que invierta el tiempo de
investigación necesario para confirmar:
- Gemini CLI: shape exacto de MCP dentro de `settings.json`, ruta
  exacta de `GEMINI.md` a nivel de usuario, formato de "Agent Skills"/
  "Extensions".
- OpenCode: shape exacto de la clave `"mcp"` en `opencode.json`,
  formato de "Agent Skills"/"Plugins".

Este es exactamente el resultado que el usuario pidió explícitamente:
"2 adapters correctos" en vez de "3 adapters con partes adivinadas".
