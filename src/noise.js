import { reduce, PLAY, PAUSE } from './site.js';
import './noise.css';

// the rack: noise's feed as a newsstand wall. the covers and their positions are static markup; this plays the reels,
// pulls a cover off the wall, draws the barcode of every post, and ties them together.
const rack = document.getElementById('rack');
if (rack) (async () => {
const wall = rack.querySelector('.wall');
const tiles = [...wall.querySelectorAll('.tile')];
const lift = wall.querySelector('.lift');
const mag = lift.querySelector('.lift-mag');
const page = lift.querySelector('.lift-page');
const limg = page.querySelector('img'), lcv = page.querySelector('canvas'), lctx = lcv.getContext('2d');
const tag = lift.querySelector('.lift-tag');
const tagN = tag.querySelector('.tag-n b'), tagD = tag.querySelector('.tag-d'), tagM = tag.querySelector('.tag-m'), tagH = tag.querySelector('.tag-h'), tagGo = tag.querySelector('.tag-go');
const code = rack.querySelector('.run-code'), canvas = code.querySelector('canvas'), pin = code.querySelector('.run-pin');
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const num = n => Number(n).toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
rack.setAttribute('data-ready', '');

/* ── first look: paste the covers up once, when the wall scrolls in ── */
if (rack.hasAttribute('data-wait')) {
  const go = () => { rack.removeAttribute('data-wait'); rack.setAttribute('data-in', ''); setTimeout(() => rack.removeAttribute('data-in'), 1400); };
  if ('IntersectionObserver' in window) new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: .08 }).observe(wall);
  else go();
}

/* ── pulling a cover ── */
let on = null, how = null, mirror = 0;
let reels = null; // set by the reels block below: decides again which reels play
let bars = null; // set once the barcode is drawn: index → position
let rank = null; // code → place among all posts by likes, once the list has loaded

function show(tile, by) {
  how = by;
  if (on === tile) return;
  if (on) on.removeAttribute('data-on');
  on = tile; tile.setAttribute('data-on', ''); wall.setAttribute('data-on', '');
  const a = tile.firstElementChild, d = a.dataset, vid = a.querySelector('video'), img = vid || a.querySelector('img');

  limg.src = vid ? vid.poster : img.currentSrc || img.src;
  // a pulled reel keeps playing: the big cover repaints its tile's own frames, so the two never drift apart.
  // a reel that hasn't started yet (held, or refused by the browser) keeps its poster here, as on its tile
  cancelAnimationFrame(mirror); page.removeAttribute('data-live');
  if (vid) {
    lcv.width = vid.width; lcv.height = vid.height;
    const paint = () => { if (vid.readyState >= 2 && vid.played.length) { lctx.drawImage(vid, 0, 0, lcv.width, lcv.height); page.setAttribute('data-live', ''); } mirror = requestAnimationFrame(paint); };
    paint();
  }
  if (reels) reels();
  page.href = tagGo.href = a.href;
  tagN.textContent = num(d.likes);
  const kind = tile.dataset.kind === 'carousel' ? `carousel, ${d.slides} slides` : tile.dataset.kind;
  tagD.textContent = `${+d.date.slice(8)} ${MON[+d.date.slice(5, 7) - 1]}`;
  const place = rank && rank.get(d.code);
  tagM.replaceChildren(...[`${num(d.comments)} comments`, kind, place ? `no. ${place} of ${num(rank.size)}` : ''].filter(Boolean).map(t => Object.assign(document.createElement('span'), { textContent: t })));
  tagH.textContent = d.hook;
  // a carousel is a thicker magazine: a few page edges behind the cover, more for more slides
  const pages = tile.dataset.kind === 'carousel' ? clamp(Math.round(d.slides / 3.5), 1, 5) : 0;
  page.style.setProperty('--stack', pages ? Array.from({ length: pages }, (_, i) => `${(i + 1) * 2.5}px ${(i + 1) * 2.5}px 0 0 ${i % 2 ? '#8f8b82' : '#e2ddd1'}`).join(',') : '0 0 0 #0000');
  page.style.setProperty('--rx', '0deg'); page.style.setProperty('--ry', '0deg');

  // where it goes: grown around its own slot, tag beside it (or under it on a narrow wall), all kept inside the wall and the window
  const W = wall.clientWidth, H = wall.clientHeight;
  const tx = tile.offsetLeft + 2, ty = tile.offsetTop + 2, tw = tile.offsetWidth - 4, th = tile.offsetHeight - 4;
  const side = W >= 640, ar = img.getAttribute('width') / img.getAttribute('height'), gap = 12, pad = 6; // the pulled cover is drawn at the file's own ratio
  const box = wall.getBoundingClientRect();
  const vTop = clamp(-box.top + 10, 0, H), vBot = clamp(innerHeight - box.top - 10, 0, H);
  let lh = Math.sqrt(Math.max(tw * th * 1.1, side ? 46000 : 27000) / ar), lw = lh * ar;
  const TW = side ? 244 : clamp(lw, 236, W - 2 * pad);
  tag.style.width = TW + 'px';
  const TH = tag.offsetHeight;
  const roomH = Math.max(200, Math.min(H, vBot - vTop) - 2 * pad - (side ? 0 : TH + gap));
  const k = Math.min(1, roomH / lh, (side ? W * .5 : W - 2 * pad) / lw); lh *= k; lw *= k;
  let lx = tx + tw / 2 - lw / 2, ly = ty + th / 2 - lh / 2, gx, gy, gh;
  if (side) {
    const right = tx + tw / 2 < W * .58;
    if (tw < 130) lx = right ? tx + tw + gap : tx - gap - lw;   // a small cover comes out beside its slot, not on top of its neighbours
    let g = clamp(right ? lx : lx - gap - TW, pad, W - (lw + gap + TW) - pad);
    lx = right ? g : g + TW + gap; gx = right ? lx + lw + gap : g; gh = Math.max(lh, TH);
  } else {
    lx = clamp(lx, pad, W - lw - pad); gx = clamp(lx + lw / 2 - TW / 2, pad, W - TW - pad); gh = lh + gap + TH;
  }
  ly = clamp(ly, pad, H - gh - pad);
  if (vBot - vTop >= gh + 2 * pad) ly = clamp(ly, vTop + pad, vBot - gh - pad);
  gy = side ? ly : ly + lh + gap;

  mag.style.transition = 'none';
  mag.style.width = lw + 'px'; mag.style.height = lh + 'px';
  mag.style.transform = `translate(${tx}px,${ty}px) scale(${tw / lw})`;
  void mag.offsetWidth;
  mag.style.transition = '';
  mag.style.transform = `translate(${lx}px,${ly}px)`;
  tag.style.left = gx + 'px'; tag.style.top = gy + 'px';
  lift.setAttribute('data-on', '');
  placePin();
}
function hide() {
  if (!on) return;
  cancelAnimationFrame(mirror);
  on.removeAttribute('data-on'); on = null; how = null;
  if (reels) reels();
  wall.removeAttribute('data-on'); lift.removeAttribute('data-on'); pin.removeAttribute('data-on');
}

