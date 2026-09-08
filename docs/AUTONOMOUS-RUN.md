# O2B — AUTONOMOUS-RUN.md

Registro del desarrollo autónomo de O2B (fases 3+), autorizado por el
usuario el 2026-09-08 para trabajar sin aprobación entre fases mientras
está ausente.

Regla #1 respetada: `docs/DOGFOOD-BASELINE.md` se preserva sin alterar
retroactivamente. Cualquier comparación post-hardening va en un
documento nuevo (`docs/DOGFOOD-POST-HARDENING.md`), nunca sobreescribiendo
el baseline.

---

## FASE 3 — Hardening post-dogfood

**Objetivo**: corregir, con evidencia (fixtures + tests), los bugs
confirmados en `docs/DOGFOOD-BASELINE.md`, priorizados P0 > P1 > P2 > P3 > P4.

### Verificación previa a corregir (documentación oficial)

Antes de tocar código, se verificaron contra `code.claude.com/docs`
(fetch en vivo, 2026-09-08) las rutas reales de Claude Code:

- `~/.claude/CLAUDE.md` = user-scope CLAUDE.md — **confirmado oficial**
  (`docs/en/memory`).
- `./CLAUDE.md` o `./.claude/CLAUDE.md` = project-scope — **confirmado
  oficial**; O2B ya leía `./CLAUDE.md` correctamente, faltaba la
  variante `./.claude/CLAUDE.md`.
- `.mcp.json` en la **raíz del proyecto** (no dentro de `.claude/`) =
  project-scope MCP servers — **confirmado oficial** (`docs/en/mcp`).
- `~/.claude.json` = user-scope y local-scope MCP servers — **confirmado
  oficial** (`docs/en/mcp`) + **confirmado empíricamente** en Fase 2
  (estructura real inspeccionada: clave `mcpServers` de nivel superior).
- `.claude/rules/*.md` = mecanismo de instrucciones adicional (rules) —
  **confirmado oficial**, no modelado por O2B todavía (documentado como
  limitación conocida, no se implementa en esta fase por alcance).

### Cambios (P0/P1) — tabla de seguimiento

| # | Bug (baseline) | Prioridad | Fix | Estado |
|---|---|---|---|---|
| 1 | `CLAUDE.md` global buscado en `~/CLAUDE.md` en vez de `~/.claude/CLAUDE.md` | P1 | Corregir ruta global; leer también `<project>/.claude/CLAUDE.md` como alternativa documentada | **hecho** |
| 2 | MCP servers de Claude Code: solo `.mcp.json`, nunca `~/.claude.json`; y `.mcp.json` de proyecto en ruta equivocada | P0 | Leer `~/.claude.json` (user-scope) + corregir ruta de proyecto a `<root>/.mcp.json` | **hecho** |
| 3 | `plugins` nunca se puebla | P1 | Leer `plugins/installed_plugins.json` + `settings.json.enabledPlugins`, derivar `providedCapabilities` del filesystem del plugin | **hecho** |
| 4 | `secrets.github-token` no cubre `github_pat_...` | P0 | Regex ampliado (clásico + fine-grained) | **hecho** |
| 5 | `mcp.env-secret-inlined` no inspecciona `args: [...]` | P0 | Nueva regla `mcp.arg-secret-inlined` (heurística, dos patrones: `--flag=value` y `--flag`,`value` adyacentes) | **hecho** |

Archivos tocados: `packages/core/src/adapters/claude-code/index.ts`,
`packages/scanner/src/rules/secrets.ts`,
`packages/scanner/src/rules/mcp.ts`. Fixtures nuevos/movidos:
`packages/core/tests/fixtures/claude-home/**` (nuevo),
`claude-project/.mcp.json` (nuevo, antes no existía),
`optimize-project/.mcp.json` y `privacy-project/.mcp.json` (movidos desde
`.claude/.mcp.json` a la raíz, siguiendo la convención real confirmada),
`demo-environment/.mcp.json` y `demo-environment/fake-home/.claude/CLAUDE.md`
(golden demo, mismo movimiento).

