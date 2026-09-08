import { promises as fs } from 'node:fs';
import { runDoctorCommand } from './commands/doctor.js';
import { runOptimizeCommand } from './commands/optimize.js';
import { runScanCommand } from './commands/scan.js';
import { runInventoryCommand } from './commands/inventory.js';
import { runSnapshotCommand } from './commands/snapshot.js';
import { runDiffCommand } from './commands/diff.js';
import { runReportCommand } from './commands/report.js';
import { EXIT_EXECUTION_ERROR } from './exit-codes.js';
import { buildCrashReport } from './crash-report.js';

const O2B_VERSION = '0.2.0-beta.1';

function printHelp(): void {
  console.log('O2B — AI Coding Environment Manager (BETA)');
  console.log('');
  console.log('Uso: o2b <comando> [rootDir] [opciones]');
  console.log('');
  console.log('Comandos:');
  console.log('  doctor [rootDir]           Diagnóstico read-only completo (inventario, seguridad, conflictos, contexto)');
  console.log('  inventory [rootDir]        Solo el inventario detectado (agents/skills/mcp/hooks/plugins/instruction sources)');
  console.log('  scan [rootDir]             Solo los hallazgos de seguridad (para gates de CI)');
  console.log('  optimize [rootDir]         Recomendaciones read-only según el stack detectado');
  console.log('  snapshot [rootDir]         Guarda un reporte de doctor a un archivo JSON (--out <file>)');
  console.log('  diff <before.json> <after.json>   Compara dos snapshots guardados con `snapshot`');
  console.log('  report [rootDir] --sanitize   Reporte sanitizado (sin tu home/ruta real) apto para compartir como feedback');
  console.log('');
  console.log('Opciones comunes:');
  console.log('  --json          Salida en JSON estable, apta para scripts (nunca cambia de forma entre versiones menores)');
  console.log('  --home <dir>    Usa <dir> como home en vez de process.env.HOME/USERPROFILE (para probar contra fixtures)');
  console.log('  --quiet         Solo lo esencial: findings y el resumen, sin explicaciones extendidas');
  console.log('  --strict        Trata cualquier hallazgo de seguridad (no solo critical/high) como fallo de CI (exit 2)');
  console.log('  --no-color      Desactiva colores ANSI (también se desactivan automáticamente si no hay TTY, o si NO_COLOR está seteado)');
  console.log('  --profiles-dir <dir>   Solo para `optimize`: directorio de profiles alternativo');
  console.log('  --out <file>    Ruta de salida (`snapshot`/`report`)');
  console.log('  --crash-report <file>   Si un comando falla, guarda un reporte de error sanitizado en <file> (nunca secrets/env/rutas home completas)');
  console.log('  --verbose       Muestra el stack trace técnico completo si algo falla (por defecto se oculta)');
  console.log('');
  console.log('Exit codes: 0 = sin hallazgos, 1 = hallazgos de advertencia, 2 = hallazgo crítico/alto, 3 = error de ejecución de O2B.');
  console.log('Todos los comandos son estrictamente read-only sobre tu configuración de IA: nunca escriben, mueven ni borran nada bajo ~/.claude, ~/.codex o ~/.cursor.');
  console.log('Antes de usarlo, lee docs/BETA-QUICKSTART.md (qué lee O2B, qué NO modifica nunca, garantías de privacidad).');
}

async function main(): Promise<number> {
  const [, , command, ...args] = process.argv;
  const verbose = args.includes('--verbose');
  const crashReportIdx = args.indexOf('--crash-report');
  const crashReportPath = crashReportIdx !== -1 && args[crashReportIdx + 1] ? args[crashReportIdx + 1] : undefined;

  try {
    switch (command) {
      case 'doctor':
        return await runDoctorCommand(args);
      case 'inventory':
        return await runInventoryCommand(args);
      case 'scan':
        return await runScanCommand(args);
      case 'optimize':
        return await runOptimizeCommand(args);
      case 'snapshot':
        return await runSnapshotCommand(args);
      case 'diff':
        return await runDiffCommand(args);
      case 'report':
        return await runReportCommand(args);
      case undefined:
      case '--help':
      case '-h':
        printHelp();
        return 0;
      default:
        console.error(`Comando desconocido: "${command}". Ejecuta "o2b --help" para ver los comandos disponibles.`);
        return EXIT_EXECUTION_ERROR;
    }
  } catch (err: any) {
    // Never dump a raw stack trace at a normal user — only under --verbose.
    console.error(`o2b ${command ?? ''}: ${err?.message ?? String(err)}`.trim());
    if (verbose && err?.stack) console.error(err.stack);
    else console.error('(pasa --verbose para ver el detalle técnico completo)');

    if (crashReportPath) {
      const report = buildCrashReport(err, {
        o2bVersion: O2B_VERSION,
        command: command ?? '(none)',
        includeStack: verbose,
        harnessesDetected: [], // best-effort: the failing command may not have reached detection
      });
      try {
        await fs.writeFile(crashReportPath, JSON.stringify(report, null, 2), 'utf8');
        console.error(`Reporte de error sanitizado guardado en ${crashReportPath} — puedes adjuntarlo al reportar el bug.`);
      } catch {
        console.error(`No se pudo escribir el reporte de error en ${crashReportPath}.`);
      }
    }

    return EXIT_EXECUTION_ERROR;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = EXIT_EXECUTION_ERROR;
  });
