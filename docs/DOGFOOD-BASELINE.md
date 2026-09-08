# O2B DOGFOOD REPORT — Fase 2 (baseline, sin correcciones)

Fecha: 2026-09-08. Ejecutado por Claude Code (Sonnet 5) contra el entorno
real de Claude Code y Codex del usuario, en modo estrictamente read-only,
con autorización explícita del usuario para esta sesión únicamente.

**Este documento congela el comportamiento observado ANTES de cualquier
corrección.** No se modificó ningún archivo fuera de este repo. No se
ejecutó `--apply`. No se instaló/desinstaló/deshabilitó nada.

Snapshot crudo (sanitizado, sin rutas personales completas ni secretos):
[`docs/dogfood/snapshot-real-sanitized.json`](dogfood/snapshot-real-sanitized.json).

---

## ENVIRONMENT

- OS: `win32`, Node `v24.15.0`.
- Harnesses detectados por O2B: `claude-code` y `codex` — **correcto**,
  ambos existen realmente (`~/.claude/` y `~/.codex/` presentes).
- `rootDir` usado para las corridas: el propio repo O2B (`.`), con
  `homeDir` por defecto (`os.homedir()`, es decir el `~` real del
  usuario) — así es como se activó la lectura real de `~/.claude` y
  `~/.codex` sin pasar `--home`.

## INVENTORY

Comparación O2B (declarado) vs. estado real verificado manualmente
(lectura directa de `~/.claude/`, `~/.claude.json`, `~/.codex/`,
`~/.claude/plugins/`):

| Categoría | O2B reportó | Real verificado | Veredicto |
|---|---|---|---|
| Skills (Claude Code, global) | 14 | 14 (15 carpetas en `~/.claude/skills`, 1 sin `SKILL.md` — `learned/` — correctamente excluida) | **TRUE POSITIVE**, recall 100% |
| Agents (Claude Code, global/proyecto) | 0 | 0 en `~/.claude/agents/` (no existe el directorio) | **TRUE POSITIVE** (correcto no encontrar nada ahí) — pero ver FALSE NEGATIVES: agentes de plugins no se cuentan en absoluto |
| MCP servers (Claude Code) | 0 | 11 reales, registrados en `~/.claude.json` → `mcpServers` (supabase, n8n-mcp, lightrag-mcp, context7, github, sentry, playwright, vercel, hyperframes, blender, headroom) | **FALSE NEGATIVE masivo** — 0/11 recall |
| MCP servers (Codex) | 1 (`node_repl`) | 1 real en `~/.codex/config.toml` (`[mcp_servers.node_repl]`) | **TRUE POSITIVE** exacto |
| Hooks (Claude Code, settings.json global) | 2 (`SessionStart`, `PreToolUse`, ambos de Headroom) | 2 reales en `~/.claude/settings.json` | **TRUE POSITIVE** exacto |
| Hooks embebidos en plugins (ecc, headroom, claude-mem) | 0 | Al menos 3 plugins traen su propio `hooks/hooks.json` (`ecc`, `headroom`, `claude-mem`) — contenido no auditado en detalle, pero confirmado que existen y son distintos de los 2 ya detectados en `settings.json` | **FALSE NEGATIVE** — superficie de hooks reportada es parcial |
| Plugins | 0 | 4 reales, habilitados (`~/.claude/settings.json` → `enabledPlugins`: `claude-mem`, `ui-ux-pro-max`, `ecc`, `headroom`) | **FALSE NEGATIVE total** — 0/4 recall, y el campo `Plugin` del dominio nunca se puebla desde ningún adapter |
| Instruction sources (Claude Code) | 1 (`settings.json`, 7908 bytes / ~1974 tokens) | 2 reales: `settings.json` (igual) **+ `~/.claude/CLAUDE.md`, 7893 bytes** (el CLAUDE.md global real del usuario, nunca leído) | **FALSE NEGATIVE crítico** — el archivo más importante para el "Context Configuration Score" no se lee nunca |
| Instruction sources (Codex, `AGENTS.md`) | 0 | 0 (no existe `AGENTS.md` ni global ni en este proyecto) | **TRUE POSITIVE** (correcto no encontrar nada) |
| Plugins/agentes/skills (Codex) | 0, con warning explícito | Codex tiene 8 plugins habilitados en `config.toml` (`documents`, `spreadsheets`, `presentations`, `pdf`, `sites`, `visualize`, `template-creator`, `browser`) que O2B no reporta — pero lo declara explícitamente como decisión de diseño conservadora (ver `docs/CODEX-ADAPTER-NOTES.md`), no como "0 confirmado" | **Diseño honesto, no un bug** — pero sigue siendo un gap de cobertura real |

