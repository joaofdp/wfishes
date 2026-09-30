import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
// every page shares one masthead and footer: <!--masthead--> and <!--footer--> are filled at build/dev time,
// and the link for the current page gets aria-current (no framework needed for four pages)
const partials = {
  name: 'studio-partials',
  transformIndexHtml(html, ctx) {
    const page = '/' + relative(root, ctx.filename).replace(/index\.html$/, '');
    const mast = readFileSync(resolve(root, 'partials/masthead.html'), 'utf8')
      .replace(`href="${page}"`, `href="${page}" aria-current="page"`);
    const out = html.replace('<!--masthead-->', mast).replace('<!--footer-->', readFileSync(resolve(root, 'partials/footer.html'), 'utf8'));
    const preload = ['400', '500'].map(w => ({ tag: 'link', attrs: { rel: 'preload', href: `/fonts/helvetica-neue-${w}.woff2`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }));
    return { html: out, tags: preload };
  },
};
const pages = { home: 'index.html', latitud: 'work/latitud/index.html', noise: 'work/noise/index.html', mutuals: 'work/mutuals/index.html', notfound: '404.html' };
// builds into ./dist, the folder cloudflare serves (wrangler.jsonc: assets.directory). 404.html is the page cloudflare answers unknown urls with.
// appType 'mpa': dev and preview answer unknown urls with a real 404 instead of the home page
export default defineConfig({
  root, base: '/', appType: 'mpa', cacheDir: root + '.vite-cache', plugins: [partials],
  server: { host: '127.0.0.1', port: 4336, strictPort: true },
  preview: { host: '127.0.0.1', port: 4335, strictPort: true },
  build: { outDir: root + 'dist', emptyOutDir: true,
    rollupOptions: { input: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, resolve(root, v)])) } },
});
