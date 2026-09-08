# Instalación en Windows (PowerShell)

Requisito: Node.js 18 o superior instalado (`node --version` para
confirmar).

## 1. Verificar el checksum del tarball

Abrí PowerShell en la carpeta donde tenés `o2b-cli-0.2.0-beta.1.tgz` y
`CHECKSUMS.txt` (ambos vienen en este mismo kit).

```powershell
Get-FileHash .\o2b-cli-0.2.0-beta.1.tgz -Algorithm SHA256
```

Compará el resultado con el hash que aparece en `CHECKSUMS.txt`. Deben
coincidir exactamente.

## 2. Crear una carpeta para la beta e instalar

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\o2b-beta"
Set-Location "$env:USERPROFILE\o2b-beta"
npm init -y
npm install "C:\ruta\completa\a\o2b-cli-0.2.0-beta.1.tgz"
```

(Reemplazá `C:\ruta\completa\a\` por la carpeta real donde tengas el
`.tgz` de este kit.)

## 3. Verificar que funciona

```powershell
.\node_modules\.bin\o2b.cmd --help
```

Si ves el listado de comandos de O2B, la instalación funcionó.

## 4. Correr los comandos

```powershell
.\node_modules\.bin\o2b.cmd doctor
.\node_modules\.bin\o2b.cmd inventory
.\node_modules\.bin\o2b.cmd scan
.\node_modules\.bin\o2b.cmd optimize
.\node_modules\.bin\o2b.cmd report --sanitize --out reporte-beta.json
```

Seguí con [`TEST-CHECKLIST.md`](TEST-CHECKLIST.md) para marcar qué
funcionó.

## Desinstalar

```powershell
Set-Location "$env:USERPROFILE\o2b-beta"
npm uninstall @o2b/cli
```

O simplemente borrá la carpeta entera:

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\o2b-beta"
```
