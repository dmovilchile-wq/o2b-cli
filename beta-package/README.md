# O2B Private Beta — 0.2.0-beta.1

Este directorio contiene el paquete de beta privada, listo para
entregar manualmente a testers. **No está publicado en npm.**

## Contenido

- `o2b-cli-0.2.0-beta.1.tgz` — el paquete instalable.
- `CHECKSUMS.txt` — SHA-256 del tarball, para verificar integridad
  antes de instalar.

## Instrucciones completas

Ver [`docs/BETA-QUICKSTART.md`](../docs/BETA-QUICKSTART.md) en la raíz
del repo — instalación, los 5 comandos principales, cómo generar un
reporte sanitizado, y cómo desinstalar.

## Verificar el checksum antes de instalar

```bash
sha256sum -c CHECKSUMS.txt
```

## Instalar

```bash
mkdir -p ~/o2b-beta && cd ~/o2b-beta
npm init -y
npm install /ruta/a/este/directorio/o2b-cli-0.2.0-beta.1.tgz
```
