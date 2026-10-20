// Bundles the site into ./dist with esbuild.
// Output is a classic (non-module) script so dist/index.html also works when opened
// straight from disk, without a server.
import * as esbuild from 'esbuild';
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const watch = process.argv.includes('--watch');
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

await mkdir(dist, { recursive: true });
for (const f of await readdir(join(root, 'public'))) {
  await copyFile(join(root, 'public', f), join(dist, f));
}

const options = {
  entryPoints: { app: join(root, 'src/main.tsx') },
  bundle: true,
  outdir: dist,
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: !watch,
  sourcemap: watch,
  jsx: 'automatic',
  loader: { '.webp': 'file', '.woff2': 'file' },
  assetNames: 'assets/[name]-[hash]',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching src/ … run `npm run serve` in another terminal.');
} else {
  const result = await esbuild.build({ ...options, metafile: true });
  const out = Object.entries(result.metafile.outputs)
    .map(([file, o]) => `${file.replace(root, '')}  ${(o.bytes / 1024).toFixed(1)} KB`)
    .join('\n');
  console.log(out);
}
