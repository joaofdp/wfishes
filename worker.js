// this worker runs for three things only (wrangler.jsonc: run_worker_first): the videos and the two private proposals,
// /colossus and /longi.
//
// the videos: cloudflare's static assets answer a Range request with the whole file and a 200. iphones ask for byte ranges
// before they play a video and can refuse that 200 (webkit bug 284443), so this worker answers a range with a real 206.
//
// the proposals: a password page, then a cookie for 30 days. each password's sha-256 is below; a secret set on the worker
// in cloudflare overrides it (PASSWORD for /colossus, LONGI_PASSWORD for /longi). /colossus is built into public/colossus
// by the colossus project (deck/tools/build-site.cjs); /longi is copied into public/longi by the longi project
// (tools/build-site.py).
const PRIVATE = {
  colossus: {
    sha256: 'cc7e751338952cf8aff2563cb8cd715b731f41885ac9a81955bb93a452c3ef0e', secret: 'PASSWORD', cookie: 'wf_colossus',
    lang: 'en', title: 'weird fishes x colossus', h1: 'colossus, 2027', line: 'a proposal from weird fishes, for the colossus team.',
    placeholder: 'password', button: 'open', wrong: 'that’s not the password. try again?', date: 'November, 2026',
  },
  longi: {
    sha256: 'ff8e4e4b4ba8245b2530ca41dbf396c643b3548d80dd4be5c934bf0701039dc9', secret: 'LONGI_PASSWORD', cookie: 'wf_longi',
    lang: 'pt-BR', title: 'weird fishes x longi', h1: 'longi, 2027', line: 'uma proposta da weird fishes para a longi.',
    placeholder: 'senha', button: 'abrir', wrong: 'essa não é a senha. tenta de novo?', date: 'Novembro, 2026',
  },
};
const quiet = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function gate(name, p, wrong) {
  return new Response(`<!doctype html>
<html lang="${p.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${p.title}</title>
<style>
@font-face { font-family: "Helvetica Neue"; font-weight: 400; src: local("Helvetica Neue"), url("/fonts/helvetica-neue-400.woff2") format("woff2"); }
html, body { margin: 0; height: 100%; background: #fff; color: #141414; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
main { box-sizing: border-box; min-height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 8vw 60px; }
h1 { margin: 0 0 10px; font-weight: 400; font-size: clamp(40px, 6vw, 84px); line-height: 1.02; letter-spacing: -0.025em; }
p { margin: 0 0 32px; font-size: clamp(17px, 1.7vw, 22px); color: #85857f; }
form { display: flex; gap: 10px; width: 100%; max-width: 480px; }
input { flex: 1; min-width: 0; font: inherit; font-size: 18px; padding: 13px 15px; border: 1px solid #dcdcd7; border-radius: 9px; outline: none; }
input:focus { border-color: #5450d0; }
button { font: inherit; font-size: 18px; padding: 13px 20px; border: 0; border-radius: 9px; background: #141414; color: #fff; cursor: pointer; }
.no { margin: 16px 0 0; font-size: 16px; color: #b3261e; }
footer { position: fixed; left: 0; right: 0; bottom: 24px; text-align: center; font-size: 13px; }
footer span + span { margin-left: 18px; }
</style></head>
<body><main>
<h1>${p.h1}</h1>
<p>${p.line}</p>
<form method="post" action="/${name}/"><input type="password" name="password" placeholder="${p.placeholder}" aria-label="${p.placeholder}" autocomplete="current-password" autofocus required><button>${p.button}</button></form>
${wrong ? `<p class="no">${p.wrong}</p>` : ''}
</main><footer><span>Weird Fishes Atelier</span><span>${p.date}</span></footer></body></html>`,
  { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', ...quiet } });
}

async function locked(name, request, env) {
  const p = PRIVATE[name];
  const want = env[p.secret] ? await sha256(env[p.secret]) : p.sha256;
  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const tried = form ? String(form.get('password') || '') : '';
    if (!same(await sha256(tried), want)) return gate(name, p, true);
    return new Response(null, { status: 303, headers: {
      location: `/${name}/`, ...quiet,
      'set-cookie': `${p.cookie}=${encodeURIComponent(tried)}; Path=/${name}; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
    } });
  }
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + p.cookie + '=([^;]+)'));
  let held = '';
  try { held = m ? decodeURIComponent(m[1]) : ''; } catch { held = ''; }
  if (!held || !same(await sha256(held), want)) {
    const page = (request.headers.get('accept') || '').includes('text/html');
    return page ? gate(name, p, false) : new Response('locked', { status: 401, headers: quiet });
  }
  const res = await env.ASSETS.fetch(request);
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'private, no-cache');
  headers.set('x-robots-tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const top = path.split('/')[1];
    if (Object.hasOwn(PRIVATE, top) && (path === '/' + top || path.startsWith('/' + top + '/'))) return locked(top, request, env);

    const range = request.headers.get('Range');
    const plain = new Headers(request.headers); plain.delete('Range');
    const res = await env.ASSETS.fetch(new Request(request, { headers: plain }));
    if (request.method !== 'GET' || res.status !== 200) return res;

    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes');
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) return new Response(res.body, { status: 200, headers });

    const buf = await res.arrayBuffer(), size = buf.byteLength;
    let start, end;
    if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }   // bytes=-500: the last 500
    else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
    if (start >= size || start > end) {
      headers.set('Content-Range', `bytes */${size}`); headers.delete('Content-Length');
      return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(buf.slice(start, end + 1), { status: 206, headers });
  },
};