## HEADROOM DETECTION

Headroom se instaló como plugin justo antes de esta sesión. O2B lo
detectó **parcialmente y sin saber que es "Headroom"**, exactamente como
pedía el punto 4 (sin reglas específicas precargadas):

- **Detectado correctamente**: los 2 hooks que Headroom registra en
  `~/.claude/settings.json` (`SessionStart` y `PreToolUse`, ambos
  apuntando al binario `headroom.EXE init hook ensure ...`). O2B los
  reportó con su comando completo, sin riskFlags (correcto — el comando
  no coincide con ningún patrón peligroso de `riskFlagsForCommand`).
- **No detectado**: el servidor MCP `headroom` (`type: stdio, command:
  headroom.EXE mcp serve`) registrado en `~/.claude.json` — cae en el
  mismo agujero que los otros 10 MCP servers de Claude Code.
- **No detectado**: que `headroom` es un **plugin instalado y habilitado**
  (`~/.claude/plugins/installed_plugins.json` +
  `enabledPlugins.headroom@headroom-marketplace: true`).
- **No detectado**: el `hooks/hooks.json` propio que Headroom trae dentro
  de su paquete de plugin (además de los 2 hooks ya vistos en
  `settings.json` — no se auditó si son redundantes entre sí, pero es un
  ejemplo perfecto de "provider routing" invisible para O2B).
- **Provider routing**: `~/.claude/settings.json` → `env.ANTHROPIC_BASE_URL
  = "http://127.0.0.1:8787"` — esto es un indicio fuerte de que Headroom
  (u otra herramienta) está interceptando/enrutando las llamadas a la API
  de Anthropic vía un proxy local. **O2B no lo señala en ningún lado** —
  ni como hallazgo de seguridad, ni como nota de compatibilidad, aunque sí
  lee el archivo `settings.json` completo (el dato está ahí, solo que
  ninguna regla del scanner lo interpreta).

Conclusión Headroom: la detección **genérica** de hooks funcionó bien
(sin reglas hardcodeadas), pero la imagen es incompleta — falta el MCP
server, el plugin, el hook interno del plugin, y el cambio de
`ANTHROPIC_BASE_URL`, que es probablemente el cambio más importante que
introdujo Headroom.

## SECURITY

`report.security = []` (score 100/100, método `measured`).

**Esto es engañoso.** El motivo no es que el entorno esté limpio, sino
que el escáner de seguridad **solo analiza los archivos que el inventario
ya descubrió** (`packages/core/src/doctor/run.ts`,
`scannablePaths` = paths de agents/skills/hooks/mcpServers/instructionSources
recolectados). Como el inventario de MCP servers de Claude Code está
vacío (ver arriba) y `~/.claude/CLAUDE.md` nunca se agrega a la lista,
**`~/.claude.json` jamás se escanea**.

`~/.claude.json` contiene, en texto plano, dentro de la clave
`mcpServers` real del usuario:

- Un token de acceso de Supabase (`--access-token=...`), pasado como
  argumento CLI.
