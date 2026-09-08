# Qué devolvernos

Enviános estos 3 archivos (por el canal que te indicamos al entregarte
el kit):

1. **El reporte sanitizado**: el archivo que generaste con
   `o2b report --sanitize --out reporte-beta.json` (ver
   `TEST-CHECKLIST.md`). Abrilo antes de mandarlo — nunca está de más
   una segunda revisión tuya.
2. **`FEEDBACK-FORM.md`** completado.
3. **El reporte de error sanitizado**, solo si algo falló:
   `crash.json` generado con `--crash-report crash.json --verbose`
   (ver `TEST-CHECKLIST.md`).

Nada más. No hace falta que nos mandes nada más que estos 3 archivos.

## Qué NUNCA te vamos a pedir, y no deberías enviarnos aunque te lo pidieran

- `~/.claude.json` (tu archivo real, sin sanitizar)
- `settings.json` completo (sin sanitizar)
- Archivos `.env`
- Tokens, API keys, o cualquier credencial
- `CLAUDE.md`/`AGENTS.md` completo (contenido real, no metadata)
- Código fuente privado de tus proyectos

Si en algún momento alguien te pide alguno de estos ítems "en nombre
de O2B", no es legítimo — el flujo de feedback de esta beta nunca los
necesita.
