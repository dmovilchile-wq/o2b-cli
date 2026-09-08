# O2B — Beta Quickstart

Gracias por probar O2B en beta privada. Esta página está pensada para
que puedas instalar, correr los comandos principales, y generar un
reporte para darnos feedback en menos de 5 minutos.

**Lee la sección "Antes de ejecutar `doctor`" antes de correr nada.**
No es un trámite — explica exactamente qué va a leer O2B en tu máquina.

---

## Antes de ejecutar `doctor` — qué esperar

### WHAT O2B READS

O2B lee (nunca escribe) configuración de los harnesses de IA que
detecte instalados:

- **Claude Code**: `~/.claude/` completo (CLAUDE.md global, skills,
  agents, hooks en `settings.json`/`settings.local.json`, plugins
  instalados y sus propios `hooks/hooks.json`, `.claude/rules/*.md`),
  `~/.claude.json` (MCP servers de usuario y de proyecto), y el
  equivalente a nivel de proyecto (`<tu proyecto>/.claude/`,
  `<tu proyecto>/CLAUDE.md`, `<tu proyecto>/.mcp.json`).
- **Codex**: `~/.codex/config.toml`, `AGENTS.md` (global y de
  proyecto). Deliberadamente conservador — no reporta agents/skills de
  Codex porque no existe un formato público verificable para ellos.
- **Cursor**: `~/.cursor/mcp.json`, `~/.cursor/rules/*.mdc`, `AGENTS.md`
  / `.cursorrules` (global y de proyecto).

**Sí, esto incluye tu configuración GLOBAL** (`~/.claude`, `~/.codex`,
`~/.cursor`), no solo la del proyecto donde corres el comando — esa es
la premisa completa del producto: ver el entorno completo, no solo un
repo. Si prefieres probarlo solo contra configuración de prueba, usa
`--home <directorio-de-prueba>` en cualquier comando.

### WHAT O2B DOES NOT MODIFY

**Nunca.** Ningún comando de O2B escribe, mueve, renombra ni borra
nada bajo `~/.claude`, `~/.codex`, `~/.cursor`, ni tu configuración de
proyecto. La única excepción es el archivo de SALIDA que tú mismo
nombres explícitamente con `--out` (`o2b snapshot`/`o2b report`) — ese
archivo lo eliges tú, en la ruta que tú eliges, y nunca está dentro de
`~/.claude`/`~/.codex`/`~/.cursor`.

Esto no es una promesa de marketing — está verificado con tests de
regresión (`packages/core/tests/privacy/`) y re-verificado por grep de
todo el código fuente antes de cada release. Ver
`docs/PRIVACY.md`/`SECURITY.md` para el detalle técnico.

### WHAT O2B MAY DISCOVER

Vas a ver, potencialmente, cosas que no esperabas:

- Secretos en texto plano dentro de configuraciones de MCP servers
  (esto le pasó al propio equipo de O2B durante su propio dogfood —
  ver `docs/DOGFOOD-BASELINE.md`).
- Plugins/hooks que instalaste hace tiempo y olvidaste.
- Skills o agentes con descripciones casi idénticas (posible
  redundancia).
- Configuración de "provider routing" (variables como
  `ANTHROPIC_BASE_URL`) que puede indicar que tu tráfico pasa por un
  proxy — legítimo en muchos setups, pero vale la pena confirmar que
  sea intencional.

