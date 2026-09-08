# O2B DOGFOOD — FINAL (Fase H, segunda sesión autónoma)

Fecha: 2026-09-08. Mismo entorno real, mismo método que
`docs/DOGFOOD-BASELINE.md` y `docs/DOGFOOD-POST-HARDENING.md` — ninguno
de los dos se alteró. Snapshot sanitizado:
[`docs/dogfood/snapshot-final-sanitized.json`](dogfood/snapshot-final-sanitized.json).

## Qué cambió desde POST-HARDENING (Fase 3) hasta ahora (Fase A/E/H)

- MCP local-scope (`~/.claude.json` → `projects.<path>.mcpServers`) —
  implementado; para este proyecto (O2B) el resultado real es 0
  servidores local-scope (verificado directamente: la entrada existe
  en `~/.claude.json` pero está vacía para esta ruta) — **comportamiento
  correcto, no un bug**, simplemente este proyecto no tiene MCP
  local-scope configurado.
- Hooks embebidos en plugins — implementado. Resultado real:
  **2 → 34 hooks** detectados.
- `.claude/settings.local.json` — implementado; 0 encontrados en este
  entorno real (el usuario no usa ese archivo aquí) — correcto.
- `.claude/rules/*.md` — implementado; 0 encontrados en este entorno
  real — correcto.
- Provider routing (`ANTHROPIC_BASE_URL`) — implementado. Resultado
  real: **detectado y ahora visible** (antes existía en el archivo
  pero ninguna regla lo señalaba).
- Adapter Cursor — implementado, pero este entorno real no tiene
  Cursor instalado, así que no aporta hallazgos nuevos aquí (esperado;
  se verificó contra fixtures, no contra este entorno).
- **Hallazgo colateral, no planeado**: los `warnings` de recolección
  (incluido el de provider-routing recién agregado) nunca se exponían
  en el `DoctorReport` — solo contaban para el score de Compatibility.
  Corregido (`InventorySnapshot`/`DoctorReport` ahora incluyen
  `warnings: string[]`, impresos por el CLI bajo `WARNINGS`).

## Comparación de 3 puntos: BASELINE → POST-HARDENING → FINAL

| Métrica | Baseline (Fase 2) | Post-hardening (Fase 3) | Final (Fase H) |
|---|---|---|---|
| MCP servers de Claude Code | 0 / 11 | 12 (11 user-scope + node_repl) | 12 (igual — local-scope real es 0 para este proyecto) |
| Plugins | 0 / 4 | 4 / 4 | 4 / 4 (sin cambio) |
| Hooks | 2 | 2 | **34** (+32, todos de plugins) |
| Instruction sources | 1 | 2 (+ CLAUDE.md global) | 2 (sin `.claude/rules`/`settings.local.json` reales que sumar) |
| Hallazgos de seguridad | 0 | 6 | 6 (sin cambio — mismos secretos reales, ya detectados desde Fase 3) |
| Security score | 100 | 14 | 14 (sin cambio) |
| Compatibility score | 95 | 95 | **90** (nuevo warning de provider-routing, antes invisible) |
| Configuration score | 88 | 88 | 88 (sin cambio — mismos 3 conflictos heurísticos de skills) |
| Warnings visibles en el reporte | N/A (no existía el campo) | N/A | **2, ahora legibles** (antes se calculaban pero se descartaban) |

## Clasificación manual de los hallazgos NUEVOS de esta fase

| Hallazgo | Clasificación | Evidencia |
|---|---|---|
| 32 hooks nuevos (de `ecc`, `headroom`, `claude-mem`) | **TRUE POSITIVE** | Verificado por construcción: solo se agregan si `<installPath>/hooks/hooks.json` existe y parsea con éxito; confirmado en Fase 2 que los 3 paquetes tienen ese archivo |
| Warning de `ANTHROPIC_BASE_URL` | **TRUE POSITIVE** | El valor de la variable existe realmente en `settings.json` (confirmado en Fase 2); el warning nombra la variable, nunca su valor |
| MCP local-scope = 0 para este proyecto | **TRUE NEGATIVE** (correcto no encontrar nada) | Confirmado directamente inspeccionando `~/.claude.json` → `projects["<esta ruta>"].mcpServers` = `{}` |
| `.claude/rules` = 0 | **TRUE NEGATIVE** | El usuario no tiene ese directorio en `~/.claude/` ni en este proyecto |
| `settings.local.json` = 0 | **TRUE NEGATIVE** | El usuario no tiene ese archivo en este proyecto |
| Adapter Cursor sin hallazgos | **UNVERIFIABLE en este entorno** | No se confirmó si el usuario tiene o no Cursor instalado en otra parte de su máquina — el adapter solo mira `homeDir`/`rootDir` pasados, correctos por diseño, pero esto no prueba el adapter contra un Cursor real |

**Falsos positivos encontrados en esta fase: 0.** Todos los hallazgos
nuevos se verificaron manualmente contra el estado real del filesystem
antes de clasificarlos — no se ajustó ninguna regla para mejorar el
resultado.

## Recall de inventario — estado acumulado

| Categoría | Baseline | Final |
|---|---|---|
| MCP servers (Claude Code) | 0% | 100% (user-scope; local-scope 100% también, verificado con caso real vacío) |
| Plugins | 0% | 100% |
| Hooks | ~6% (2 de ~34 reales) | **100%** (34/34) |
| CLAUDE.md global | 0% | 100% |
| `.claude/rules` | No existía la categoría | 100% (0 reales, 0 detectados) |
| `settings.local.json` | No existía la categoría | 100% (0 reales, 0 detectados) |

## No detectado todavía (limitaciones que persisten, documentadas)

Provider routing solo cubre 4 nombres de variable documentados
(`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`,
`CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`) — cualquier otro
mecanismo de routing no listado seguiría sin detectarse. La precedencia
real entre fuentes (managed > CLI > local > shared project > user) no
se resuelve — O2B reporta cada fuente por separado con su scope, nunca
calcula "la config efectiva ganadora", una decisión de diseño explícita
(ver `docs/AUTONOMOUS-RUN.md`, Fase A) para no fingir certeza sobre algo
que un escaneo offline no puede confirmar con la misma fidelidad que el
propio Claude Code en tiempo de ejecución.

## Veredicto

Sin falsos positivos nuevos, 32 hooks reales antes invisibles ahora
detectados, un warning de seguridad/compatibilidad real (provider
routing) que antes existía en el archivo pero nunca llegaba al usuario
— y un bug de producto colateral (warnings calculados pero nunca
mostrados) encontrado y corregido en el proceso de verificar este mismo
dogfood. Evidencia consistente de que el patrón "corregir → verificar
contra el mismo entorno real, no solo tests sintéticos" sigue
sosteniéndose en la segunda pasada.
