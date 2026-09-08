# Privacy-first — principio arquitectónico, no comportamiento accidental

Esto no es una lista de features: es una restricción de diseño que el código
de `packages/core`, `packages/scanner` y `packages/cli` debe cumplir en todo
momento durante la Fase 1 (Community).

1. **Procesamiento 100% local.** `o2b doctor`, `o2b optimize` y `o2b scan`
   no hacen ninguna llamada de red. Los adapters (`ClaudeCodeAdapter`,
   `CodexAdapter`) solo usan `fs.readFile`/`readdir`/`access`; el motor del
   scanner opera sobre contenido ya leído en memoria.
2. **Cero telemetría, cero uploads.** Ningún comando de la Fase 1 reporta
   uso, errores ni resultados a un servidor de O2B ni de terceros.
3. **Cero llamadas externas necesarias para `doctor`.** El diagnóstico
   completo funciona sin conexión a internet.
4. **Cero secretos completos en reportes.** Todo hallazgo de tipo `secrets`
   pasa por `packages/scanner/src/redact.ts` antes de llegar a un
   `SecurityFinding.evidence` — se muestra prefijo+sufijo con el medio
   enmascarado, nunca el valor completo.
5. **Variables de entorno: solo nombres, nunca valores.** El modelo
   `MCPServer.envVarNames` guarda las claves (`Object.keys(def.env)`), nunca
   `def.env` completo — ver `packages/core/src/adapters/claude-code/index.ts`.
6. **Rutas sensibles anonimizables en exportaciones.** El `DoctorReport`
   (`packages/core/src/domain/types.ts`) registra `environment.rootDirLabel`
   como el *basename* del proyecto, no la ruta absoluta completa — ver
   `buildDoctorReport()`. Los reportes en terminal sí muestran rutas
   completas (útiles para navegar al archivo), pero el reporte serializado
   pensado para compartir/almacenar no las incluye por defecto.
7. **Cualquier sincronización cloud futura (O2B Pro) debe ser opt-in
   explícito**, nunca activada por defecto ni como efecto secundario de
   instalar O2B.

**Verificación:** `grep -rn "writeFile\|unlink\|fs.rm(" packages/*/src` no
debe devolver ninguna operación real de escritura/borrado fuera de
comentarios o texto de reglas — es el chequeo que se corrió antes de cerrar
la Fase 1 (ver evidencia de la sesión de implementación).