**Tests**: 68→79 tests en `@o2b/core` (10 nuevos en
`claude-code.test.ts`: CLAUDE.md global, MCP user-scope, plugins,
`.mcp.json` project-scope; 1 nuevo en `compare.test.ts`), 35→38 en
`@o2b/scanner` (3 nuevos: 1 GitHub PAT fine-grained, 2
`mcp.arg-secret-inlined`). Total workspace core+scanner: 103→117,
todos PASS. Coverage core 92.19% stmts/78.41% branch (antes 91.9/78.77
— se mantiene); scanner 99.13% stmts/93.75% branch (antes 97.24/89.65 —
mejora). Golden demo re-ejecutado manualmente contra
`demo-environment/` tras mover sus fixtures — `doctor` y `optimize`
producen los mismos hallazgos documentados en `docs/GOLDEN-DEMO.md`
(ahora encontrados en la ruta correcta).

**Dogfood post-hardening**: re-ejecutado read-only contra el mismo
entorno real de Fase 2. Resultado completo y comparación cuantitativa en
`docs/DOGFOOD-POST-HARDENING.md`. Resumen: MCP servers de Claude Code
0→12/12, plugins 0→4/4, CLAUDE.md global detectado, 6 hallazgos de
seguridad reales ahora visibles (antes 0), security score 100→14
(refleja el riesgo real, no una regresión). `docs/DOGFOOD-BASELINE.md`
permanece sin alterar.

**Limitaciones documentadas, no cerradas en esta fase** (para no
sobre-prometer): `~/.claude.json` → `projects.<path>.mcpServers`
(MCP local-scope) no se lee; hooks embebidos en `hooks/hooks.json` de
cada plugin no se cuentan; `ANTHROPIC_BASE_URL` (provider routing) no
se señala; `.claude/rules/*.md` (confirmado en docs oficiales durante
esta fase) no se modela.

**FASE 3: COMPLETA** (P0/P1 del baseline cerrados y verificados con
evidencia; limitaciones restantes documentadas explícitamente, no
ocultas).

---

## FASE 4 — Productización del CLI

**Objetivo**: hacer del CLI una experiencia usable por terceros:
comandos `inventory`/`scan` reales (antes no existían — `npm run scan`
estaba roto, apuntaba a un comando inexistente), flags `--quiet`/
`--strict`/`--no-color`, manejo de errores sin stack traces para el
usuario normal, `--help` completo.

**Cambios**:
- `packages/cli/src/output.ts` (nuevo) — helper de color ANSI sin
  dependencias nuevas, respeta `NO_COLOR` y no-TTY.
- `packages/cli/src/commands/scan.ts` (nuevo) — vista solo-seguridad de
  `doctor`, mismo pipeline, sin lógica de detección duplicada. Corrige
  el script `npm run scan` que antes fallaba (comando `scan`
  inexistente en el switch de `cli.ts`).
- `packages/cli/src/commands/inventory.ts` (nuevo) — vista solo-
  inventario de `doctor`.
- `packages/cli/src/commands/doctor.ts` — agrega `--quiet`, `--strict`,
  `--no-color`; severidades coloreadas.
- `packages/cli/src/exit-codes.ts` — `exitCodeForFindings` acepta
  `strict` opcional (retrocompatible).
- `packages/cli/src/cli.ts` — enruta los comandos nuevos, `try/catch`
  global: nunca imprime `err.stack` salvo `--verbose`; `--help`
  documenta todos los comandos/flags y el contrato de exit codes.

**No se agregó** `--json` a los comandos que ya lo tenían (sin cambio),
ni ninguna dependencia nueva (color ANSI implementado a mano, ~30
líneas, no justifica `chalk`/`picocolors`).

**Tests**: 5→9 en `@o2b/cli` (nuevos: `--strict`, `scan` solo-seguridad,
`inventory` sin filtrar por seguridad, error sin stack trace). Todos
PASS, spawneando el binario real (no solo llamando las funciones).

**Verificado manualmente** (smoke test real contra `demo-environment/`):
`o2b inventory`, `o2b scan`, `o2b snapshot --out`, `o2b diff` — los 4
producen salida correcta y exit codes coherentes.

**FASE 4: COMPLETA.**

---

## FASE 9 — Snapshot & Diff (adelantada, building on Fase 4)

`compareSnapshots` ya existía en `@o2b/core` desde antes de esta sesión
(Fase 1), pero no cubría `plugins`/`instructionSources` y no tenía
ningún comando de CLI que lo expusiera. Esta fase cierra ambos gaps:

- `domain/types.ts` — `CountDelta.metric` ahora incluye `plugins` e
  `instructionSources`.
- `report/compare.ts` — `compareSnapshots` calcula esos 2 deltas
  nuevos.
