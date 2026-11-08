/* KSP · Drafting Table (Rev B) — interactions.
   No framework. Without JS the page is still complete and readable. */
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

  /* ---------- ASCII boot loader ---------- */
  let isReady = false;
  const ready = () => {
    if (isReady) return;
    isReady = true;
    doc.classList.add('ready');
    const hero = $('.cover-art .dw');
    if (hero) hero.classList.add('in');
  };
  const boot = $('.boot');
  if (!boot || reduce) {
    if (boot) boot.remove();
    requestAnimationFrame(ready);
  } else {
    const pre = $('.boot-art', boot);
    const target = pre.textContent;
    const rows = target.split('\n');
    const W = Math.max(...rows.map((r) => r.length));
    const noise = '.:-=+*#%@';
    // every character gets its own moment to settle: a left-to-right wave with a little jitter
    const when = rows.map((r) => Array.from(r, (ch, c) => (ch === ' ' ? -1 : (c / W) * 0.72 + Math.random() * 0.26)));
    const esc = (ch) => (ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch);
    const logs = $$('.boot-log p', boot);
    const track = $('.boot-bar .track', boot), pc = $('.boot-bar .pc', boot);
    const BAR = 28, ART = 1300, TOTAL = 1900;
    const t0 = performance.now();
    let done = false, raf = 0;
    const paint = (p) => {
      let html = '';
      rows.forEach((r, ri) => {
        let line = '', open = false;
        for (let c = 0; c < r.length; c++) {
          const ch = r[c], at = when[ri][c];
          if (at < 0) { if (open) { line += '</span>'; open = false; } line += ' '; continue; }
          if (p >= at) { if (open) { line += '</span>'; open = false; } line += esc(ch); }
          else { if (!open) { line += '<span class="x">'; open = true; } line += esc(noise[(Math.random() * noise.length) | 0]); }
        }
        if (open) line += '</span>';
        html += line + (ri < rows.length - 1 ? '\n' : '');
      });
      pre.innerHTML = html;
    };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      pre.textContent = target;
      logs.forEach((l) => l.classList.add('on'));
      track.innerHTML = '[<b>' + '#'.repeat(BAR) + '</b>]';
      pc.textContent = '100%';
      setTimeout(() => { boot.classList.add('is-done'); ready(); }, 260);
      setTimeout(() => boot.remove(), 1200);
    };
    const tick = (now) => {
      const t = now - t0;
      paint(Math.min(1, t / ART));
      logs.forEach((l, i) => { if (t > 120 + i * 330) l.classList.add('on'); });
      const n = Math.round(Math.min(1, t / TOTAL) * BAR);
      track.innerHTML = '[<b>' + '#'.repeat(n) + '</b>' + '.'.repeat(BAR - n) + ']';
      pc.textContent = Math.round(Math.min(1, t / TOTAL) * 100) + '%';
      if (t >= TOTAL) finish(); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    boot.addEventListener('click', finish);
    addEventListener('keydown', finish, { once: true });
  }

  /* ---------- theme: vellum / blueprint ---------- */
  const modeBtn = $('.mode');
  const meta = $('meta[name="theme-color"]');
  const syncTheme = () => {
    const bp = doc.getAttribute('data-theme') === 'blueprint';
    if (modeBtn) modeBtn.setAttribute('aria-pressed', String(bp));
    if (meta) meta.setAttribute('content', bp ? '#0f2a4a' : '#ece8df');
  };
  syncTheme();
  if (modeBtn) modeBtn.addEventListener('click', () => {
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
    addEventListener('scroll', () => { if (!raf && x > -999) raf = requestAnimationFrame(paint); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
  }

  /* ---------- name: letters widen under the cursor ---------- */
  const wave = $('[data-wave]');
  if (wave && fine && !reduce && wave.firstChild && wave.firstChild.nodeType === 3) {
    const dotEl = $('.dot', wave);
    const text = wave.firstChild.textContent;
    wave.firstChild.remove();
    const frag = document.createDocumentFragment();
    text.split('').forEach((ch) => { const s = document.createElement('span'); s.setAttribute('data-l', ''); s.textContent = ch; frag.appendChild(s); });
    wave.insertBefore(frag, dotEl);
    const letters = $$('[data-l]', wave);
    wave.addEventListener('pointermove', (e) => {
      letters.forEach((l) => {
        const r = l.getBoundingClientRect();
        const k = Math.max(0, 1 - Math.abs(e.clientX - (r.left + r.width / 2)) / r.width / 2.2);
        l.style.fontStretch = `${112 + 13 * k}%`;
        l.style.color = k > 0.75 ? 'var(--signal)' : '';
      });
    });
    wave.addEventListener('pointerleave', () => letters.forEach((l) => { l.style.fontStretch = ''; l.style.color = ''; }));
  }

  /* ---------- reveal on view + counters ---------- */
  const counted = new WeakSet();
  const countUp = (el) => {
    if (counted.has(el)) return;
    counted.add(el);
    const to = parseFloat(el.getAttribute('data-count'));
    if (reduce || !isFinite(to)) return;
    const t0 = performance.now(), dur = 1300;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
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
      $$('.pj-body.is-on .dw, .flag .dw', el).forEach((d) => d.classList.add('in'));
      if (el.matches('.dw')) el.classList.add('in');
      $$('[data-count]', el).forEach(countUp);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  $$('.rv, .sh, .circuit, .flag .dw').forEach((el) => io.observe(el));

  /* ---------- SMIL: pause off-screen, never run with reduced motion ---------- */
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

  /* ---------- work: the drawing viewer ---------- */
  const desk = matchMedia('(min-width: 1000px)');
  const heads = $$('.pj-head');
  const replot = (body) => {
    const art = $('.dw', body);
    if (!art) return;
    art.classList.add('reset');
    art.classList.remove('in');
    void art.getBoundingClientRect();
    art.classList.remove('reset');
    requestAnimationFrame(() => requestAnimationFrame(() => art.classList.add('in')));
    if (art.unpauseAnimations && !reduce) art.unpauseAnimations();
  };
  const openPj = (head, focusScroll) => {
    const body = document.getElementById(head.getAttribute('aria-controls'));
    const isOpen = head.getAttribute('aria-expanded') === 'true';
    if (isOpen && desk.matches) return;
    heads.forEach((h) => {
      const on = h === head && !isOpen;
      h.setAttribute('aria-expanded', String(on));
      const b = document.getElementById(h.getAttribute('aria-controls'));
      if (b) b.classList.toggle('is-on', on);
    });
    if (!isOpen && body) {
      replot(body);
      if (focusScroll && !desk.matches) setTimeout(() => head.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 60);
    }
  };
  heads.forEach((h, i) => {
    h.addEventListener('click', () => openPj(h, true));
    h.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const n = heads[(i + (e.key === 'ArrowDown' ? 1 : heads.length - 1)) % heads.length];
      n.focus();
      if (desk.matches) openPj(n, false);
    });
  });

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
      el.tabIndex = -1;
      el.setAttribute('data-no', s.getAttribute('data-sheet'));
      el.setAttribute('aria-label', s.getAttribute('data-title') || '');
      el.setAttribute('data-cursor', (s.getAttribute('data-title') || '').toUpperCase());
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
      let c = -1;
      pads.forEach((pd, i) => { const on = pd.at <= p + 0.002; pd.el.classList.toggle('is-on', on); if (on) c = i; });
      pads.forEach((pd, i) => pd.el.classList.toggle('is-cur', i === c));
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

  /* ---------- index menu (phones) ---------- */
  const menu = $('#sheet-menu'), menuBtn = $('.menu-btn');
  const setMenu = (open) => {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    doc.style.overflow = open ? 'hidden' : '';
    if (open) { const f = $('ol a', menu); if (f) f.focus({ preventScroll: true }); }
    else if (menuBtn) menuBtn.focus({ preventScroll: true });
  };
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(true));
  if (menu) {
    $('.menu-close', menu).addEventListener('click', () => setMenu(false));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }

  /* ---------- resume: panel + full-page viewer ---------- */
  const CV = window.KSP_CV || {};
  let cvKey = Object.keys(CV)[0];
  const tabs = $$('[data-cvtab]');
  const stageImg = $('.cv-stage img'), panelDl = $('.cv-dl');
  const pick = (key) => {
    const c = CV[key];
    if (!c || !stageImg) return;
    cvKey = key;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.getAttribute('data-cvtab') === key)));
    panelDl.href = `assets/resume/${c.file}.pdf`;
    panelDl.setAttribute('download', `${c.file}.pdf`);
    stageImg.classList.add('swap');
    setTimeout(() => {
      stageImg.src = `assets/resume/${c.file}.webp`;
      stageImg.alt = `Preview of the ${c.role} resume`;
      stageImg.onload = () => stageImg.classList.remove('swap');
      if (stageImg.complete) stageImg.classList.remove('swap');
    }, 200);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t.getAttribute('data-cvtab')));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const n = tabs[(i + (e.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); pick(n.getAttribute('data-cvtab'));
    });
  });

  const viewer = $('#viewer');
  if (viewer) {
    const img = $('#viewer-img'), role = $('#viewer-role'), dl = $('.viewer-dl', viewer);
    const page = $('.page', viewer), stamp = $('.stamp', viewer), zoom = $('.viewer-zoom', viewer);
    const stage = $('.viewer-stage', viewer);
    const vtabs = $$('[data-tab]', viewer);
    let lastFocus = null;
    const show = (key) => {
      const c = CV[key];
      if (!c) return;
      img.src = `assets/resume/${c.file}.webp`;
      img.alt = `Resume of K S Pankaj, ${c.role}`;
      role.textContent = c.role;
      dl.href = `assets/resume/${c.file}.pdf`;
      dl.setAttribute('download', `${c.file}.pdf`);
      vtabs.forEach((t) => t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === key)));
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
    $$('.cv-read, .cv-stage').forEach((b) => b.addEventListener('click', () => open(cvKey)));
    vtabs.forEach((t) => t.addEventListener('click', () => { show(t.getAttribute('data-tab')); pick(t.getAttribute('data-tab')); }));
    $('.viewer-close', viewer).addEventListener('click', close);
    zoom.addEventListener('click', () => page.classList.toggle('zoom'));
    dl.addEventListener('click', () => { stamp.classList.remove('go'); void stamp.offsetWidth; stamp.classList.add('go'); });
    viewer.addEventListener('click', (e) => { if (e.target === viewer || e.target === stage) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (viewer.classList.contains('is-open')) close();
      else if (menu && menu.classList.contains('is-open')) setMenu(false);
    });
    const m = location.hash.match(/^#cv-(\w+)/);
    if (m && CV[m[1]]) setTimeout(() => open(m[1]), 400);
  }

  /* ---------- for the curious ones with DevTools open ---------- */
  try {
    console.log('%cK S Pankaj%c\nYou opened DevTools on a portfolio. We would get along.\npankqx@gmail.com · github.com/pankqx',
      'font: 900 28px Archivo, sans-serif; color: #ff4e1b', 'font: 12px monospace; color: inherit');
  } catch (e) { /* no console, no problem */ }
})();
