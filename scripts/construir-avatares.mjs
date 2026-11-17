import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [path.join(raiz, 'scripts', 'avatares-entrada.mjs')],
  outfile: path.join(raiz, 'js', 'vendor', 'avatares.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  legalComments: 'none',
  logLevel: 'info'
});
