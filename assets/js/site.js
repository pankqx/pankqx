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
  };
  const boot = $('.boot');
  if (!boot || reduce || doc.classList.contains('wipe-in')) {
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
    const BAR = 28, ART = 2600, TOTAL = 4700;
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
      const t = Math.max(0, now - t0);
      paint(Math.min(1, t / ART));
      logs.forEach((l, i) => { if (t > 200 + i * 760) l.classList.add('on'); });
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
      cur.classList.toggle('is-hidden', !!(e.target.closest && e.target.closest('.game-box')));
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
      $$('.pj-body.is-on .dw, .flag .dw, .build-art .dw', el).forEach((d) => d.classList.add('in'));
      if (el.matches('.dw')) el.classList.add('in');
      $$('[data-count]', el).forEach(countUp);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  $$('.rv, .sh, .circuit, .flag .dw, .build-art .dw').forEach((el) => io.observe(el));

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
    navLinks.forEach((a) => a.classList.toggle('is-active', !!active && (a.dataset.sec || '').split(' ').includes(active.slice(1))));
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


  /* =====================================================================
     ASCII: page wipe, decoding headings, typing, sprites, 3D chip
     ===================================================================== */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#%&';
  const NOISE = '.:-=+*#%@/\\|<>[]{}01';
  const pickCh = (set) => set[(Math.random() * set.length) | 0];

  /* ---------- page wipe between Home and About ---------- */
  const wipe = $('.wipe');
  const wipeGrid = () => {
    const lh = 15, cw = 13 * 0.6;
    const cols = Math.ceil(innerWidth / cw) + 2, rows = Math.ceil(innerHeight / lh) + 1;
    wipe.style.setProperty('--lh', lh + 'px');
    wipe.innerHTML = '';
    const els = [];
    for (let r = 0; r < rows; r++) { const d = document.createElement('div'); d.className = 'wr'; wipe.appendChild(d); els.push(d); }
    const jitter = els.map(() => Math.random() * 0.22);
    return { els, cols, rows, jitter };
  };
  const noiseLine = (cols, thin) => { let o = ''; for (let i = 0; i < cols; i++) o += Math.random() < thin ? ' ' : pickCh(NOISE); return o; };
  const wipeIn = () => {
    if (!wipe || !doc.classList.contains('wipe-in')) return;
    if (reduce) { doc.classList.remove('wipe-in'); return; }
    const { els, cols, rows, jitter } = wipeGrid();
    const t0 = performance.now(), dur = 620;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, now - t0) / dur);
      els.forEach((el, i) => {
        const at = (i / rows) * 0.72 + jitter[i];
        const local = (p - at + 0.25) / 0.25;
        if (p >= at) { el.classList.add('off'); return; }
        el.classList.toggle('edge', local > 0.55);
        el.textContent = noiseLine(cols, Math.max(0.15, Math.min(0.95, local)));
      });
      if (p < 1) requestAnimationFrame(step);
      else { wipe.innerHTML = ''; doc.classList.remove('wipe-in'); }
    };
    requestAnimationFrame(step);
  };
  const wipeOut = (go) => {
    if (!wipe || reduce) { go(); return; }
    const { els, cols, rows, jitter } = wipeGrid();
    els.forEach((el) => el.classList.add('off'));
    wipe.classList.add('on');
    const t0 = performance.now(), dur = 420;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, now - t0) / dur);
      els.forEach((el, i) => {
        const at = (i / rows) * 0.75 + jitter[i] * 0.6;
        if (p < at) return;
        el.classList.remove('off');
        el.classList.toggle('edge', p - at < 0.12);
        el.textContent = noiseLine(cols, 0.15);
      });
      if (p < 1) requestAnimationFrame(step); else setTimeout(go, 40);
    };
    requestAnimationFrame(step);
  };
  const isSheet = (u) => /\/(index\.html|about\.html)?$/.test(u.pathname);
  const norm = (pth) => pth.replace(/index\.html$/, '');
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin || !isSheet(url) || norm(url.pathname) === norm(location.pathname)) return;
    e.preventDefault();
    wipeOut(() => { store.sset('ksp-wipe', '1'); location.href = url.href; });
  });
  addEventListener('pageshow', (e) => { if (e.persisted && wipe) { wipe.innerHTML = ''; wipe.classList.remove('on'); doc.classList.remove('wipe-in'); } });
  wipeIn();

  /* ---------- headings decode from random characters ---------- */
  const decodeEl = (el, dur = 800) => {
    if (reduce || el.dataset.decoded) return;
    el.dataset.decoded = '1';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; let nd;
    while ((nd = walker.nextNode())) if (nd.nodeValue.trim()) nodes.push({ n: nd, text: nd.nodeValue });
    const total = nodes.reduce((acc, o) => acc + o.text.length, 0) || 1;
    let k = 0;
    nodes.forEach((o) => { o.at = Array.from(o.text, () => (k++ / total) * 0.55 + Math.random() * 0.45); });
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, Math.max(0, now - t0) / dur);
      nodes.forEach((o) => {
        let out = '';
        for (let i = 0; i < o.text.length; i++) { const ch = o.text[i]; out += (ch === ' ' || p >= o.at[i]) ? ch : pickCh(GLYPHS); }
        o.n.nodeValue = out;
      });
      if (p < 1) requestAnimationFrame(step); else nodes.forEach((o) => { o.n.nodeValue = o.text; });
    };
    requestAnimationFrame(step);
  };
  const dio = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { dio.unobserve(en.target); setTimeout(() => decodeEl(en.target), 120); }
  }), { threshold: 0.5 });
  $$('[data-decode]').forEach((el) => dio.observe(el));

  /* ---------- terminal typing (about.txt) ---------- */
  const typeEl = (el) => {
    if (reduce || el.dataset.typed) return;
    el.dataset.typed = '1';
    const ps = $$('p:not(.term-cursor)', el);
    const texts = ps.map((p) => p.textContent);
    el.style.minHeight = el.offsetHeight + 'px';
    ps.forEach((p) => { p.textContent = ''; });
    let pi = 0, ci = 0;
    const tick = () => {
      for (let n = 0; n < 3 && pi < ps.length; n++) {
        ci++;
        ps[pi].textContent = texts[pi].slice(0, ci);
        if (ci >= texts[pi].length) { pi++; ci = 0; }
      }
      if (pi < ps.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const tio = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { tio.unobserve(en.target); setTimeout(() => typeEl(en.target), 300); }
  }), { threshold: 0.3 });
  $$('[data-type]').forEach((el) => tio.observe(el));

  /* ---------- letter sprites ---------- */
  const scramble = (target, p) => Array.from(target, (ch) => (ch === ' ' || ch === '\n' || Math.random() < p) ? ch : pickCh(NOISE)).join('');
  const SPRITES = {
    arrow: () => { let i = 0; return { ms: 90, next: () => { i = (i + 1) % 8; return (' '.repeat(i) + '--->').padEnd(11, ' '); } }; },
    cup: (el) => {
      const base = el.textContent.split('\n');
      const a = ['    ( (     ', '     ) )    '], b = ['     ) )    ', '    ( (     '];
      let f = 0;
      return { ms: 480, next: () => { f ^= 1; const s = f ? b : a; return [s[0], s[1], ...base.slice(2)].join('\n'); } };
    },
    fast: () => {
      const topics = ['kotlin', 'arduino c', 'angular', 'next.js', 'your stack'];
      let t = 0, n = 0, hold = 0;
      return { ms: 70, next: () => {
        if (hold > 0) { hold--; } else if (n < 14) { n++; } else { hold = 12; n = 15; }
        if (n === 15 && hold === 0) { n = 0; t = (t + 1) % topics.length; }
        const k = Math.min(n, 14);
        const tail = k < 14 ? `${Math.round((k / 14) * 100)}%` : (topics[t] === 'your stack' ? 'ready :)' : 'ok');
        return `learning ${topics[t]}\n[${'#'.repeat(k)}${'.'.repeat(14 - k)}] ${tail}`;
      } };
    },
    adapt: () => {
      const shapes = [
        ['+----------+', '| o o o    |', '|----------|', '|          |', '+----------+', '  same me · web'],
        ['  .------.  ', '  |      |  ', '  |      |  ', '  |  ()  |  ', "  '------'  ", '  same me · android'],
        ['+----------+', '|          |', '+----++----+', '     ||     ', '   ======   ', '  same me · desktop'],
        ['  | | | |   ', ' +-------+  ', '-|  ESP  |- ', ' +-------+  ', '  | | | |   ', '  same me · hardware'],
      ].map((l) => l.join('\n'));
      let i = 0, f = 0;
      return { ms: 60, next: () => {
        f++;
        if (f > 26) { f = 0; i = (i + 1) % shapes.length; }
        return f < 6 ? scramble(shapes[i], f / 6) : shapes[i];
      } };
    },
    team: () => {
      const F = [
        ['  o       o  ', ' /|\\     /|\\ ', ' / \\     / \\ ', '             '],
        ['  o/     \\o  ', ' /|       |\\ ', ' / \\     / \\ ', '             '],
        ['    o/ \\o    ', '   /|   |\\   ', '   / \\ / \\   ', '             '],
        ['    o/*\\o    ', '   /|   |\\   ', '   / \\ / \\   ', '  high five! '],
      ].map((l) => l.join('\n'));
      const seq = [0, 0, 0, 1, 2, 3, 3, 3, 3, 2, 1, 0];
      let i = 0;
      return { ms: 260, next: () => { i = (i + 1) % seq.length; return F[seq[i]]; } };
    },
    create: () => {
      const art = ['    \\ | /     ', '  -- (o) --   ', '    / | \\     ', '   /\\     /\\  ', '__/  \\/\\_/  \\_'].join('\n');
      const idx = []; for (let i = 0; i < art.length; i++) if (art[i] !== ' ' && art[i] !== '\n') idx.push(i);
      const order = idx.sort(() => Math.random() - 0.5);
      let n = 0, dir = 1, hold = 0;
      return { ms: 45, next: () => {
        if (hold > 0) hold--;
        else { n += dir * 2; if (n >= order.length) { n = order.length; dir = -1; hold = 40; } else if (n <= 0) { n = 0; dir = 1; hold = 8; } }
        const on = new Set(order.slice(0, n));
        return Array.from(art, (ch, i) => (ch === '\n' || on.has(i)) ? ch : ' ').join('');
      } };
    },
  };
  $$('[data-sprite]').forEach((el) => {
    const make = SPRITES[el.getAttribute('data-sprite')];
    if (!make || reduce) return;
    const sp = make(el);
    let timer = 0;
    const run = (on) => {
      clearInterval(timer);
      if (on) timer = setInterval(() => { el.textContent = sp.next(); }, sp.ms);
    };
    new IntersectionObserver((en) => run(en[0].isIntersecting)).observe(el);
    el._sprite = sp;
  });

  /* ---------- coffee refills ---------- */
  const cup = $('.cup');
  if (cup) {
    let cups = 3;
    const label = $('[data-coffee]', cup), hint = $('.cup-txt > span', cup);
    cup.addEventListener('click', () => {
      cups++;
      label.textContent = '#' + cups;
      hint.textContent = cups < 6 ? 'Tap for a refill' : cups < 9 ? 'Okay, that is a lot of coffee' : 'Shipping a feature. Please hold.';
      cup.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], { duration: 420 });
    });
  }

  /* ---------- HTTP Dino: a tiny ASCII runner ---------- */
  const gbox = $('.game-box');
  if (gbox) {
    const scr = $('.game-screen', gbox), scoreEl = $('[data-score]', gbox), bestEl = $('[data-best]', gbox);
    const ROWS = 12, GROUND = 11;
    const DINO = [
      ['           __ ', '          / _)', '   .-^^^-/ /  ', '__/       /   ', '<__.|_|-|_|   '],
      ['           __ ', '          / _)', '   .-^^^-/ /  ', '__/       /   ', '<__./_/-\\_\\   '],
    ];
    const BUGS = [
      { art: ['\\_/', '(o)'], w: 3, h: 2 },
      { art: ['\\|/', '(o)', '/|\\'], w: 3, h: 3 },
      { art: ['404'], w: 3, h: 1 },
      { art: ['}{', '}{'], w: 2, h: 2 },
    ];
    const COFFEE = { art: ['c[_]'], w: 4, h: 1 };
    const QUIPS = ['Even I ship bugs sometimes.', 'That one is in production now.', 'Classic Friday deploy.', 'Needs more coffee.', 'The bug says hi.'];
    let bonus = 0, cols = 60, state = 'ready', y = 0, vy = 0, x = 2, speed = 20, dist = 0, score = 0, best = 0, items = [], clouds = [], gap = 30, frame = 0, flash = '', flashT = 0, quip = '', raf = 0, last = 0, onScreen = false;
    try { best = parseInt(localStorage.getItem('ksp-dino-best') || '0', 10) || 0; } catch (e) { best = 0; }
    const pad4 = (n) => String(n).padStart(4, '0');
    bestEl.textContent = pad4(best);
    const fit = () => {
      const fs = innerWidth < 600 ? 12 : 13;
      scr.style.fontSize = fs + 'px';
      cols = Math.max(34, Math.min(80, Math.floor(gbox.clientWidth / (fs * 0.6)) - 2));
    };
    fit();
    addEventListener('resize', fit);
    const reset = () => {
      y = 0; vy = 0; speed = 20; dist = 0; score = 0; bonus = 0; items = []; gap = cols * 0.7; flash = ''; flashT = 0;
      clouds = [{ x: cols * 0.3, row: 1 }, { x: cols * 0.8, row: 0 }];
      scoreEl.textContent = pad4(0);
    };
    reset();
    const G = 95, V0 = 31;
    const jump = () => {
      if (state === 'ready' || state === 'over') { reset(); state = 'run'; last = performance.now(); loop(last); return; }
      if (y <= 0.01) vy = V0;
    };
    const spawn = () => {
      if (Math.random() < 0.22) items.push({ ...COFFEE, x: cols + 2, lift: 4 + ((Math.random() * 2) | 0), coffee: true });
      else { const b = BUGS[(Math.random() * BUGS.length) | 0]; items.push({ ...b, x: cols + 2, lift: 0 }); }
      gap = Math.max(16, speed * (0.85 + Math.random() * 0.9));
    };
    const draw = () => {
      const ch = Array.from({ length: ROWS }, () => new Array(cols).fill(' '));
      const cl = Array.from({ length: ROWS }, () => new Array(cols).fill(''));
      const put = (r, c, str, cls) => { for (let k = 0; k < str.length; k++) { const cc = c + k; if (r >= 0 && r < ROWS && cc >= 0 && cc < cols && str[k] !== ' ') { ch[r][cc] = str[k]; cl[r][cc] = cls || ''; } } };
      clouds.forEach((c) => put(c.row, Math.round(c.x), '.-~~~-.', 'm'));
      const off = Math.floor(dist) % 7;
      for (let c = 0; c < cols; c++) { ch[GROUND][c] = (c + off) % 7 === 0 ? '.' : '_'; cl[GROUND][c] = 'm'; }
      items.forEach((it) => it.art.forEach((line, i) => put(GROUND - it.h - it.lift + i, Math.round(it.x), line, it.coffee ? 'c' : 'b')));
      const legs = state === 'run' && y <= 0.01 ? (Math.floor(dist / 2) % 2) : 0;
      const top = GROUND - 5 - Math.round(y);
      DINO[legs].forEach((line, i) => put(top + i, x, line, 'd'));
      const center = (r, str, cls) => put(r, Math.max(0, Math.floor((cols - str.length) / 2)), str, cls);
      if (state === 'ready') { center(2, 'HTTP DINO', 'b'); center(3, 'tap or press space to jump'); center(4, '(my hackathon team was called this)', 'm'); }
      if (state === 'over') { center(2, `BUG GOT YOU · score ${score}`, 'b'); center(3, quip); center(4, 'tap to try again', 'm'); }
      if (flashT > 0) center(1, flash, 'c');
      let html = '';
      for (let r = 0; r < ROWS; r++) {
        let cur = '', run = '';
        const flush = () => { if (!run) return; html += cur ? `<span class="g-${cur}">${run}</span>` : run; run = ''; };
        for (let c = 0; c < cols; c++) {
          const k = cl[r][c]; let t = ch[r][c];
          t = t === '<' ? '&lt;' : t === '>' ? '&gt;' : t === '&' ? '&amp;' : t;
          if (k !== cur) { flush(); cur = k; }
          run += t;
        }
        flush();
        if (r < ROWS - 1) html += '\n';
      }
      scr.innerHTML = html;
    };
    const hit = (it) => {
      const top = GROUND - 5 - y; // dino top row (float)
      const dx0 = x + 4, dx1 = x + 12, dy0 = top + 1.6, dy1 = top + 4.6;
      const ix0 = it.x, ix1 = it.x + it.w - 0.2, iy0 = GROUND - it.h - it.lift, iy1 = GROUND - it.lift - 0.2;
      return dx0 < ix1 && dx1 > ix0 && dy0 < iy1 && dy1 > iy0;
    };
    const loop = (now) => {
      cancelAnimationFrame(raf);
      if (state !== 'run' || !onScreen) { draw(); return; }
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      speed = Math.min(42, speed + dt * 0.6);
      const dx = speed * dt;
      dist += dx; gap -= dx;
      if (gap <= 0) spawn();
      vy -= G * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0;
      clouds.forEach((c) => { c.x -= dx * 0.25; if (c.x < -8) { c.x = cols + Math.random() * 10; c.row = (Math.random() * 2) | 0; } });
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.x -= dx;
        if (it.x < -6) { items.splice(i, 1); continue; }
        if (hit(it)) {
          if (it.coffee) { items.splice(i, 1); bonus += 10; flash = '+10 · caffeinated'; flashT = 0.9; continue; }
          state = 'over'; quip = QUIPS[(Math.random() * QUIPS.length) | 0];
          if (score > best) { best = score; bestEl.textContent = pad4(best); try { localStorage.setItem('ksp-dino-best', String(best)); } catch (e) { /* ignore */ } }
          draw(); return;
        }
      }
      score = Math.floor(dist / 4) + bonus;
      scoreEl.textContent = pad4(score);
      if (flashT > 0) flashT -= dt;
      draw();
      raf = requestAnimationFrame(loop);
    };
    gbox.addEventListener('pointerdown', (e) => { e.preventDefault(); gbox.focus({ preventScroll: true }); jump(); });
    gbox.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { e.preventDefault(); jump(); } });
    new IntersectionObserver((en) => {
      onScreen = en[0].isIntersecting;
      if (onScreen && state === 'run') { last = performance.now(); raf = requestAnimationFrame(loop); }
    }, { threshold: 0.3 }).observe(gbox);
    draw();
  }

  /* ---------- for the curious ones with DevTools open ---------- */
  try {
    console.log('%cK S Pankaj%c\nYou opened DevTools on a portfolio. We would get along.\npankqx@gmail.com · github.com/pankqx',
      'font: 900 28px Archivo, sans-serif; color: #ff4e1b', 'font: 12px monospace; color: inherit');
  } catch (e) { /* no console, no problem */ }
})();
