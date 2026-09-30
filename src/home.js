import { reduce, PLAY, PAUSE } from './site.js';
import './home.css';

// hello: the mii by the contact line waves once when the page opens (after its wave frames have loaded)
const hello = document.querySelector('.mii-hello');
if (hello && !reduce.matches) {
  const sheet = new Image();
  sheet.onload = () => setTimeout(() => {
    if (hello.hasAttribute('data-wave') || hello.hasAttribute('data-held')) return;
    hello.setAttribute('data-wave', '');
    setTimeout(() => hello.removeAttribute('data-wave'), 1700);
  }, 500);
  sheet.src = '/media/mii/wave.webp';
}

// pick him up: drag the hello mii and he flails and swings from your pointer (like grabbing a mii in the plaza).
// let go over his own line and he lands on it and walks home. let go past the end of it and he falls to the next
// rule below that's under him; with no line under him he falls all the way to the bottom of the page, and waits there.
if (hello) {
  for (const n of ['held', 'walk']) { hello.style.setProperty('--' + n, `url(${new URL(`/media/mii/${n}.webp`, document.baseURI).href})`); new Image().src = `/media/mii/${n}.webp`; }
  let walkAt = 0;
  const line = hello.parentElement;
  const ledges = () => [line, ...document.querySelectorAll('.hp-head, .receipts .chapter-heading, .home-studio .chapter-heading')];
  let perch = line;   // the rule he's standing on (or falling to); 'bottom' = the end of the page
  let dx = 0, dy = 0, rot = 0, vrot = 0, vy = 0, px = 0, py = 0, lastPx = 0, grab = null, raf = 0, squash = 1;
  const home = () => { const r = line.getBoundingClientRect(), m = hello.offsetWidth, h = hello.offsetHeight; return { r, left: r.right - 6 - m, top: r.top - h, w: m, h }; };
  // where his feet rest on the current perch, as offsets from his home spot: [floor dy, min dx, max dx]
  const floor = H => {
    if (perch === line) return [0, H.r.left - H.left, 0];
    if (perch === 'bottom') return [document.querySelector('.site-footer').getBoundingClientRect().bottom - 3 - H.r.top, 4 - H.left, document.documentElement.clientWidth - H.w - 16 - H.left];   // the footer's end, not scrollHeight: while he's held his own box can stretch the page
    const r = perch.getBoundingClientRect();
    return [r.top - H.r.top, r.left - H.left, r.right - H.w - H.left];
  };
  const apply = () => { hello.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(2 - squash).toFixed(3)},${squash.toFixed(3)})`; };
  const tick = t => {
    const H = home();
    if (grab) {
      // hang from the grab point, swinging with the pointer's sideways speed; stay inside the window
      const tx = Math.max(-H.left, Math.min(innerWidth - H.w - H.left, px - H.left - H.w / 2)), ty = py - H.top - 14;
      const svx = (px - lastPx); lastPx = px;
      vrot += ((-svx * 1.6) - rot) * .18 - vrot * .22; rot = Math.max(-40, Math.min(40, rot + vrot));
      dx += (tx - dx) * .5; dy += (ty - dy) * .5; squash += (1 - squash) * .3;
    } else {
      // fall to the perch, sliding along it to the nearest spot on it
      const [fy, minX, maxX] = floor(H);
      const landX = Math.max(minX, Math.min(maxX, dx));
      dx += (landX - dx) * .12;
      if (dy < fy) { vy = Math.min(vy + 2600 / 60, 2800); dy = Math.min(fy, dy + vy / 60); } else { dy += (fy - dy) * .15; vy = 0; }
      rot += (0 - rot) * .2; vrot = 0;
      if (dy >= fy - .5 && Math.abs(dx - landX) < .5 && hello.hasAttribute('data-falling')) {
        dy = fy; hello.removeAttribute('data-falling'); squash = .78;                 // thud
        walkAt = perch === line && dx < -2 ? t + 550 : 0;                             // on his own line he walks back home
      }
      squash += (1 - squash) * .18;
      if (walkAt && t >= walkAt && !hello.hasAttribute('data-falling')) {
        hello.setAttribute('data-walking', '');
        dx = Math.min(0, dx + 62 / 60);
        if (dx >= 0) { dx = 0; walkAt = 0; hello.removeAttribute('data-walking'); }
      }
      if (!walkAt && !hello.hasAttribute('data-falling') && Math.abs(1 - squash) < .003 && Math.abs(rot) < .1) { squash = 1; rot = 0; dy = fy; apply(); raf = 0; return; }
    }
    apply(); raf = requestAnimationFrame(tick);
  };
  hello.addEventListener('pointerdown', e => {
    e.preventDefault(); hello.setPointerCapture(e.pointerId);
    grab = true; px = lastPx = e.clientX; py = e.clientY; vy = 0;
    hello.removeAttribute('data-wave'); hello.removeAttribute('data-blink'); hello.removeAttribute('data-falling'); hello.removeAttribute('data-walking'); walkAt = 0;
    hello.setAttribute('data-held', ''); hello.setAttribute('data-on', '');
    if (!raf) raf = requestAnimationFrame(tick);
  });
  hello.addEventListener('pointermove', e => { if (grab) { px = e.clientX; py = e.clientY; } });
  const drop = () => {
    if (!grab) return; grab = null;
    // the first rule below his feet that's actually under him; none means the bottom of the page
    const H = home(), fx = H.left + dx + H.w / 2, feet = H.r.top + dy;
    perch = 'bottom'; let best = Infinity;
    for (const el of ledges()) { const r = el.getBoundingClientRect(); if (fx >= r.left && fx <= r.right && r.top >= feet - 10 && r.top < best) { best = r.top; perch = el; } }
    hello.toggleAttribute('data-away', perch !== line);
    hello.removeAttribute('data-held'); hello.setAttribute('data-falling', ''); vy = 0; if (!raf) raf = requestAnimationFrame(tick);
  };
  hello.addEventListener('pointerup', drop); hello.addEventListener('pointercancel', drop);
  // the page reflows (resize, fonts): keep him standing on his perch
  new ResizeObserver(() => { if (perch === line || grab || raf) return; const H = home(), [fy, minX, maxX] = floor(H); dy = fy; dx = Math.max(minX, Math.min(maxX, dx)); apply(); }).observe(document.body);
}

// ---------------------------------------------------------------------------------------------
// the sharks: a fish-eye lens swims over the painting and the paint moves like water.
// the <img> is the page; the canvas only fades in once webgl has drawn a frame. still under reduced motion.
const art = document.getElementById('sharks');
if (art && !reduce.matches) {
  const img = art.querySelector('img');
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
  if (gl) {
    const vs = `attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision mediump float;
