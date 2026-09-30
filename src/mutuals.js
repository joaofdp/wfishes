import { reduce } from './site.js';
import './mutuals.css';

// silhouette divider: pointer position, drag or arrow keys move the line; idle, it eases across once
// when it comes into view so the idea reads without touching it.
const box = document.getElementById('silhouette');
if (box) {
  let x = 50, anim = 0, done = false;
  const set = v => { x = Math.max(0, Math.min(100, v)); box.style.setProperty('--x', x + '%'); };
  const fromEvent = e => { const r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
  set(100);
  box.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { cancelAnimationFrame(anim); fromEvent(e); } });
  let drag = false;
  box.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { drag = true; cancelAnimationFrame(anim); fromEvent(e); } });
  box.addEventListener('pointermove', e => { if (drag) fromEvent(e); });
  const end = () => { drag = false; }; box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); cancelAnimationFrame(anim); set(x + (e.key === 'ArrowRight' ? 5 : -5)); }
  });
  // first view: all silhouette, then the design wipes in from the right to the middle
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || done) return; done = true;
    if (reduce.matches) { set(50); return; }
    const t0 = performance.now(), from = 100, to = 38, dur = 2200;
    const step = t => { const k = Math.min(1, (t - t0 - 500) / dur); if (k > 0) set(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }, { threshold: 0.6 }).observe(box);
}
