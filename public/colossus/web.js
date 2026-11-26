// The web version of the priced proposal: the deck's engine (deck.js), self-guided.
// → / space / click / swipe = next, ← = back, Home / End, f = full screen. The address keeps the place: #13.2 is page 13, step 2.
(() => {
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  let cur = 0, step = 0, first = true;

  // controls, outside the page
  const ui = document.createElement('nav');
  // their classes start with wf- (web.css): the pages use names like .bar and .next for their own things
  ui.className = 'wf-ui';
  ui.innerHTML = '<span class="wf-hint">click, or use ← →</span><button class="wf-prev" aria-label="back">←</button><span class="wf-n"></span><button class="wf-next" aria-label="next">→</button>';
  document.body.append(ui);
  const bar = document.createElement('div'); bar.className = 'wf-progress'; document.body.append(bar);
  const turn = document.createElement('p'); turn.className = 'wf-turn'; turn.textContent = 'best on a laptop, or with the phone sideways'; document.body.append(turn);
  const hint = ui.querySelector('.wf-hint');

  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  function inRange(spec, k) {
    const [a, b] = spec.split('-').map(Number);
    return spec.includes('-') ? k >= a && k <= b : k >= a;
  }
  function stepsOf(i) { return +(slides[i].dataset.steps || 0); }

  // camera: fit a rectangle of the 3200 x 3300 sheet into the frame
  function aim(cam, k) {
    const stops = cam.dataset.stops.split(';').map(s => s.split(',').map(Number));
    const [x, y, w, h] = stops[Math.min(k, stops.length - 1)];
    const W = cam.offsetWidth, H = cam.offsetHeight, pad = +(cam.dataset.pad ?? 56);
    const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const tx = W / 2 - s * (x + w / 2), ty = H / 2 - s * (y + h / 2);
    const b = cam.querySelector('.board');
    if (b) b.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
    const spot = cam.querySelector('.spot');
    if (spot) {
      const q = 14;
      spot.style.left = (tx + s * x - q).toFixed(1) + 'px'; spot.style.top = (ty + s * y - q).toFixed(1) + 'px';
      spot.style.width = (s * w + 2 * q).toFixed(1) + 'px'; spot.style.height = (s * h + 2 * q).toFixed(1) + 'px';
    }
    const count = cam.closest('.slide').querySelector('.count .k');
    if (count) count.textContent = Math.min(k, stops.length - 1) + 1;
  }

  // the pictures of the sheets load near the page that shows them
  function lazy(i) {
    slides.forEach((sl, j) => {
      if (j < i - 1 || j > i + 2) return;
      sl.querySelectorAll('img[data-src]').forEach(im => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
    });
  }

  function show(i, k) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    k = Math.max(0, Math.min(stepsOf(i), k));
    const entering = first || i !== cur || !slides[i].classList.contains('on'), stepped = k !== step;
    first = false;
    if (i !== cur) { slides[cur].classList.remove('on'); slides[cur].classList.remove('play'); }
    cur = i; step = k;
    const sl = slides[i];
    sl.classList.add('on');
    if (entering) { sl.classList.remove('play'); void sl.offsetWidth; sl.classList.add('play'); }
    sl.querySelectorAll('[data-count]').forEach(el => { if (+(el.dataset.countAt || 0) === k && (entering || stepped)) countUp(el); });
    sl.dataset.at = k;
    sl.querySelectorAll('[data-step]').forEach(el => el.classList.toggle('in', inRange(el.dataset.step, k)));
    sl.querySelectorAll('.cam').forEach(c => aim(c, k));
    lazy(i);
    history.replaceState(null, '', `#${i + 1}.${k}`);
    ui.querySelector('.wf-n').textContent = `${i + 1} / ${slides.length}`;
    ui.querySelector('.wf-prev').disabled = i === 0 && k === 0;
    ui.querySelector('.wf-next').disabled = i === slides.length - 1;
    bar.style.width = (100 * (i + 1) / slides.length) + '%';
    document.title = `${sl.dataset.title || 'colossus'}: weird fishes x colossus`;
  }
  function countUp(el) {
    const end = +el.dataset.count, delay = +(el.dataset.delay || 0), dur = 1100, t0 = performance.now() + delay;
    const fmt = n => Math.round(n).toLocaleString('en-US');
    el.textContent = fmt(0);
    const tick = t => {
      const u = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - u, 3);
      el.textContent = fmt(end * e);
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function moved() { hint.classList.add('wf-gone'); }
  function next() { moved(); step < stepsOf(cur) ? show(cur, step + 1) : cur < slides.length - 1 && show(cur + 1, 0); }
  function prev() { moved(); step > 0 ? show(cur, step - 1) : cur > 0 && show(cur - 1, stepsOf(cur - 1)); }

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0, 0);
    else if (k === 'End') show(slides.length - 1, 0);
    else if (k === 'f' && document.documentElement.requestFullscreen) document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  });
  ui.querySelector('.wf-next').addEventListener('click', next);
  ui.querySelector('.wf-prev').addEventListener('click', prev);
  stage.addEventListener('click', e => { if (!e.target.closest('a')) next(); });
  let x0 = null, y0 = null;
  addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); dx < 0 ? next() : prev(); }
    x0 = null;
  });

  // a link with another #page.step jumps there
  addEventListener('hashchange', () => {
    const h = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
    if (h) show(+h[1] - 1, h[2] ? +h[2] : 0);
  });

  // start where the address says; every camera starts on its first stop, without moving
  const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
  const i0 = m ? +m[1] - 1 : 0, k0 = m && m[2] ? +m[2] : 0;
  slides[0].classList.add('on');
  requestAnimationFrame(() => {
    document.querySelectorAll('.cam').forEach(c => {
      const b = c.querySelector('.board'), sp = c.querySelector('.spot');
      [b, sp].forEach(e => e && (e.style.transition = 'none')); aim(c, 0); void c.offsetWidth; [b, sp].forEach(e => e && (e.style.transition = ''));
    });
    show(i0, k0);
  });
})();