- `packages/cli/src/commands/snapshot.ts` (nuevo) — `o2b snapshot
  [rootDir] [--out <file>]`, guarda el `DoctorReport` completo a JSON.
  Única escritura de archivo de todo el CLI, y es un archivo que el
  propio usuario pide explícitamente (por defecto
  `./o2b-snapshot.json`) — no toca `~/.claude`/`~/.codex`.
- `packages/cli/src/commands/diff.ts` (nuevo) — `o2b diff <before.json>
  <after.json>`, envuelve `compareSnapshots` sobre 2 archivos locales.

No hay almacenamiento de historial (eso es explícitamente Pro, ver
Fase 17) — `snapshot`/`diff` son solo lectura/escritura de archivos que
el usuario controla y nombra.

**Tests**: 1 nuevo en `compare.test.ts` (deltas de plugins/
instructionSources) + los 2 de `scan`/`inventory` ya contados arriba
ejercitan indirectamente el mismo pipeline. Verificado manualmente:
`snapshot` → `snapshot` → `diff` produce deltas en cero cuando nada
cambió (caso base correcto).

**FASE 9: COMPLETA** (alcance mínimo: snapshot/diff funcionales y
testeados; NO incluye historial persistente ni UI — eso es Pro).

---

## FASE 10 — Security hardening (parcial)

- `npm audit`: **0 vulnerabilidades en dependencias de producción**. 6
  vulnerabilidades solo en `devDependencies` (el dev-server interno de
  `esbuild`/`vite`, usado transitivamente por `vitest`) — moderate/high/
  critical pero acotadas al servidor de desarrollo local, no a nada que
  se distribuya o corra contra el entorno de un usuario. No se forzó
  `npm audit fix --force` porque implica un major bump de `vitest`
  (breaking) sin verificar — documentado como seguimiento explícito en
  `SECURITY.md`, no ocultado.
- Auto-escaneo del propio repo (`git ls-files` + grep de patrones de
  secretos + `v.valdes`/`vvald`/`C:\Users`) — **0 coincidencias reales**,
  ver Fase 14 abajo (mismo trabajo, gate de beta).
- Confirmado de nuevo (grep) que `packages/core/src` sigue sin ninguna
  llamada de escritura (`writeFile`/`unlink`/`rename`/`mkdir`) contra el
  entorno escaneado — la única escritura de todo el CLI es
  `o2b snapshot`, y escribe únicamente el archivo que el usuario nombra.
- **NO se hizo en esta pasada** (por presupuesto de tiempo, no por
  decisión de omitirlo indefinidamente): fuzz/property testing de los
  parsers TOML/frontmatter/JSON contra inputs malformados grandes,
  symlinks, archivos binarios, ReDoS en las regex del scanner (todas son
  simples y acotadas por `{n,}` con clases de caracteres razonables,
  pero no se verificó formalmente con un fuzzer), inyección de escape de
  terminal en `evidence`/nombres de archivo. **Marcado como PARCIAL, no
  COMPLETA.**

---

## FASE 11 — Performance (NO ALCANZADA)

No se generaron entornos sintéticos de 100/500/1000 skills ni se
midieron runtime/memoria en esta sesión — presupuesto de tiempo se
priorizó hacia hardening real (Fase 3, con impacto de seguridad
confirmado) y productización del CLI (Fase 4/9) sobre benchmarking. El
motor de recolección es `Promise.all` sobre lecturas de archivo
individuales sin ningún cache ni límite de concurrencia explícito — es
una hipótesis razonable de dónde podría degradar con miles de archivos,
pero **no medida, no confirmada**. Queda como próximo paso explícito.

## FASE 12 — Golden demo 2.0 (NO ALCANZADA como rediseño; SÍ verificada)

El golden demo existente (`demo-environment/`) se **verificó y se
mantuvo funcional** tras los fixes de Fase 3 (ver Fase 3 arriba — rutas
de `.mcp.json`/`CLAUDE.md` movidas, mismos 9 problemas plantados
documentados en `docs/GOLDEN-DEMO.md` siguen reproduciéndose). No se
hizo un rediseño de UX del demo ni se agregó guía paso a paso adicional
— el catálogo y el README ya explican qué demuestra cada problema.

## FASE 5 — Soporte multi-harness más profundo (NO ALCANZADA)

