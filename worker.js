// this worker runs for two things only (wrangler.jsonc: run_worker_first): the videos, and the private /colossus proposal.
//
// the videos: cloudflare's static assets answer a Range request with the whole file and a 200. iphones ask for byte ranges
// before they play a video and can refuse that 200 (webkit bug 284443), so this worker answers a range with a real 206.
//
// /colossus: a password page, then a cookie for 30 days. the password's sha-256 is below; a PASSWORD secret set on the
// worker in cloudflare overrides it. the proposal's files are built into public/colossus by the colossus project
// (deck/tools/build-site.cjs).
const COLOSSUS_SHA256 = 'cc7e751338952cf8aff2563cb8cd715b731f41885ac9a81955bb93a452c3ef0e';
const COOKIE = 'wf_colossus';
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
function gate(wrong) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>weird fishes x colossus</title>
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
<h1>colossus, 2027</h1>
<p>a proposal from weird fishes, for the colossus team.</p>
<form method="post" action="/colossus/"><input type="password" name="password" placeholder="password" aria-label="password" autocomplete="current-password" autofocus required><button>open</button></form>
${wrong ? '<p class="no">that’s not the password. try again?</p>' : ''}
</main><footer><span>Weird Fishes Atelier</span><span>November, 2026</span></footer></body></html>`,
  { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', ...quiet } });
}

async function colossus(request, env) {
  const want = env.PASSWORD ? await sha256(env.PASSWORD) : COLOSSUS_SHA256;
  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const tried = form ? String(form.get('password') || '') : '';
    if (!same(await sha256(tried), want)) return gate(true);
    return new Response(null, { status: 303, headers: {
      location: '/colossus/', ...quiet,
      'set-cookie': `${COOKIE}=${encodeURIComponent(tried)}; Path=/colossus; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
    } });
  }
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  let held = '';
  try { held = m ? decodeURIComponent(m[1]) : ''; } catch { held = ''; }
  if (!held || !same(await sha256(held), want)) {
    const page = (request.headers.get('accept') || '').includes('text/html');
    return page ? gate(false) : new Response('locked', { status: 401, headers: quiet });
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
    if (path === '/colossus' || path.startsWith('/colossus/')) return colossus(request, env);

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