varying vec2 v;uniform sampler2D t;uniform vec2 res;uniform vec2 m;uniform float s;uniform float time;uniform vec3 drops[4];uniform vec4 cover;
void main(){
  float aspect=res.x/res.y;
  vec2 uv=v;
  // the water: two slow sines, barely there
  uv.x+=sin(v.y*10.0+time*.8)*.0024+sin(v.y*27.0-time*1.1)*.0011;
  uv.y+=sin(v.x*9.0+time*.6)*.0019;
  // taps leave rings
  for(int i=0;i<4;i++){vec3 d=drops[i];float age=time-d.z;
    if(age>0.0&&age<2.6){vec2 q=v-d.xy;q.x*=aspect;float r=length(q);
      float w=sin(r*62.0-age*10.0)*exp(-r*5.5)*exp(-age*1.5)*.014;uv+=q/max(r,1e-4)*w*vec2(1.0/aspect,1.0);}}
  // the fish-eye: inside the lens, sample closer to its centre
  vec2 q=v-m;q.x*=aspect;float r=length(q);float R=.24;float ca=0.0;float rim=0.0;
  if(s>.001&&r<R){float k=r/R;float rs=R*pow(k,1.0+.55*s);vec2 dir=q/max(r,1e-4);vec2 nq=dir*rs;nq.x/=aspect;
    uv=m+nq+(uv-v);ca=s*smoothstep(R*.55,R,r)*.007;}
  rim=s*(smoothstep(R-.006,R,r)-smoothstep(R,R+.006,r));
  // everything above works in box space; cover crops the painting into the box the way the <img> does
  uv=cover.zw+uv*cover.xy;ca*=cover.x;
  vec3 col=vec3(texture2D(t,uv+vec2(ca,0.)).r,texture2D(t,uv).g,texture2D(t,uv-vec2(ca,0.)).b);
  col=mix(col,vec3(1.0),rim*.45);
  gl_FragColor=vec4(col,1.0);
}`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = n => gl.getUniformLocation(prog, n);
      const uRes = U('res'), uM = U('m'), uS = U('s'), uT = U('time'), uD = U('drops'), uC = U('cover');
      const tex = gl.createTexture();
      const drops = new Float32Array(12).fill(-10); let dropI = 0;
      let running = false, raf = 0, inView = false, t0 = performance.now();
      let mx = .5, my = .45, tx = .5, ty = .45, str = 0, tstr = .75, lastPointer = -1e9, inside = false;
      const now = () => (performance.now() - t0) / 1000;
      const size = () => {
        const r = art.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
        canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
        gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uRes, canvas.width, canvas.height);
        // object-fit: cover, same crop and object-position as the <img> (on phones the box is 16:9, the painting 4:5)
        const ia = img.naturalWidth / img.naturalHeight, ba = r.width / r.height;
        const sx = ba > ia ? 1 : ba / ia, sy = ba > ia ? ia / ba : 1;
        const [ox, oy] = getComputedStyle(img).objectPosition.split(' ').map(v => v.endsWith('%') ? parseFloat(v) / 100 : .5);
        gl.uniform4f(uC, sx, sy, (1 - sx) * ox, (1 - sy) * oy);
      };
      const frame = () => {
        const t = now();
        // no pointer for a while: the lens wanders on its own, like it's looking around
        if (!inside && t - lastPointer > 2.2) { tx = .5 + Math.sin(t * .31) * .28 + Math.sin(t * .83) * .06; ty = .5 + Math.sin(t * .23 + 1.3) * .3; tstr = .72; }
        mx += (tx - mx) * .09; my += (ty - my) * .09; str += (tstr - str) * .07;
        gl.uniform2f(uM, mx, my); gl.uniform1f(uS, str); gl.uniform1f(uT, t); gl.uniform3fv(uD, drops);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!canvas.hasAttribute('data-on')) canvas.setAttribute('data-on', '');
        raf = running ? requestAnimationFrame(frame) : 0;
      };
      const start = () => { if (!running && inView && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } };
      const stop = () => { running = false; cancelAnimationFrame(raf); };
      const uvOf = e => { const r = art.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
      art.addEventListener('pointermove', e => { [tx, ty] = uvOf(e); tstr = 1; lastPointer = now(); });
      art.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') inside = true; });   // the lens is the cursor here: it stays put
      art.addEventListener('pointerleave', () => { inside = false; lastPointer = now() - 1.4; });
      art.addEventListener('pointerdown', e => { const [x, y] = uvOf(e); drops.set([x, y, now()], dropI * 3); dropI = (dropI + 1) % 4; lastPointer = now(); [tx, ty] = [x, y]; });
      const ready = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // webgl1 only mipmaps power-of-two textures: redraw the painting into a square (uvs are 0-1, so the stretch
        // doesn't show) and let the gpu shrink it smoothly, like the <img> does
        const P = innerWidth > 700 ? 2048 : 1024, pot = document.createElement('canvas'); pot.width = pot.height = P;
        pot.getContext('2d').drawImage(img, 0, 0, P, P);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pot); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        canvas.setAttribute('aria-hidden', 'true'); art.appendChild(canvas); size();
        new ResizeObserver(size).observe(art);
        new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }).observe(art);
        document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
      };
      (img.complete && img.naturalWidth) ? ready() : img.addEventListener('load', ready, { once: true });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// the receipts: each value flaps through characters and lands, like a departures board.
// the real value stays in the text for screen readers; the tiles are decoration.
const board = document.getElementById('board');
if (board) {
  const CH = '0123456789$km+–st';
  const flaps = [...board.querySelectorAll('.flap')];
  const tiles = flaps.map(f => {
    const v = f.dataset.value; f.textContent = '';
    const sr = document.createElement('span'); sr.className = 'visually-hidden'; sr.textContent = v; f.appendChild(sr);
    const row = document.createElement('span'); row.setAttribute('aria-hidden', 'true'); row.style.display = 'contents'; f.appendChild(row);
    return [...v].map(ch => { const s = document.createElement('span'); s.className = 'tile'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch; row.appendChild(s); return { s, ch }; });
  });
  if (!reduce.matches) {
    const run = () => {
      tiles.forEach((row, i) => row.forEach((tile, j) => {
        let n = 6 + i * 2 + j * 3;
        const tick = () => {
          tile.s.removeAttribute('data-flip'); void tile.s.offsetWidth;
          if (n-- <= 0) { tile.s.textContent = tile.ch; tile.s.setAttribute('data-flip', ''); return; }
          tile.s.textContent = CH[(Math.random() * CH.length) | 0]; tile.s.setAttribute('data-flip', '');
          setTimeout(tick, 70);
        };
        setTimeout(tick, i * 90);
      }));
    };
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); run(); } }, { threshold: .35 }).observe(board);
  }
}

// ---------------------------------------------------------------------------------------------
// the spotlight archive: a fish-eye mosaic. left alone it drifts gently (with a pause button); the piece under the
// pointer, or the one with keyboard focus, swells properly and the rest make room. the highlighted piece is always
// the one a click or enter opens. phones: a tap opens the piece. reduced motion: an even, still grid.
const mosaic = document.getElementById('mosaic');
if (mosaic) {
  const cells = [...mosaic.querySelectorAll('.mosaic-cell')];
  const view = document.getElementById('tank-view');
  const open = c => {
    const im = view.querySelector('img'), a = view.querySelector('a');
    im.src = `/media/home/tank/${c.dataset.n}-l.webp`; im.alt = `personal work ${cells.indexOf(c) + 1} of ${cells.length}, from joão’s midjourney spotlight`;
    a.href = c.dataset.job; view.showModal(); if (!kbNav) document.activeElement.blur();   // safari rings the close button on open; keyboard visitors keep the ring
  };
  view.addEventListener('click', e => { if (e.target === view) view.close(); });
  // a mouse click opens the highlighted piece (the one in colour, swollen under the cursor); taps and enter open their own
  let lastPointer = 'mouse';
  addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, true);
  cells.forEach(c => c.addEventListener('click', e => open(e.detail && lastPointer !== 'touch' && over && focusIdx >= 0 ? cells[focusIdx] : c)));
  const phone = matchMedia('(max-width: 700px)');
  const dims = () => phone.matches ? [3, 7] : [7, 3];
  // a swollen piece gets its sharper file (the grid loads small thumbnails)
  const sharpen = c => { const im = c.querySelector('img'); if (!c.dataset.sharp) { c.dataset.sharp = '1'; im.src = `/media/home/tank/${c.dataset.n}-m.webp`; } };
  let focusIdx = -1;
  const setFocusCell = (i, user) => {
    if (user && i >= 0) sharpen(cells[i]);
    if (i === focusIdx) return; cells[focusIdx]?.removeAttribute('data-focus'); focusIdx = i; cells[i]?.setAttribute('data-focus', '');
  };
  // one tab stop; arrows move around the wall. the wall only locks onto a focused piece when the keyboard put it there
  // (safari focuses a clicked button too, and esc after a click counts as keyboard)
  let cur = 0, over = null, cx = 0, cy = 0, kbNav = false;
  addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') kbNav = true; }, true);
  addEventListener('pointerdown', () => { kbNav = false; }, true);
  cells.forEach((c, i) => { c.tabIndex = i ? -1 : 0; c.addEventListener('focus', () => { cur = i; aim(i); }); });
  mosaic.addEventListener('keydown', e => {
    const [cols] = dims(), i = cells.indexOf(document.activeElement); if (i < 0) return;
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    let n = d !== undefined ? i + d : e.key === 'Home' ? 0 : e.key === 'End' ? cells.length - 1 : -1;
    if (n < 0 && d === undefined) return;
    e.preventDefault(); n = Math.max(0, Math.min(cells.length - 1, n)); over = null;   // the keyboard takes over from a resting mouse
    cells[cur].tabIndex = -1; cells[n].tabIndex = 0; cells[n].focus();
  });
  let tx = .5, ty = .5, x = .5, y = .5;
  function aim(i) { const [cols, rows] = dims(); tx = (i % cols + .5) / cols; ty = (Math.floor(i / cols) + .5) / rows; }
  if (!reduce.matches) {
    mosaic.setAttribute('data-live', '');
    // resting: a soft swell that drifts; engaged: a strong one on the chosen piece
    const REST = [1.1, .17], ENGAGED = [2.8, .135];
    let amp = REST[0], sig = REST[1], paused = false, running = false, raf = 0;
    const weights = (n, p) => Array.from({ length: n }, (_, i) => { const c = (i + .5) / n; return (1 + amp * Math.exp(-((p - c) ** 2) / (2 * sig * sig))).toFixed(3) + 'fr'; }).join(' ');
    // mouse: the highlight is the cell actually under the pointer, and the swell peaks under the pointer inside it
    // the target only changes when the mouse really moves, so a grid settling under a still cursor can't flicker
    // a true fish-eye: find the focus whose swollen layout puts that same point under the cursor, so once the wall settles
    // the piece under the cursor is the biggest one and the one in colour
    const G = 6;   // .mosaic padding and gap, px
    const cdf = (n, f) => {
      const w = Array.from({ length: n }, (_, i) => 1 + ENGAGED[0] * Math.exp(-(((i + .5) / n - f) ** 2) / (2 * ENGAGED[1] ** 2)));
      const k = Math.min(n - 1, Math.floor(f * n)); let s = 0; for (let i = 0; i < k; i++) s += w[i];
      return (s + (f * n - k) * w[k]) / w.reduce((a, b) => a + b);
    };
    const solve = (n, px, size) => {
      let f = .5;
      for (let pass = 0; pass < 2; pass++) {   // second pass accounts for the gaps before the focus track
        const k = Math.min(n - 1, Math.floor(f * n)), P = Math.min(1, Math.max(0, (px - G - k * G) / (size - 2 * G - (n - 1) * G)));
        let lo = 0, hi = 1; for (let it = 0; it < 24; it++) { f = (lo + hi) / 2; cdf(n, f) < P ? lo = f : hi = f; }
      }
      return Math.min(.999, Math.max(0, f));
    };
    mosaic.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || (e.clientX === cx && e.clientY === cy && over)) return;
      cx = e.clientX; cy = e.clientY;
      const r = mosaic.getBoundingClientRect(), [cols, rows] = dims();
      tx = solve(cols, cx - r.left, r.width); ty = solve(rows, cy - r.top, r.height);
      over = cells[Math.floor(ty * rows) * cols + Math.floor(tx * cols)] || null;
    });
    mosaic.addEventListener('pointerleave', () => { over = null; });
    // the grid can slide a gap under a still cursor: a click there opens the highlighted piece
    mosaic.addEventListener('click', e => { if (!e.target.closest('.mosaic-cell') && focusIdx >= 0) open(cells[focusIdx]); });

    const frame = t => {
      const kb = kbNav && document.activeElement?.matches(':focus-visible') ? cells.indexOf(document.activeElement) : -1;
      let target = -1, user = true;
      if (over) target = cells.indexOf(over);
      else if (kb >= 0) { target = kb; aim(kb); }
      else {
        user = false;   // paused just freezes the resting swell where it is
        if (!paused) { tx = .5 + .4 * Math.sin(t / 1000 * .17); ty = .5 + .36 * Math.sin(t / 1000 * .27 + 1.2); }
      }
      const [A, S] = user ? ENGAGED : REST;
      amp += (A - amp) * .08; sig += (S - sig) * .08;
      x += (tx - x) * .1; y += (ty - y) * .1;
      const [cols, rows] = dims();
      mosaic.style.gridTemplateColumns = weights(cols, x); mosaic.style.gridTemplateRows = weights(rows, y);
      setFocusCell(target >= 0 ? target : Math.min(rows - 1, Math.floor(y * rows)) * cols + Math.min(cols - 1, Math.floor(x * cols)), user && target >= 0);
      raf = running ? requestAnimationFrame(frame) : 0;
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting) { running = false; cancelAnimationFrame(raf); }
    }).observe(mosaic);
    // the drift can be stopped, like every other moving thing on the site
    const wrap = mosaic.parentElement, btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'vtoggle';
    const sync = () => { btn.innerHTML = paused ? PLAY : PAUSE; btn.setAttribute('aria-label', `${paused ? 'play' : 'pause'}: the drifting wall`); wrap.toggleAttribute('data-paused', paused); };
    btn.addEventListener('click', () => { paused = !paused; sync(); });
    sync(); wrap.appendChild(btn);
  }
}
