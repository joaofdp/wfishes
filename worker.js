// cloudflare's static assets answer a Range request with the whole file and a 200. iphones ask for byte ranges before
// they play a video and can refuse that 200 (webkit bug 284443), so this worker sits in front of the mp4s only
// (wrangler.jsonc: run_worker_first) and answers a range with a real 206. every other request never reaches it.
export default {
  async fetch(request, env) {
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
