import './site.css';

export const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// header: always there at the top; slides away while you read down, comes back as soon as you scroll up
const mast = document.querySelector('.masthead');
if (mast) {
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, dy = y - lastY;
    if (y < 120 || dy < -4 || mast.contains(document.activeElement)) mast.removeAttribute('data-hidden');
    else if (dy > 6) mast.setAttribute('data-hidden', '');
    if (Math.abs(dy) > 4) lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  mast.addEventListener('focusin', () => mast.removeAttribute('data-hidden'));
}
// the logo on the homepage: already here, so go back to the top instead of loading the page again
if (location.pathname === '/' || location.pathname === '/index.html') {
  for (const a of document.querySelectorAll('a[href="/"]')) a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;   // new tab / window still works
    e.preventDefault();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });
  // same for links to a section of this page ("studio"): glide there instead of jumping
  for (const a of document.querySelectorAll('a[href^="/#"]')) a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const id = a.getAttribute('href').slice(2), target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  });
}
export const PLAY = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg>';
export const PAUSE = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor"/></svg>';

// Media loads as it approaches: the poster about a screen ahead, the recording itself once it's on screen
// (whichever observer fires first). Recordings play only while on screen. Reduced motion starts them paused.
const near = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const v = e.target; near.unobserve(v);
    if (v.dataset.poster) v.poster = v.dataset.poster;
  }
}, { rootMargin: '700px 0px' });
const ensureSrc = v => {
  if (v.getAttribute('src') || !v.dataset.src) return;
  if (v.dataset.poster && !v.getAttribute('poster')) v.poster = v.dataset.poster;
  v.preload = 'auto'; v.src = v.dataset.src;
};

const videos = [...document.querySelectorAll('video[data-auto]')];
const visible = new Set();
// safari refuses autoplay in low power mode (muted or not): the video is marked blocked, its button shows 'play',
// and the first click, tap or key anywhere on the page starts what's on screen and unlocks the rest for later
const syncs = new Map();
const tryPlay = v => v.play().then(() => { if (v.dataset.blocked) { delete v.dataset.blocked; syncs.get(v)?.(); } })
  .catch(e => { if (e && e.name === 'NotAllowedError' && !v.dataset.blocked) { v.dataset.blocked = '1'; syncs.get(v)?.(); armUnlock(); } });
let armed = false;
const unlock = e => {
  if (e.target.closest?.('.vtoggle, .film-play')) return;   // those buttons answer for their own video
  armed = false; ['click', 'keydown', 'touchend'].forEach(t => removeEventListener(t, unlock, true));
  for (const v of videos) {
    if (v.dataset.held === '1' || v.dataset.full === '1') continue;
    delete v.dataset.blocked; syncs.get(v)?.();
    if (visible.has(v)) { ensureSrc(v); tryPlay(v); }
    else { v.play().catch(() => {}); v.pause(); }   // a play() inside the gesture is what safari remembers per video
  }
};
function armUnlock() { if (armed) return; armed = true; ['click', 'keydown', 'touchend'].forEach(t => addEventListener(t, unlock, true)); }
function update(v) {
  // a film playing with sound is the visitor's choice: pause it when it leaves the screen (remembering where), never restart it
  if (v.dataset.full === '1') { if (!visible.has(v) && !v.paused) { v.dataset.t = v.currentTime; v.pause(); } return; }
  if (v.dataset.held !== '1' && visible.has(v)) { ensureSrc(v); tryPlay(v); }
  else v.pause();
}
for (const v of videos) {
  near.observe(v);
  const frame = v.closest('.frame');
  const cap = v.dataset.label || 'recording';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'vtoggle';
  frame.appendChild(btn);
  const sync = () => {
    const stopped = v.dataset.held === '1' || v.dataset.blocked === '1';
    btn.innerHTML = stopped ? PLAY : PAUSE;
    btn.setAttribute('aria-label', `${stopped ? 'play' : 'pause'}: ${cap}`);
    frame.toggleAttribute('data-paused', stopped);
  };
  syncs.set(v, sync);
  if (reduce.matches) v.dataset.held = '1';
  // a play() refused while the source was still loading gets another go once it can play
  v.addEventListener('canplay', () => { if (v.paused && visible.has(v) && v.dataset.held !== '1' && v.dataset.full !== '1' && !v.dataset.blocked) tryPlay(v); });
  btn.addEventListener('click', e => {
    e.stopPropagation();   // this click is its own answer; don't also run the page-wide unlock
    if (v.dataset.held === '1' || v.dataset.blocked === '1') { v.dataset.held = '0'; delete v.dataset.blocked; ensureSrc(v); tryPlay(v); }
    else { v.dataset.held = '1'; v.pause(); }
    sync();
  });
  sync();
}
const io = new IntersectionObserver(entries => {
  for (const e of entries) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); update(e.target); }
}, { threshold: 0.2 });
videos.forEach(v => io.observe(v));


