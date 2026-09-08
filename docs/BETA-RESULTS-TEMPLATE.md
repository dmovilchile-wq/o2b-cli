# O2B Beta — Results Log (template)

Plantilla para registrar los resultados de cada tester a medida que
llegan. Usar IDs anónimos (Tester A, Tester B, ...), nunca nombres
reales — no hace falta saber quién es quién para que este registro sea
útil.

Copiar el bloque de abajo una vez por tester.

---

## Tester A

- **Environment**: (OS, Node version)
- **Harnesses**: (Claude Code / Codex / Cursor, cuál principal)
- **Escala aproximada**: MCP servers ___, plugins ___, skills ___
- **Doctor result**: (scores reportados — Security/Configuration/Context/Compatibility)
- **True positives**: (findings confirmados correctos por el tester)
- **False positives**: (findings que el tester marcó como incorrectos)
- **False negatives**: (cosas reales que O2B no detectó, según el tester)
- **Useful findings**: (lo que el tester marcó como valioso)
- **Performance**: (tiempo aproximado de `doctor`, ¿percibido como rápido/lento?)
- **Crashes**: (sí/no, referencia al crash-report si aplica)
- **Would reinstall**: YES / MAYBE / NO
- **Would recommend**: YES / MAYBE / NO
- **Would pay for Pro**: YES / MAYBE / NO — motivo
- **Overall score**: (1-5, o cualitativo)
- **Notas libres**:

---

## Tester B

- **Environment**:
- **Harnesses**:
- **Escala aproximada**: MCP servers ___, plugins ___, skills ___
- **Doctor result**:
- **True positives**:
- **False positives**:
- **False negatives**:
- **Useful findings**:
- **Performance**:
- **Crashes**:
- **Would reinstall**: YES / MAYBE / NO
- **Would recommend**: YES / MAYBE / NO
- **Would pay for Pro**: YES / MAYBE / NO — motivo
- **Overall score**:
- **Notas libres**:

---

## Tester C

(repetir el mismo bloque — copiar tantas veces como testers reales
respondan, hasta 5)

---

## Síntesis (completar después de recibir todas las respuestas)

- **Recall/precisión percibida agregada**: (patrón entre testers, no promedio numérico forzado)
- **Falsos positivos recurrentes**: (si el mismo tipo de finding aparece mal en más de un tester)
- **Falsos negativos recurrentes**:
- **Perfiles de `docs/BETA-TEST-MATRIX.md` cubiertos**: A ☐ B ☐ C ☐ D ☐ E ☐
- **¿Algún crash reproducible entre testers?**
- **Sentimiento general**: (patrón en would-reinstall/would-recommend/would-pay)
- **Próximo paso recomendado**: PUBLISH BETA / SEGUIR EN PRIVADA / CORREGIR ANTES DE AMPLIAR
