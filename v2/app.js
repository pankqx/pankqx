/* Version 2 · the only script visitors load. Two jobs: the small motions, and the visitor number. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- small motions: sections rise in, numbers count up ---------- */
  document.documentElement.classList.add('js');
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); seen.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rise').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; seen.observe(el); });
  if (!reduce) document.querySelectorAll('.stats b').forEach((el) => {
    const m = el.textContent.match(/^(\D*)(\d+)(.*)$/);
    if (!m || m[1]) return;                       // "No.1" stays as it is
    const to = +m[2], t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + m[3]; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  /* ---------- visitor number: one count per browser session, hidden if the service is down ---------- */
  const visits = document.querySelector('[data-visits]');
  if (visits) {
    const live = location.hostname === 'pankqx.github.io';
    let counted = false;
    try { counted = !!sessionStorage.getItem('ksp-counted'); } catch (e) { /* private mode */ }
    fetch(`https://abacus.jasoncameron.dev/${live && !counted ? 'hit' : 'get'}/pankqx.github.io/visits`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('counter'))))
      .then((d) => {
        if (!d.value) return;
        try { if (live) sessionStorage.setItem('ksp-counted', '1'); } catch (e) { /* private mode */ }
        visits.querySelector('[data-visits-n]').textContent = '#' + String(d.value).padStart(4, '0');
        visits.hidden = false;
      })
      .catch(() => { /* fine without it */ });
  }
})();
