# O2B Beta — Test Checklist

Marcá cada comando con ✅ (funcionó como esperabas), ⚠️ (funcionó pero
algo raro pasó — anotá qué), o ❌ (falló/crasheó). Un par de líneas de
nota alcanza, no hace falta detalle exhaustivo.

| Comando | ✅ / ⚠️ / ❌ | Notas |
|---|---|---|
| `o2b --help` | | |
| `o2b doctor` | | |
| `o2b inventory` | | |
| `o2b scan` | | |
| `o2b optimize` | | |
| `o2b report --sanitize` | | |

## Si algo falló (❌ o ⚠️)

Corré el mismo comando agregando `--crash-report crash.json --verbose`
y guardá `crash.json` — es un reporte sanitizado del error (sin
secretos, sin tu ruta home real), nos ayuda muchísimo a reproducirlo.

```bash
o2b <comando-que-falló> --crash-report crash.json --verbose
```

## Cuando termines

Completá [`FEEDBACK-FORM.md`](FEEDBACK-FORM.md) y seguí las
instrucciones de [`SEND-BACK.md`](SEND-BACK.md) para devolvernos todo.
