// Builds dist/index.single.html: the whole site in ONE file — code, styles, config, icon AND photos inlined.
// Handy for sending the site as a single attachment. Run after `npm run build`.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const read = (f) => readFileSync(join(dist, f), 'utf8');

const result = await esbuild.build({
  entryPoints: [join(root, 'src/main.tsx')],
  bundle: true,
  write: false,
  outdir: '/virtual',
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: true,
  jsx: 'automatic',
  loader: { '.webp': 'dataurl', '.woff2': 'dataurl' },
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = result.outputFiles.find((f) => f.path.endsWith('.css')).text;

let html = read('index.html');
const fav = 'data:image/svg+xml,' + encodeURIComponent(read('favicon.svg').trim());
html = html
  .replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">', () => `<link rel="icon" href="${fav}" type="image/svg+xml">`)
  .replace('<link rel="stylesheet" href="app.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script src="config.js"></script>', () => `<script>\n${read('config.js')}</script>`)
  .replace('<script src="app.js" defer></script>', () => `<script>\n${js.replace(/<\/script/g, '<\\/script')}\n</script>`);
if (/(src|href)="(app\.js|app\.css|config\.js)"/.test(html)) throw new Error('inlining failed');
writeFileSync(join(dist, 'index.single.html'), html);
console.log('dist/index.single.html', (html.length / 1024).toFixed(0), 'KB');
