# O2B Pro / Team / Enterprise — design (not implemented)

Fecha: 2026-09-08. Diseño únicamente — **nada de esto está implementado,
desplegado, ni facturado**. No se compraron dominios, no se crearon
cuentas externas, no se contrató ningún servicio para este documento.
Ver `packages/core/src/edition.ts` para el único artefacto de código que
existe hoy relacionado con esto: una lista tipada e inerte de flags de
edición, sin lógica de licensing real detrás.

## Principio de separación

**Community (open-source, este repo)**: 100% local, read-only,
sin cuenta, sin red. Todo lo implementado hasta ahora (`doctor`,
`inventory`, `scan`, `optimize`, `snapshot`, `diff`) vive y vivirá aquí,
sin degradarse nunca a cambio de vender Pro — el Community core no debe
volverse una demo capada.

**Pro/Team/Enterprise (comercial, no implementado)**: todo lo que
requiere estado compartido entre sesiones/dispositivos/personas, o
automatización que actúa sobre el entorno real (`--apply`). Vive en un
backend separado; el CLI Community nunca depende de él para funcionar.

## O2B Pro (individual)

- **Historial de score en el tiempo**: además de `o2b snapshot`/
  `o2b diff` (ya en Community, 100% local), Pro almacenaría snapshots
  en una cuenta del usuario para verlos sin gestionar archivos a mano.
- **Sync multi-dispositivo**: mismo historial visible desde más de una
  máquina.
- **`optimize --apply` con rollback**: la única forma en que O2B
  escribiría alguna vez en `~/.claude`/`~/.codex` — y solo bajo Pro,
  solo con confirmación explícita por cambio, y solo con un mecanismo
  de rollback verificado antes de existir en Community. **No existe
  hoy en ninguna edición.**
- **Rule packs actualizados**: reglas de seguridad más allá de las 17
  que ya son públicas en Community, actualizadas con mayor frecuencia
  que un release de código.
- **Session observability opt-in**: telemetría LOCAL (nunca subida sin
  consentimiento explícito) de qué se usó realmente en una sesión — ver
  la Fase 8 de `docs/AUTONOMOUS-RUN.md` para el spike de viabilidad
  técnica que sustenta esto (o su bloqueo, si no fue viable en esta
  sesión).

## O2B Team

- **Profiles/policies compartidos**: un equipo define qué MCP
  servers/skills son `RECOMMENDED` para su stack una vez, no cada
  desarrollador por separado.
- **Integración con GitHub**: reportar el estado de Doctor como check
  de PR (análogo, no copiado, a lo que ECC ya hace con AgentShield —
  ver `docs/COMPETITIVE-MATRIX.md`, donde ECC gana hoy en este eje).
- **Audit trail**: quién corrió `optimize --apply` y cuándo, a nivel de
  equipo.

## O2B Enterprise

- **SSO/RBAC**: control de acceso a los reportes/historial a nivel de
  organización.
- **Fleet management**: visibilidad agregada de la salud de Doctor a
  través de muchos repos/equipos, sin acceso al contenido de cada
  CLAUDE.md individual (privacy-first se mantiene incluso a escala).

## Qué NO se hizo en este pase (por diseño, y porque el usuario lo prohibió explícitamente)

No se implementó billing real, no se contrató ningún servicio de
autenticación/pagos, no se compró ningún dominio, no se creó ninguna
cuenta externa, no se desplegó infraestructura. Este documento es
exclusivamente arquitectura futura — su valor es dejar clara la frontera
entre lo que ya es Community y lo que requeriría un backend nuevo, para
que una futura sesión (con autorización explícita) pueda empezar a
construirlo sin tener que re-decidir esta separación desde cero.
