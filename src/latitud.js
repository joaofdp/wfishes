import { reduce, PLAY, PAUSE } from './site.js';
import './latitud.css';

// Playbook specimen: the 22 real openers locked to one position, at poster scale.
// Idle, it hard-cuts through them; pointer position, drag or arrow keys pick one directly.
const spec = document.getElementById('specimen');
if (spec) {
  const N = 22;
  const stack = spec.querySelector('.specimen-stack');
  const count = spec.querySelector('.specimen-count>span');
  const live = spec.querySelector('.specimen-live');
  const names = ['David Vélez, Nubank', 'Guillermo Rauch, Vercel', 'Matias Woloski, Auth0 (Okta)', 'Alejandro Matamala, Runway', 'Henrique Dubugras, Brex', 'Alexandra Zatarain, Eight Sleep', 'Fabrício Bloisi, iFood, Movile and Prosus', 'Sergio Fogel, dLocal', 'Daniel Undurraga, Cornershop', 'Arthur Lazarte, Wildlife', 'Cesar Carvalho, Wellhub', 'Mike Krieger, Instagram', 'Carlos García, Kavak', 'Luis Silva, CloudWalk', 'Martín Migoya, Globant', 'Miguel Santos, Technisys', 'Mateo Marietti, CookUnity', 'Demian Brener, OpenZeppelin', 'Geraldo Thomaz, VTEX', 'João Del Valle, EBANX', 'Igor Marinelli, Tractian', 'Victor Cardenas, Slash'];
  let imgs = [], cur = 11, timer = 0, engaged = false, inView = false, held = reduce.matches;

  function show(i, announce = false) {
    cur = (i + N) % N;
    imgs.forEach((im, k) => {
      let d = k - cur; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
      im.style.setProperty('--o', d);
      im.dataset.near = Math.abs(d) <= 1 ? String(d) : 'far';
    });
    count.textContent = String(cur + 1).padStart(2, '0');
    if (announce) live.textContent = `Playbook ${cur + 1} of 22: ${names[cur]}`;
  }
  const build = () => {
    if (imgs.length) return;
    imgs = Array.from({ length: N }, (_, i) => {
      const im = new Image();
      im.src = `/media/latitud/playbooks/${String(i + 1).padStart(2, '0')}.webp`;
      im.alt = ''; im.decoding = 'async'; im.width = 1990; im.height = 459;
      stack.appendChild(im); return im;
    });
    show(cur);
  };
  const tick = () => {
    clearTimeout(timer);
    if (inView && !engaged && !held) timer = setTimeout(() => { show(cur + 1); tick(); }, 1100);
  };
  // pause control, like the recordings
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'vtoggle';
  const syncBtn = () => { btn.innerHTML = held ? PLAY : PAUSE; btn.setAttribute('aria-label', held ? 'play the playbook openers' : 'pause the playbook openers'); spec.toggleAttribute('data-paused', held); };
  btn.addEventListener('click', e => { e.stopPropagation(); held = !held; syncBtn(); tick(); });
  spec.appendChild(btn); syncBtn();

  spec.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || btn.contains(e.target)) return;
    engaged = true; clearTimeout(timer);
    const r = spec.getBoundingClientRect();
    const i = Math.min(N - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * N)));
    if (i !== cur) show(i);
  });
  spec.addEventListener('pointerleave', () => { engaged = false; tick(); });
  // touch: horizontal drag scrubs; vertical stays native scroll (touch-action: pan-y)
  let tx = null, t0 = 0;
  spec.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !btn.contains(e.target)) { tx = e.clientX; t0 = cur; engaged = true; clearTimeout(timer); } });
  spec.addEventListener('pointermove', e => { if (e.pointerType === 'touch' && tx !== null) show(t0 - Math.round((e.clientX - tx) / (spec.clientWidth / 12))); });
  const end = () => { if (tx !== null) { tx = null; engaged = false; tick(); } };
  spec.addEventListener('pointerup', end); spec.addEventListener('pointercancel', end);
  spec.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
  });
  spec.addEventListener('focus', () => { engaged = true; clearTimeout(timer); });
  spec.addEventListener('blur', () => { engaged = false; tick(); });
  new IntersectionObserver(([e]) => { if (e.isIntersecting) build(); }, { rootMargin: '1000px 0px' }).observe(spec);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; tick(); }, { threshold: 0.3 }).observe(spec);
}

