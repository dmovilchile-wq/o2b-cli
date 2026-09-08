# O2B — STATUS (leer esto primero en cualquier sesión nueva)

Última actualización: 2026-09-08. Ver `docs/PLAN.md` para la intención
original del producto; este archivo es el estado real de avance.

## Dónde estamos

- **Fase 1 (MVP core): COMPLETA.**
- **Fase 1.1 (hardening/validación): COMPLETA.** 112/112 tests pasando.
- **Fase 2 (dogfood read-only contra `~/.claude` real del usuario):
  EJECUTADA el 2026-09-08.** Resultado completo en
  `docs/DOGFOOD-BASELINE.md`. Validación: **MODERATE**. Recomendación:
  **CONDITIONAL GO** — no avanzar a beta pública ni a `--apply` hasta
  corregir 3 bugs críticos de cobertura (ruta de `CLAUDE.md` global, MCP
  servers leídos solo desde `.mcp.json` y no desde `~/.claude.json`,
  detección de plugins no implementada). Ningún archivo fuera de este
  repo fue modificado durante el dogfood.
- **No publicado.** Sin git remoto, sin npm publish, sin push a GitHub.
  Repo git local inicializado en esta misma carpeta para poder seguir
  trabajando con historial.

## Reglas que siguen vigentes (no relajar sin que el usuario lo pida)

1. Nunca escribir/modificar `~/.claude`, `~/.codex`, `CLAUDE.md` real,
   plugins/MCP/hooks reales. Todos los adapters son de solo lectura
   (`fs.readFile`/`readdir`/`access` únicamente) — verificado con grep y
   con tests de privacidad (`packages/core/tests/privacy/`).
2. `o2b optimize` es solo-recomendación; `--apply` no existe todavía.
3. No copiar código/reglas/texto de `affaan-m/ECC` ni `affaan-m/agentshield`
   — todo el código de este repo es original.
4. No inflar contenido: **3 agentes, 8 skills, 16 reglas de seguridad**.
   No agregar más "porque ECC tiene más" — la ventaja de O2B es
   Doctor/Inventory/Conflicts/Context/Optimize, no volumen de contenido.
5. No inventar capacidades de Codex sin verificación oficial — ver
   `docs/CODEX-ADAPTER-NOTES.md`.
6. No prometer métricas sin evidencia — cualquier score debe declarar su
   método (`measured`/`heuristic`/`estimated`/`unknown`).

## Qué existe y dónde

```
O2B/
  STATUS.md                 <- este archivo, leer primero
  docs/PLAN.md              <- plan original completo (v3, aprobado)
  docs/PRIVACY.md           <- principios privacy-first
  docs/CODEX-ADAPTER-NOTES.md <- verificado vs. UNKNOWN de Codex
  docs/CONTEXT-SCORING.md   <- fórmula del Context Configuration Score + tabla real
  docs/GOLDEN-DEMO.md       <- catálogo de problemas plantados en demo-environment/
  README.md, LICENSE (MIT), .env.example (sin variables — justificado)
  packages/
    core/    -> @o2b/core: dominio, adapters (Claude+Codex), inventory,
                doctor, conflicts, context, optimize, report (schema+compare)
    scanner/ -> @o2b/scanner: 16 reglas + engine + redact
    cli/     -> @o2b/cli: comandos doctor/optimize, exit codes 0/1/2/3
  agents/    -> planner.md, code-reviewer.md, security-reviewer.md
  skills/    -> 8 skills (plan-first, code-review, security-scan,
                secrets-audit, mcp-review, context-budget-audit,
                git-workflow, verification-loop)
  profiles/  -> node-web.profile.json (datos de optimize)
  demo-environment/ -> golden demo reproducible, con fake-home/ propio
```

## Evidencia de la Fase 1.1 (resumen — detalle completo en el chat/PR)

- **Tests**: 112/112 PASS (`npm test` en la raíz corre los 3 workspaces).
- **Coverage** (`@vitest/coverage-v8`): core 91.9% stmts / 78.77% branch;
  scanner 97.24% stmts / 89.65% branch. Áreas antes en 0% (ContextAnalyzer,
  Doctor, build-report) ahora en 99-100%.
- **CodexAdapter**: 11 tests dedicados, formato TOML verificado contra
  documentación real (no inventado).
- **Golden demo**: `redundant-mcp` demostrado con un par inequívoco
  (`github-mcp`/`github-mcp-server`) Y un caso conservador documentado que
  a propósito NO se marca (`playwright`/`playwright-mcp-extra`, similitud
  bajo el umbral 0.6).
- **Context Configuration Score**: renombrado desde "Context Efficiency"
  porque el umbral de 20,000 tokens es arbitrario, no validado
  empíricamente — ver `docs/CONTEXT-SCORING.md` para la tabla real
  fixture→tokens→score.
- **Privacidad**: 8 tests de regresión (secretos nunca completos, env solo
  nombres, cero red, cero escritura a disco).
- **CLI**: 5 tests E2E con procesos reales spawneados, confirmando los 4
  exit codes (0/1/2/3).
- **Schema**: `DOCTOR_REPORT_SCHEMA_VERSION = 1`, con tests de
  serialización/round-trip.

## Próximo paso (cuando el usuario lo autorice explícitamente)

**Fase 2**: correr `o2b doctor` (y opcionalmente `o2b optimize`) en modo
estrictamente read-only contra la configuración real de Claude Code del
usuario (`~/.claude` real, sin `--home` de prueba), comparar el reporte
contra lo que el usuario sabe que tiene instalado, y ajustar reglas/
conflictos/profiles según lo que aparezca. **No iniciar esto sin pedido
explícito del usuario en la conversación**, incluso si este archivo dice
que Fase 1.1 está completa.

## Cosas menores pendientes (no bloquean Fase 2, quedan anotadas)

- `docs/ARCHITECTURE.md` y `docs/PROFILES.md` mencionados en el plan
  original todavía no se escribieron como archivos separados (su contenido
  vive repartido en `docs/PRIVACY.md`, `docs/CODEX-ADAPTER-NOTES.md`,
  `docs/CONTEXT-SCORING.md`, y los comentarios de `edition.ts`).
- `docs/COMPETITIVE-MATRIX.md` standalone no se creó — la matriz vive en
  `docs/PLAN.md` §12.
- Gaps de cobertura menores y no críticos: `edition.ts` (flags inertes),
  barrels `index.ts` (solo re-exports), un par de branches en
  `optimize/detectors.ts` y `optimize/profiles.ts`.
