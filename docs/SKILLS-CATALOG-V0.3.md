# O2B Skills Catalog v0.3 — design (Fases 4-10)

## Fase 4 — Análisis de las 8 skills actuales

| Skill | PURPOSE | ACTIVATION | OVERLAP | QUALITY | UNIQUENESS | PRODUCT VALUE | DECISION |
|---|---|---|---|---|---|---|---|
| `security-scan` | Correr el scanner de O2B sobre un proyecto | Antes de shippear cambios de config de agente | Alto con `secrets-audit` (ambos buscan secretos) | Buena — delega en el CLI real, no reinventa lógica | Alta — es la única que ejecuta el motor real de O2B | Alta | **KEEP, ampliar** para cubrir explícitamente hooks-de-plugin y multi-harness (Cursor) |
| `secrets-audit` | Buscar secretos hardcodeados en archivos de config | Al revisar config antes de commit | Alto con `security-scan` (el propio SKILL.md lo admite: "overlaps with O2B's secrets scanner category") | Buena pero redundante | Baja — duplica lo que `security-scan` ya hace mejor (motor real vs. grep manual) | Baja tal como está | **MERGE en `security-scan`** — un manual-grep-first-pass no aporta sobre invocar el scanner real |
| `mcp-review` | Revisar MCP servers por pinning/secretos/redundancia | Antes de agregar/cambiar un MCP server | Bajo | Buena, específica | Alta — único enfoque MCP-first | Alta | **KEEP** |
| `context-budget-audit` | Medir el tamaño de las instrucciones siempre-cargadas | Cuando CLAUDE.md/AGENTS.md crece | Bajo | Buena | Alta — usa directamente el desglose de contexto de O2B | Alta | **KEEP** |
| `code-review` | Revisar el diff actual por bugs de corrección | Después de escribir/modificar código | N/A | Buena | Ninguna respecto al dominio de O2B — es una skill de ingeniería genérica | Genérica | **RECLASIFICAR** como skill de contribuidor (ver Fase 14), no producto O2B |
| `plan-first` | Descomponer una tarea no trivial en pasos verificables | Antes de una feature/refactor/fix | N/A | Buena | Ninguna | Genérica | **RECLASIFICAR** — contribuidor, no producto |
| `git-workflow` | Higiene de git para este repo | Antes de operaciones git destructivas | N/A | Buena | Ninguna | Genérica | **RECLASIFICAR** — contribuidor, no producto |
| `verification-loop` | No declarar terminado sin probar | Al final de cualquier tarea | N/A | Buena | Ninguna | Genérica | **RECLASIFICAR** — contribuidor, no producto |

**Hallazgo central de la Fase 4**: de las 8 skills actuales, **4 son
genéricas de ingeniería** (no específicas del dominio de O2B —
exactamente el filtro que la Fase 6 pide aplicar) y **1 duplica a
otra** (`secrets-audit` vs. `security-scan`). Solo 3
(`security-scan`, `mcp-review`, `context-budget-audit`) son
"skills de producto O2B" genuinas hoy.

## Fase 5 — Catálogo objetivo

**No se llega a 20-30.** La evidencia de las Fases 1-4 no lo respalda:
el benchmark de ECC (Fase 1-3) identificó ~5 capacidades reales con
mapeo P0/P1, y el análisis de las 8 skills actuales (Fase 4) mostró que
la mitad son genéricas, no de producto. Forzar el catálogo a 20+
skills inflaría el conteo sin sustancia — exactamente lo que el
usuario pidió evitar ("no perseguir el número de ECC artificialmente").

