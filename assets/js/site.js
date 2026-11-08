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

  /* ---------- fireworks behind the loader: rockets, bursts, crackles ---------- */
  const fireworks = (canvas, host) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};
    const css = getComputedStyle(doc);
    const blueprint = doc.getAttribute('data-theme') === 'blueprint';
    const signal = css.getPropertyValue('--signal').trim() || '#ff4e1b';
    const palette = blueprint ? [signal, '#ffc24b', '#eaf1fa', '#7fd1ff', '#ff8fb1'] : [signal, '#f2a900', '#d6336c', '#ff7a45', '#1f9e74'];
    const sparkle = blueprint ? ['#ffffff', '#ffe08a'] : ['#f2a900', signal];
    let W = 0, H = 0, k = 1;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      k = Math.max(0.6, Math.min(1.35, Math.min(W, H) / 680));
    };
    size();
    addEventListener('resize', size);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const rockets = [], parts = [];
    const small = W < 600;
    const launch = () => {
      const x = rnd(0.08, 0.92) * W, top = rnd(0.08, 0.4) * H, g = 0.11 * k;
      rockets.push({ x, y: H + 8, px: x, py: H + 8, vx: rnd(-0.7, 0.7) * k, vy: -Math.sqrt(2 * g * (H + 8 - top)), g, color: pick(palette) });
    };
    const burst = (x, y, color) => {
      const kind = Math.random(); // < .3 ring · < .82 peony · else willow
      const n = Math.round(rnd(55, 85) * (small ? 0.65 : 1));
      const alt = pick(palette);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.06, 0.06);
        const sp = (kind < 0.3 ? rnd(3.1, 3.5) : rnd(0.7, 4.6)) * k;
        const willow = kind >= 0.82;
        parts.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0,
          life: willow ? rnd(90, 130) : rnd(50, 90), color: willow ? '#f2a900' : (Math.random() < 0.72 ? color : alt),
          w: rnd(1.3, 2.3) * k, drag: willow ? 0.972 : 0.984, grav: (willow ? 0.07 : 0.045) * k, crackle: !willow && Math.random() < 0.22 });
      }
      parts.push({ flash: true, x, y, age: 0, life: 12, r: 46 * k, color });
    };
    const crack = (x, y) => {
      for (let i = 0; i < 5; i++) {
        const a = rnd(0, Math.PI * 2), sp = rnd(0.6, 2) * k;
        parts.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rnd(8, 16), color: pick(sparkle), w: 1.2 * k, drag: 0.9, grav: 0, twinkle: true });
      }
    };
    const start = performance.now();
    let last = start, next = 120, finale = false, alive = true;
    const frame = (now) => {
      if (!alive) return;
      const dt = Math.max(0, Math.min(3, (now - last) / 16.67)), e = Math.max(0, now - start);
      last = now;
      ctx.clearRect(0, 0, W, H);
      if (e > next && e < 4400) { launch(); if (Math.random() < 0.3) launch(); next = e + rnd(240, 480); }
      if (!finale && e > 3700) { finale = true; for (let i = 0; i < (small ? 4 : 6); i++) setTimeout(launch, i * 70); }
      ctx.lineCap = 'round';
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.px = r.x; r.py = r.y;
        r.vy += r.g * dt; r.x += r.vx * dt; r.y += r.vy * dt;
        const tail = ctx.createLinearGradient(r.x, r.y, r.x - r.vx * 7, r.y - r.vy * 7);
        tail.addColorStop(0, r.color); tail.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = tail; ctx.lineWidth = 2.2 * k;
        ctx.beginPath(); ctx.moveTo(r.x - r.vx * 7, r.y - r.vy * 7); ctx.lineTo(r.x, r.y); ctx.stroke();
        ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, 2 * k, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.5) parts.push({ x: r.x, y: r.y + 4, px: r.x, py: r.y + 4, vx: rnd(-0.4, 0.4), vy: rnd(0.4, 1.4), age: 0, life: rnd(10, 22), color: pick(sparkle), w: 1.1 * k, drag: 0.94, grav: 0.02, twinkle: true });
        if (r.vy >= -0.6) { burst(r.x, r.y, r.color); rockets.splice(i, 1); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
        const t = p.age / p.life;
        if (p.flash) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = (1 - t) * 0.35; ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        p.px = p.x; p.py = p.y;
        const d = Math.pow(p.drag, dt);
        p.vx *= d; p.vy = p.vy * d + p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = p.twinkle ? Math.random() * (1 - t) : (1 - t * t);
        ctx.strokeStyle = p.color; ctx.lineWidth = p.w;
        const len = p.twinkle ? 1 : (p.grav > 0.06 * k ? 12 : 8);
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * len, p.y - p.vy * len); ctx.lineTo(p.x + 0.01, p.y + 0.01); ctx.stroke();
        if (!p.twinkle && t < 0.7) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.w * 0.9, 0, Math.PI * 2); ctx.fill(); }
        if (p.crackle && t > 0.72) { p.crackle = false; crack(p.x, p.y); }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return () => { alive = false; removeEventListener('resize', size); };
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
    const fxCanvas = $('.boot-fx', boot);
    const stopFx = fxCanvas ? fireworks(fxCanvas, boot) : () => {};
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
      setTimeout(() => { stopFx(); boot.remove(); }, 1200);
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

  /* ---------- KSP-01 in 3D, drawn with characters ---------- */
  const c3 = $('.c3d');
  if (c3) {
    const BM = { K: ['1...1', '1..1.', '1.1..', '11...', '1.1..', '1..1.', '1...1'], S: ['.1111', '1....', '1....', '.111.', '....1', '....1', '1111.'], P: ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'] };
    const H = 0.14, ST = 0.02;
    const lx0 = -0.8, lx1 = 0.8, lz0 = -0.46, lz1 = 0.46;
    const mark = (x, z) => {
      if (Math.hypot(x + 0.78, z - 0.76) < 0.1) return 2;
      if (Math.abs(x) > 0.93 || Math.abs(z) > 0.93) return 3;
      if (x < lx0 || x > lx1 || z < lz0 || z > lz1) return 0;
      const c = Math.min(16, Math.floor(((x - lx0) / (lx1 - lx0)) * 17));
      const r = Math.min(6, Math.floor(((lz1 - z) / (lz1 - lz0)) * 7));
      const li = Math.floor(c / 6), lc = c % 6;
      if (li > 2 || lc === 5) return 0;
      return BM['KSP'[li]][r][lc] === '1' ? 1 : 0;
    };
    const pts = [];
    const add = (x, y, z, nx, ny, nz, m) => pts.push(x, y, z, nx, ny, nz, m || 0);
    const box = (x0, x1, y0, y1, z0, z1, top) => {
      const rng = (a, b) => { const o = []; for (let v = a; v <= b + 1e-9; v += ST) o.push(v); if (o[o.length - 1] < b - 1e-6) o.push(b); return o; };
      const X = rng(x0, x1), Y = rng(y0, y1), Z = rng(z0, z1);
      X.forEach((x) => Z.forEach((z) => { add(x, y1, z, 0, 1, 0, top ? mark(x, z) : 0); add(x, y0, z, 0, -1, 0); }));
      X.forEach((x) => Y.forEach((y) => { add(x, y, z1, 0, 0, 1); add(x, y, z0, 0, 0, -1); }));
      Z.forEach((z) => Y.forEach((y) => { add(x1, y, z, 1, 0, 0); add(x0, y, z, -1, 0, 0); }));
    };
    box(-1, 1, -H, H, -1, 1, true);
    for (let i = 0; i < 7; i++) {
      const t = -0.75 + i * 0.25, w = 0.05;
      box(1, 1.3, -0.07, -0.02, t - w, t + w); box(-1.3, -1, -0.07, -0.02, t - w, t + w);
      box(t - w, t + w, -0.07, -0.02, 1, 1.3); box(t - w, t + w, -0.07, -0.02, -1.3, -1);
    }
    const PT = new Float32Array(pts);
    const RAMP = '.,-~:;=!*#$@';
    let cols = 84, rows = 42, K1 = 80, A = -1.0, B = 0.35, vA = 0, vB = 0, drag = null, visible = true, clock = 0;
    const fit = () => {
      const w = c3.parentElement.clientWidth;
      cols = w < 520 ? 56 : 84;
      rows = Math.round(cols * 0.5);
      c3.style.fontSize = (w / (cols * 0.6)).toFixed(2) + 'px';
      K1 = cols * 1.3;
    };
    fit();
    addEventListener('resize', fit);
    const out = [], zb = new Float32Array(200 * 100);
    const render = () => {
      const n = cols * rows;
      out.length = n; out.fill(' ');
      zb.fill(0, 0, n);
      const ca = Math.cos(A), sa = Math.sin(A), cb = Math.cos(B), sb = Math.sin(B);
      const K2 = 4.2, KY = K1 * (0.6 / 1.1);
      for (let i = 0; i < PT.length; i += 7) {
        const x = PT[i], y = PT[i + 1], z = PT[i + 2];
        const x1 = x * cb + z * sb, z1 = -x * sb + z * cb;
        const y2 = y * ca - z1 * sa, z2 = y * sa + z1 * ca;
        const ooz = 1 / (z2 + K2);
        const xp = (cols / 2 + K1 * ooz * x1) | 0, yp = (rows / 2 - KY * ooz * y2) | 0;
        if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;
        const idx = xp + yp * cols;
        if (ooz <= zb[idx]) continue;
        const nx = PT[i + 3], ny = PT[i + 4], nz = PT[i + 5];
        const nz1 = -nx * sb + nz * cb;
        const ny2 = ny * ca - nz1 * sa, nz2 = ny * sa + nz1 * ca;
        if (nz2 > 0.2) continue; // facing away
        zb[idx] = ooz;
        const L = ny2 * 0.55 - nz2 * 0.6 + nx * 0.25;
        const m = PT[i + 6];
        if (m === 1) { out[idx] = L > 0.2 ? '@' : '#'; continue; }
        if (m === 2) { out[idx] = 'O'; continue; }
        if (m === 3) { out[idx] = L > 0.2 ? '#' : '='; continue; }
        const top = ny > 0.5;
        out[idx] = L > 0 ? RAMP[Math.min(top ? 4 : 11, 1 + ((L * (top ? 5 : 11)) | 0))] : '.';
      }
      let s = '';
      for (let r = 0; r < rows; r++) s += out.slice(r * cols, r * cols + cols).join('') + (r < rows - 1 ? '\n' : '');
      c3.textContent = s;
    };
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(3, Math.max(0, (now - last) / 16.67)); last = now;
      if (!drag) {
        clock += dt;
        B += vB * dt; vB *= Math.pow(0.95, dt);
        A += vA * dt; vA *= Math.pow(0.92, dt);
        const sway = 0.5 * Math.sin(clock * 0.018);
        const home = Math.round(B / (Math.PI * 2)) * Math.PI * 2 + sway;
        if (Math.abs(vB) < 0.01) B += (home - B) * 0.03 * dt;
        A += (-1.0 + 0.12 * Math.sin(clock * 0.011) - A) * 0.03 * dt;
      }
      render();
      if (visible && !reduce) requestAnimationFrame(loop);
    };
    render();
    if (!reduce) {
      new IntersectionObserver((en) => { const was = visible; visible = en[0].isIntersecting; if (visible && !was) { last = performance.now(); requestAnimationFrame(loop); } }).observe(c3);
      requestAnimationFrame(loop);
    }
    c3.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c3.setPointerCapture(e.pointerId); });
    c3.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      B += dx * 0.012; A = Math.max(-1.5, Math.min(0.6, A - dy * 0.012));
      vB = dx * 0.012; vA = -dy * 0.006;
      if (reduce) render();
    });
    const end = () => { drag = null; };
    c3.addEventListener('pointerup', end); c3.addEventListener('pointercancel', end);
  }

  /* ---------- for the curious ones with DevTools open ---------- */
  try {
    console.log('%cK S Pankaj%c\nYou opened DevTools on a portfolio. We would get along.\npankqx@gmail.com · github.com/pankqx',
      'font: 900 28px Archivo, sans-serif; color: #ff4e1b', 'font: 12px monospace; color: inherit');
  } catch (e) { /* no console, no problem */ }
})();
