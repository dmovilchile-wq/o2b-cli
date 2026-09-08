# Session observability — experimental spike (Fase D)

Prototipo aislado. Ver `docs/SESSION-OBSERVABILITY-SPIKE.md` para la
investigación completa.

**Nunca instalado en `~/.claude` real.** Probado únicamente vía
`node --test experimental/session-observability/hook-logger.test.mjs`
(sandbox, directorios temporales) y con JSON sintético manual por stdin.

No forma parte del paquete `@o2b/*` publicable — vive fuera de
`packages/` deliberadamente, y no se referencia desde ningún
`package.json` de los workspaces (no se instala como dependencia de
nada).