**Catálogo objetivo: 8 skills de producto O2B** (igual cantidad que
antes, composición distinta y con mejor justificación) + 4 skills de
contribuidor (separadas, documentadas, no parte del "catálogo de
producto").

### Producto O2B (8, todas mapeadas a un comando real del CLI)

| # | Skill | Estado | Mapea a |
|---|---|---|---|
| 1 | `environment-inventory` | **NUEVO (P0)** | `o2b inventory` |
| 2 | `hook-plugin-audit` | **NUEVO (P0)** | `o2b doctor`/`scan` — hooks + plugins, incl. hooks embebidos |
| 3 | `instruction-conflict-analysis` | **NUEVO (P0)** | `o2b doctor` — conflicts (contradictory-instruction, duplicate-name, redundant-mcp) |
| 4 | `security-scan` | **MEJORADO** (absorbe `secrets-audit`) | `o2b scan` |
| 5 | `mcp-review` | KEEP | MCP servers específicamente |
| 6 | `context-budget-audit` | KEEP | `o2b doctor` — context breakdown |
| 7 | `snapshot-diff-workflow` | **NUEVO (P1)** | `o2b snapshot` + `o2b diff` |
| 8 | `optimize-tool-relevance` | **NUEVO (P1)** | `o2b optimize` |

### Contribuidor O2B (4, sin cambio de contenido, solo reclasificadas)

`code-review`, `plan-first`, `git-workflow`, `verification-loop` — se
mantienen en el repo (siguen siendo útiles para quien desarrolla O2B
mismo) pero se documentan explícitamente como una categoría separada,
no parte de lo que un usuario de O2B instalaría por el valor del
producto. Ver Fase 14.

### Diferidas (P2 — no implementadas en esta fase)

`config-gc-interpretation` (interpretar redundancia sin borrar —
depende de que `optimize`/`conflicts` maduren más), `cost-usage-
tracking` (depende de telemetría de sesión desplegada, hoy solo
prototipo), `skill-quality-audit` (fuera del dominio de "entorno",
más cerca de "calidad editorial de contenido").

## Fase 6 — Diferenciación (WHY IS THIS AN O2B SKILL?)

| Skill | Por qué es de O2B | Relación con observability/security/optimization |
|---|---|---|
| `environment-inventory` | Enseña a leer el inventario cross-harness normalizado — no existe en ningún otro producto de forma unificada (Claude Code + Codex + Cursor a la vez) | Observability |
| `hook-plugin-audit` | Los hooks embebidos en plugins fueron el mayor hallazgo real del propio dogfood de O2B (2→34) — nadie más audita esta superficie específica | Security + Observability |
| `instruction-conflict-analysis` | Contradicciones entre CLAUDE.md global/proyecto son invisibles sin una herramienta — es el propio Conflict Engine de O2B | Observability + Optimization |
| `security-scan` | Ejecuta el motor real de O2B con redacción garantizada y confidence declarado | Security |
| `mcp-review` | MCP es el vector de secretos más grande encontrado en el propio dogfood (Fase 2/3) | Security |
| `context-budget-audit` | Mide el costo real de contexto con method declarado (measured/estimated) | Optimization |
| `snapshot-diff-workflow` | Comparar el entorno antes/después de instalar algo — nadie más lo hace cross-harness y 100% local | Observability |
| `optimize-tool-relevance` | Separa detección de stack de recomendación de herramienta, con `expectedEffect`/`confidence` explícitos — no es "ayuda a escribir React" | Optimization |

Ninguna responde "ayuda a escribir mejor código en X" — todas pasan el
filtro de la Fase 6.

## Fase 7 — Solapamiento con ECC

| Skill O2B | Clasificación | Nota |
|---|---|---|
| `environment-inventory` | SIMILAR DOMAIN / DIFFERENT APPROACH | ECC no tiene una skill dedicada a "solo mostrar el inventario"; `workspace-surface-audit` mezcla inventario+recomendación de contenido de terceros, que O2B nunca hace |
| `hook-plugin-audit` | UNIQUE TO O2B | Ninguna skill de ECC nombra explícitamente "hooks embebidos en plugins" como su objeto de auditoría |
| `instruction-conflict-analysis` | UNIQUE TO O2B | Ninguna skill de ECC detecta contradicciones semánticas entre CLAUDE.md global/proyecto |
| `security-scan` | SIMILAR DOMAIN / DIFFERENT APPROACH | Mismo dominio que el `security-scan` de ECC (via AgentShield) — diferenciador real: multi-harness + confidence declarado, no solo Claude Code |
| `mcp-review` | SIMILAR DOMAIN / DIFFERENT APPROACH | ECC no tiene una skill MCP-first dedicada; el audit de MCP vive disperso en `automation-audit-ops`/`workspace-surface-audit` |
| `context-budget-audit` | SIMILAR DOMAIN / DIFFERENT APPROACH | Análogo a `context-budget` de ECC — diferenciador: methodology honesta (measured/estimated/unknown) documentada aparte (`docs/CONTEXT-SCORING.md`) |
| `snapshot-diff-workflow` | UNIQUE TO O2B | No se encontró una skill de ECC equivalente a comparar snapshots de entorno completos antes/después |
| `optimize-tool-relevance` | UNIQUE TO O2B | `optimize` de O2B nunca recomienda instalar contenido de terceros — diferencia estructural, no solo de implementación |

## Fase 8 — Formato de skill (convención propia de O2B, no la de ECC)

```
---
name: <kebab-case>
description: <qué hace + cuándo activarla, en una frase accionable>
origin: O2B
version: 1.0.0
tags: [<lista corta>]
---

## Purpose
## When to Activate
## Inputs
## Workflow
## Evidence Requirements
## Confidence / Uncertainty
## Safety Rules
## Anti-Patterns
## Expected Output
## Related O2B Skills
```

Nunca copiado de ECC — las 9 secciones fueron elegidas para reflejar
específicamente cómo O2B ya estructura sus propios reportes
(evidence/confidence/method), algo que el formato anterior de O2B
(frontmatter + un párrafo corto) no tenía y que ECC tampoco usa con
esta forma exacta.

## Fase 9 — Activación

Cada `description` nueva sigue el patrón "QUÉ hace + CUÁNDO activarla"
con verbos concretos (no "ayuda a analizar configuración"). Ver
`packages/core/tests/skills/catalog.test.ts` para el validador
programático (nombres duplicados, frontmatter faltante, `origin`
inválido, referencias rotas en "Related O2B Skills", descripciones
casi-idénticas entre skills).

## Fase 10 — Costo de contexto del catálogo

Ver la sección "CONTEXT COST" del informe final de chat — medido con
el mismo método que O2B ya usa para cualquier entorno
(INSTALLED/DISCOVERABLE/ALWAYS-LOADED/ON-DEMAND POTENTIAL/LOADED-
ACTIVE=UNKNOWN), corriendo `o2b doctor` sobre el propio repo O2B tras
implementar el catálogo — no una estimación manual.
