# O2B vs. ECC — Skills Benchmark

Fecha: 2026-09-08. Metodología: inventario **programático** del catálogo
real de ECC v2.2.1 instalado localmente (`~/.claude/plugins/cache/ecc/
ecc/2.2.1/skills/`, 286 directorios, uno por skill — mismo número que
la estimación del usuario) — se extrajo únicamente `name:`/
`description:` del frontmatter de cada `SKILL.md` (286 líneas, un
`grep` por archivo), **nunca el cuerpo/contenido interno**. Cero
archivos de ECC fueron copiados, parafraseados o usados como plantilla.
Este documento es análisis competitivo, no una lista derivada del texto
de ECC.

No se navegó el repo de GitHub de ECC en esta sesión — la instalación
local (plugin `ecc@ecc` v2.2.1, ya presente en el entorno real
dogfoodeado en sesiones previas, ver `docs/DOGFOOD-FINAL.md`) es la
misma versión que el catálogo oficial actual y evita cualquier
ambigüedad de red/autenticación. Es la fuente más autoritativa
disponible sin salir del entorno ya verificado.

## Resultado del filtrado programático

286 skills totales → 138 coinciden con palabras clave amplias
(mcp/hook/plugin/skill/agent/context/environ/config/session/memory/
observ/audit/secret/harness/instruction) → de esas 138, **~15 son
genuinamente del dominio de O2B** (gestión/auditoría del entorno de
IA en sí). El resto de las 138 son sobre **construir productos con
agentes de IA** (agent-eval, agent-harness-construction, gan-style-
harness, etc.) — dominio distinto: O2B audita el entorno donde corre
el agente, ECC en gran parte ayuda a construir cosas *con* agentes.

## Matriz ECC → O2B (solo las capacidades realmente relevantes)

| ECC CAPABILITY | ECC SKILL(S) | O2B RELEVANCE | O2B ALREADY COVERS? | O2B SHOULD HAVE? | PRIORITY | RATIONALE |
|---|---|---|---|---|---|---|
| Config garbage collection | `config-gc` | Alta — escanea `~/.claude` por skills/hooks/MCP/permisos redundantes o huérfanos | Parcial (`doctor`/`conflicts` detecta redundancia, no limpia) | Sí, como skill que enseña a interpretar `doctor`+`conflicts`, no a borrar | P1 | O2B es read-only por diseño — no replicar el flujo de borrado guiado de ECC, pero sí la interpretación de hallazgos |
| Context window audit | `context-budget` | Alta — audita consumo de contexto por agents/skills/MCP/rules | Sí (`context-budget-audit` ya existe) | Ya cubierto | — | Mantener, mejorar |
| Config security scan | `security-scan` (ECC, vía AgentShield) | Alta — escanea `.claude/` por CLAUDE.md/settings.json/MCP/hooks/agents | Sí (`security-scan` + scanner de O2B) | Ya cubierto, mejorar cobertura (hooks de plugins, Cursor) | — | O2B ya es un competidor directo aquí — diferenciador: multi-harness + provenance/confidence, no solo Claude Code |
| Skill/rule/agent quality audit | `skill-stocktake`, `skill-comply` | Media — calidad de skills, cumplimiento de reglas | No | No para v0.3 | P2 | Fuera del dominio de O2B (O2B audita el ENTORNO, no la calidad editorial de cada skill individual) |
| Workspace/harness surface audit | `workspace-surface-audit` | Alta — audita repo+MCP+plugins+conectores+harness y recomienda | Parcial (`doctor`+`inventory` hacen el audit, no la recomendación de "qué instalar") | No — `optimize` ya cubre la parte de recomendación de O2B, con enfoque distinto (perfiles de stack, no "qué skill de ECC instalar") | — | Mismo dominio, enfoque deliberadamente distinto: O2B nunca recomienda contenido de terceros para instalar |
| Automation/hooks/MCP overlap audit | `automation-audit-ops` | Alta — inventario de jobs/hooks/conectores/MCP vivos/rotos/redundantes | Parcial (`doctor` detecta hooks rotos vía `orphaned-reference`, MCP redundante vía `redundant-mcp`) | Sí — falta cubrir hooks *embebidos en plugins* como una capacidad explícita, ya implementada en el adapter pero no como skill dedicada | P0 | Justamente el hallazgo más grande del dogfood de Fase H (2→34 hooks) — merece una skill propia |
| Cross-harness memory/context sharing | `unified-memory` | Media — comparte contexto entre Claude/Codex/Hermes/Cursor/OpenCode | No | No — O2B no gestiona memoria compartida, solo la observa | P2 | Dominio adyacente pero distinto: O2B es observador read-only, no un bus de memoria activo |
| Cost/usage tracking | `cost-tracking` | Media — trackea tokens/gasto real de Claude Code | No (LOADED/ACTIVE es `unknown` por diseño) | No para v0.3 — requeriría telemetría de sesión, ya investigada y prototipada sin desplegar (`docs/SESSION-OBSERVABILITY-SPIKE.md`) | P2 | Mismo motivo que LOADED/ACTIVE=UNKNOWN: no fingir certeza sin el prototipo desplegado |
| Hook-blocking gates | `gateguard`, `delivery-gate` | Baja-Media — hooks que bloquean acciones hasta cumplir condiciones | No | No — O2B no instala hooks activos, es un observador, no un enforcer | NO | Fuera de alcance: O2B nunca modifica ni bloquea sesiones activas, por diseño de privacidad/read-only |
| Rule distillation | `rules-distill` | Baja — extrae principios recurrentes de skills a archivos de reglas | No | No | NO | Generador de contenido, no auditor — fuera del dominio |
| Compaction suggestion | `strategic-compact` | Baja — sugiere compactación manual de contexto | No | No | NO | Gestión de sesión activa, no auditoría de configuración |
| MCP server building | `mcp-server-patterns` | Baja para O2B (O2B *consume/audita* MCP servers, no enseña a construirlos) | No | No | NO | Dominio de "escribir código", no "auditar entorno" — exactamente el filtro de la Fase 6 |

## Categorías A-D (Fase 2)

- **A. CORE O2B**: config security scan, context window audit,
  automation/hooks/MCP overlap audit, workspace/harness surface audit
  (con enfoque propio).
- **B. USEFUL FOR O2B**: config garbage collection (como
  interpretación, no como acción).
- **C. GENERIC CODING**: la inmensa mayoría de las 286 (react-patterns,
  django-security, kubernetes-patterns, homelab-*, etc.) — no
  evaluadas individualmente porque el propio nombre/descripción ya las
  descarta del dominio de O2B por la regla de la Fase 6.
- **D. OUT OF SCOPE**: construcción de productos-agente (agent-eval,
  agent-harness-construction, gan-style-harness, autonomous-agent-
  harness), hooks activos que modifican/bloquean sesiones (gateguard,
  delivery-gate, plankton-code-quality), generación de contenido
  (rules-distill, article-writing, social-publisher).

## Conclusión de la Fase 1-3

De 286 skills de ECC, **ninguna se copia**, y solo **~5 capacidades**
(no skills textuales) tienen un mapeo P0/P1 real hacia O2B — todas ya
parcialmente cubiertas por comandos existentes del CLI (`doctor`,
`inventory`, `scan`, `optimize`), a las que les falta una skill
dedicada que enseñe a interpretarlas con el mismo rigor de
provenance/confidence que ya usa el resto de O2B. Esto confirma, con
evidencia y no por intuición, que el catálogo objetivo de O2B no
necesita acercarse a las 286 (ni a las 30) de ECC — ver
`docs/SKILLS-CATALOG-V0.3.md` para el diseño resultante.