Claude Code y Codex se fortalecieron indirectamente en Fase 3 (ver
arriba). **No se investigó** viabilidad de adapters para Cursor/Gemini
CLI/OpenCode en esta sesión — requeriría investigación de documentación
oficial de cada uno antes de siquiera decidir si califican (los 4
requisitos que el propio encargo exige: documentación suficiente,
config detectable, aporte real, fixtures fiables). Sin esa investigación
no hay base para implementar ni para descartar con evidencia — se deja
explícitamente como `NOT IMPLEMENTED — pending verified specification
research`, no como un "no" definitivo.

## FASE 6 / 7 — Doctor 2 / Optimize 2 (PARCIAL)

Gran parte del contenido sustantivo de estas fases ya se ejecutó como
parte de la Fase 3 (MCP inventory, plugin detection, provenance/
confidence en cada regla nueva) y Fase 9 (diff). Lo que **no** se hizo:
ampliar `profiles/` con más stacks (Next.js, Python, Flutter/Dart,
Supabase, Docker) — el encargo pide investigar antes de asumir que una
herramienta debe activarse solo porque aparece un framework, y esa
investigación no se ejecutó en esta sesión por presupuesto de tiempo.
Queda como el paso de mayor valor pendiente para que `optimize` deje de
depender de un solo profile.

## FASE 8 — Session observability spike (NO ALCANZADA)

No se investigó viabilidad de hooks/eventos oficiales de Claude Code
para telemetría LOCAL de LOADED/ACTIVE/USED en esta sesión. Es,
explícitamente, el gap que hace que `LOADED/ACTIVE` siga siendo
`UNKNOWN` en todo reporte de Doctor — perfectamente honesto (nunca se
rellenó con una suposición), pero no investigado a fondo todavía.

---

## FASE 13 — Documentación beta (COMPLETA)

`README.md` actualizado (estado real post-dogfood, comandos nuevos,
scope de MCP de Claude Code corregido, limitaciones actualizadas).
Nuevos: `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`. README ya
distinguía AVAILABLE NOW / roadmap explícitamente marcado "not built" —
se mantuvo esa disciplina en todos los documentos nuevos.

## FASE 14 — Beta readiness (gate ejecutado, resultado: CONDITIONAL)

Búsqueda ejecutada sobre `git ls-files` (solo archivos versionados, no
`node_modules`/`coverage`): `v.valdes`, `vvald`, `C:\Users`, patrones de
token/API-key reales, emails. **Resultado: 0 coincidencias reales** —
las únicas coincidencias de patrones "tipo secreto" son fixtures de test
explícitamente sintéticas (`FAKE`, `PRIVACYTESTSECRET`, `example...`,
ver detalle en el chat de esta sesión). Todos los tests pasan (126/126
en los 3 workspaces). Privacy regression tests pasan (8/8). Read-only
guarantees reverificadas por grep. Golden demo funcional. Dogfood real
ejecutado dos veces (baseline + post-hardening) contra un entorno
complejo real. Licencia MIT presente en los 4 `package.json`.

**Gate NO totalmente verde**: quedan bugs conocidos sin cerrar (MCP
"local scope", hooks de plugins, `.claude/rules/`), Optimize con un solo
profile, y Fase 10/11 solo parciales/no alcanzadas. Ver PRODUCT
VALIDATION / BETA READINESS en el informe final para el veredicto
explícito.

## FASE 15 — Auditoría legal/originalidad (COMPLETA)

Ver `docs/ORIGINALITY-REVIEW.md`. Conclusión: sin señales de código/
texto/branding copiado de ECC/AgentShield; MIT correctamente declarado
(y corregido en los 3 subpaquetes que no lo declaraban); licencias de
189 paquetes npm transitivos no auditadas individualmente (fuera de
alcance de una revisión manual razonable, recomendado `license-checker`
antes de publicar).

## FASE 16 — Validación comercial (COMPLETA)

Ver `docs/COMPETITIVE-MATRIX.md` (reemplaza la matriz embebida en
`docs/PLAN.md` §12 con datos post-dogfood, marcando `NOT VERIFIED` donde
corresponde en vez de inventar cifras de ECC).

## FASE 17 — Diseño Pro (COMPLETA, solo diseño)

Ver `docs/PRO-DESIGN.md`. Nada implementado, desplegado, ni facturado.

## FASE 18 — Release candidate local (PARCIAL)

