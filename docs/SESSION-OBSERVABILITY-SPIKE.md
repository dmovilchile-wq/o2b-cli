# Session observability — investigación + prototipo experimental (Fase D)

Fecha: 2026-09-08. Investigación contra documentación oficial de hooks de
Claude Code (fetch en vivo, `code.claude.com/docs/en/hooks`,
`.../hooks-guide`). Codex: ver limitación al final — no se encontró
documentación pública equivalente de hooks/eventos de sesión suficiente
para diseñar un spike simétrico en el tiempo disponible.

## Qué puede observarse REALMENTE (Claude Code)

Los hooks reciben un JSON por stdin en cada evento. Campos confirmados,
comunes a todos los eventos: `session_id`, `prompt_id`, `transcript_path`,
`cwd`, `permission_mode`, `hook_event_name`. En `PreToolUse`/
`PostToolUse`: `tool_name`. En eventos de subagente (`SubagentStart`/
`SubagentStop`): `agent_id`, `agent_type`.

**Confirmado que NO viene en el JSON del hook**: contenido del prompt
(solo `prompt_id`, un identificador, no el texto), contenido de archivos,
duración/timestamp explícito. La ausencia de timestamp/duración en el
payload es en realidad una buena noticia de privacidad — significa que
un hook no puede filtrar esos datos por accidente; si se quieren, hay
que calcularlos localmente (ver más abajo).

**No confirmado con certeza**: si la invocación de una *skill*
específicamente aparece como un `tool_name` distinguible (p. ej.
`"Skill"` con el nombre de la skill en otro campo) o si se mezcla
indistinguiblemente dentro de eventos de subagente/Task. La
documentación fetcheada no lo confirma explícitamente — **marcar como
UNKNOWN**, no asumir.

## Clasificación pedida (DISCOVERABLE / AVAILABLE / LOADED / INVOKED / ACTIVE)

| Nivel | ¿Observable estáticamente (Doctor, offline)? | ¿Observable vía hooks (sesión real, opt-in)? |
|---|---|---|
| DISCOVERABLE (existe en disco, O2B ya lo ve) | **Sí** — es literalmente el inventario de `doctor`/`inventory` | N/A |
| AVAILABLE (cargado en el índice de skills al iniciar sesión) | **No exactamente** — O2B puede *inferir* que algo se ofrece (existe + no está excluido), pero no confirma que Claude Code lo haya indexado en esa sesión concreta | `SessionStart` confirma que la sesión arrancó; no confirma qué se indexó |
| LOADED (el cuerpo completo entró al contexto) | **No** — imposible offline | **Parcialmente**: `PreToolUse` con `tool_name` da evidencia de que *algo* se invocó, lo cual implica que se cargó; no cubre skills que se cargan sin pasar por una tool call explícita (UNKNOWN) |
| INVOKED (se ejecutó una tool call concreta) | **No** | **Sí** — `PreToolUse`/`PostToolUse` con `tool_name`, y `SubagentStart`/`SubagentStop` con `agent_type`, son evidencia directa y confiable |
| ACTIVE (duración real de uso) | **No** | **Sí, calculado, no dado directamente** — emparejar `PreToolUse`→`PostToolUse` del mismo `tool_name`+sesión y restar timestamps locales (el hook script pone su propio timestamp al ejecutarse; el JSON no lo trae) |

## Datos permitidos vs. prohibidos — verificado contra lo que el JSON de hooks realmente expone

- **Permitidos y disponibles**: `timestamp` (calculado localmente al
  ejecutar el hook, no viene en el JSON), `tool_name`/`agent_type` como
  identificador de herramienta, `hook_event_name` como tipo de evento,
  un ID de sesión — pero el `session_id` real de Claude Code NO debe
  guardarse tal cual si se quiere pseudonimizar de verdad; el prototipo
  lo hashea (SHA-256 truncado) antes de escribir nada a disco.
  `duration` es calculable emparejando Pre/Post del mismo tool_name.
- **Prohibidos y confirmado que el JSON de hooks NO los expone de
  todas formas**: prompt completo (solo `prompt_id`), respuesta
  completa, código fuente, contenido de archivos, secretos,
  credenciales. Esto significa que el diseño "privacy-first" no depende
  únicamente de que el prototipo decida no leerlos — el propio hook
  input de Claude Code ya no los incluye, lo cual reduce el riesgo real
  de fuga incluso si el prototipo tuviera un bug.

## Prototipo experimental — QUÉ y DÓNDE

`experimental/session-observability/hook-logger.mjs` — script Node
standalone. Lee un evento de hook (JSON) por stdin, extrae ÚNICAMENTE
los campos permitidos, hashea `session_id`, calcula `duration` cuando
puede emparejar un `PostToolUse` con su `PreToolUse` anterior (mismo
`tool_name`+sesión hasheada, mismo proceso), y **agrega** (append-only)
una línea JSONL a un archivo de log **local**, cuya ruta se controla
por la variable de entorno `O2B_OBSERVABILITY_LOG` (nunca escribe en
`~/.claude` ni en ninguna ruta por defecto fuera de donde se le indique
explícitamente).

**NO está registrado en ningún `settings.json` real, ni siquiera de
prueba en `~/.claude`.** Se probó exclusivamente:
1. Invocándolo directamente con JSON sintético por stdin (manual).
2. Con un test automatizado (`experimental/session-observability/
   hook-logger.test.mjs`) que verifica que el output NUNCA contiene
   claves fuera de la lista permitida.

Ver el propio archivo para el código; es deliberadamente pequeño (una
función pura de transformación + un `main()` de I/O) para que sea fácil
de auditar exactamente qué toca.

## Decisión

**Viable técnicamente, con datos limitados y honestos** (INVOKED es lo
más confiable; ACTIVE requiere cálculo local; AVAILABLE/LOADED de
skills específicamente sigue siendo UNKNOWN en varios casos). El
prototipo demuestra la viabilidad en sandbox. **No se instala en el
entorno real del usuario bajo ninguna circunstancia** — eso queda
fuera del alcance de esta sesión y requeriría autorización explícita
por separado, más una decisión de producto sobre si esto vive en
Community (opt-in local) o en O2B Pro (ver `docs/PRO-DESIGN.md`).

## Codex

No se investigó un spike simétrico para Codex en esta sesión —
`docs/CODEX-ADAPTER-NOTES.md` ya documenta que Codex no tiene, a la
fecha, especificación pública verificable equivalente a los plugins de
Claude Code; lo mismo aplica aquí sin una investigación dedicada
adicional que esta sesión no alcanzó a hacer. `NOT INVESTIGATED —
pending dedicated research`, no `NOT POSSIBLE`.