// mouse: hover pulls, the cover tilts and catches the light under the pointer, click opens the post
let ptype = matchMedia('(hover: none)').matches ? 'touch' : 'mouse', raf = 0, mx = 0, my = 0;
addEventListener('pointerdown', e => { ptype = e.pointerType; }, true);
wall.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const t = e.target.closest('.tile'); if (!t) return;
  wall.removeAttribute('data-touch'); show(t, 'hover');
});
wall.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && how === 'hover') hide(); });
wall.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || how !== 'hover' || reduce.matches) return;
  mx = e.clientX; my = e.clientY;
  if (!raf) raf = requestAnimationFrame(() => {
    raf = 0; if (!on) return;
    const r = on.getBoundingClientRect(), px = clamp((mx - r.left) / r.width, 0, 1), py = clamp((my - r.top) / r.height, 0, 1);
    page.style.setProperty('--ry', ((px - .5) * 10).toFixed(2) + 'deg'); page.style.setProperty('--rx', ((.5 - py) * 10).toFixed(2) + 'deg');
    page.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); page.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  });
});
// keyboard: focus pulls, enter opens
wall.addEventListener('focusin', e => {
  const a = e.target.closest('.tile a');
  if (a && a.matches(':focus-visible')) { wall.removeAttribute('data-touch'); show(a.parentElement, 'focus'); }
});
wall.addEventListener('focusout', () => { if (how === 'focus') hide(); });
// one tab stop; arrows walk the covers from most liked down, home and end jump
const links = tiles.map(t => t.firstElementChild);
let cur = 0;
links.forEach((a, i) => { a.tabIndex = i ? -1 : 0; a.addEventListener('focus', () => { links[cur].tabIndex = -1; cur = i; a.tabIndex = 0; }); });
wall.addEventListener('keydown', e => {
  const i = links.indexOf(document.activeElement); if (i < 0) return;
  const n = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: links.length - 1 }[e.key];
  if (n === undefined) return;
  e.preventDefault(); links[clamp(n, 0, links.length - 1)].focus();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
// touch: the first tap pulls the cover and shows its tag (with the link), a tap on the pulled cover opens the post
wall.addEventListener('click', e => {
  const a = e.target.closest('.tile a'); if (!a || e.detail === 0) return;
  if (ptype === 'mouse') return;   // safari reports a tap's click as 'mouse', so go by the last pointerdown
  e.preventDefault(); wall.setAttribute('data-touch', ''); show(a.parentElement, 'touch');
});
document.addEventListener('pointerdown', e => { if (how === 'touch' && !e.target.closest('.tile, .lift-page, .lift-tag, .run-code')) hide(); });
let lastW = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; hide(); } }); // a phone's toolbar sliding away is a resize too; only a real width change moves the wall