- Una API key de LightRAG (`--api-key ...`), pasado como argumento CLI.
- Un GitHub Personal Access Token de formato fine-grained
  (`github_pat_...`), pasado como variable de entorno
  (`GITHUB_PERSONAL_ACCESS_TOKEN`).

*(Ninguno de estos valores se reproduce en este documento ni en el
snapshot sanitizado — se confirmaron manualmente durante la inspección
read-only y se mencionan aquí solo por tipo/formato, nunca por valor.)*

Dos hallazgos de seguridad independientes, ambos **NO reportados**:

1. **Causa raíz — cobertura**: `~/.claude.json` nunca entra a
   `scannablePaths` porque el adapter de Claude Code solo busca MCP
   servers en `.mcp.json` (convención de proyecto), nunca en
   `~/.claude.json` (que es donde realmente vive la config de MCP
   servers a nivel de usuario en este entorno). Si se corrigiera solo
   este bug de inventario, el archivo pasaría a escanearse.
2. **Gap adicional en la regla, incluso si se escaneara**: la regla
   `mcp.env-secret-inlined`
   (`packages/scanner/src/rules/mcp.ts`) solo mira pares
   `"CLAVE_CON_KEY_TOKEN_O_SECRET": "valor"` dentro de bloques `env`.
   - El GitHub PAT (viaja por `env`) **sí sería detectado** si el
     archivo se escaneara.
   - El token de Supabase y la API key de LightRAG (viajan como
     argumentos `args: [...]`, no como `env`) **no serían detectados**
     ni siquiera si se arreglara el gap de cobertura — el patrón no
     inspecciona arrays de argumentos.
   - Adicionalmente, `secrets.github-token`
     (`packages/scanner/src/rules/secrets.ts`) usa el patrón
     `/gh[pousr]_[A-Za-z0-9]{30,}/`, que cubre los formatos clásicos
     (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`) pero **no** el formato
     fine-grained actual (`github_pat_...`) que es justamente el que usa
     este usuario. La regla genérica de `mcp.env-secret-inlined` sí lo
     cubriría por nombre de variable, pero la regla específica de GitHub
     no.

**Security score real observado: 100/100 — pero por ausencia de
escaneo, no por ausencia de riesgo.** Este es, con diferencia, el
hallazgo más importante de todo el dogfood.

## CONFLICTS

3 conflictos reportados, los 3 tipo `similar-description` entre skills:

| # | Par | Similitud declarada | Validación manual |
|---|---|---|---|
| 1 | `hunter-design` ↔ `inyeccionesadomiciliosantiago-design` | 96% | **TRUE POSITIVE** — mismo template de "Design system skill for X", texto casi idéntico salvo el nombre del sitio |
| 2 | `hunter-design` ↔ `tu-sitio-de-referencia-design` | 69% | **TRUE POSITIVE** — mismo template, versión recortada (falta el párrafo "ultra-mode") |
| 3 | `inyeccionesadomiciliosantiago-design` ↔ `tu-sitio-de-referencia-design` | 69% | **TRUE POSITIVE** — mismo caso |

**Precisión de conflictos: 3/3 = 100%** sobre lo que sí analiza. Todos
severidad `low`, confianza `heuristic` — clasificación de severidad
razonable (son plantillas repetidas, no un conflicto funcional grave).

**Conflictos reales que O2B NO detectó** (false negatives, encontrados
en la inspección manual):

- El `ANTHROPIC_BASE_URL` local (`http://127.0.0.1:8787`) definido en
  `settings.json` interactuando con **4 plugins habilitados
  simultáneamente** (`claude-mem`, `ui-ux-pro-max`, `ecc`, `headroom`) —
  ninguno de estos plugins se detecta, así que no hay base para
  detectar interacción/orden/conflicto entre ellos.
- Redundancia potencial entre los **2 hooks de Headroom en
  `settings.json`** (`SessionStart` + `PreToolUse`, mismo comando,
  mismo marcador `headroom-init-claude`) y el `hooks/hooks.json` propio
  del plugin Headroom — no evaluable porque O2B no lee ese segundo
  archivo.
- No hay ningún chequeo de la familia `hyperframes-*` (8 skills) para
  confirmar que la partición temática es intencional y no
  accidentalmente redundante — en este caso la inspección manual
  confirma que **no es un conflicto** (cada skill cubre un dominio
  distinto: audio, keyframes, cli, core, creative, registry, animation,
  índice), así que la ausencia de alerta aquí es correcta (true
  negative), no un gap.

## CONTEXT

Reportado por O2B:

- **ALWAYS-LOADED**: 7908 bytes / ~1974 tokens estimados — declarado
  como `settings.json` global + proyecto únicamente.
- **DISCOVERABLE**: 8012 bytes / ~2003 tokens (índice nombre+descripción
  de las 14 skills).
- **ON-DEMAND POTENTIAL**: 219 927 bytes / ~54 982 tokens (cuerpo
  completo de agents+skills si se activaran).
- **LOADED/ACTIVE**: `unknown`, con nota explícita de que un CLI offline
  no tiene telemetría de sesión — **correcto, no se inventó un número**.

**Real verificado**: el ALWAYS-LOADED reportado está **subestimado en
~7893 bytes / ~1973 tokens** porque excluye `~/.claude/CLAUDE.md` (el
CLAUDE.md global real del usuario, que sí se carga en cada sesión). El
ALWAYS-LOADED real es, como mínimo, el doble de lo que O2B reporta
(~15 800 bytes / ~3950 tokens en vez de ~1974). Esto es consecuencia
directa del bug de ruta descrito abajo (BUGS DISCOVERED), no de una
limitación de metodología.

La metodología en sí (measured para bytes en disco, estimated para
tokens vía heurística ~4 caracteres/token, unknown honesto para
LOADED/ACTIVE) es sólida y transparente — el problema es la cobertura
de archivos, no el cálculo.

## OPTIMIZE

Ejecutado contra el propio repo O2B (`node`, `vitest` detectados vía
`package.json` raíz).

```
detectedTags: ["vitest", "node"]
matchedProfiles: []
recommendations: []
```

Solo existe **un profile** en `profiles/` (`node-web.profile.json`,
requiere `express`/`react`/`vite`). Como O2B (el proyecto) no usa
ninguno de esos tres, **correctamente no matcheó ningún profile y no
emitió ninguna recomendación** — comportamiento correcto (true
negative, sin falsos positivos).

**Limitación real para esta prueba de valor**: con un solo profile en
el catálogo y ningún proyecto disponible en este entorno que matcheara
(`express`/`react`/`vite`), **no fue posible ejercitar la
diferenciación RECOMMENDED / ON-DEMAND / POSSIBLY UNNECESSARY /
REVIEW con datos reales** en esta sesión. Se validó la lógica leyendo
el código (`packages/core/src/optimize/run.ts` y `detectors.ts`):

- La lógica es coherente: RECOMMENDED sale de `profile.recommends.mcpServers`
  no instalados; POSSIBLY UNNECESSARY (`kind: 'review'`) solo se
  calcula **si al menos un profile matcheó**, y compara servidores
  instalados contra la unión de `recommends`+`onDemand` de los
  profiles matcheados.
- Detección de stack (`detectStackTags`) **solo lee el `package.json`
  de la raíz del `rootDir`**, no los de sub-paquetes en un monorepo con
  `workspaces`. Para un proyecto real con dependencias declaradas en
  paquetes internos (como el propio O2B, que sí tiene `vitest` en
  paquetes internos pero se detectó igual porque también está en el
  root), esto podría producir falsos negativos de stack en monorepos
  donde el root `package.json` no declara las dependencias reales.
  **No confirmado con un caso real en esta sesión — clasificar como
  riesgo teórico, no como bug verificado.**

## TRUE POSITIVES

1. Harnesses `claude-code` + `codex` — ambos correctos.
2. Las 14 skills globales de Claude Code — recall y precisión 100%,
   incluida la exclusión correcta de `learned/` (sin `SKILL.md`).
3. MCP server `node_repl` de Codex — parseo TOML exacto, incluye todas
   las env var *names* (nunca valores).
4. Los 2 hooks de Headroom en `settings.json` — comando completo,
   riskFlags correctamente vacíos.
5. Los 3 conflictos de "similar-description" entre skills de diseño —
   los 3 son duplicados reales de plantilla.
6. `Optimize` no forzó ninguna recomendación falsa cuando el stack no
   matcheaba ningún profile (comportamiento conservador correcto).
7. El warning explícito y la decisión de no inventar agentes/skills
   para Codex (`docs/CODEX-ADAPTER-NOTES.md`) — honestidad metodológica
   verificada contra la config real de Codex.
8. `LOADED/ACTIVE = unknown` con nota explicativa — no se infló el
   score de contexto con una suposición.

## FALSE POSITIVES

Ninguno confirmado en esta sesión. No se observó ningún finding de
seguridad, conflicto o recomendación de Optimize que fuera incorrecto
al validarlo manualmente. (Los 3 conflictos y los hallazgos de
inventario positivos se verificaron todos como correctos.)

## FALSE NEGATIVES

Por severidad de impacto, de mayor a menor:

1. **Crítico — Security**: 3 secretos reales en texto plano en
   `~/.claude.json` (Supabase token, LightRAG API key, GitHub PAT
   fine-grained) nunca escaneados, por la causa raíz de cobertura de
   MCP servers explicada arriba. Score de seguridad 100/100 con riesgo
   real presente.
2. **Crítico — Inventory/MCP**: 11 de 11 MCP servers reales de Claude
   Code no detectados (`supabase`, `n8n-mcp`, `lightrag-mcp`,
   `context7`, `github`, `sentry`, `playwright`, `vercel`,
   `hyperframes`, `blender`, `headroom`). Recall 0%.
3. **Crítico — Inventory/Plugins**: 4 de 4 plugins reales no
   detectados (`claude-mem`, `ui-ux-pro-max`, `ecc`, `headroom`), y el
   campo `plugins` del dominio nunca se puebla desde ningún adapter —
   no es un bug de parseo, es una función no implementada.
4. **Alto — Context/Instruction sources**: `~/.claude/CLAUDE.md` (el
   CLAUDE.md global real del usuario, 7893 bytes) nunca se lee ni se
   analiza — bug de ruta confirmado (ver BUGS DISCOVERED). Esto además
   bloqueó por completo el punto 9 del encargo (análisis del Super
   Prompt Maestro): **no se pudo ejecutar ese análisis porque O2B ni
   siquiera encontró el archivo.**
5. **Medio — Hooks de plugins**: hooks embebidos en `hooks/hooks.json`
   dentro de al menos 3 plugins (`ecc`, `headroom`, `claude-mem`) no se
   cuentan — solo se leen hooks declarados directamente en
   `settings.json`.
6. **Medio — Provider routing**: `ANTHROPIC_BASE_URL` apuntando a un
   proxy local no se señala en ningún lado (ni compatibilidad, ni
   seguridad, ni conflictos), pese a que el archivo que lo contiene sí
   se lee completo.
7. **Bajo — Codex plugins**: 8 plugins de Codex habilitados en
   `config.toml` no se reportan — pero esto es una decisión de diseño
   documentada y honesta, no un bug oculto.

## LIMITATIONS

- El catálogo de `profiles/` tiene un solo profile
  (`node-web.profile.json`), insuficiente para ejercitar
  `RECOMMENDED`/`ON-DEMAND`/`POSSIBLY UNNECESSARY` con datos reales en
  esta sesión — la lógica se validó leyendo código, no con una corrida
  real que matcheara.
- `detectStackTags` solo lee el `package.json` de la raíz del
  `rootDir` pasado, no de sub-paquetes en monorepos — riesgo teórico
  de falso negativo de stack no confirmado con un caso real.
- El análisis del "Super Prompt Maestro" (punto 9 del encargo) **no
  pudo ejecutarse** porque O2B no encontró `~/.claude/CLAUDE.md` — no
  es una limitación de diseño sino consecuencia directa del bug de
  ruta (ver BUGS DISCOVERED).
- Este dogfood se ejecutó contra `rootDir = .` (el propio repo O2B) por
  ser un proyecto "apropiado" ya disponible sin necesidad de explorar
  otras carpetas personales del usuario más allá de lo estrictamente
  necesario para inspeccionar `~/.claude` y `~/.codex`. No se buscó
  activamente un segundo proyecto con `react`/`express`/`vite` en el
  disco del usuario para no leer carpetas personales sin necesidad
  clara — esto limitó la validación de Optimize (ver arriba) pero se
  consideró la opción más respetuosa de la privacidad.

## BUGS DISCOVERED

Todos verificados leyendo el código fuente (`packages/core/src/adapters/
claude-code/index.ts`) contra el estado real del filesystem. **No se
corrigió nada — solo se documenta.**

1. **`collectInstructionSource(path.join(homeDir, 'CLAUDE.md'), ...)`
   busca `~/CLAUDE.md`, no `~/.claude/CLAUDE.md`.**
   El CLAUDE.md global real de Claude Code vive en `~/.claude/CLAUDE.md`
   (confirmado: existe, 7893 bytes). `~/CLAUDE.md` (raíz del home) no
   existe. Resultado: el CLAUDE.md global nunca se detecta, nunca se
   escanea por seguridad, y nunca cuenta en el Context Configuration
   Score — pese a ser, en la práctica, el archivo de instrucciones más
   importante del entorno. Archivo: `packages/core/src/adapters/
   claude-code/index.ts:230`.

2. **`collectMcpServers` solo lee `.mcp.json` (convención de proyecto),
   nunca `~/.claude.json` → `mcpServers`.**
   En este entorno real, todos los MCP servers de Claude Code (11 de
   ellos) están registrados en `~/.claude.json`, no en un `.mcp.json`.
   Ningún `.mcp.json` existe ni en `~/.claude/` ni en el proyecto.
   Resultado: inventario de MCP servers de Claude Code con recall 0%
   en este entorno, y efecto en cascada sobre Security (ver arriba).
   Archivos: `packages/core/src/adapters/claude-code/index.ts:146-167,
   223-227`.

3. **El campo `plugins` nunca se puebla para Claude Code.**
   `collectHooksAndPlugins` (nombre de la función sugiere que sí lo
   hace) solo construye `hooks`; devuelve `mcpServers: []` sin tocarlo
   y no existe ninguna otra función que lea
   `~/.claude/plugins/installed_plugins.json` o
   `~/.claude/settings.json` → `enabledPlugins`. El tipo `Plugin` existe
   en el dominio (`domain/types.ts`) pero ningún adapter lo llena nunca
   — es una función anunciada por el nombre de la función y el modelo
   de dominio, pero no implementada. Archivo: `packages/core/src/
   adapters/claude-code/index.ts:112-144`.

4. **Regla `secrets.github-token` no cubre el formato fine-grained
   actual (`github_pat_...`)**, solo los prefijos clásicos
   (`ghp_/gho_/ghu_/ghs_/ghr_`). Archivo:
   `packages/scanner/src/rules/secrets.ts:59-65`.

5. **Regla `mcp.env-secret-inlined` no inspecciona `args: [...]`**, solo
   pares clave/valor dentro de bloques tipo `env`. Un secreto pasado
   como argumento de línea de comandos (patrón real y común, visto dos
   veces en este mismo entorno: Supabase y LightRAG) no sería detectado
   ni corrigiendo el bug #2. Archivo:
   `packages/scanner/src/rules/mcp.ts:26-42`.

## PRODUCT INSIGHTS

- **La honestidad metodológica del proyecto es real y se sostuvo bajo
  prueba**: scores con `method` explícito (`measured`/`estimated`/
  `heuristic`/`unknown`), `LOADED/ACTIVE` nunca inventado, warnings
  explícitos cuando el CodexAdapter decide no reportar algo. Esto no es
  marketing — se verificó contra el comportamiento real.
- **Pero la promesa central del producto — "sé qué hay realmente en tu
  entorno de IA" — está rota en la práctica para el caso de uso más
  importante (MCP servers y plugins de Claude Code) en un entorno
  real.** Un usuario que instale MCP servers vía el flujo estándar de
  Claude Code (que persiste en `~/.claude.json`, no en `.mcp.json`)
  obtiene un reporte que dice "0 MCP servers" cuando tiene 11.
- **El bug de MCP servers no es cosmético: tiene efecto en cascada
  sobre Security** (el escáner nunca llega a mirar el archivo con los
  secretos reales) y sobre Optimize (sin inventario de MCP servers
  reales, "possibly unnecessary" y "on-demand" nunca podrían detectar
  nada útil en este entorno, aunque hubiera más profiles).
- **El bug de ruta de CLAUDE.md es el más fácil de arreglar y el de
  mayor impacto en Context**: es una sola línea (`homeDir` →
  `path.join(homeDir, '.claude')`), y desbloquea directamente el punto
  9 del encargo original (análisis del propio CLAUDE.md/Super Prompt
  Maestro), que hoy no se puede ejecutar en absoluto.
- **Los tres módulos que sí funcionaron bien** (skills, hooks de
  settings.json, conflictos de descripción similar) comparten un rasgo:
  leen exactamente el archivo/directorio que documentan leer, sin capas
  adicionales (plugins, `~/.claude.json`, args de CLI). El patrón del
  bug es consistente: **O2B modela bien las convenciones "de proyecto"
  de Claude Code, pero no modela las convenciones "de usuario/CLI"
  (`~/.claude.json`, plugins instalados) que en la práctica son donde
  vive la mayoría de la configuración real de un usuario avanzado.**

---

## PRUEBA DE VALOR

**A. ¿O2B encontró algo útil que no era evidente mirando Claude Code
normalmente?**
Sí, parcialmente. Los 3 conflictos de skills duplicadas (mismo template
de "Design system skill for X" repetido 3 veces con nombres de sitio
distintos) no son evidentes navegando manualmente 14 carpetas de
skills, y O2B los encontró con precisión perfecta. También fue útil como
confirmación estructurada de que los hooks de Headroom están donde se
espera. Pero el hallazgo más valioso de esta sesión completa — los 3
secretos en texto plano en `~/.claude.json` — lo encontró la inspección
manual, **no O2B**, precisamente porque O2B nunca llegó a mirar ese
archivo.

**B. ¿O2B detectó correctamente un entorno complejo sin conocerlo
previamente?**
Parcialmente. Detectó bien la capa "harness + archivos de proyecto"
(dos harnesses, 14 skills, hooks de settings.json, un MCP server de
Codex). No detectó la capa "usuario/plugins" que en este entorno es
donde vive la mayor parte de la complejidad real: 4 plugins, 11 MCP
servers de Claude Code, hooks embebidos en plugins, y el
`ANTHROPIC_BASE_URL` personalizado. Un entorno con 4 plugins y 11 MCP
servers reales se reportó como si tuviera 0 y 0.

**C. ¿Qué resultados fueron ruido?**
Ninguno de los resultados producidos fue ruido en sí — todo lo que O2B
reportó (14 skills, 2 hooks, 1 MCP de Codex, 3 conflictos) se verificó
como correcto. El "ruido" en este dogfood no vino de falsos positivos,
sino de **scores altos que transmiten falsa confianza** (Security
100/100, Configuration 88/100 con solo 3 hallazgos heurísticos triviales)
cuando el motivo real de esos números altos es cobertura incompleta, no
ausencia de problemas.

**D. ¿Qué cosas importantes no detectó?**
Ver FALSE NEGATIVES arriba. En orden de importancia: secretos reales en
`~/.claude.json`, 11 MCP servers de Claude Code, 4 plugins instalados,
el CLAUDE.md global real del usuario (y con él, la imposibilidad de
ejecutar el punto 9 del encargo), hooks embebidos en plugins, y el
`ANTHROPIC_BASE_URL` de provider routing.

**E. Si O2B fuera un producto ajeno, ¿este diagnóstico justificaría
instalarlo?**
No en su estado actual, para un usuario con un setup como este
(plugins + MCP servers registrados vía `claude mcp add` /
`~/.claude.json`, que es el flujo estándar y más común). Un producto
que se presenta como "doctor" de seguridad y contexto, y que da
Security 100/100 con 3 secretos reales sin detectar y "0 MCP servers"
cuando hay 11, generaría más falsa confianza que valor si se instalara
tal cual hoy. La arquitectura (adapters, scanner con reglas
declarativas, scores con método explícito) es sólida y el gap es
localizado y corregible — pero el estado actual no sostiene la promesa
central del producto en el entorno de usuario más representativo
(alguien con plugins y MCP servers instalados vía los flujos estándar
de Claude Code).

**F. ¿Existe suficiente valor para continuar hacia una beta pública?**
Sí, condicionalmente. El diseño (privacy-first verificado de verdad,
scores con método declarado, honestidad sobre lo que no se sabe,
detección genérica de Headroom sin reglas hardcodeadas) demuestra que
el enfoque es correcto y que los bugs encontrados son de cobertura, no
de arquitectura — los 3 bugs críticos (#1 CLAUDE.md, #2 MCP servers,
#3 plugins) son localizados, tienen ubicación exacta en el código, y no
requieren rediseño. Pero **no debería salir a beta pública en el estado
actual**: para casi cualquier usuario con plugins o con MCP servers
registrados vía el flujo estándar de Claude Code, el reporte de hoy
subestima drásticamente lo que hay instalado y da una falsa sensación
de seguridad. La condición para continuar es cerrar al menos los bugs
#1 y #2 (y idealmente #3) antes de cualquier exposición externa.

---

## PRODUCT VALIDATION: **MODERATE**

La arquitectura, la honestidad metodológica y la precisión de lo que sí
se detecta (100% en skills, hooks de settings.json y conflictos) son
fuertes. Pero el recall en las dos categorías que más importan para la
promesa del producto (MCP servers y plugins de Claude Code) fue 0% en
este entorno real, con efecto en cascada sobre Security. No es "STRONG"
porque el gap no es marginal — es la mayoría de la superficie real de
un usuario con plugins. No es "WEAK" ni "FAILED" porque los bugs son
puntuales, ya localizados con precisión, y no cuestionan el diseño de
fondo.

## RECOMMENDATION: **CONDITIONAL GO**

Continuar el desarrollo, pero **no avanzar a beta pública ni a Fase 2
de auto-corrección (`--apply`) hasta corregir, como mínimo**:

1. Ruta de `CLAUDE.md` global (`~/.claude/CLAUDE.md`, no `~/CLAUDE.md`).
2. Lectura de MCP servers desde `~/.claude.json` → `mcpServers` además
   de (o en vez de) `.mcp.json`.
3. Implementación real de detección de plugins
   (`~/.claude/plugins/installed_plugins.json` +
   `settings.json` → `enabledPlugins`).

Después de esas tres correcciones, repetir este mismo dogfood (mismo
entorno real, mismo método, mismos criterios TP/FP/FN) para medir la
mejora con el mismo rasero — no ajustar la metodología para que el
resultado se vea mejor.
