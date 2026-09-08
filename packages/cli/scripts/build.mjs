#!/usr/bin/env node
// Fase J (packaging) — bundles the CLI + its @o2b/core and @o2b/scanner
// workspace dependencies into one self-contained CommonJS file, so a
// published tarball works outside this monorepo (no "*" workspace
// references left to resolve). See docs/PACKAGING-DECISION.md.
import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, '..', 'src', 'cli.ts');
const distDir = path.join(here, '..', 'dist');
const outfile = path.join(distDir, 'o2b.mjs');
const profilesSrc = path.join(here, '..', '..', '..', 'profiles');
const profilesDest = path.join(distDir, 'profiles');

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node18',
  // ESM, not CJS: several commands rely on `import.meta.url` (to resolve
  // the bundled default profiles directory) — esbuild leaves
  // import.meta empty under "cjs" output, which silently breaks that
  // resolution. Confirmed by an esbuild warning during the first build
  // attempt of this Fase J packaging work; matches the source's own
  // "type": "module" anyway.
  format: 'esm',
  banner: { js: '#!/usr/bin/env node' },
  // Node built-ins are external by default under platform:'node'; nothing
  // else needs to be external because everything O2B imports (@o2b/core,
  // @o2b/scanner) is our own workspace source, meant to be inlined.
});

await mkdir(distDir, { recursive: true });
await cp(profilesSrc, profilesDest, { recursive: true });

console.log(`Bundled ${entry} -> ${outfile}`);
console.log(`Copied ${profilesSrc} -> ${profilesDest}`);