Hecho: versión bump `0.1.0` → `0.2.0` (root + 3 subpaquetes),
`CHANGELOG.md` con la sección `[0.2.0]`, `files` agregado a los 3
`package.json` publicables (antes `@o2b/core` empaquetaba 1.3MB
incluyendo fixtures de test — ahora 59KB, solo `src/`), `npm pack
--dry-run` inspeccionado para los 3 paquetes (contenido correcto, sin
`tests/`).

**No hecho**: instalación real desde el `.tgz` en un sandbox limpio —
los 3 paquetes se referencian entre sí como `"*"` (protocolo de
workspace de npm), lo que no resuelve fuera del monorepo sin un
registro (real o local tipo Verdaccio) o sin cambiar esas referencias a
rutas de archivo — decisión de empaquetado/distribución que no se tomó
unilateralmente en esta sesión (ver REQUIRES USER APPROVAL en el
informe final). `npm publish` **no se ejecutó**, ningún repo de GitHub
público se creó, ningún push remoto se hizo — tal como se prohibió
explícitamente.

---

**Fin del registro de la PRIMERA sesión de desarrollo autónomo.**

---

# SEGUNDA SESIÓN AUTÓNOMA — Fases A-K hacia Release Candidate local

Autorizada por el usuario el 2026-09-08, inmediatamente después de la
primera. Objetivo: cerrar las fases pendientes (5/6/7/8/10/11 de la
primera sesión, renombradas A-K) y llegar a un RC local verificable.
`docs/DOGFOOD-BASELINE.md` y `docs/DOGFOOD-POST-HARDENING.md` se
preservaron intactos — ver `docs/DOGFOOD-FINAL.md` para la 3ª medición.

## PRIORIDAD 0 — Verificación de secretos (antes de tocar nada)

Búsqueda en `git ls-files` (archivos versionados) de prefijos de
secretos reales conocidos (`sbp_`, `github_pat_`, `gh[pousr]_`) +
patrones genéricos `KEY|TOKEN|SECRET` seguidos de 24+ caracteres
opacos, excluyendo coincidencias ya confirmadas como sintéticas
(`example`, `synthetic`, `fake`, `FIXTURE`, `PRIVACYTEST`, etc.).
**Resultado: 0 secretos reales encontrados** en ningún archivo del
repo, ni en `docs/dogfood/*.json` (evidencia: los campos `evidence` de
los 6 hallazgos de seguridad están todos redactados con asteriscos,
excepto uno que solo contenía el nombre del flag `"--api-key",` sin
ningún valor — no un secreto). `git log --all -p` también se revisó
por los mismos patrones — limpio. **P0 SECURITY ISSUE: ninguno.**

## FASE A — Cerrar Claude Code adapter

Investigado contra `code.claude.com/docs` (fetch en vivo) y contra el
`~/.claude.json` real del usuario (solo para confirmar el shape de
`projects.<path>`, sin leer ni exponer ningún valor de secreto).
Implementado, genéricamente (nada hardcodeado a Headroom/ECC):

1. **MCP local-scope** (`~/.claude.json` → `projects.<rootDir absoluto>
   .mcpServers`) — confirmado oficialmente y contra un caso real
   (vacío para este proyecto, lo cual también se verificó).
2. **Hooks de plugins** (`<installPath>/hooks/hooks.json`, mismo shape
   que `settings.json`) — confirmado oficial
   ("Plugin hooks/hooks.json ... Yes, bundled with the plugin").
3. **`.claude/rules/*.md`** — confirmado oficial; se distingue regla
   incondicional (`alwaysLoaded: true`, cuenta para el Context Score)
   de regla `paths:`-scoped (`alwaysLoaded: false`, cuenta como
   on-demand, no siempre-cargada — nuevo campo `InstructionSource.
   alwaysLoaded`).