Ninguno de estos hallazgos se envía a ningún lado automáticamente. Los
ves tú, localmente, y decides qué compartir (ver más abajo, "Reporte
sanitizado").

### PRIVACY GUARANTEES

- **100% local.** Cero llamadas de red durante `doctor`/`inventory`/
  `scan`/`optimize`/`snapshot`/`diff`/`report`. Nada se sube a ningún
  servidor de O2B — no existe tal servidor en esta fase.
- **Cero telemetría.** No hay ningún tipo de analytics, ni siquiera
  anónimo.
- **Secretos siempre redactados.** Ningún hallazgo de seguridad
  muestra el valor completo de un secreto — ver
  `packages/scanner/src/redact.ts`.
- **Variables de entorno: solo nombres, nunca valores.** En ningún
  reporte, snapshot, ni export.
- **Contenido de archivos de instrucciones (CLAUDE.md/AGENTS.md):
  nunca se incluye completo** en ningún reporte — solo metadata (ruta,
  tamaño, tokens estimados).

### KNOWN LIMITATIONS (beta)

- No resuelve la precedencia real entre fuentes de config (managed >
  CLI > local > shared project > user) — reporta cada fuente por
  separado, nunca "la config efectiva ganadora".
- `detectConflicts` (comparación de descripciones similares) escala
  O(n²) — con cientos de skills muy parecidas puede tardar segundos,
  no milisegundos. Ver `docs/PERFORMANCE.md`.
- MCP servers "local scope" de Claude Code (`~/.claude.json` →
  `projects.<ruta>`) se leen; otros mecanismos de provider-routing
  fuera de una lista corta de variables documentadas, no.
- Solo 3 harnesses soportados (Claude Code, Codex, Cursor). Gemini
  CLI/OpenCode: investigados, no implementados aún (documentación
  oficial insuficiente en el momento de esta beta — ver
  `docs/ADAPTER-RESEARCH-CURSOR-GEMINI-OPENCODE.md`).
- `LOADED`/`ACTIVE` real de una sesión (qué se usó de verdad) siempre
  es `UNKNOWN` — un escaneo offline no puede saberlo. Hay un prototipo
  experimental (nunca desplegado) documentado en
  `docs/SESSION-OBSERVABILITY-SPIKE.md`.

---

## Instalación

Recibiste un archivo `.tgz` (no está en npm todavía — beta privada).

```bash
mkdir -p ~/o2b-beta && cd ~/o2b-beta
npm init -y
npm install /ruta/al/o2b-cli-0.2.0-beta.1.tgz
```

Verifica el checksum del `.tgz` antes de instalar (te lo damos junto
al archivo, en `CHECKSUMS.txt`):

```bash
shasum -a 256 -c CHECKSUMS.txt
```

## Los 5 comandos (menos de 5 minutos)

```bash
# 1. Diagnóstico completo (read-only)
./node_modules/.bin/o2b doctor

# 2. Solo qué hay instalado
./node_modules/.bin/o2b inventory

# 3. Solo hallazgos de seguridad
./node_modules/.bin/o2b scan

# 4. Recomendaciones para el proyecto donde estés parado
./node_modules/.bin/o2b optimize

# 5. Guardar un snapshot completo (para tu propio uso, comparar antes/después)
./node_modules/.bin/o2b snapshot --out mi-snapshot.json
```

Si preferís no tocar tu configuración real todavía, agregá `--home
<carpeta-vacía>` a cualquier comando para probar contra un entorno
vacío primero.

## Generar el reporte sanitizado para darnos feedback

```bash
./node_modules/.bin/o2b report --sanitize --out reporte-beta.json
```

Esto genera un JSON **sin tu ruta home real ni la ruta de tu
proyecto** (reemplazadas por `<HOME>`/`<PROJECT>`), sin contenido
completo de tus archivos de instrucciones, sin valores de variables de
entorno, y con los secretos ya redactados. Abrilo vos mismo antes de
enviarlo — nunca está de más una segunda revisión — y mandanoslo junto
con `docs/BETA-FEEDBACK.md` completado.

## Desinstalación

```bash
cd ~/o2b-beta
npm uninstall @o2b/cli
# o simplemente borrá la carpeta ~/o2b-beta entera
rm -rf ~/o2b-beta
```

O2B nunca tocó nada fuera de esa carpeta y de los archivos `--out` que
vos mismo nombraste, así que no hay nada más que limpiar.

## Reportar un bug

Si algo falla:

```bash
./node_modules/.bin/o2b <comando-que-falló> --crash-report crash.json --verbose
```

Esto genera `crash.json` con versión de O2B, versión de Node, SO,
comando, tipo y mensaje de error (sanitizados — sin secretos, sin tu
ruta home real), y opcionalmente el stack trace técnico. Adjuntalo a
tu reporte junto con qué comando corriste y qué esperabas que pasara.
