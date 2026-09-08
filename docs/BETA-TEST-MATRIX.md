# O2B — Beta Test Matrix

No es una lista de personas a conseguir — es qué queremos observar en
cada perfil, para que cuando lleguen 3-5 testers reales sepamos si
cubrimos casos distintos o si accidentalmente los 5 tienen setups
parecidos y no aprendemos nada nuevo.

| Perfil | Qué buscamos observar | Riesgo específico a vigilar |
|---|---|---|
| **A. Claude Code complejo** (muchos plugins, MCP servers, hooks, historial largo de uso) | ¿El inventario completo se ve razonable? ¿`detectConflicts` tarda perceptiblemente (ver `docs/PERFORMANCE.md`, O(n²))? ¿Aparecen secretos reales en `scan` que el usuario no sabía que estaban expuestos? | Máxima superficie — el perfil más parecido al dogfood interno (`docs/DOGFOOD-FINAL.md`), así que es donde más confiamos en la precisión, pero también donde el rendimiento y el volumen de hallazgos podrían abrumar |
| **B. Codex principalmente** (poco o nada de Claude Code) | ¿El warning explícito de "agents/skills no reportados para Codex" se entiende, o confunde? ¿El usuario espera más de Codex de lo que O2B puede dar honestamente? | Codex es el harness con menos cobertura por diseño (sin plugins/skills) — validar que la honestidad ("no sabemos") se lea bien y no como un bug |
| **C. Cursor principalmente** | Cursor es el adapter más nuevo (esta misma sesión) — ¿detecta bien `.cursor/mcp.json` y `.cursor/rules/*.mdc` reales? ¿El usuario nota que agents/skills/hooks de Cursor no se reportan (por falta de spec verificada) y le parece razonable o una carencia grave? | El único harness sin dogfood real todavía — este es literalmente el primer uso contra un Cursor real fuera de fixtures sintéticos |
| **D. Entorno mínimo/limpio** (recién instalado, pocos o ningún MCP/skill/plugin) | ¿`doctor` da un reporte sensato con casi todo en 0/vacío? ¿Los scores se ven razonables (100/100 esperado) sin parecer "no hizo nada"? ¿`optimize` sin stack detectado se comunica bien? | El caso "no hay nada que encontrar" — validar que O2B comunique bien la ausencia de problemas sin parecer roto o inútil |
| **E. Entorno con muchos plugins/MCP** (posiblemente > 100 skills combinadas) | Rendimiento real bajo carga — ¿confirma o contradice el benchmark sintético de `docs/PERFORMANCE.md`? ¿`detectConflicts` se vuelve molesto en la práctica? | El único perfil que podría tocar de verdad el bottleneck O(n²) ya documentado — si aparece, es la señal real (no sintética) que justificaría priorizar esa optimización |

## Qué pedirle a cada tester, independientemente del perfil

1. Instalar siguiendo `docs/BETA-QUICKSTART.md`.
2. Correr los 5 comandos contra su entorno real (no un `--home` de prueba).
3. Completar `docs/BETA-FEEDBACK.md`.
4. Adjuntar el `report --sanitize` si está dispuesto.

## Qué NO pedirle

Config real completa, secretos, o cualquier archivo sin sanitizar. El
`report --sanitize` y las preguntas de `BETA-FEEDBACK.md` están
diseñados específicamente para no necesitar eso.