/* ── the reels play where they hang: muted loops, only while on screen. one button holds them all ── */
const vids = tiles.map(t => t.querySelector('video')).filter(Boolean);
if (vids.length) {
  const seen = new Set();
  let held = reduce.matches, blocked = false, armed = false;
  const hold = Object.assign(document.createElement('button'), { type: 'button', className: 'rack-hold' });
  rack.querySelector('.rack-head').append(hold);
  const sync = () => {
    const stopped = held || blocked;
    hold.innerHTML = stopped ? PLAY : PAUSE;
    hold.setAttribute('aria-label', `${stopped ? 'play' : 'pause'} the reels on the wall`);
  };
  const load = v => { if (!v.getAttribute('src')) { v.preload = 'auto'; v.src = v.dataset.src; } };
  // safari in low power mode refuses autoplay, muted or not: the posters stay up, the button turns to 'play',
  // and the first click, tap or key anywhere starts the reels
  const play = v => { load(v); v.play().then(() => { if (blocked) { blocked = false; sync(); } }).catch(e => { if (e && e.name === 'NotAllowedError' && !blocked && !held) { blocked = true; sync(); arm(); } }); };
  const live = v => seen.has(v) || (on && on.contains(v));   // a pulled reel counts as on screen: the big cover is, even when its tile isn't
  const run = () => vids.forEach(v => { if (!held && live(v)) play(v); else v.pause(); });
  reels = () => { if (!blocked) run(); };
  const EVS = ['click', 'keydown', 'touchend'];
  const unlock = e => {
    const mine = hold.contains(e.target);
    if (mine && e.type !== 'click') return;   // a swipe or a stray key that ends on the button isn't a press: stay armed
    armed = false; EVS.forEach(t => removeEventListener(t, unlock, true));
    if (mine) return;   // the button answers for itself
    blocked = false; sync(); start();
  };
  function arm() { if (armed) return; armed = true; EVS.forEach(t => addEventListener(t, unlock, true)); }
  // inside a gesture: every reel gets its play(), which is what safari remembers, and the ones off screen stop again
  function start() {
    vids.forEach(v => { if (live(v)) play(v); else { load(v); v.play().catch(() => {}); v.pause(); } });
    // the same gesture covers the recordings further down the page: site.js only listens for one after a recording of its own was refused
    document.querySelectorAll('video[data-auto]').forEach(v => { if (v.paused && v.dataset.held !== '1' && v.dataset.full !== '1') { v.play().catch(() => {}); v.pause(); } });
  }
  hold.addEventListener('click', () => {
    if (held || blocked) { held = false; blocked = false; start(); } else { held = true; run(); }
    sync();
  });
  vids.forEach(v => v.addEventListener('canplay', () => { if (v.paused && !held && !blocked && seen.has(v)) play(v); }));
  const io = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); if (!blocked) run(); }, { threshold: .1 });
  vids.forEach(v => io.observe(v));
  sync();
}

