# O2B vs. ECC — competitive matrix (updated post-dogfood)

Fecha: 2026-09-08. Reemplaza la versión embebida en `docs/PLAN.md` §12
con datos actualizados tras el dogfood real de Fase 2/3
(`docs/DOGFOOD-BASELINE.md`, `docs/DOGFOOD-POST-HARDENING.md`), no solo
estimaciones de planificación. No se inventan cifras de ECC no
verificables desde este repo — donde no se pudo confirmar algo
directamente, se marca `NOT VERIFIED`.

## Lo que cambió respecto a `docs/PLAN.md` §12

Durante el dogfood, ECC estaba instalado como **plugin** en el entorno
real usado para probar O2B. Esto permitió verificar, no solo estimar,
un hecho central: **antes del hardening de Fase 3, O2B ni siquiera veía
que ECC estaba instalado** (0 plugins detectados). Después del
hardening, O2B detecta el plugin `ecc@ecc` y sus capabilities de
filesystem (`agents`, `skills`, `hooks`, `commands`) — pero **no**
enumera individualmente los agentes/skills que ECC aporta (eso sigue
siendo contenido interno del plugin, fuera del inventario granular de
O2B). Este es el estado real, no un plan.

## Matriz

| Capacidad | ECC (observado en este entorno + docs públicas) | O2B (verificado en este repo) | Diferenciación real |
|---|---|---|---|
| Agentes/skills listos para usar | Decenas de agentes y cientos de skills vía plugin (conteo exacto: `NOT VERIFIED` desde este repo — no se auditó el paquete de ECC) | 3 agentes / 8 skills propios (regla explícita, ver `STATUS.md` regla #4: no inflar contenido) | ECC gana en volumen — O2B no compite ahí por diseño |
| Escáner de seguridad de config de agente | AgentShield (según `docs/PLAN.md` §2, `NOT VERIFIED` en esta sesión — no se auditó AgentShield directamente) | 17 reglas propias, testeadas (16 + `mcp.arg-secret-inlined` agregada en Fase 3), con confianza `measured`/`heuristic` explícita por regla | O2B compite en integrar el hallazgo dentro de un diagnóstico de entorno completo (inventario+conflictos+contexto), no en cantidad de reglas |
| Detección de que ECC/otro plugin está instalado y qué expone | N/A (es el objeto observado, no el observador) | **Verificado en Fase 3**: detecta el plugin, su estado `enabledPlugins`, y qué directorios (agents/skills/hooks/commands) trae — pero no lo que hay *dentro* de cada uno | Diferenciador real y nuevo: O2B ahora puede decir "tienes ECC instalado y aporta hooks" sin que el usuario tuviera que saberlo de antemano — exactamente el caso de valor real observado en el dogfood |
| Inventario normalizado multi-harness (Claude Code + Codex) | No es su función | Sí — núcleo del producto, verificado contra un entorno real con ambos harnesses presentes | Diferenciador real, confirmado con datos reales, no solo diseño |
| Detección de conflictos/duplicados entre fuentes | `NOT VERIFIED` | Sí, Conflict Engine — en el dogfood real detectó 3/3 duplicados de skills con precisión 100% (`docs/DOGFOOD-BASELINE.md`) | Diferenciador real y verificado, no solo un plan |
| Análisis de costo de contexto (honesto, con niveles de confianza) | `NOT VERIFIED` | Sí — y el dogfood reveló que el cálculo real subestimaba el CLAUDE.md global en ~50% antes del fix de Fase 3 (ahora corregido y reverificado) | Diferenciador real, con la honestidad de admitir y corregir su propio error |
| Recomendación de stack (`optimize`) | No es función central documentada, `NOT VERIFIED` | Sí, pero el catálogo de profiles sigue siendo mínimo (1 profile) — no se pudo ejercitar con datos reales de MCP servers en esta sesión (ver `docs/DOGFOOD-POST-HARDENING.md`) | Diferenciador de diseño, valor real todavía no demostrado con más de un profile |
| Automatización vía GitHub App / PR triggers | Sí, según `docs/PLAN.md` §2 (`NOT VERIFIED` en esta sesión) | No implementado, no planeado para Community | ECC gana hoy en este eje — fuera del alcance declarado de O2B |
| Historial de snapshots / diff entre corridas | `NOT VERIFIED` | **Nuevo en Fase 9**: `o2b snapshot`/`o2b diff`, 100% local, sin almacenamiento persistente ni servidor — ver `docs/AUTONOMOUS-RUN.md` | Diferenciador incipiente — base para O2B Pro (historial real), no el historial en sí |

## Respuestas directas (pedidas explícitamente en la Fase 16)

**¿Qué hace O2B hoy que ECC no hace (verificado, no supuesto)?**
Detecta y normaliza en un solo modelo lo que hay instalado *a través de*
Claude Code y Codex simultáneamente — incluyendo, desde esta sesión, si
ECC mismo está instalado y qué expone (plugin, capabilities). Ese es un
ángulo que un generador/proveedor de contenido (que es lo que ECC hace)
estructuralmente no cubre sobre sí mismo ni sobre el resto del entorno.

**¿Qué hace ECC mejor hoy?** Volumen y madurez de contenido listo para
usar (agentes/skills/comandos), y automatización (PR triggers, GitHub
App) — ninguno de los dos es el objetivo de O2B.

**¿Por qué instalar O2B?** Para saber, con evidencia y no solo con
memoria, qué hay realmente instalado en tu entorno de Claude Code/Codex
— incluyendo lo que trajeron los plugins que instalaste (como ECC
mismo) — y si hay secretos expuestos, config redundante, o contradicciones
entre instrucciones globales y de proyecto. El dogfood de Fase 2/3
demostró un caso real: 3 secretos en texto plano que ni una revisión
manual superficial ni la versión anterior de O2B habían detectado.

**¿Por qué eventualmente pagar por O2B Pro?** Historial de score en el
tiempo, sync multi-dispositivo, políticas de equipo compartidas,
auto-apply seguro con rollback para `optimize` — ninguno implementado
todavía (ver `docs/PRO-DESIGN.md`), pero la base local (`snapshot`/
`diff`) ya existe en Community.

**¿Qué falta todavía?** Lectura de MCP servers "local scope" por
proyecto, hooks embebidos en plugins, `.claude/rules/*.md`, más
profiles de `optimize` verificados contra proyectos reales, y
observabilidad de sesión real (LOADED/ACTIVE) — ver
`docs/DOGFOOD-POST-HARDENING.md` y Fase 8 de `docs/AUTONOMOUS-RUN.md`.

## Metodología y límites

No se creó/asumió demanda de mercado, clientes, ni cifras de ECC no
verificables desde este repo. Toda celda marcada `NOT VERIFIED`
significa exactamente eso — no una cifra estimada disfrazada de dato.
