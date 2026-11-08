/* KSP — Drafting Table · interactions
   No framework. Everything degrades to a readable page without JS. */
(() => {
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    sget: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------- loader → ready ---------- */
  const loader = $('.loader');
  const seen = store.sget('ksp-seen');
  const ready = () => {
    doc.classList.add('ready');
    if (loader) loader.classList.add('is-done');
    setTimeout(() => loader && loader.remove(), 700);
  };
  if (reduce || seen) { if (loader) loader.remove(); requestAnimationFrame(ready); }
  else { store.sset('ksp-seen', '1'); setTimeout(ready, 1350); }

  /* ---------- theme: vellum / blueprint ---------- */
  const modeBtn = $('.mode');
  const meta = $('meta[name="theme-color"]');
  const syncTheme = () => {
    const bp = doc.getAttribute('data-theme') === 'blueprint';
    if (modeBtn) modeBtn.setAttribute('aria-pressed', String(bp));
    if (meta) meta.setAttribute('content', bp ? '#0f2a4a' : '#ece8df');
  };
  syncTheme();
  if (modeBtn) modeBtn.addEventListener('click', (e) => {
    const next = doc.getAttribute('data-theme') === 'blueprint' ? 'vellum' : 'blueprint';
    const apply = () => { doc.setAttribute('data-theme', next); store.set('ksp-theme', next); syncTheme(); };
    if (!document.startViewTransition || reduce) { apply(); return; }
    const r = modeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(apply);
    t.ready.then(() => {
      doc.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  });

  /* ---------- crosshair cursor ---------- */
  const cur = $('.cursor');
  if (cur && fine && !reduce) {
    doc.classList.add('has-cursor');
    const cx = $('.cx', cur), cy = $('.cy', cur), dot = $('.cdot', cur), lab = $('.clabel', cur);
    let x = -999, y = -999, raf = 0, hotLabel = '';
    const pad = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0');
    const paint = () => {
      raf = 0;
      cx.style.transform = `translateY(${y}px)`;
      cy.style.transform = `translateX(${x}px)`;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      lab.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
      lab.textContent = hotLabel || `X ${pad(x)} · Y ${pad(y + scrollY)}`;
    };
    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      const hot = e.target.closest && e.target.closest('a, button, [data-cursor]');
      hotLabel = hot ? (hot.getAttribute('data-cursor') || 'OPEN') : '';
      cur.classList.toggle('is-hot', !!hot);
      cur.classList.remove('is-hidden');
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerdown', () => dot.animate([{ scale: 1 }, { scale: 0.7 }, { scale: 1 }], { duration: 260 }));
  }

  /* ---------- name: variable-width wave ---------- */
  const wave = $('[data-wave]');
  if (wave && fine && !reduce) {
    const dotEl = $('.dot', wave);
    const text = wave.firstChild && wave.firstChild.nodeType === 3 ? wave.firstChild.textContent : '';
    if (text) {
      wave.firstChild.remove();
      const frag = document.createDocumentFragment();
      text.split('').forEach((ch) => {
        const s = document.createElement('span');
        s.setAttribute('data-l', '');
        s.textContent = ch;
        frag.appendChild(s);
      });
      wave.insertBefore(frag, dotEl);
      const letters = $$('[data-l]', wave);
      wave.addEventListener('pointermove', (e) => {
        letters.forEach((l) => {
          const r = l.getBoundingClientRect();
          const d = Math.abs(e.clientX - (r.left + r.width / 2)) / r.width;
          const k = Math.max(0, 1 - d / 2.2);
          l.style.fontStretch = `${112 + 13 * k}%`;
          l.style.color = k > 0.75 ? 'var(--signal)' : '';
        });
      });
      wave.addEventListener('pointerleave', () => letters.forEach((l) => { l.style.fontStretch = ''; l.style.color = ''; }));
    }
  }

  /* ---------- reveal on view ---------- */
  const counted = new WeakSet();
  const countUp = (el) => {
    if (counted.has(el)) return;
    counted.add(el);
    const to = parseFloat(el.getAttribute('data-count'));
    if (reduce || !isFinite(to)) { el.textContent = String(to); return; }
    const t0 = performance.now(), dur = 1300;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      $$('.dw', el).forEach((d) => d.classList.add('in'));
      $$('[data-count]', el).forEach(countUp);
      if (el.matches('[data-count]')) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  $$('.rv, .dw, .sh, .board, .timeline li').forEach((el) => io.observe(el));
  // hero drawing starts with the page
  const heroArt = $('.cover-art .dw');
  if (heroArt) { io.unobserve(heroArt); setTimeout(() => heroArt.classList.add('in'), seen || reduce ? 50 : 1250); }

  /* ---------- SMIL animations: pause off-screen and for reduced motion ---------- */
  const arts = $$('svg.art');
  if (reduce) arts.forEach((s) => s.pauseAnimations && s.pauseAnimations());
  else {
    const vio = new IntersectionObserver((entries) => entries.forEach((en) => {
      const s = en.target;
      if (!s.pauseAnimations) return;
      if (en.isIntersecting) s.unpauseAnimations(); else s.pauseAnimations();
    }));
    arts.forEach((s) => vio.observe(s));
  }

  /* ---------- bar, nav highlight, PCB trace ---------- */
  const bar = $('#bar');
  const sheets = $$('[data-sheet]');
  const navLinks = $$('.nav a');
  const tv = $('.trace-v'), th = $('.trace-h');
  const tFill = tv && $('.tfill', tv), tPulse = tv && $('.tpulse', tv), hFill = th && $('.tfill', th);
  let pads = [];
  const buildPads = () => {
    if (!tv) return;
    pads.forEach((p) => p.el.remove());
    const H = tv.clientHeight;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    pads = sheets.map((s) => {
      const el = document.createElement('a');
      el.className = 'tpad';
      el.href = '#' + s.id;
      el.setAttribute('data-no', s.getAttribute('data-sheet'));
      el.setAttribute('aria-label', s.getAttribute('data-title') || '');
      el.setAttribute('data-cursor', (s.getAttribute('data-title') || '').toUpperCase());
      el.tabIndex = -1;
      const at = Math.min(1, Math.max(0, (s.offsetTop - 80) / max));
      el.style.top = (at * H) + 'px';
      tv.appendChild(el);
      return { el, at };
    });
  };
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 24);
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const p = Math.min(1, Math.max(0, y / max));
    if (tv && tFill) {
      const H = tv.clientHeight;
      tFill.style.height = (p * H) + 'px';
      tPulse.style.top = (p * H) + 'px';
      let cur = -1;
      pads.forEach((pd, i) => { const on = pd.at <= p + 0.002; pd.el.classList.toggle('is-on', on); if (on) cur = i; });
      pads.forEach((pd, i) => pd.el.classList.toggle('is-cur', i === cur));
    }
    if (hFill) hFill.style.width = (p * 100) + '%';
    let active = '';
    sheets.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) active = '#' + s.id; });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === active));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  const relayout = () => { buildPads(); onScroll(); };
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();

  /* ---------- index menu (mobile) ---------- */
  const menu = $('#sheet-menu'), menuBtn = $('.menu-btn');
  const setMenu = (open) => {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    doc.style.overflow = open ? 'hidden' : '';
    if (open) { const f = $('a', menu); if (f) f.focus({ preventScroll: true }); }
    else if (menuBtn) menuBtn.focus({ preventScroll: true });
  };
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(true));
  if (menu) {
    $('.menu-close', menu).addEventListener('click', () => setMenu(false));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }

  /* ---------- resume viewer ---------- */
  const CV = window.KSP_CV || {};
  const viewer = $('#viewer');
  if (viewer) {
    const img = $('#viewer-img'), role = $('#viewer-role'), dl = $('.viewer-dl', viewer);
    const page = $('.page', viewer), stamp = $('.stamp', viewer), zoom = $('.viewer-zoom', viewer);
    const stage = $('.viewer-stage', viewer);
    const tabs = $$('[data-tab]', viewer);
    let lastFocus = null;
    const show = (key) => {
      const c = CV[key];
      if (!c) return;
      img.src = `assets/resume/${c.file}.webp`;
      img.alt = `Resume of K S Pankaj, ${c.role}`;
      role.textContent = c.role;
      dl.href = `assets/resume/${c.file}.pdf`;
      dl.setAttribute('download', `${c.file}.pdf`);
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === key)));
      stamp.classList.remove('go');
      stage.scrollTop = 0;
    };
    const open = (key) => {
      lastFocus = document.activeElement;
      show(key);
      viewer.classList.add('is-open');
      viewer.setAttribute('aria-hidden', 'false');
      doc.style.overflow = 'hidden';
      setTimeout(() => $('.viewer-close', viewer).focus({ preventScroll: true }), 50);
    };
    const close = () => {
      viewer.classList.remove('is-open');
      viewer.setAttribute('aria-hidden', 'true');
      doc.style.overflow = '';
      page.classList.remove('zoom');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    $$('[data-cv]').forEach((b) => b.addEventListener('click', () => open(b.getAttribute('data-cv'))));
    tabs.forEach((t) => t.addEventListener('click', () => show(t.getAttribute('data-tab'))));
    $('.viewer-close', viewer).addEventListener('click', close);
    zoom.addEventListener('click', () => page.classList.toggle('zoom'));
    dl.addEventListener('click', () => { stamp.classList.remove('go'); void stamp.offsetWidth; stamp.classList.add('go'); });
    viewer.addEventListener('click', (e) => { if (e.target === viewer || e.target === stage) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (viewer.classList.contains('is-open')) close();
      else if (menu && menu.classList.contains('is-open')) setMenu(false);
    });
    // deep link: #cv-ai etc.
    const m = location.hash.match(/^#cv-(\w+)/);
    if (m && CV[m[1]]) setTimeout(() => open(m[1]), 400);
  }
})();
