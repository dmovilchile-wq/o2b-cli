#!/usr/bin/env node
// Re-exec Node with tsx registered via --import so the CLI's TypeScript
// source can run without a separate build step. `--import` needs an
// absolute resolvable specifier — resolving it relative to *this file*
// (not the caller's cwd, which may be an unrelated project being
// diagnosed) is what makes `o2b doctor` work when invoked from any
// directory.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.join(here, '..', 'src', 'cli.ts');
const tsxLoaderUrl = import.meta.resolve('tsx/esm');

const result = spawnSync(
  process.execPath,
  ['--import', tsxLoaderUrl, cliEntry, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
