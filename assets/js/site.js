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
  const hFill = $('.trace-h .tfill');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 24);
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const p = Math.min(1, Math.max(0, y / max));
    if (hFill) hFill.style.width = (p * 100) + '%';
    let active = '';
    sheets.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) active = '#' + s.id; });
    navLinks.forEach((a) => a.classList.toggle('is-active', !!active && (a.dataset.sec || '').split(' ').includes(active.slice(1))));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

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

  /* =====================================================================
     KOLAM
     The hero drawing. A grid of dots; every dot sits in a tile. Each tile
     corner is either round (the line loops back) or sharp (lines cross).
     Changing those corners smoothly is what makes the pattern flow.
     ===================================================================== */
  const kolam = $('[data-kolam]');
  if (kolam) {
    const ctx = kolam.getContext('2d');
    const N = 7, V = N + 1, MID = N / 2;      // 7 x 7 dots, 8 x 8 corners
    const at = (i, j) => j * V + i;
    const from = new Float32Array(V * V), to = new Float32Array(V * V), start = new Float32Array(V * V);
    let size = 0, ts = 0, col = {}, raf = 0, seen = false, lastTouch = -1e9, lastNew = 0, hot = -1;
    const inner = (i, j) => i > 0 && i < N && j > 0 && j < N;
    const value = (k, now) => {
      const p = Math.min(1, Math.max(0, (now - start[k]) / 900));
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      return from[k] + (to[k] - from[k]) * e;
    };
    /* set one corner and its seven mirror images, so the pattern stays symmetric */
    const setSym = (i, j, v, now, wait) => {
      [[i, j], [N - i, j], [i, N - j], [N - i, N - j], [j, i], [N - j, i], [j, N - i], [N - j, N - i]].forEach(([a, b]) => {
        if (!inner(a, b)) return;
        const k = at(a, b);
        from[k] = value(k, now); to[k] = v; start[k] = now + wait;
      });
    };
    const fresh = (now) => {
      for (let j = 1; j <= MID; j++) for (let i = j; i <= MID; i++) {
        const far = Math.hypot(i - MID, j - MID);
        setSym(i, j, Math.random() < 0.62 ? 1 : 0, now, far * 170);   // ripples out from the centre
      }
      lastNew = now;
    };
    const colors = () => { const cs = getComputedStyle(kolam); col = { ink: cs.getPropertyValue('--ink').trim(), dim: cs.getPropertyValue('--ink-3').trim(), hot: cs.getPropertyValue('--signal').trim() }; };
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size = kolam.clientWidth || 320;
      kolam.width = kolam.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ts = (size * 0.97) / (N * Math.SQRT2);
      colors();
    };
    const tile = (x, y, r) => {            // a square whose four corners can each be rounded differently
      ctx.beginPath();
      ctx.moveTo(x + r[0], y);
      ctx.arcTo(x + ts, y, x + ts, y + ts, r[1]);
      ctx.arcTo(x + ts, y + ts, x, y + ts, r[2]);
      ctx.arcTo(x, y + ts, x, y, r[3]);
      ctx.arcTo(x, y, x + ts, y, r[0]);
      ctx.closePath();
      ctx.stroke();
    };
    const draw = (now) => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(Math.PI / 4);
      ctx.translate(-N * ts / 2, -N * ts / 2);
      ctx.lineWidth = size < 380 ? 1.4 : 1.7;
      ctx.strokeStyle = col.ink;
      const half = ts / 2;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const r = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)].map((k) => (1 - value(k, now)) * half);
        tile(i * ts, j * ts, r);
        const centre = i === (N - 1) / 2 && j === (N - 1) / 2;
        ctx.fillStyle = centre ? col.hot : col.dim;
        ctx.beginPath(); ctx.arc(i * ts + half, j * ts + half, centre ? 4 : 2.2, 0, 6.2832); ctx.fill();
      }
      if (hot >= 0) { ctx.fillStyle = col.hot; ctx.beginPath(); ctx.arc((hot % V) * ts, ((hot / V) | 0) * ts, 4, 0, 6.2832); ctx.fill(); }
      ctx.restore();
    };
    const frame = (now) => {
      raf = 0;
      if (!seen || document.hidden) return;
      if (!reduce && now - lastNew > 4200 && now - lastTouch > 7000) fresh(now);
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && seen) raf = requestAnimationFrame(frame); };
    /* touch or move over it: the nearest corner flips, and the pattern follows your finger */
    const poke = (e) => {
      const r = kolam.getBoundingClientRect();
      const x = e.clientX - r.left - size / 2, y = e.clientY - r.top - size / 2;
      const c = Math.SQRT1_2;                               // undo the 45 degree turn
      const i = Math.round(((x + y) * c + N * ts / 2) / ts), j = Math.round(((y - x) * c + N * ts / 2) / ts);
      if (!inner(i, j)) { hot = -1; return; }
      const k = at(i, j);
      if (k === hot) return;
      hot = k;
      const now = performance.now();
      setSym(i, j, to[k] > 0.5 ? 0 : 1, now, 0);
      lastTouch = now;
    };
    kolam.addEventListener('pointerdown', poke);
    kolam.addEventListener('pointermove', poke);
    kolam.addEventListener('pointerleave', () => { hot = -1; });
    new IntersectionObserver((en) => { seen = en[0].isIntersecting; kick(); }).observe(kolam);
    document.addEventListener('visibilitychange', kick);
    addEventListener('resize', () => { fit(); draw(performance.now()); });
    new MutationObserver(() => { colors(); draw(performance.now()); }).observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
    fit();
    fresh(performance.now() + (doc.classList.contains('wipe-in') || reduce ? -5000 : 4300));   // begins as plain circles, blooms as the loader lifts
    draw(performance.now());
  }

  /* =====================================================================
     GAMES
     Five small games on the About page. Two are drawn on a <canvas>
     (HTTP Dino, Catch the skills) and three are plain buttons
     (Ship it, Squash the bugs, Memory).
     ===================================================================== */
  const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');
  const pad4 = (n) => String(Math.max(0, n)).padStart(4, '0');
  const oneOf = (a) => a[(Math.random() * a.length) | 0];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no haptics */ } };

  /* A screen made of letters, painted on a canvas.
     You place text by column and row (decimals allowed, which is what makes movement smooth). */
  const asciiScreen = (canvas, rows) => {
    const ctx = canvas.getContext('2d');
    const s = { cols: 40, rows, cw: 8, ch: 16, color: {} };
    let font = '';
    s.colors = () => {
      const cs = getComputedStyle(canvas);
      const v = (name) => cs.getPropertyValue(name).trim();
      s.color = { '': v('--ink'), dim: v('--ink-3'), hot: v('--signal'), warm: v('--signal-ink') };
    };
    s.fit = () => {
      const w = canvas.clientWidth || 300;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const fs = w < 380 ? 12 : w < 640 ? 13 : 15;
      font = `${fs}px "Plex Mono", ui-monospace, Menlo, monospace`;
      ctx.font = font;
      s.cw = ctx.measureText('M').width;
      s.ch = Math.round(fs * 1.3);
      s.cols = Math.max(24, Math.floor(w / s.cw));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(rows * s.ch * dpr);
      canvas.style.height = rows * s.ch + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font;
      ctx.textBaseline = 'top';
      s.colors();
    };
    s.clear = () => { ctx.globalAlpha = 1; ctx.clearRect(0, 0, canvas.width, canvas.height); };
    s.shake = (px) => { ctx.translate((Math.random() - 0.5) * px, (Math.random() - 0.5) * px); };
    s.unshake = () => { const dpr = canvas.width / (canvas.clientWidth || 1); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    s.put = (col, row, str, kind, alpha) => {
      ctx.fillStyle = s.color[kind || ''] || s.color[''];
      ctx.globalAlpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha));
      for (let i = 0; i < str.length; i++) if (str[i] !== ' ') ctx.fillText(str[i], (col + i) * s.cw, row * s.ch);
    };
    s.center = (row, str, kind, alpha) => s.put(Math.max(0, (s.cols - str.length) / 2), row, str, kind, alpha);
    s.colAt = (clientX) => { const r = canvas.getBoundingClientRect(); return ((clientX - r.left) / r.width) * s.cols; };
    s.fit();
    return s;
  };
  /* run fn every frame, but only while the game is on screen and the tab is visible */
  const gameLoop = (box, step) => {
    let raf = 0, last = 0, visible = false, running = false;
    const frame = (now) => {
      raf = 0;
      if (!running || !visible || document.hidden) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      step(dt, now);
      if (running) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && running && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; kick(); }, { threshold: 0.2 }).observe(box);
    document.addEventListener('visibilitychange', kick);
    return { start: () => { running = true; kick(); }, stop: () => { running = false; } };
  };
  const onTheme = (fn) => new MutationObserver(fn).observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
  /* a little burst of letters when you win */
  const celebrate = (box) => {
    if (reduce) return;
    const bits = ['*', '+', '·', '{ }', '</>', 'c[_]', ':)', '++', 'ok'];
    for (let i = 0; i < 16; i++) {
      const el = document.createElement('span');
      el.className = 'confetti';
      el.textContent = oneOf(bits);
      el.style.left = 6 + Math.random() * 88 + '%';
      box.appendChild(el);
      const rise = 60 + Math.random() * 120, drift = (Math.random() - 0.5) * 60;
      el.animate(
        [{ transform: 'translate(0, 0) rotate(0)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${drift}px, -${rise}px) rotate(${(Math.random() - 0.5) * 40}deg)`, opacity: 0 }],
        { duration: 900 + Math.random() * 700, delay: Math.random() * 250, easing: 'cubic-bezier(.2,.7,.1,1)' }
      ).onfinish = () => el.remove();
    }
    buzz([12, 40, 12]);
  };
  /* the end-of-game card used by the three button games */
  const winCard = (box, title, line, again) => {
    const old = $('.game-win', box); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'game-win';
    el.innerHTML = '<p class="gw-t serif"></p><p class="gw-l"></p><button type="button" class="btn btn-sm">Play again</button>';
    $('.gw-t', el).textContent = title;
    $('.gw-l', el).textContent = line;
    $('button', el).addEventListener('click', () => { el.remove(); again(); });
    box.appendChild(el);
    celebrate(box);
  };

  /* ---------- 1 · HTTP Dino: jump the bugs, grab the coffee ---------- */
  const dinoBox = $('[data-game="dino"]');
  if (dinoBox) {
    const canvas = $('canvas', dinoBox), scoreEl = $('[data-score]', dinoBox), bestEl = $('[data-best]', dinoBox);
    const ROWS = 14, GROUND = 12;            // the ground line sits on row 12
    const GRAVITY = 62, JUMP = 27;           // rows per second: higher JUMP = higher jump
    const DINO = [
      ['           __ ', '          / _)', '   .-^^^-/ /  ', '__/       /   ', '<__.|_|-|_|   '],
      ['           __ ', '          / _)', '   .-^^^-/ /  ', '__/       /   ', '<__./_/-\\_\\   '],
    ];
    const BUGS = [
      { art: ['404'], w: 3, h: 1 },
      { art: ['\\_/', '(o)'], w: 3, h: 2 },
      { art: ['}{', '}{'], w: 2, h: 2 },
      { art: ['\\|/', '(o)', '/|\\'], w: 3, h: 3, late: true },
    ];
    const RANKS = [[0, 'intern'], [60, 'junior dev'], [150, 'developer'], [300, 'senior dev'], [500, 'tech lead'], [800, 'staff engineer'], [1200, 'CTO']];
    const QUIPS = ['Even I ship bugs sometimes.', 'That one is in production now.', 'Classic Friday deploy.', 'Needs more coffee.', 'The bug says hi.'];
    const scr = asciiScreen(canvas, ROWS);
    const X = 1;                             // dino's left edge, in columns
    let state = 'ready', y = 0, vy = 0, air = 0, wantJump = -1, speed = 17, dist = 0, bonus = 0, score = 0, gap = 0;
    let items = [], dust = [], clouds = [], flash = '', flashT = 0, quip = '', overAt = 0, shakeT = 0, rankI = 0, t = 0;
    let best = parseInt(store.get('ksp-dino-best') || '0', 10) || 0;
    bestEl.textContent = pad4(best);
    const rankOf = (sc) => { let r = 0; RANKS.forEach((k, i) => { if (sc >= k[0]) r = i; }); return r; };
    const puff = (n, col, row) => { for (let i = 0; i < n; i++) dust.push({ x: col + Math.random() * 6, y: row, vx: -4 - Math.random() * 6, vy: -1 - Math.random() * 3, life: 0.45, ch: oneOf(['.', '·', "'"]) }); };
    const reset = () => {
      y = 0; vy = 0; air = 0; wantJump = -1; speed = 17; dist = 0; bonus = 0; score = 0; rankI = 0;
      items = []; dust = []; flash = ''; flashT = 0; shakeT = 0; gap = scr.cols * 0.9;
      clouds = [{ x: scr.cols * 0.2, row: 1 }, { x: scr.cols * 0.7, row: 0 }];
      scoreEl.textContent = pad4(0);
    };
    const spawn = () => {
      if (Math.random() < 0.24) items.push({ art: ['c[_]'], w: 4, h: 1, x: scr.cols + 1, lift: 4 + ((Math.random() * 2) | 0), coffee: true });
      else {
        const pool = BUGS.filter((b) => !b.late || score > 150);
        items.push({ ...oneOf(pool), x: scr.cols + 1, lift: 0 });
      }
      // always leave room to land and breathe before the next one
      gap = Math.max(22, speed * (1.15 + Math.random() * 0.9));
    };
    const draw = () => {
      scr.clear();
      if (shakeT > 0) scr.shake(6 * shakeT / 0.3);
      clouds.forEach((c) => scr.put(c.x, c.row, '.-~~~-.', 'dim', 0.7));
      const off = dist % 7;
      for (let c = -1; c < scr.cols + 7; c += 7) scr.put(c - off, GROUND, '.______', 'dim');
      items.forEach((it) => it.art.forEach((line, i) => scr.put(it.x, GROUND - it.h - it.lift + i, line, it.coffee ? 'warm' : 'hot')));
      dust.forEach((d) => scr.put(d.x, d.y, d.ch, 'dim', d.life / 0.45));
      const legs = state === 'run' && y < 0.05 ? Math.floor(dist / 2.2) % 2 : 0;
      DINO[legs].forEach((line, i) => scr.put(X, GROUND - 5 - y + i, line, ''));
      const blink = 0.55 + 0.45 * Math.sin(t * 4);
      if (state === 'ready') {
        scr.center(3, 'HTTP DINO', 'hot');
        scr.center(5, fine ? '[ click or press space ]' : '[ tap to play ]', '', blink);
        scr.center(6, 'tap twice for a double jump', 'dim');
      } else if (state === 'over') {
        scr.center(3, `score ${score} · ${RANKS[rankOf(score)][1]}`, 'hot');
        scr.center(4, quip);
        if (performance.now() - overAt > 500) scr.center(6, fine ? '[ click to try again ]' : '[ tap to try again ]', '', blink);
      } else if (flashT > 0) scr.center(3, flash, 'warm', flashT / 0.5);
      scr.unshake();
    };
    const loop = gameLoop(dinoBox, (dt, now) => {
      t += dt;
      if (state === 'run') {
        speed = Math.min(34, speed + dt * 0.45);
        const dx = speed * dt;
        dist += dx; gap -= dx;
        if (gap <= 0) spawn();
        // jump: a tap a moment before landing still counts, and one extra jump is allowed in the air
        if (wantJump > 0 && now - wantJump < 160) {
          if (y < 0.05) { vy = JUMP; air = 0; wantJump = -1; puff(3, X + 2, GROUND - 1); }
          else if (air < 1) { vy = JUMP * 0.85; air++; wantJump = -1; puff(2, X + 4, GROUND - 1 - y); }
        }
        const wasUp = y > 0.05;
        vy -= GRAVITY * dt; y += vy * dt;
        if (y <= 0) { y = 0; vy = 0; if (wasUp) puff(3, X + 2, GROUND - 1); }
        if (y > 6.6) { y = 6.6; vy = Math.min(vy, 0); }   // a ceiling, so a double jump never leaves the screen
        clouds.forEach((c) => { c.x -= dx * 0.2; if (c.x < -8) { c.x = scr.cols + Math.random() * 10; c.row = (Math.random() * 2) | 0; } });
        const feet = GROUND - y, bx0 = X + 5, bx1 = X + 11, by0 = feet - 3.3;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.x -= dx;
          if (it.x < -6) { items.splice(i, 1); continue; }
          const top = GROUND - it.h - it.lift, bottom = GROUND - it.lift;
          const touch = bx0 < it.x + it.w - 0.4 && bx1 > it.x + 0.4 && by0 < bottom - 0.3 && feet > top + 0.35;
          if (!touch) continue;
          if (it.coffee) { items.splice(i, 1); bonus += 10; flash = '+10 · caffeinated'; flashT = 0.9; buzz(8); continue; }
          state = 'over'; overAt = now; shakeT = 0.3; quip = oneOf(QUIPS); buzz(60);
          dinoBox.classList.remove('is-playing');
          if (score > best) { best = score; quip = 'New best. ' + quip; bestEl.textContent = pad4(best); store.set('ksp-dino-best', String(best)); }
          break;
        }
        if (state === 'run') {
          score = Math.floor(dist / 4) + bonus;
          scoreEl.textContent = pad4(score);
          const r = rankOf(score);
          if (r > rankI) { rankI = r; flash = 'promoted: ' + RANKS[r][1]; flashT = 1.4; }
        }
      }
      for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.life <= 0) dust.splice(i, 1); }
      if (flashT > 0) flashT -= dt;
      if (shakeT > 0) shakeT -= dt;
      draw();
    });
    const press = () => {
      const now = performance.now();
      if (state === 'run') { wantJump = now; return; }
      if (state === 'over' && now - overAt < 500) return;   // so a late tap does not restart by accident
      reset(); state = 'run'; wantJump = now;
      dinoBox.classList.add('is-playing');
    };
    dinoBox.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); if (e.pointerType === 'mouse') dinoBox.focus({ preventScroll: true }); press(); });
    dinoBox.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } });
    const refit = () => { scr.fit(); draw(); };
    addEventListener('resize', refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    onTheme(() => { scr.colors(); draw(); });
    reset(); draw();
    loop.start();   // the loop keeps running so the "tap to play" line can pulse
  }

  /* ---------- 2 · Catch the skills ---------- */
  const catchBox = $('[data-game="catch"] .game-box');
  if (catchBox) {
    const canvas = $('canvas', catchBox), scoreEl = $('[data-score]', catchBox), timeEl = $('[data-time]', catchBox);
    const ROWS = 12, BASKET = '\\_______/', BW = BASKET.length, ROUND = 20;
    const SKILLS = ['react', 'kotlin', 'python', 'git', 'sql', 'docker', 'esp32', 'next.js', 'java', 'node', 'c#', 'angular'];
    const scr = asciiScreen(canvas, ROWS);
    let state = 'ready', bx = 0, target = null, keys = 0, items = [], pops = [], score = 0, combo = 0, left = ROUND, spawnIn = 0, t = 0, overAt = 0;
    const centerBasket = () => { bx = (scr.cols - BW) / 2; target = null; };
    const draw = () => {
      scr.clear();
      items.forEach((it) => scr.put(it.x, it.y, it.t, it.kind));
      pops.forEach((p) => scr.put(p.x, p.y, p.t, p.kind, p.life / 0.7));
      scr.put(bx, ROWS - 1, BASKET, '');
      const blink = 0.55 + 0.45 * Math.sin(t * 4);
      if (state === 'ready') {
        scr.center(1, 'CATCH THE SKILLS', 'hot');
        scr.center(3, fine ? '[ click to start ]' : '[ tap to start ]', '', blink);
        scr.center(5, 'slide your finger to move', 'dim');
        scr.center(6, 'skills +1 · coffee +3 · bugs -2', 'dim');
      } else if (state === 'over') {
        const stars = score >= 18 ? 3 : score >= 10 ? 2 : score >= 4 ? 1 : 0;
        scr.center(1, `you caught ${score}`, 'hot');
        scr.center(2, '[' + '*'.repeat(stars) + ' '.repeat(3 - stars) + ']', 'warm');
        scr.center(4, stars === 3 ? 'fast learner, confirmed.' : stars === 2 ? 'that is roughly my week.' : 'the bugs had a good day.');
        if (performance.now() - overAt > 600) scr.center(6, fine ? '[ click to play again ]' : '[ tap to play again ]', '', blink);
      } else if (combo >= 3) scr.put(scr.cols - 9, 0, `combo x${combo}`, 'warm');
    };
    const loop = gameLoop(catchBox, (dt, now) => {
      t += dt;
      if (state === 'run') {
        left -= dt;
        timeEl.textContent = String(Math.max(0, Math.ceil(left)));
        if (keys) { target = null; bx += keys * 36 * dt; }
        if (target !== null) bx += (target - bx) * Math.min(1, dt * 22);   // glide toward the finger
        bx = Math.max(0, Math.min(scr.cols - BW, bx));
        spawnIn -= dt;
        if (spawnIn <= 0) {
          const r = Math.random();
          const text = r < 0.68 ? oneOf(SKILLS) : r < 0.9 ? '}{' : 'c[_]';
          items.push({ t: text, kind: r < 0.68 ? '' : r < 0.9 ? 'hot' : 'warm', x: Math.random() * (scr.cols - text.length), y: -1, v: 3.4 + Math.random() * 2 + (ROUND - left) * 0.14 });
          spawnIn = 0.42 + Math.random() * 0.4;
        }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.v * dt;
          if (it.y < ROWS - 1.4) continue;
          if (it.x + it.t.length > bx + 0.3 && it.x < bx + BW - 0.3) {
            let gain = 1, label = '+1';
            if (it.kind === 'hot') { gain = -2; label = '-2 bug'; combo = 0; buzz(40); }
            else if (it.kind === 'warm') { gain = 3; label = '+3 coffee'; combo++; buzz(8); }
            else { combo++; buzz(6); }
            score = Math.max(0, score + gain);
            scoreEl.textContent = pad2(score);
            pops.push({ t: label, kind: gain < 0 ? 'hot' : 'warm', x: Math.min(scr.cols - label.length, Math.max(0, it.x)), y: ROWS - 2.4, life: 0.7 });
            items.splice(i, 1);
          } else if (it.y > ROWS) { if (it.kind === '') combo = 0; items.splice(i, 1); }
        }
        if (left <= 0) { state = 'over'; overAt = now; items = []; catchBox.classList.remove('is-playing'); if (score >= 10) celebrate(catchBox); }
      }
      for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life -= dt; p.y -= 3 * dt; if (p.life <= 0) pops.splice(i, 1); }
      draw();
    });
    const start = () => { items = []; pops = []; score = 0; combo = 0; left = ROUND; spawnIn = 0.2; state = 'run'; scoreEl.textContent = '00'; catchBox.classList.add('is-playing'); };
    const follow = (e) => { target = scr.colAt(e.clientX) - BW / 2; };
    catchBox.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      if (e.pointerType === 'mouse') catchBox.focus({ preventScroll: true });
      if (state === 'run') { follow(e); return; }
      if (state === 'over' && performance.now() - overAt < 600) return;
      e.preventDefault(); start(); follow(e);
    });
    catchBox.addEventListener('pointermove', (e) => { if (state === 'run') follow(e); });
    catchBox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); keys = e.key === 'ArrowLeft' ? -1 : 1; if (state !== 'run') start(); }
      if ((e.key === ' ' || e.key === 'Enter') && state !== 'run') { e.preventDefault(); start(); }
    });
    catchBox.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys = 0; });
    const refit = () => { scr.fit(); bx = Math.min(bx, scr.cols - BW); draw(); };
    addEventListener('resize', refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { scr.fit(); if (state !== 'run') centerBasket(); draw(); });
    onTheme(() => { scr.colors(); draw(); });
    centerBasket(); draw();
    loop.start();
  }

  /* ---------- 3 · Ship it: tap the five steps in order ---------- */
  const gShip = $('[data-game="ship"]');
  if (gShip) {
    const STEPS = ['Spec', 'Slice', 'Generate', 'Verify', 'Ship'];
    const box = $('.game-box', gShip), line = $('[data-line]', gShip), btns = $('[data-btns]', gShip), msg = $('[data-msg]', gShip);
    const timeEl = $('[data-time]', gShip), bestEl = $('[data-best]', gShip);
    let next = 0, t0 = 0, timer = 0, penalty = 0, running = false, best = parseFloat(store.get('ksp-ship-best') || '0') || 0;
    if (best) bestEl.textContent = best.toFixed(1) + 's';
    const drawLine = () => {
      line.innerHTML = '';
      STEPS.forEach((st, i) => {
        const el = document.createElement('span');
        el.className = 'pipe' + (i < next ? ' on' : '');
        el.textContent = i < next ? st : '?';
        line.appendChild(el);
      });
    };
    const elapsed = () => (performance.now() - t0) / 1000 + penalty;
    const setup = () => {
      next = 0; penalty = 0; running = false; clearInterval(timer);
      timeEl.textContent = '0.0s';
      msg.textContent = 'Tap the five steps in the right order. The clock starts on your first tap.';
      btns.innerHTML = '';
      shuffle(STEPS.slice()).forEach((st) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'ship-btn'; b.textContent = st; b.dataset.step = st;
        b.addEventListener('click', () => press(b));
        btns.appendChild(b);
      });
      drawLine();
    };
    const press = (b) => {
      if (b.disabled) return;
      if (!running && next === 0) { running = true; t0 = performance.now(); timer = setInterval(() => { timeEl.textContent = elapsed().toFixed(1) + 's'; }, 100); }
      if (b.dataset.step === STEPS[next]) {
        b.disabled = true; b.classList.add('done'); next++; drawLine(); buzz(8);
        msg.textContent = ['Good. Next?', 'Nice.', 'Keep going.', 'Almost there.', ''][next - 1];
        if (next === STEPS.length) {
          clearInterval(timer); running = false;
          const t = elapsed();
          timeEl.textContent = t.toFixed(1) + 's';
          const rec = !best || t < best;
          if (rec) { best = t; store.set('ksp-ship-best', String(t)); bestEl.textContent = t.toFixed(1) + 's'; }
          winCard(box, `Shipped in ${t.toFixed(1)}s`, (t < 3 ? 'Faster than my CI pipeline.' : t < 6 ? 'Production is safe.' : 'Shipped is better than perfect.') + (rec ? ' New best!' : ''), setup);
        }
      } else {
        penalty += 1; buzz(40);
        msg.textContent = `Not yet. "${b.dataset.step}" comes later. +1s`;
        b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
      }
    };
    setup();
  }

  /* ---------- 4 · Squash the bugs, spare the features ---------- */
  const gSq = $('[data-game="squash"]');
  if (gSq) {
    const box = $('.game-box', gSq), holesEl = $('[data-holes]', gSq), msg = $('[data-msg]', gSq), scoreEl = $('[data-score]', gSq), timeEl = $('[data-time]', gSq);
    const ART = {
      empty: ['     ', '     ', '\\___/'],
      bug: [' \\_/ ', '-(o)-', '\\___/'],
      feature: ['  +  ', '[new]', '\\___/'],
      splat: [' \\*/ ', ' x_x ', '\\___/'],
      oops: ['  !  ', 'oops ', '\\___/'],
    };
    const N = 6, ROUND = 20;
    const holes = [];
    let state = 'ready', score = 0, left = ROUND, tick = 0, clock = 0, spawnAt = 0;
    const show = (h, kind, ms) => { h.kind = kind; h.until = performance.now() + ms; h.pre.textContent = ART[kind].join('\n'); h.b.dataset.kind = kind; };
    const hit = (h) => {
      if (state !== 'run') { if ($('.game-win', box)) return; start(); return; }
      if (h.kind === 'bug') { score++; show(h, 'splat', 350); buzz(10); h.b.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }], { duration: 160 }); }
      else if (h.kind === 'feature') { score = Math.max(0, score - 3); show(h, 'oops', 500); msg.textContent = 'That was a feature! -3'; buzz(50); }
      scoreEl.textContent = pad2(score);
    };
    for (let i = 0; i < N; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hole';
      b.setAttribute('aria-label', 'Hole ' + (i + 1));
      const pre = document.createElement('pre'); pre.className = 'sprite'; pre.textContent = ART.empty.join('\n');
      b.appendChild(pre); holesEl.appendChild(b);
      const h = { b, pre, kind: 'empty', until: 0 };
      b.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); hit(h); });   // pointerdown reacts faster than click on phones
      b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(h); } });
      holes.push(h);
    }
    const ready = () => { state = 'ready'; msg.textContent = 'Tap any hole to start. Twenty seconds.'; };
    const start = () => {
      state = 'run'; score = 0; left = ROUND; scoreEl.textContent = '00'; timeEl.textContent = String(ROUND);
      msg.textContent = 'Go! Bugs only.';
      clock = performance.now(); spawnAt = 0;
      holes.forEach((h) => show(h, 'empty', 0));
      clearInterval(tick);
      tick = setInterval(step, 80);
    };
    const step = () => {
      const now = performance.now();
      left = ROUND - (now - clock) / 1000;
      timeEl.textContent = String(Math.max(0, Math.ceil(left)));
      holes.forEach((h) => { if (h.kind !== 'empty' && now > h.until) show(h, 'empty', 0); });
      if (left <= 0) {
        clearInterval(tick); state = 'over';
        holes.forEach((h) => show(h, 'empty', 0));
        msg.textContent = '';
        winCard(box, `${score} bug${score === 1 ? '' : 's'} squashed`, score >= 18 ? 'Hired.' : score >= 10 ? 'The bugs lost.' : 'The bugs are in production now.', ready);
        return;
      }
      if (now > spawnAt) {
        const free = holes.filter((h) => h.kind === 'empty');
        if (free.length) {
          const fast = Math.max(0, (ROUND - left) / ROUND);
          show(oneOf(free), Math.random() < 0.18 ? 'feature' : 'bug', 1050 - fast * 420);
        }
        spawnAt = now + 540 - Math.min(260, (ROUND - left) * 14) + Math.random() * 200;
      }
    };
    ready();
  }

  /* ---------- 5 · Memory: match the tools ---------- */
  const gMem = $('[data-game="memory"]');
  if (gMem) {
    const box = $('.game-box', gMem), cardsEl = $('[data-cards]', gMem), msg = $('[data-msg]', gMem), movesEl = $('[data-score]', gMem), bestEl = $('[data-best]', gMem);
    const PAIRS = [['react', '<o>'], ['python', '>>>'], ['kotlin', 'K>'], ['git', 'o-o'], ['docker', '[=]'], ['esp32', '|#|']];
    let open = [], moves = 0, found = 0, lock = false, best = parseInt(store.get('ksp-mem-best') || '0', 10) || 0;
    if (best) bestEl.textContent = pad2(best);
    const setup = () => {
      cardsEl.innerHTML = ''; open = []; moves = 0; found = 0; lock = false; movesEl.textContent = '00';
      msg.textContent = 'Flip two cards at a time. Find all six pairs.';
      shuffle(PAIRS.flatMap((p) => [p, p])).forEach(([name, icon]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'card'; b.dataset.name = name;
        b.setAttribute('aria-label', 'Hidden card');
        const back = document.createElement('span'); back.className = 'card-back'; back.textContent = '?';
        const face = document.createElement('span'); face.className = 'card-face';
        const ic = document.createElement('b'); ic.textContent = icon;
        face.append(ic, name);
        b.append(back, face);
        b.addEventListener('click', () => flip(b));
        cardsEl.appendChild(b);
      });
    };
    const flip = (b) => {
      if (lock || b.classList.contains('up') || b.classList.contains('matched')) return;
      b.classList.add('up'); b.setAttribute('aria-label', b.dataset.name); buzz(6);
      open.push(b);
      if (open.length < 2) return;
      moves++; movesEl.textContent = pad2(moves);
      const [a, c] = open; open = [];
      if (a.dataset.name === c.dataset.name) {
        a.classList.add('matched'); c.classList.add('matched'); found++;
        msg.textContent = found < PAIRS.length ? `${a.dataset.name}, matched.` : '';
        if (found === PAIRS.length) {
          const rec = !best || moves < best;
          if (rec) { best = moves; store.set('ksp-mem-best', String(moves)); bestEl.textContent = pad2(moves); }
          winCard(box, `All matched in ${moves} moves`, (moves <= 8 ? 'Sharp memory.' : 'My toolbox, now yours.') + (rec ? ' New best!' : ''), setup);
        }
      } else {
        lock = true;
        setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); a.setAttribute('aria-label', 'Hidden card'); c.setAttribute('aria-label', 'Hidden card'); lock = false; }, 700);
      }
    };
    setup();
  }

  /* =====================================================================
     VISITOR COUNTER
     The site has no server, so a free counting service keeps the number.
     One visit = one browser session. If the service is down, the line stays hidden.
     ===================================================================== */
  const visits = $('[data-visits]');
  if (visits) {
    const COUNTER = 'https://abacus.jasoncameron.dev';
    const KEY = 'pankqx.github.io/visits';
    const live = location.hostname === 'pankqx.github.io';        // never count local testing
    const counted = store.sget('ksp-counted');
    fetch(`${COUNTER}/${live && !counted ? 'hit' : 'get'}/${KEY}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('counter'))))
      .then((d) => {
        const n = Number(d.value);
        if (!n) return;
        if (live) store.sset('ksp-counted', '1');
        const out = $('[data-visits-n]', visits);
        visits.hidden = false;
        if (reduce) { out.textContent = '#' + pad4(n); return; }
        const t0 = performance.now(), from = Math.max(0, n - 40);
        const roll = (now) => {
          const p = Math.min(1, (now - t0) / 900);
          out.textContent = '#' + pad4(Math.round(from + (n - from) * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(roll);
        };
        requestAnimationFrame(roll);
      })
      .catch(() => { /* counter is offline: the page works fine without it */ });
  }

  /* ---------- for the curious ones with DevTools open ---------- */
  try {
    console.log('%cK S Pankaj%c\nYou opened DevTools on a portfolio. We would get along.\npankqx@gmail.com · github.com/pankqx',
      'font: 900 28px Archivo, sans-serif; color: #ff4e1b', 'font: 12px monospace; color: inherit');
  } catch (e) { /* no console, no problem */ }
})();
