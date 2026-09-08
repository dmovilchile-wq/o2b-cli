# O2B — Originality & Licensing Review

Fecha: 2026-09-08. Revisión razonable, no asesoría legal. Alcance:
confirmar implementación greenfield, licenciamiento correcto, y ausencia
de código/texto/branding copiado de `affaan-m/ECC` o `agentshield`,
según lo pedido explícitamente en `STATUS.md` (regla #3) y en la Fase 15
del desarrollo autónomo.

## Metodología

- `git log` completo del repo (commit único de historia hasta la fecha:
  "Fase 1 + Fase 1.1: O2B Environment Manager core, hardened and
  validated" + los commits de esta sesión de hardening) — sin señales
  de squash de un fork externo ni de importación masiva de otro repo.
- Búsqueda de texto literal por nombres/branding de ECC/AgentShield en
  todos los archivos versionados (`git ls-files`).
- Revisión de `package.json` (root + 3 subpaquetes) y `LICENSE`.
- Revisión de `package-lock.json` para el árbol de dependencias de
  terceros y sus licencias declaradas (vía metadata de npm, no
  auditoría legal de cada licencia individual).
- Ningún archivo de código fuente de ECC/AgentShield fue leído ni
  copiado durante esta sesión ni las anteriores documentadas en
  `STATUS.md`/`docs/AUTONOMOUS-RUN.md` — la única interacción con ECC
  en esta sesión fue leer **metadata de un marketplace de plugins
  instalado localmente** (nombres de agentes/skills que Claude Code
  expone como parte del entorno del usuario, vía system reminders), no
  su código fuente.

## Hallazgos

1. **Implementación greenfield** — confirmado por inspección de
   `packages/core`, `packages/scanner`, `packages/cli`: arquitectura de
   adapters + domain model + scanner de reglas declarativas es un diseño
   propio de O2B (adapters `ClaudeCodeAdapter`/`CodexAdapter` con
   contrato `HarnessAdapter`, no una estructura calcada de ningún
   proyecto conocido). No se encontró código verbatim ni comentarios
   heredados de otro repositorio.
2. **Copyright y licencia** — `LICENSE` (raíz): MIT, `Copyright (c) 2026
   O2B contributors`. `package.json` raíz: `"license": "MIT"`. Los 3
   subpaquetes (`@o2b/core`, `@o2b/scanner`, `@o2b/cli`) no declaraban
   `license` individualmente — **corregido en esta sesión** (Fase 15):
   ahora los 3 declaran `"license": "MIT"` explícitamente, consistente
   con la raíz. Son paquetes `"private": true` (no se publican
   independientes a npm), así que esto es una mejora de claridad, no la
   corrección de un incumplimiento.
3. **Branding** — ninguna referencia a "ECC", "Everything Claude Code",
   "AgentShield" ni sus logos/nombres de producto en ningún archivo
   versionado (`git ls-files` + grep). El nombre "O2B" y su README/CLI
   son consistentes en todo el repo.
4. **Dependencias de terceros — auditado con herramienta real (Fase I,
   segunda sesión autónoma)**. Se instaló `license-checker-rseidelsohn`
   como devDependency (paquete local, sin llamadas de red en tiempo de
   análisis — solo lee metadata de `node_modules`) y se corrió contra
   el árbol completo (`npm run license-check`, o
   `npx license-checker-rseidelsohn --json` para el detalle). Resultado
   real sobre 230 paquetes resueltos:
   - **0 licencias GPL/AGPL/copyleft fuerte** — verificado explícitamente
     con un filtro sobre el JSON completo, no solo inspección visual.
   - Distribución: MIT (123), ISC (66), BlueOak-1.0.0 (14), Apache-2.0
     (12), BSD-3-Clause (6), BSD-2-Clause (2), CC0-1.0 (1),
     `(MIT AND CC-BY-3.0)` (1), CC-BY-3.0 (1).
   - 4 paquetes marcados `UNLICENSED` por la herramienta: son
     **los propios paquetes de O2B** (`o2b`, `@o2b/core`,
     `@o2b/scanner`, `@o2b/cli`) — no un paquete de terceros. La
     herramienta los marca así porque todos declaran `"private": true`
     (convención de npm: un paquete privado no puede publicarse, así
     que se reporta como sin licencia de publicación,
     independientemente de que cada uno sí declare `"license": "MIT"`
     en su propio campo). **No es un hallazgo real de licencia
     problemática** — es el comportamiento esperado de la herramienta
     ante paquetes privados propios.
   - Todos los transitivos son paquetes públicos y muy usados del
     ecosistema npm (Vite/Vitest/Babel/esbuild/TypeScript y similares);
     ninguno mostró una licencia atípica o no permisiva.
5. **Claims comerciales** — `README.md`/`STATUS.md`/`docs/PLAN.md` no
   contienen afirmaciones de métricas no respaldadas (ver regla #6 de
   `STATUS.md`, ya verificada en Fase 1.1 y reforzada en esta sesión:
   todo score declara su `method` — measured/heuristic/estimated/
   unknown). No se encontraron claims de clientes, casos de uso
   probados en producción de terceros, ni comparaciones cuantitativas
   sin fuente.

## Limitaciones de esta revisión

- No es una auditoría legal formal ni sustituye asesoría de un
  abogado de propiedad intelectual.
- No se ejecutó un escaneo automatizado de similitud de código contra
  el repositorio de ECC (requeriría clonar ese repo, lo cual esta
  sesión no hizo por diseño — evitar cualquier contacto directo con
  ese código, ver regla #3 de `STATUS.md`).
- La auditoría de licencias (punto 4) usa la metadata que cada paquete
  declara en su propio `package.json` — no verifica que esa
  declaración sea exacta (un paquete podría, en teoría, declarar mal
  su propia licencia); esto es una limitación inherente a cualquier
  herramienta automatizada de este tipo, no específica de O2B.

## Conclusión

Sobre la base de la evidencia disponible (estructura del código,
historial de git, ausencia de branding/texto copiado, licencia MIT
consistente, y ahora una auditoría real de 230 dependencias sin
copyleft fuerte), no se encontró ninguna señal de código, texto o
branding copiado de ECC/AgentShield, y no se encontró ninguna
dependencia con licencia problemática para distribución MIT.
**Esto no constituye asesoría legal.**
