import { runDoctorCommand } from './commands/doctor.js';
import { runOptimizeCommand } from './commands/optimize.js';
import { EXIT_EXECUTION_ERROR } from './exit-codes.js';

async function main(): Promise<number> {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case 'doctor':
      return runDoctorCommand(args);
    case 'optimize':
      return runOptimizeCommand(args);
    default:
      console.log('O2B — AI Coding Environment Manager');
      console.log('');
      console.log('Uso: o2b <comando> [rootDir] [--json] [--home <dir>]');
      console.log('  doctor [rootDir]     Diagnóstico read-only del entorno de IA (inventario, seguridad, conflictos, contexto)');
      console.log('  optimize [rootDir]   Recomendaciones read-only según el stack detectado (--profiles-dir <dir> opcional)');
      return command ? EXIT_EXECUTION_ERROR : 0;
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