/* ── the run: all 842 posts as a barcode, oldest first. the posts on the wall are the long bars ── */
const BAR = 26, LONG = 6, LABEL = 26, BLOCK = BAR + LONG + LABEL;
let all = [], wallAt = new Map(), months = [], labels = [];
function placePin() {
  if (!bars || !on) return pin.removeAttribute('data-on');
  const i = wallAt.get(on); if (i === undefined) return;
  pin.style.left = bars.x(i) + 'px'; pin.style.top = bars.row(i) * BLOCK + 'px'; pin.style.height = BAR + LONG + 'px';
  pin.setAttribute('data-on', '');
}
function draw() {
  const W = code.clientWidth; if (!W || !all.length) return;
  const n = all.length, rows = Math.ceil(n * 1.15 / W), per = Math.ceil(n / rows), pitch = W / per;
  const dpr = Math.min(devicePixelRatio || 1, 3), ctx = canvas.getContext('2d');
  canvas.width = Math.round(W * dpr); canvas.height = Math.round((rows * BLOCK - 8) * dpr); canvas.style.height = rows * BLOCK - 8 + 'px';
  bars = { per, pitch, rows, x: i => (i % per) * pitch, row: i => Math.floor(i / per) };
  const kind = rack.dataset.kind, thin = Math.max(1, Math.round(pitch * dpr * .5)), thick = Math.max(thin, Math.round(1.5 * dpr));
  const onWall = new Set(wallAt.values());
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#fff';
  for (const pass of [0, 1]) for (let i = 0; i < n; i++) {
    const w = onWall.has(i); if (w !== !!pass) continue;
    const hit = !kind || all[i].k === kind;
    ctx.globalAlpha = kind ? (hit ? (w ? 1 : .8) : .1) : (w ? 1 : .34);
    ctx.fillRect(Math.round(bars.x(i) * dpr), Math.round(bars.row(i) * BLOCK * dpr), w ? thick : thin, Math.round((BAR + (w ? LONG : 0)) * dpr));
  }
  // month names sit under the first bar of each month, with how many posts went up that month
  labels.forEach(l => l.remove()); labels = [];
  const put = (i, html, cont) => {
    const el = document.createElement('span'); el.className = 'run-month'; el.innerHTML = html; code.append(el);
    const x = bars.x(i); el.style.top = bars.row(i) * BLOCK + BAR + LONG + 5 + 'px'; el.style.left = x + 'px';
    if (x + el.offsetWidth > W) { el.setAttribute('data-end', ''); el.style.left = x + thin / dpr + 'px'; }
    labels.push(el); return el;
  };
  months.forEach(m => put(m.at, `${m.name}<b>${m.count}</b>`));
  for (let r = 1; r < rows; r++) { // a wrapped row says which month it picks up in, unless a month starts right there
    const i = r * per, m = months.filter(m => m.at <= i).pop();
    if (m && !months.some(o => o.at >= i && (o.at - i) * pitch < 44 && bars.row(o.at) === r)) put(i, m.name);
  }
  placePin();
}
try {
  all = await fetch('/media/noise/wall/posts.json').then(r => r.json());
  rank = new Map([...all].sort((a, b) => b.l - a.l).map((p, i) => [p.c, i + 1]));
  all.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const at = new Map(all.map((p, i) => [p.c, i]));
  tiles.forEach(t => { const i = at.get(t.firstElementChild.dataset.code); if (i !== undefined) wallAt.set(t, i); });
  all.forEach((p, i) => { const k = p.d.slice(0, 7); const m = months[months.length - 1]; if (m && m.key === k) m.count++; else months.push({ key: k, name: MON[+k.slice(5) - 1], at: i, count: 1 }); });
  canvas.setAttribute('aria-label', `all ${num(all.length)} posts from may to september 2026 in the order they went up, one bar each. ${months.map(m => `${m.name} ${m.count}`).join(', ')}. the long bars are the posts on the wall.`);
  rack.querySelector('.run').hidden = false;
  new ResizeObserver(() => requestAnimationFrame(draw)).observe(code);
  draw();

  // scrubbing the barcode pulls the covers in the order they were posted
  const byBar = [...wallAt].map(([t, i]) => ({ t, i })).sort((a, b) => a.i - b.i);
  const scrub = e => {
    if (e.pointerType === 'touch') wall.setAttribute('data-touch', ''); else wall.removeAttribute('data-touch');
    const r = canvas.getBoundingClientRect(), row = clamp(Math.floor((e.clientY - r.top) / BLOCK), 0, bars.rows - 1), x = e.clientX - r.left;
    let best = null, bd = 14;
    for (const b of byBar) if (bars.row(b.i) === row) { const dx = Math.abs(bars.x(b.i) - x); if (dx < bd) { bd = dx; best = b; } }
    if (best) show(best.t, e.pointerType === 'touch' ? 'touch' : 'scrub'); else if (how === 'scrub') hide();
  };
  code.addEventListener('pointermove', scrub); code.addEventListener('pointerdown', scrub);
  code.addEventListener('pointerleave', e => { if (how === 'scrub' && e.pointerType === 'mouse') hide(); });
} catch (err) { rack.querySelector('.run').hidden = true; }

/* ── formats: pick one and the wall and the barcode show only that kind ── */
const fmt = rack.querySelector('.fmt'), btns = [...fmt.querySelectorAll('button')];
fmt.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const k = b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.kind;
  btns.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.kind === k)));
  if (k) rack.dataset.kind = k; else delete rack.dataset.kind;
  draw();
});
})();

