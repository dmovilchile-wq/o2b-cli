# Packaging — decisión técnica (Fase J)

Fecha: 2026-09-08. Problema real descubierto durante esta misma fase:
`packages/cli/package.json` depende de `@o2b/core`/`@o2b/scanner` con
`"*"` (protocolo de workspace de npm) — eso solo resuelve **dentro**
del monorepo. Un `npm pack` del paquete `@o2b/cli` produce un tarball
que, instalado en un sandbox limpio (fuera de este repo), **no puede
resolver esas dos dependencias** — exactamente el escenario que Fase 18
de la primera sesión autónoma dejó documentado como pendiente
("REQUIRES USER APPROVAL", no resuelto).

## Opciones evaluadas

**A. 3 paquetes scoped publicados por separado** (`@o2b/core`,
`@o2b/scanner`, `@o2b/cli`, cada uno en el registro de npm). Requiere
reemplazar `"*"` por rangos de versión reales (`^0.2.0`) y publicar los
3 en orden de dependencia. Ventaja: separación limpia, cada paquete
reusable independientemente (p. ej. `@o2b/scanner` como librería en
otro proyecto). Desventaja: 3 publicaciones que mantener en sync,
3 números de versión, más superficie de mantenimiento para un producto
que hoy solo tiene un consumidor real (el propio CLI).

**B. Paquete CLI principal que declara los internos como dependencias
normales publicadas** — mismo problema que A, solo con otro nombre; no
resuelve nada distinto.

**C. Bundle único** — compilar `packages/cli/src/cli.ts` + todo lo que
importa de `@o2b/core`/`@o2b/scanner` en un solo archivo JS
autocontenido (sin dependencias de workspace), publicado como un único
paquete `@o2b/cli` (o `o2b`) con `tsx` fuera del bundle solo si hiciera
falta en desarrollo, pero el binario publicado no necesita ni `tsx` ni
resolver ningún paquete propio en tiempo de ejecución.

## Decisión: **Opción C (bundle único)**

Razones, evaluadas explícitamente:

- **UX de instalación**: `npm install -g o2b` (o `npx o2b`) debe
  funcionar sin que el usuario sepa que existen 3 paquetes internos —
  eso es un detalle de implementación, no algo que el usuario deba
  resolver.
- **Complejidad de npm**: la Opción A introduce un problema real de
  orden de publicación (`@o2b/scanner` antes que `@o2b/core` antes que
  `@o2b/cli`) y de sincronización de versiones que no aporta nada al
  usuario final del CLI.
- **Versionado**: con bundle único, una sola versión (`o2b@0.2.0`) es
  la única que existe públicamente — más simple de comunicar en el
  README/CHANGELOG.
- **Gestión de dependencias**: el bundle solo depende, en runtime, de
  Node mismo — cero dependencias npm que puedan romperse o quedar
  desactualizadas en la instalación del usuario.
- **Separación futura para Pro** (ver `docs/PRO-DESIGN.md`): no se
  pierde nada — `@o2b/core`/`@o2b/scanner` siguen existiendo como
  paquetes internos del monorepo (para desarrollo/tests), simplemente
  no se publican por separado hoy. Si en el futuro un backend de Pro
  necesita importar `@o2b/core` como librería (no como CLI), publicarlo
  por separado en ese momento es una decisión aislada, no bloqueada
  por esta.
- **Tamaño**: el bundle es pequeño (el propio `@o2b/core` sin tests
  pesa ~59KB sin comprimir, ver `docs/AUTONOMOUS-RUN.md` Fase 18 de la
  primera sesión) — nada que justifique la complejidad de 3 paquetes
  separados para este volumen de código.
- **Mantenimiento**: 1 paquete publicado > 3 paquetes publicados, para
  un producto en esta etapa (pre-beta, un solo consumidor real del
  código: el propio CLI).

## Qué NO cambia

`packages/core` y `packages/scanner` siguen siendo paquetes de
workspace normales — el desarrollo, los tests, y `npm test` en la raíz
siguen funcionando exactamente igual. El bundle es solo el artefacto de
**distribución**, generado en build; el código fuente sigue vivo y
editable en `packages/*/src` como siempre.

## Implementación

- `packages/cli/scripts/build.mjs` — bundlea `src/cli.ts` con esbuild
  (ya presente transitivamente vía `tsx`, ahora declarado como
  devDependency explícita) a `dist/o2b.cjs`, formato CommonJS, target
  Node 18, sin dependencias externas empaquetadas (Node built-ins
  externalizados).
- `packages/cli/package.json` — `"bin"` apunta a `dist/o2b.cjs`;
  `"files"` incluye `dist` (no `src`, para el paquete que se
  publicaría — el bundle ya contiene todo). `@o2b/core`/`@o2b/scanner`
  se mueven a `devDependencies` (siguen haciendo falta para
  desarrollar/testear el CLI dentro del monorepo, pero no se declaran
  como dependencia del paquete publicado, porque ya están inlineados
  en el bundle).
- `bin/o2b.js` (el wrapper que usa `tsx` para correr TS sin build) se
  mantiene para el flujo de desarrollo dentro del monorepo (`npm test`,
  `npm run doctor`, etc. lo siguen usando) — el bundle es
  exclusivamente el artefacto para distribución externa.

Ver "CLEAN INSTALL TEST" en `docs/AUTONOMOUS-RUN.md` (Fase J) para la
verificación real de este bundle instalado desde un tarball en un
sandbox limpio, fuera del monorepo.