4. **Provider routing** — genérico, por NOMBRE de variable de entorno
   (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`,
   `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`), nunca por
   valor; emite un warning de compatibilidad, no un hallazgo de
   seguridad (es un patrón legítimo en muchos setups).
5. **Precedencia global/proyecto/local** — decisión explícita de NO
   resolverla (O2B reporta cada fuente por separado con su scope; no
   simula qué "gana" en runtime, para no fingir una certeza que un
   escaneo offline no tiene).
6. **`.claude/settings.local.json`** — confirmado oficial
   (precedencia: project local > shared project > user), no se leía
   en absoluto — ahora sí, en hooks e instruction sources.

Archivos: `packages/core/src/adapters/claude-code/index.ts` (reescrito
sustancialmente), `packages/core/src/context/analyze.ts` (excluye
reglas on-demand del cómputo always-loaded), `packages/core/src/
domain/types.ts` (`InstructionSource.alwaysLoaded`, `InstructionKind`
+= `settings.local.json`/`rules`). 6 tests nuevos en
`claude-code.test.ts` (16 total, de 10).

## FASE B — Optimize deja de ser demo

`Recommendation` ganó `expectedEffect`; `RecommendationKind` ganó
`'on-demand'`. `OptimizeProfile.recommends`/`onDemand` pasaron de
`string[]` a `ProfileMcpSuggestion[]` (`{name, reason, expectedEffect,
confidence}` obligatorios por sugerencia — imposible recomendar algo
sin justificarlo). El filtro "POSSIBLY UNNECESSARY" se volvió
**estricto**: solo dispara si un profile matcheado lo nombra
explícitamente en `discourages` — antes disparaba para CUALQUIER MCP
instalado no mencionado, lo cual habría producido exactamente las
"recomendaciones absurdas" que el encargo pedía evitar en proyectos
ambiguos/monorepo.

7 profiles nuevos/actualizados en `/profiles`: `node-web` (actualizado,
matchers reducidos a `express`/`vite`), `react`, `nextjs`,
`node-typescript`, `python`, `flutter-dart`, `docker`, `supabase`.
**Diseño deliberado**: `flutter-dart`, `python`, `docker`,
`node-typescript` quedan con `recommends`/`onDemand` vacíos — detectar
el stack no implica recomendar nada si no hay una razón defendible
(el propio ejemplo que dio el usuario: Flutter no recomienda nada).
`supabase` es el único con `recommends` no vacío (recomendar el MCP de
Supabase cuando el stack YA es Supabase es el único caso donde el
dominio detectado ES el dominio de la herramienta).

10 tests nuevos (`profiles-real.test.ts`) cubren los 4 casos
combinados pedidos (Flutter+Supabase, Next.js+Supabase, Python+Docker,
Node+React) y un caso de monorepo ambiguo (React+Flutter en la misma
raíz) — ninguno produce recomendaciones duplicadas ni absurdas.

## FASE C — Adapters adicionales: investigar primero

Ver `docs/ADAPTER-RESEARCH-CURSOR-GEMINI-OPENCODE.md` — tabla completa
para Cursor/Gemini CLI/OpenCode contra documentación oficial fetcheada
en vivo. **Decisión: solo Cursor tiene especificación suficientemente
verificada** (shape JSON de MCP confirmado con precisión) —
implementado (`packages/core/src/adapters/cursor/index.ts`,
`HarnessKind` += `'cursor'`), conservador (agents/skills/hooks
reportados vacíos con warning explícito, mismo patrón que
CodexAdapter). 6 tests nuevos. Gemini CLI y OpenCode: `NOT IMPLEMENTED
— insufficient verified specification` (razón exacta documentada por
herramienta, no un "no" genérico).

## FASE D — Session observability spike

Ver `docs/SESSION-OBSERVABILITY-SPIKE.md`. Investigación contra
`code.claude.com/docs/en/hooks` confirma qué campos trae realmente el
JSON de cada hook (nunca prompt/archivos, sí `tool_name`/`agent_type`/
`session_id`/`hook_event_name`). Prototipo experimental aislado:
`experimental/session-observability/hook-logger.mjs` — nunca instalado
en `~/.claude` real, probado con `node --test` (5/5 tests) contra
sandboxes temporales. Redacta el `session_id` (SHA-256 truncado),
allowlist estricta de 6 campos de salida, se niega a escribir si no
se le da explícitamente una ruta de log.

## FASE E — Security hardening completo

6 tests nuevos (`packages/core/tests/security/hardening.test.ts`):
JSON malformado (settings.json, installed_plugins.json), contenido
binario/UTF-8 inválido como CLAUDE.md, path traversal en
`installPath` de un plugin, symlink de skills apuntando fuera del
proyecto, y una combinación de varias fuentes malformadas a la vez
contra `runDoctor` completo. Los 6 pasan — ninguna vulnerabilidad de
crash/traversal confirmada en el adapter.

**Bug de rendimiento real encontrado y corregido** (vía
`packages/scanner/tests/security/redos.test.ts`, 2 tests): no era
ReDoS por backtracking de regex (las regex del scanner están bien
acotadas), sino **O(n²) algorítmico real**: tanto el `lineNumberAt`
duplicado en las 5 reglas como `engine.ts`'s cálculo de `lineText`
llamaban `content.split('\n')` **una vez POR CADA hallazgo** — con
muchos hallazgos en un archivo grande, eso degrada a O(hallazgos ×
tamaño). Confirmado empíricamente: 20 000 líneas adversariales, 6.2s
antes → 55ms después. Corregido con `packages/scanner/src/
line-index.ts` (índice de líneas precalculado una vez por archivo,
O(log n) por búsqueda) aplicado a las 5 reglas + `engine.ts`.

## FASE F — Performance

Ver `docs/PERFORMANCE.md`. Benchmark reproducible
(`packages/core/tests/perf/benchmark.mjs`) con 100/500/1000 skills
sintéticas + MCP/hooks proporcionales. `inventory` escala linealmente.
`detectConflicts` escala cuadráticamente (confirmado exactamente:
499 500 comparaciones con 1000 skills = n·(n-1)/2) — **decisión
explícita de NO optimizarlo** en esta pasada: el entorno real
dogfoodeado tiene 14 skills (≈1-2ms), muy por debajo de donde el
bottleneck importa; optimizar el algoritmo de similitud es un cambio
de diseño no trivial que merece su propia sesión dedicada, no un
parche apresurado. Documentado como known limitation con el número
exacto para que una sesión futura decida.

## FASE G — Golden demo 2 (toque ligero)

`docs/GOLDEN-DEMO.md` corregido para reflejar el comportamiento real
de "POSSIBLY UNNECESSARY" tras el rediseño estricto de Fase B (antes
sobre-flageaba `github-mcp-server`/`playwright-mcp-extra`, ahora no,
correctamente). `npm run demo` agregado (doctor + optimize contra
`demo-environment/`, verificado funcionando). **No se rediseñó la UX
del demo** desde cero — el catálogo existente ya cumple el objetivo
("en pocos minutos: inventory/security/conflicts/context/optimize");
`snapshot`/`diff` no se agregaron al demo explícitamente por falta de
tiempo, aunque sí están verificados funcionando en general (Fase J).

## FASE H — Dogfood final

Ver `docs/DOGFOOD-FINAL.md` — comparación de 3 puntos completa
(BASELINE → POST-HARDENING → FINAL) contra el mismo entorno real.
Resultado más importante: **hooks 2 → 34** (32 nuevos, todos de
plugins, clasificados TRUE POSITIVE por construcción del código). Un
hallazgo colateral no planeado: verificar que el nuevo warning de
provider-routing fuera visible al usuario reveló que **ningún
warning de recolección se exponía nunca en el `DoctorReport`** (solo
contaban para el score de Compatibility, el texto se descartaba) —
corregido (`InventorySnapshot`/`DoctorReport` ganan `warnings:
string[]`, impreso por el CLI). También se corrigió `O2B_VERSION`
hardcodeado en `0.1.0` (desincronizado del bump real a `0.2.0`).

## FASE I — Dependencias y licencias

`license-checker-rseidelsohn` instalado como devDependency (solo lee
metadata local, sin red). **230 paquetes auditados, 0 GPL/AGPL/
copyleft fuerte.** Los 4 `UNLICENSED` reportados son los propios
paquetes de O2B (por `"private": true`, no por licencia real
declarada) — explicado en detalle en `docs/ORIGINALITY-REVIEW.md`
(actualizado con los resultados reales, reemplazando la sección
anterior que decía "no verificado exhaustivamente").

## FASE J — Packaging real

Ver `docs/PACKAGING-DECISION.md` — opción C (bundle único vía esbuild)
elegida sobre A (3 paquetes scoped) y B, con justificación explícita.
**Bug real encontrado y corregido durante la implementación**: el
bundle en formato CJS rompía `import.meta.url` (usado para resolver
`profiles/`), y aunque se cambió a formato ESM, la profundidad de
directorios del bundle (`dist/`) vs. el código fuente (`src/
commands/`) seguía sin coincidir — `optimize` matcheaba 0 profiles
contra un proyecto con `express` en package.json, un bug real que solo
apareció al probar el bundle de verdad, no en los tests unitarios
existentes (que corren contra el código fuente, no el bundle). Fix:
build script copia `profiles/*.json` a `dist/profiles/`, y el código
prueba esa ubicación primero, con fallback al cálculo de desarrollo.

**CLEAN INSTALL TEST — ejecutado y PASA**: `npm pack` en
`packages/cli` → tarball de 20KB (10 archivos: bundle + 8 profiles +
package.json, sin tests, sin datos personales) → instalado con
`npm install <tarball>` en un sandbox temporal completamente fuera del
monorepo → los 7 comandos (`--help`, `doctor`, `inventory`, `scan`,
`optimize`, `snapshot`, `diff`) ejecutados y verificados funcionando,
incluyendo que `optimize` matcheara correctamente el profile `node-web`
contra un `package.json` con `express`. Sandbox destruido después.

## FASE K — Beta gate final

Ver el informe final de chat (O2B RELEASE CANDIDATE REPORT) para el
veredicto consolidado de todos los gates.

---

**Fin del registro de la segunda sesión.**

---

# TERCERA SESIÓN — Preparación de Private Beta

Autorizada tras la aprobación explícita del RC. Alcance deliberadamente
congelado (sin nuevas features grandes, sin optimizar `detectConflicts`,
sin harnesses nuevos, sin ampliar agents/skills, sin Pro) — el objetivo
es exclusivamente validación externa segura.

**Versión**: bump a `0.2.0-beta.1` (4 `package.json` + `O2B_VERSION`).

**Sanitized diagnostic export**: `packages/core/src/report/sanitize.ts`
(`sanitizeDoctorReport`) + comando `o2b report --sanitize`
(`packages/cli/src/commands/report.ts`) — reemplaza cada ocurrencia de
`homeDir`/`rootDir` (ambos estilos de separador) por `<HOME>`/
`<PROJECT>` en todo el árbol del reporte. `--sanitize` es obligatorio,
no default — `o2b report` sin el flag se niega a correr, para que
nadie comparta un reporte sin sanitizar por error. 4 tests de
privacidad nuevos (`packages/core/tests/report/sanitize.test.ts`).

**Crash report seguro**: `packages/cli/src/crash-report.ts`
(`buildCrashReport`) — redacta el home dir y cualquier substring con
forma de secreto (mismos patrones que el scanner) del mensaje de error
y del stack; nunca incluye env values ni contenido de archivos porque
nunca los recibe en primer lugar. Flag `--crash-report <file>` en
`cli.ts`. 4 tests unitarios. (Un test e2e planeado se descartó: todos
los comandos ya atrapan sus propios errores internamente — por diseño
— así que el catch global de `cli.ts` solo dispara ante un bug
genuinamente inesperado, no algo que un test deba fabricar
artificialmente.)

**Beta safety review**: grep explícito de `packages/core/src`,
`packages/scanner/src`, `packages/cli/src` por cualquier llamada de
red (`fetch`, `http.request`, `axios`, etc.) — **0 coincidencias**.
Confirma, no solo asume, "cero network calls".

**Docs nuevas**: `docs/BETA-QUICKSTART.md` (incluye las 5 secciones de
consentimiento pedidas: WHAT O2B READS / DOES NOT MODIFY / MAY
DISCOVER / PRIVACY GUARANTEES / KNOWN LIMITATIONS, antes de cualquier
instrucción de instalación), `docs/BETA-FEEDBACK.md` (preguntas
exactas pedidas), `docs/BETA-TEST-MATRIX.md` (5 perfiles A-E, qué
observar en cada uno, no testers reales).

**Beta package**: `beta-package/o2b-cli-0.2.0-beta.1.tgz` (bundle
único ya decidido en Fase J, reconstruido con la versión beta) +
`CHECKSUMS.txt` (SHA-256) + `README.md` corto. Tarball inspeccionado
directamente (10 archivos: bundle + 8 profiles + package.json — sin
tests, sin dogfood, sin datos personales — confirmado también con grep
sobre el bundle compilado: 0 coincidencias de identificadores
personales o secretos). Clean install + uninstall verificados en un
sandbox temporal fuera del repo (incluye probar `report --sanitize` y
el rechazo correcto de `report` sin `--sanitize`).

**Tests**: 152 → 162 (10 nuevos: 4 sanitize + 4 crash-report + 2 e2e de
`report`). Coverage core 95.97%/81.38% (mejoró), scanner sin cambio
(99.19%/94.11%). Golden demo re-verificado, sin cambios de
comportamiento.

**Fin del registro de la tercera sesión.**
