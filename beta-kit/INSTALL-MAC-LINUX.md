# Instalación en macOS / Linux (bash / zsh)

Requisito: Node.js 18 o superior instalado (`node --version` para
confirmar).

## 1. Verificar el checksum del tarball

Desde la carpeta donde tenés `o2b-cli-0.2.0-beta.1.tgz` y
`CHECKSUMS.txt` (ambos vienen en este mismo kit):

```bash
shasum -a 256 -c CHECKSUMS.txt
```

Debe imprimir `o2b-cli-0.2.0-beta.1.tgz: OK`.

## 2. Crear una carpeta para la beta e instalar

```bash
mkdir -p ~/o2b-beta && cd ~/o2b-beta
npm init -y
npm install /ruta/completa/a/o2b-cli-0.2.0-beta.1.tgz
```

(Reemplazá `/ruta/completa/a/` por la carpeta real donde tengas el
`.tgz` de este kit.)

## 3. Verificar que funciona

```bash
./node_modules/.bin/o2b --help
```

Si ves el listado de comandos de O2B, la instalación funcionó.

## 4. Correr los comandos

```bash
./node_modules/.bin/o2b doctor
./node_modules/.bin/o2b inventory
./node_modules/.bin/o2b scan
./node_modules/.bin/o2b optimize
./node_modules/.bin/o2b report --sanitize --out reporte-beta.json
```

Seguí con [`TEST-CHECKLIST.md`](TEST-CHECKLIST.md) para marcar qué
funcionó.

## Desinstalar

```bash
cd ~/o2b-beta
npm uninstall @o2b/cli
```

O simplemente borrá la carpeta entera:

```bash
rm -rf ~/o2b-beta
```
