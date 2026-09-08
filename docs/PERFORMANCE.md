# Performance — Fase F (segunda sesión autónoma)

Fecha: 2026-09-08. Hardware/software: Node v24.15.0, Windows, 16 CPUs,
34GB RAM (máquina de desarrollo, no un entorno de CI dedicado — los
números son indicativos, no una garantía de SLA). Script reproducible:
`packages/core/tests/perf/benchmark.mjs` (`node --import tsx
packages/core/tests/perf/benchmark.mjs`).

## Baseline medido (sin ninguna optimización previa)

| Skills | Inventory | Conflicts | Doctor (pipeline completo) | Heap delta aprox. |
|---|---|---|---|---|
| 100 | 65.8ms | 24.1ms (4 950 conflictos) | 147.5ms | 8.1MB |
| 500 | 291.1ms | 488.6ms (124 750 conflictos) | 964.7ms | 144.7MB |
| 1000 | 664.3ms | 2 032.1ms (499 500 conflictos) | 3 114.0ms | 516.9MB |

MCP servers y hooks escalan proporcionalmente (1 MCP cada 10 skills, 1
hook cada 20) en el mismo fixture sintético.

## Lectura de los números

**`inventory` escala linealmente** (100→1000 skills: ~10x skills, ~10x
tiempo) — sin sorpresas, es lectura de archivos uno por uno.

**`conflicts` escala cuadráticamente — confirmado, no solo sospechado.**
El detector de `similar-description` compara cada par de skills
(`n·(n-1)/2` comparaciones); con 1000 skills eso son ~500 000
comparaciones, y el conteo de "conflictos encontrados" en la tabla
(499 500) lo confirma exactamente. Esto es **inherente al diseño actual**
(comparación de pares por fuerza bruta), no un bug introducido en esta
sesión — pero antes de este benchmark nunca se había medido con datos
reales a esta escala.

**¿Es esto un problema real?** El entorno real usado en el dogfood de
Fase 2/3 (`docs/DOGFOOD-BASELINE.md`) tenía **14 skills** — a esa
escala, `conflicts` toma ~1-2ms, imperceptible. El bottleneck cuadrático
solo se vuelve notorio con cientos de skills muy similares entre sí
(el fixture sintético usa descripciones casi idénticas a propósito,
para forzar el peor caso). No hay evidencia de que ningún usuario real
tenga cientos de skills con descripciones casi-idénticas.

## Decisión — no optimizar en esta pasada

Siguiendo la instrucción explícita ("primero benchmark, luego
optimización solo si hay un bottleneck significativo, luego benchmark
de nuevo — no optimizar prematuramente"): **no se tocó el algoritmo de
`detectConflicts` en esta sesión.** Optimizarlo correctamente (p. ej.
indexar por n-gramas o usar un umbral de pre-filtrado antes de la
comparación completa) es un cambio de diseño no trivial que merece su
propia verificación dedicada, no un parche apresurado al final de una
sesión ya larga. Se documenta como **known limitation**, con el dato
concreto (peor caso ~2s con 1000 skills muy similares) para que una
sesión futura decida si vale la pena, con qué prioridad, y lo verifique
con su propio benchmark antes/después — exactamente el protocolo que
esta sesión siguió para todo lo demás.

## Hallazgo relacionado, SÍ corregido en esta sesión (Fase E, no F)

Durante la construcción de este benchmark se detectó (vía el test de
ReDoS de Fase E) un bug real de rendimiento **no relacionado con
conflicts**: el motor del scanner (`packages/scanner/src/engine.ts`) y
5 de sus reglas llamaban `content.split('\n')` una vez POR CADA
coincidencia encontrada, degradando a O(hallazgos × tamaño del
archivo). Confirmado empíricamente (20 000 líneas adversariales: 6.2s
antes del fix → 55ms después) y corregido con un índice de líneas
precalculado una sola vez por archivo (`packages/scanner/src/
line-index.ts`). Ver `packages/scanner/tests/security/redos.test.ts` y
`docs/AUTONOMOUS-RUN.md` (Fase E) para el detalle completo.
