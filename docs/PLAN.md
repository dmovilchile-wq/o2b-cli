# O2B — AI Coding Environment Manager (plan v3, pre-implementación)

## 1. Tesis del producto

**O2B = AI Coding Environment Manager.**
*"We make your AI coding environment observable, secure and optimized."*

O2B no compite por volumen de agentes/skills. Administra el **entorno**
completo donde corren los agentes de codificación de un desarrollador —
global y por proyecto, a través de uno o varios harnesses (Claude Code,
Codex, y a futuro Cursor/Gemini CLI/OpenCode) — y responde tres preguntas que
ningún harness individual responde por sí solo: *¿qué tengo realmente
instalado?*, *¿qué de eso es inseguro, redundante o contradictorio?*, *¿qué
necesito de verdad para este proyecto?*

## 2. Diferenciación frente a ECC (con evidencia, sin maquillar)

Investigado (no asumido): ECC Tools ya vende una capa Pro real vía GitHub App
— **$19/asiento/mes o $190/año**, para instalaciones de organización, repos
privados, "PR-triggered config audits", auto-triggers en pushes grandes, y
chequeos respaldados por AgentShield ([Pricing - ECC Tools](https://ecc.tools/pricing),
[GitHub Apps - ECC Tools](https://github.com/apps/ecc-tools)). Es decir: ECC
**ya hace auditorías de configuración**, no es un hueco vacío.

Dónde gana ECC hoy (hay que decirlo, no maquillar):
- 68 agentes / 286 skills listos para usar (OSS) — cobertura de contenido que
  a O2B le tomaría años igualar.
- AgentShield: 102 reglas de seguridad maduras, con GitHub Action y App.
- Generación automática de contenido a partir del historial real del repo
  (analiza commits/arquitectura y abre PRs con skills/rules/hooks
  específicos del proyecto) — un enfoque de "generar", no solo "auditar".
- Ya tiene tracción (~40k estrellas, changelog activo, PRs abiertas en
  cientos).

Dónde NO hay evidencia de que ECC compita hoy (hueco real):
- **Inventario normalizado multi-harness**: ECC instala contenido *dentro*
  de cada harness (Claude Code, Codex, Cursor…) pero no reporta un modelo
  único que compare qué existe en cada uno a la vez, con qué se solapa entre
  ellos, ni distingue configuración global vs. de proyecto de forma
  estructurada.
- **Detección de conflictos entre fuentes** (mismo nombre de skill en dos
  sitios, instrucciones contradictorias entre `CLAUDE.md` global y de
  proyecto, MCP redundante) — no es una función documentada de ECC.
- **Análisis honesto de costo de contexto real** (qué se carga de verdad vs.
  qué solo está instalado) — no documentado en ECC.
- ECC opera **por repositorio** (analiza *ese* repo, genera contenido para
  *ese* repo); O2B opera **por entorno** (toda la máquina/usuario: config
  global + N proyectos + N harnesses a la vez).

**Conclusión honesta:** el espacio libre no es "seguridad" (ECC ya lo cubre
razonablemente bien) — es **racionalización y observabilidad del entorno
completo, independiente del vendor de contenido**. Si O2B solo repite
"escaneamos secretos", pierde contra AgentShield en madurez el día 1.

## 3. Restricción técnica clave descubierta (cambia el diseño)

Investigado en documentación oficial de Claude Code Skills: el modelo real
de carga es **progressive disclosure** — al iniciar una sesión solo se cargan
`name` + `description` de cada skill (unas pocas decenas de tokens por
skill); el cuerpo completo del `SKILL.md` solo se lee cuando el skill se
invoca durante esa sesión ([Agent Skills — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview),
[Claude Code Skills: Progressive Disclosure](https://medium.com/@dan.avila7/claude-code-skills-progressive-disclosure-step-by-step-3ca02a4a9f60)).
Esta misma sesión de trabajo lo confirma empíricamente: MCP tools también
pueden quedar "deferred" (solo el nombre, sin schema) hasta pedirse
explícitamente.

**Consecuencia para el diseño:** afirmar "tienes 200 skills instalados, por
lo tanto gastas el contexto de 200 skills" sería **falso** y es exactamente
la afirmación que el usuario pidió evitar. Lo que sí se carga siempre,
completo, en cada sesión, es `CLAUDE.md`/`AGENTS.md` (global + de proyecto) y
la configuración de `settings.json`. Eso es lo que realmente pesa.

Además: un escaneo **estático y offline** (que es lo que un CLI como `o2b
doctor` puede hacer) no puede observar qué skill se **invocó de verdad**
durante una sesión real — eso es un evento en tiempo de ejecución, no un
hecho del filesystem. Por eso el modelo de estados se redefine así:

| Estado | Se puede determinar con escaneo estático (Fase 1) | Método |
|---|---|---|
| `INSTALLED` | Sí | Existe el archivo en disco |
| `DISCOVERABLE` | Sí | Frontmatter `name`+`description` parseable; costo ≈ bytes de esa porción → tokens estimados (documentado como bajo, decenas de tokens) |
| `ALWAYS-LOADED` | Sí | Contenido que la propia documentación confirma que se lee completo en cada sesión: `CLAUDE.md`/`AGENTS.md` global+proyecto, `settings.json` | 
| `ON-DEMAND POTENTIAL` | Sí (como estimación de costo *si* se activa) | Tamaño completo del cuerpo de la skill/agent, etiquetado "costo potencial, no confirmado" |
| `LOADED` / `ACTIVE` (en una sesión real) | **No, no con un escaneo offline** | Requiere integración en vivo (hook de sesión) — se declara como **fuera de alcance de Fase 1**, candidato a Fase 2/Pro (ver §13) |

Esto es más honesto que el ejemplo conceptual del usuario y evita prometer
algo que un CLI standalone no puede medir.

## 4. Prioridad del MVP (confirmada, reducida)

Orden de desarrollo:
1. Universal Inventory (modelo + adapters)
2. O2B Doctor (agrega inventory + scanner + conflicts + scores)
3. Security Scanner (10-15 reglas propias)
4. Conflict Detection
5. Context Analysis (con las limitaciones honestas de §3)
6. O2B Optimize (recomendaciones, sin auto-apply)
7. Adapters Claude Code + Codex

Contenido de agentes/skills: **el mínimo necesario para demostrar y ejercitar
estas capacidades**, no una biblioteca:
- **3 agentes:** `planner`, `code-reviewer`, `security-reviewer`
- **8-10 skills:** enfocadas en workflow + el propio uso de O2B (ej.
  `security-scan`, `context-budget-audit`, `mcp-review`), no en cubrir
  lenguajes/stacks — eso es exactamente el terreno donde ECC ya gana y no
  vale la pena perseguir en el MVP.

## 5. Arquitectura

```
O2B/
  package.json                     # workspaces (ya creado)
  LICENSE                          # MIT
  README.md
  docs/
    ARCHITECTURE.md
    PROFILES.md
    COMPETITIVE-MATRIX.md          # la tabla de la sección 12, mantenida viva
  packages/
    core/                          # @o2b/core — MIT, sin red, sin harness-specific code
      src/
        domain/                    # entidades (ver §6)
        adapters/
          harness-adapter.ts       # interfaz común
          claude-code/
          codex/
        inventory/                 # motor de recolección + normalización
        doctor/                    # agrega inventory + scanner + conflicts + scores
        conflicts/                 # ConflictEngine (ver §9)
        context/                   # ContextAnalyzer (ver §10, con sus límites honestos)
        optimize/                  # detectors + profiles + recommendations (ver §11)
        edition.ts                 # boundary Community/Pro/Team/Enterprise
      tests/
    scanner/                       # @o2b/scanner — MIT
      src/rules/ (secrets, permissions, hooks, mcp, instructions)
      src/engine.ts
      src/redact.ts
      tests/rules/                 # positivo+negativo por regla
    cli/                           # @o2b/cli
      src/commands/ (doctor.ts, optimize.ts, scan.ts, inventory.ts)
      bin/o2b.js
  profiles/                        # datos, no código (ver §11)
  agents/                          # 3 agentes (contenido)
  skills/                          # 8-10 skills (contenido)
  .claude-plugin/                  # manifest de instalación en Claude Code
```

`@o2b/core` no importa nada específico de Claude Code o Codex fuera de
`adapters/`. Esto es lo que permite agregar Cursor/Gemini/OpenCode después
sin tocar `doctor`/`optimize`/`conflicts`/`context`.

## 6. Modelo de dominio (`packages/core/src/domain`)

Entidades normalizadas (todas con `sourceHarness`, `sourcePath`,
`scope: 'global'|'project'`):

- `Harness` — `{ id, kind, version?, configRoots[] }`
- `Agent` — `{ id, name, description, model?, sourceHarness, sourcePath, scope }`
- `Skill` — `{ id, name, description, sourceHarness, sourcePath, scope, bodyBytes }`
- `MCPServer` — `{ id, name, transport, command?, url?, envVarNames[] (nunca valores), scope, deferred?: boolean }`
- `Hook` — `{ id, event, command, sourcePath, riskFlags[] }`
- `Plugin` — `{ id, name, sourceHarness, sourcePath, providedCapabilities[] }`
- `InstructionSource` — `{ id, kind: 'CLAUDE.md'|'AGENTS.md'|'settings.json', scope, path, sizeBytes, estimatedTokens }`
- `MemoryProvider` — `{ id, kind, sourcePath }` (ej. sistema de memoria/instintos si el harness lo expone; en Fase 1 solo se detecta su presencia, no se audita su contenido)
- `SecurityFinding` — `{ id, ruleId, category, severity, confidence, file, location{line?}, description, evidence(redactado), remediation }`
- `Conflict` — `{ id, type, involves: EntityRef[], description, severity, confidence: 'measured'|'heuristic' }`
- `Recommendation` — `{ id, kind: 'add'|'remove'|'review', targetType, targetId?, reason, matchedProfile, confidence }`
- `ProjectProfile` — `{ id, detectedStack: string[], matchedProfileFiles: string[] }`
- `InventorySnapshot` — agrega todo + `contextBreakdown` (§10) + `scores` (§8)

## 7. Adapters

```ts
interface HarnessAdapter {
  readonly kind: HarnessKind;
  detect(rootDir: string): Promise<boolean>;
  collect(rootDir: string): Promise<{
    agents: Agent[]; skills: Skill[]; mcpServers: MCPServer[];
    hooks: Hook[]; plugins: Plugin[]; instructionSources: InstructionSource[];
  }>;
}
```

- **`ClaudeAdapter`**: `~/.claude/` + `<project>/.claude/` — agentes
  (`agents/*.md`), skills (`skills/*/SKILL.md`), hooks/plugins
  (`settings.json`, `settings.local.json`, `.claude-plugin/`), MCP
  (`.mcp.json`), `CLAUDE.md` global y de proyecto.
- **`CodexAdapter`** (solo lectura): `AGENTS.md` (jerarquía de
  subdirectorios, estándar cross-tool confirmado), `.codex/config.toml`, MCP
  ahí declarado. **No** se inventa un formato de agentes/skills instalables
  para Codex — el sistema de plugins "enterprise" de Codex (anunciado marzo
  2026) no tiene spec pública verificable todavía; si más adelante la tiene,
  se agrega como adapter nuevo sin tocar el core.

Ambos adapters son **100% de lectura**: nunca `writeFile`/`unlink` sobre
rutas de `~/.claude`, `~/.codex`, ni sobre `settings.json`/`config.toml`
reales. Esto es lo que permite usar la configuración real del usuario como
entorno de dogfood sin riesgo (§13).

## 8. O2B Doctor

Salida (terminal + `--json`), formato inspirado en el ejemplo del usuario
pero con la etiqueta de método en cada score:

```
O2B DOCTOR
AI ENVIRONMENT
  Claude Code   detected
  Codex         detected

INVENTORY
  MCP Servers 7   Skills 42   Agents 12   Hooks 5   Plugins 3   Instruction sources 4

HEALTH
  Security             78/100   [MEASURED]
  Configuration        85/100   [MEASURED + HEURISTIC]
  Context Efficiency   61/100   [ESTIMATED — ver desglose]
  Compatibility        90/100   [HEURISTIC]

ISSUES
  - 2 skills con nombre duplicado (global vs. proyecto)      [MEASURED]
  - 1 hook con comando de red no verificado                  [MEASURED, scanner]
  - CLAUDE.md global: 14.200 tokens estimados (siempre cargado) [ESTIMADO]
  - 1 servidor MCP con variables de entorno sin valor         [MEASURED]
```

> Nota (Fase 1.1): "Context Efficiency" fue renombrado a **"Context
> Configuration Score"** — ver `docs/CONTEXT-SCORING.md`. El resto de este
> plan conserva el nombre original solo como registro histórico de la
> decisión de diseño.

Cálculo de scores:
- **Security**: MEDIDO — función del `SecurityFinding[]` ponderado por
  severidad (directo del scanner).
- **Configuration**: MEDIDO para duplicados/refs rotas/JSON-TOML inválido;
  HEURÍSTICO para "posible redundancia" (ej. dos skills con descripciones muy
  similares — similitud de texto, no semántica real sin LLM).
- **Context Efficiency**: ESTIMADO — basado en §10, con desglose explícito
  de qué parte es medida (ALWAYS-LOADED) vs. estimada (ON-DEMAND POTENTIAL).
  Nunca se presenta un único número sin su desglose al lado.
- **Compatibility**: HEURÍSTICO — señales de config que un harness
  probablemente no entiende (ej. campo de frontmatter no reconocido).

Fase 1: **100% read-only**, sin auto-fix.

## 9. Conflict Engine

Detecta (todo posible con análisis estático, sin LLM en Fase 1 — ver
limitación abajo):
- Nombre de skill/agente duplicado entre fuentes (global vs. proyecto, o
  entre harnesses) — MEDIDO, comparación exacta de `name`.
- Skills con descripciones muy similares (similitud léxica, ej. Jaccard/
  embeddings locales simples) — HEURÍSTICO, se etiqueta como "posible
  solapamiento", nunca como "duplicado confirmado".
- Instrucciones contradictorias entre `CLAUDE.md` global y de proyecto —
  **limitado en Fase 1** a detección de patrones opuestos explícitos (ej.
  "nunca hagas X" en un archivo y "siempre haz X" en otro); detección
  semántica profunda de contradicción requiere LLM-as-judge y se marca como
  mejora de Fase 2/Pro, no se promete en Fase 1.
- MCP redundante (dos servidores que declaran el mismo propósito por nombre/
  descripción) — HEURÍSTICO.
- Hooks potencialmente incompatibles (mismo evento, comandos que se pisan) —
  MEDIDO si hay colisión exacta de evento; HEURÍSTICO si es "podrían
  interferir".
- Config global vs. proyecto que se contradice en permisos — MEDIDO.
- Configuración obsoleta/huérfana (hook que apunta a script que no existe,
  MCP server referenciado pero no declarado) — MEDIDO.

**Nada se elimina o modifica automáticamente en ninguna fase del MVP.**

## 10. Context Analyzer (rediseñado tras la investigación de §3)

Reporta, con etiqueta de método en cada línea:
- `INSTALLED` — conteo por tipo (MEDIDO)
- `DISCOVERABLE` — bytes/tokens estimados de `name+description` (MEDIDO el
  tamaño, ESTIMADO el conteo de tokens vía heurística ~4 chars/token)
- `ALWAYS-LOADED` — `CLAUDE.md`/`AGENTS.md`/`settings.json`, global +
  proyecto: tamaño real (MEDIDO) y tokens estimados (ESTIMADO); esta es la
  única categoría que se puede afirmar con confianza que pesa en *cada*
  sesión, según documentación oficial de progressive disclosure.
- `ON-DEMAND POTENTIAL` — tamaño del cuerpo completo de cada skill/agente,
  etiquetado explícitamente como "costo SI se activa, no confirmado que se
  active" (ESTIMADO)
- `LOADED` / `ACTIVE` (uso real en una sesión) — **UNKNOWN en Fase 1**,
  documentado como limitación técnica real (no un "próximamente" vago): un
  CLI offline no tiene acceso a telemetría de una sesión en curso. Queda
  como propuesta concreta de Fase 2/Pro: un hook opcional
  (`SessionEnd`/`PostToolUse`) que el usuario instala voluntariamente y que
  registra localmente qué skills/tools se invocaron de verdad, que `o2b
  doctor` pueda leer después. Sin ese hook, la categoría se reporta como
  `UNKNOWN`, nunca se rellena con una suposición.

## 11. O2B Optimize

Sistema de datos, no de código hardcodeado:

- **`detectors/`**: funciones puras que leen archivos de manifiesto del
  proyecto (`package.json`, `pubspec.yaml`, `requirements.txt`, `go.mod`,
  etc.) y devuelven tags de stack (`['flutter', 'supabase']`).
- **`profiles/*.profile.json`**: `{ id, matchers: {tags:[...]}, recommends:
  {mcpServers:[], skillTags:[], agentIds:[]}, onDemand: {...}, discourages:
  {ids:[], reason} }`.
- **`optimize` engine**: cruza `detectedTags` (de detectors) contra
  `profiles/`, y contra el `InventorySnapshot` real de `doctor`, para no
  recomendar algo que ya está instalado y sí marcar como "posiblemente
  innecesario" lo instalado que ningún profile activo reclama.

Salida: `RECOMMENDED` / `ON-DEMAND` / `POSSIBLY UNNECESSARY` / `REVIEW`, cada
ítem con la razón y el profile que lo generó. **Solo recomendación en Fase
1** — cualquier futuro `--apply` se implementa explícitamente lanzando
`NotImplementedError` hasta que exista de verdad, no como no-op silencioso.

## 12. Matriz competitiva (ECC vs. O2B MVP)

| Capacidad | ECC (OSS + Pro) | O2B MVP | Diferenciación real |
|---|---|---|---|
| Agentes/skills listos para usar | 68 agentes / 286 skills | 3 agentes / 8 skills | Ninguna — ECC gana, no se compite aquí |
| Escáner de seguridad de config de agente | AgentShield: 102 reglas, CLI+Action+App | 16 reglas propias | ECC gana en madurez hoy; O2B compite en cómo se integra el hallazgo en un diagnóstico de entorno completo, no en cantidad de reglas |
| Generación de contenido desde historial del repo (PR automation) | Sí, Pro ($19/asiento/mes) | No es el foco del MVP | Enfoques distintos: ECC genera, O2B audita/racionaliza lo existente |
| Inventario normalizado multi-harness | No documentado | Sí — núcleo del producto | Diferenciador real |
| Detección de conflictos/duplicados entre fuentes | No documentado | Sí, Conflict Engine dedicado | Diferenciador real |
| Análisis de costo de contexto (honesto, con niveles de confianza) | No documentado | Sí, con límites declarados (§10) | Diferenciador real, pero de alcance modesto en Fase 1 |
| Recomendación de stack (optimize) | No es función central documentada | Sí, basado en profiles extensibles | Diferenciador, valor depende de calidad de profiles al lanzar |
| Automatización vía GitHub App (PR triggers) | Sí, Pro | No en MVP | ECC gana hoy; posible roadmap Team/Enterprise |
| Multi-harness en el *contenido que instala* | Sí (adapta agentes/skills a varios harnesses) | Fase 1: solo lee Claude Code + Codex, no instala contenido cross-harness todavía | Ambición similar, ECC más adelantado en cobertura de instalación; O2B más adelantado en objetivo de auditoría cruzada (que ECC no hace) |

## 13. Separación comercial (diseño de límites, sin implementar SaaS)

`packages/core/src/edition.ts` — feature flags desde el día 1. Hoy,
`isEnabled()` solo habilita `community.*`. El resto existe como tipo, no
como código muerto a medio implementar.

## 14. Investigación obligatoria — estado

- Codex: AGENTS.md confirmado como estándar cross-tool (Agentic AI
  Foundation, 2026 Q2); `.codex/config.toml` y MCP confirmados
  (`[mcp_servers.<name>]`, `[mcp_servers.<name>.env]`, forma remota `url =`)
  — verificado con fixtures reales en Fase 1.1. Plugin system "enterprise"
  (marzo 2026) sin spec pública verificable — **no se construyó nada que
  dependa de él**.
- Claude Code Skills: progressive disclosure confirmado en documentación
  oficial.
- ECC pricing/features Pro: confirmado vía `ecc.tools/pricing` y GitHub App
  pública.

## 15-19. Ver detalle histórico

Las secciones de tests, fases, riesgos, criterios de aceptación originales
y la recomendación GO/CONDITIONAL GO/NO-GO se mantienen como estaban al
aprobar este plan (CONDITIONAL GO). **El estado real de cumplimiento de
Fase 1 y Fase 1.1 vive en `STATUS.md`, no en este documento** — este archivo
es la intención original; `STATUS.md` es la verdad actual.