// joão's mii: sheets load as they approach and only step while on screen.
// idle loops blink now and then (second row, for one loop). each figure reacts to the pointer over its own box:
// thinking looks surprised, sitting beams, the pointer points again, the credit waves (also while you reach for the contact links).
const miis = [...document.querySelectorAll('.mii[data-mii]')];
// absolute: a url() inside a custom property resolves against the stylesheet, not the page
const sheet = n => `url(${new URL(`/media/mii/${n}.webp`, document.baseURI).href})`;
const miiIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    const m = e.target;
    if (e.isIntersecting && !m.style.getPropertyValue('--img')) {
      m.style.setProperty('--img', sheet(m.dataset.mii));
    }
    m.toggleAttribute('data-on', e.isIntersecting && !reduce.matches);
    if (m.dataset.mii === 'point' && e.isIntersecting && !m.dataset.seen && !reduce.matches) { m.dataset.seen = '1'; m.setAttribute('data-play', ''); }
  }
}, { rootMargin: '400px 0px' });
// mouse: while over; touch: a short beat after the tap
function reactTo(targets, on, off) {
  for (const el of targets) {
    el.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') on(); });
    el.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') off(); });
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { on(); clearTimeout(el._t); el._t = setTimeout(off, 1400); } });
  }
}
for (const m of miis) {
  miiIO.observe(m);
  const kind = m.dataset.mii;
  if (kind === 'think' || kind === 'wait') {
    let loops = 0;
    m.addEventListener('animationiteration', () => {
      if (m.hasAttribute('data-wave') || m.hasAttribute('data-react')) return;
      if (m.hasAttribute('data-blink')) { m.removeAttribute('data-blink'); loops = 0; }
      else if (++loops > 3 && Math.random() < .35) m.setAttribute('data-blink', '');
    });
  }
  if (kind === 'think' || kind === 'sit') {
    reactTo([m], () => { if (!reduce.matches) { m.removeAttribute('data-blink'); m.setAttribute('data-react', ''); } }, () => m.removeAttribute('data-react'));
  }
  if (kind === 'point') {
    const link = m.closest('a');
    const again = () => { if (reduce.matches || m.hasAttribute('data-play')) return; m.setAttribute('data-play', ''); };
    reactTo([m, link], again, () => {});
    link.addEventListener('focus', again);
    m.addEventListener('animationend', () => m.removeAttribute('data-play'));
  }
  if (kind === 'wait') {
    const on = () => { if (!reduce.matches && !m.hasAttribute('data-held') && !m.hasAttribute('data-falling') && !m.hasAttribute('data-walking')) { m.removeAttribute('data-blink'); m.setAttribute('data-wave', ''); } };
    const off = () => m.removeAttribute('data-wave');
    const near = [...document.querySelectorAll('[data-mii-wave]')];
    reactTo([m, ...near], on, off);
    for (const el of near) { el.addEventListener('focusin', on); el.addEventListener('focusout', off); }
  }
}

// films: the page loops the film muted; "play with sound" restarts it with sound and native controls,
// and it goes back to the excerpt when the film ends.
const SPEAKER = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg>';
for (const v of document.querySelectorAll('.film video[data-film]')) {
  const frame = v.closest('.frame');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'film-play'; b.innerHTML = `${SPEAKER}<span>play with sound</span>`;
  b.setAttribute('aria-label', `play ${v.dataset.label} with sound`);
  frame.appendChild(b);
  b.addEventListener('click', () => {
    for (const o of document.querySelectorAll('video[data-full="1"]')) if (o !== v) o.pause();   // one film with sound at a time
    v.dataset.full = '1'; frame.setAttribute('data-full', ''); delete v.dataset.t;
    v.src = v.dataset.film;
    v.loop = false; v.muted = false; v.controls = true;
    v.play().catch(() => {}); v.focus();
  });
  // safari can snap a paused film back to its last keyframe: put it back where the visitor left it
  v.addEventListener('play', () => { const t = +v.dataset.t; if (v.dataset.full === '1' && v.dataset.t && Math.abs(v.currentTime - t) > .3) v.currentTime = t; delete v.dataset.t; });
  v.addEventListener('ended', () => {
    if (v.dataset.full !== '1') return;
    delete v.dataset.full; frame.removeAttribute('data-full');
    v.controls = false; v.muted = true; v.loop = true; v.src = v.dataset.src; update(v);   // back to the muted loop, unless it was held or is off screen
    b.focus();
  });
}
