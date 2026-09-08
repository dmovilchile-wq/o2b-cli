# O2B — Private Beta

## Qué es O2B

O2B observa, asegura, y ayuda a racionalizar el entorno donde corren
tus agentes de codificación con IA — configuración global, de
proyecto, y de varios harnesses a la vez — en vez de agregar más
agentes/skills a cualquiera de ellos. No genera contenido; audita lo
que ya tenés instalado.

## Estado: BETA PRIVADA (0.2.0-beta.1)

No está publicado en npm ni en GitHub público. Este `.tgz` te llegó
directamente de forma manual. Tu feedback es lo que decide los
próximos pasos.

## Qué soporta

- **Claude Code**: inventario completo — agents, skills, hooks
  (incluidos los que traen los plugins instalados), plugins, MCP
  servers (de proyecto y de usuario/global), `CLAUDE.md`,
  `.claude/rules/*.md`, `settings.json`/`settings.local.json`.
- **Codex**: `AGENTS.md`, `.codex/config.toml` (MCP servers). No
  reporta agents/skills de Codex porque no existe, a la fecha, un
  formato público verificable para ellos — preferimos decir "no
  sabemos" antes que inventar.
- **Cursor**: `.cursor/mcp.json`, `.cursor/rules/*.mdc`, `AGENTS.md`/
  `.cursorrules`. El adapter más nuevo — tu prueba es de las primeras
  contra un Cursor real.

## Limitaciones conocidas

- No resuelve qué fuente de configuración "gana" cuando varias
  coexisten (managed/CLI/local/proyecto/usuario) — reporta cada una
  por separado.
- La detección de skills/descripciones similares puede tardar
  perceptiblemente con cientos de skills muy parecidas entre sí
  (complejidad cuadrática conocida, no optimizada todavía).
- Solo detecta variables de entorno de "provider routing" de una
  lista corta y documentada (`ANTHROPIC_BASE_URL` y similares) — otros
  mecanismos no se detectan.
- No sabe qué usaste realmente en una sesión (`LOADED`/`ACTIVE`) — solo
  qué existe en disco. Un escaneo offline no puede saber más que eso,
  y O2B no inventa esa respuesta.
- Gemini CLI y OpenCode: investigados, no soportados todavía.

## Privacidad

- **100% local. Cero red.** Ningún comando de O2B hace ninguna llamada
  de red — verificado, no solo declarado.
- **Cero telemetría.**
- **Nunca modifica nada.** Solo lee. La única excepción es el archivo
  que vos mismo nombrás con `--out` (para `snapshot`/`report`), en la
  ruta que vos elijas.
- **Secretos siempre redactados** en cualquier hallazgo.
- **Variables de entorno: solo nombres, nunca valores.**
- **`o2b report --sanitize`** genera un export sin tu ruta home real,
  sin contenido completo de tus archivos de instrucciones, y sin
  valores de entorno — pensado específicamente para que puedas
  compartirlo con nosotros sin exponer tu configuración real.

## Riesgos

O2B es software de beta. Aunque es estrictamente read-only por diseño
(y eso está verificado con tests automatizados), como con cualquier
herramienta que lee tu configuración del sistema:

- Puede fallar o crashear — usá `--crash-report <archivo>` si pasa,
  genera un reporte sanitizado del error.
- Puede tardar más de lo esperado en entornos con mucha configuración
  instalada (ver limitaciones arriba).
- Es beta: puede haber falsos positivos/negativos en sus hallazgos —
  por eso te pedimos feedback específico sobre precisión.

No hay riesgo de pérdida de datos ni de modificación de tu
configuración — O2B no escribe nada salvo los archivos que vos le
pidas explícitamente con `--out`.

## Cómo instalar

Ver [`INSTALL-WINDOWS.md`](INSTALL-WINDOWS.md) o
[`INSTALL-MAC-LINUX.md`](INSTALL-MAC-LINUX.md) según tu sistema.

## Cómo desinstalar

```bash
cd <la-carpeta-donde-instalaste-o2b>
npm uninstall @o2b/cli
```

O simplemente borrá la carpeta entera donde lo instalaste — O2B nunca
escribió nada fuera de ahí (salvo archivos `--out` que vos mismo
nombraste).
