# O2B DOGFOOD — POST-HARDENING (Fase 3)

Fecha: 2026-09-08. Mismo entorno real, mismo método, mismo `rootDir`
(el propio repo O2B) que `docs/DOGFOOD-BASELINE.md`. **El baseline no se
alteró** — este documento es una comparación nueva, no un reemplazo.

Snapshot sanitizado:
[`docs/dogfood/snapshot-post-hardening-sanitized.json`](dogfood/snapshot-post-hardening-sanitized.json).

## Qué se corrigió antes de esta corrida

Los 5 bugs de `docs/DOGFOOD-BASELINE.md` → sección BUGS DISCOVERED:
ruta de `CLAUDE.md` global, MCP servers de `~/.claude.json`, detección
de plugins, regex de GitHub PAT fine-grained, y secretos en `args`.
Detalle de la implementación y verificación contra documentación
oficial en `docs/AUTONOMOUS-RUN.md` (Fase 3).

## Comparación BASELINE → POST-HARDENING

| Métrica | Baseline (Fase 2) | Post-hardening (Fase 3) | Δ |
|---|---|---|---|
| MCP servers de Claude Code detectados | 0 / 11 reales | **12 / 12** reales (11 Claude Code + `node_repl` de Codex ya se contaba aparte) | +12, recall 0% → 100% |
| Plugins detectados | 0 / 4 reales | **4 / 4** reales (`claude-mem`, `ui-ux-pro-max`, `ecc`, `headroom`), con `providedCapabilities` derivadas del filesystem de cada plugin | +4, recall 0% → 100% |
| Instruction sources (global) | 1 (`settings.json`) | **2** (`settings.json` + `CLAUDE.md` global, 7893 bytes) | CLAUDE.md global ahora sí se lee |
| ALWAYS-LOADED (bytes/tokens estimados) | 7908 B / ~1974 tokens | **15 801 B / ~3904 tokens** | Casi el doble — ahora incluye el CLAUDE.md global real |
| Hallazgos de seguridad | 0 | **6** (1 `secrets.github-token` CRITICAL sobre el PAT real, 2 `mcp.npx-auto-install-latest` MEDIUM, 1 `mcp.env-secret-inlined` HIGH, 2 `mcp.arg-secret-inlined` HIGH nuevos — Supabase y LightRAG) | El secreto de GitHub y los 2 de `args` (Supabase, LightRAG) ahora se detectan |
| Security score | 100/100 | **14/100** | Cae porque ahora refleja el riesgo real, no porque haya nuevos problemas — el riesgo ya existía en Fase 2 y no se veía |
| Configuration score | 88/100 | 88/100 | Sin cambio (los mismos 3 conflictos heurísticos de skills; el nuevo inventario de MCP/plugins no generó conflictos nuevos en este entorno) |
| Context Configuration score | 100/100 | 100/100 | Sin cambio — 3904 tokens sigue muy por debajo del umbral de referencia de 20 000 |

## Lectura de los números

**El score de seguridad "empeoró" de 100 a 14 — eso es la corrección
funcionando, no una regresión.** El riesgo (3 secretos reales en texto
plano) existía exactamente igual en la Fase 2; lo único que cambió es
que ahora O2B lo ve. Esto es evidencia directa de que la promesa central
del producto — "sé qué hay realmente en tu entorno" — pasó de estar rota
para el caso de uso más importante (Fase 2: MODERATE, recall 0% en MCP
y plugins) a sostenerse con datos reales (Fase 3: recall 100% en ambos).

**Lo que NO cambió y sigue siendo una limitación real** (no se
corrigió en esta fase, documentado explícitamente):

- `~/.claude.json` → `projects.<path>.mcpServers` (MCP servers "local
  scope", uno por proyecto) sigue sin leerse — solo se lee el
  `mcpServers` de nivel superior (user scope). Ver
  `docs/AUTONOMOUS-RUN.md`.
- Hooks embebidos en `hooks/hooks.json` dentro de cada plugin (`ecc`,
  `headroom`, `claude-mem`) siguen sin contarse — solo hooks declarados
  directamente en `settings.json`.
- `ANTHROPIC_BASE_URL` (provider routing) sigue sin señalarse en ningún
  lado.
- `.claude/rules/*.md` (mecanismo de instrucciones adicional,
  confirmado en la documentación oficial durante esta fase) no se
  modela todavía.
- El catálogo de `profiles/` de Optimize sigue teniendo un solo profile
  — la diferenciación RECOMMENDED/ON-DEMAND/POSSIBLY UNNECESSARY con
  datos reales de MCP servers (ahora que sí se detectan) no se
  re-verificó contra un proyecto con stack matcheable en esta fase.

## Veredicto actualizado

Con el mismo criterio de medición que Fase 2 (nunca se relajó el
método para que el resultado se viera mejor), el hallazgo más grave del
baseline — recall 0% en MCP servers y plugins de Claude Code, con
cascada sobre Security — está **corregido y verificado con el mismo
entorno real**, no solo con tests sintéticos. La validación de producto
pasa de **MODERATE** a, como mínimo, **defendible para continuar** hacia
las fases siguientes de este plan (CLI, documentación, seguridad del
propio O2B) — no se reclasifica formalmente aquí como STRONG porque
persisten limitaciones documentadas arriba (local-scope MCP, hooks de
plugin, `.claude/rules/`) que no se intentó cerrar en esta pasada.
