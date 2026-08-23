/* Antigravity site – motion layer (GSAP + ScrollTrigger + MotionPath from CDN, with graceful fallback) */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap) { try { gsap.registerPlugin(ScrollTrigger, MotionPathPlugin); } catch (e) {} }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* dev: ?y=N jumps to a scroll offset */
  const y0 = new URLSearchParams(location.search).get('y');
  if (y0) { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, +y0); }

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const sentinel = document.createElement('div'); sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting), { rootMargin: '-8px 0px 0px 0px', threshold: 1 }).observe(sentinel);
  const mega = $('.nav__item--mega');
  if (mega) {
    const btn = $('.nav__link', mega);
    const open = (v) => { mega.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); open(!mega.classList.contains('is-open')); });
    mega.addEventListener('mouseenter', () => open(true));
    mega.addEventListener('mouseleave', () => open(false));
    document.addEventListener('click', (e) => { if (!mega.contains(e.target)) open(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
  }
  const burger = $('#burger');
  burger && burger.addEventListener('click', () => { const v = !nav.classList.contains('is-open'); nav.classList.toggle('is-open', v); burger.setAttribute('aria-expanded', String(v)); });

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));
  function onVisible(el, fn, threshold = 0.35) {
    if (!el) return;
    const o = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { fn(el); o.unobserve(el); } }), { threshold });
    o.observe(el);
  }

  /* ---------- Spotlight cards + tilt + magnetic ---------- */
  $$('.spot').forEach(card => card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    $$('.tilt').forEach(el => {
      const max = parseFloat(el.dataset.tilt || '6');
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(1200px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`; });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'; el.style.transform = 'perspective(1200px) rotateY(0) rotateX(0)'; setTimeout(() => el.style.transition = '', 600); });
    });
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35; el.style.transform = `translate(${x}px, ${y}px)`; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Count-up ---------- */
  $$('[data-count]').forEach(el => onVisible(el, (node) => {
    const target = parseFloat(node.dataset.count); const dec = (node.dataset.count.split('.')[1] || '').length;
    if (reduced) { node.textContent = target.toLocaleString(undefined, { minimumFractionDigits: dec }); return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); node.textContent = (target * e).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, 0.6));

  /* ---------- Switcher ---------- */
  $$('.switcher').forEach(sw => {
    const tabs = $$('.tab', sw), panes = $$('.pane', sw); let i = 0, timer;
    const dur = parseInt(sw.dataset.interval || '6000', 10); sw.style.setProperty('--dur', dur + 'ms');
    const show = (n) => { i = n; tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === n)); const bar = $('.tab__bar i', t); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; } }); panes.forEach((p, k) => p.classList.toggle('is-active', k === n)); };
    const start = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => show((i + 1) % tabs.length), dur); };
    tabs.forEach((t, k) => t.addEventListener('click', () => { show(k); start(); }));
    sw.addEventListener('mouseenter', () => clearInterval(timer)); sw.addEventListener('mouseleave', start);
    show(0); onVisible(sw, start, 0.2);
  });

  /* ---------- Digest ---------- */
  $$('.digest').forEach(d => onVisible(d, (el) => $$('.dig', el).forEach((x, k) => setTimeout(() => x.classList.add('is-on'), reduced ? 0 : 150 + k * 320)), 0.3));

  /* ---------- Hero orbit: nodes on an ellipse, particles travel node → core, core fills ---------- */
  $$('.orbit').forEach(orbit => {
    const nodes = $$('.node', orbit), svg = $('svg', orbit), core = $('.core', orbit);
    const W = 1000, H = 920, cx = 500, cy = 460, rx = 420, ry = 330;
    const place = (angleDeg) => { const a = angleDeg * Math.PI / 180; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; };
    nodes.forEach((n, k) => { const p = place(-90 + k * (360 / nodes.length)); n.style.left = (p.x / W * 100) + '%'; n.style.top = (p.y / H * 100) + '%'; n.dataset.x = p.x; n.dataset.y = p.y; });
    if (!svg) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<ellipse class="ring" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><ellipse class="ring ring--dash" cx="${cx}" cy="${cy}" rx="${rx * 0.62}" ry="${ry * 0.62}"/>` +
      nodes.map((n, k) => `<path class="path" id="op${k}" d="M${n.dataset.x} ${n.dataset.y} Q ${(+n.dataset.x + cx) / 2 + (k % 2 ? 60 : -60)} ${(+n.dataset.y + cy) / 2} ${cx} ${cy}"/>`).join('') +
      nodes.map((n, k) => `<circle class="dot" r="4" id="od${k}" opacity="0"/>`).join('');
    const rows = $$('.core__row', core), bar = $('.core__bar i', core);
    if (reduced || !hasGsap) { rows.forEach(r => r.classList.add('is-on')); if (bar) bar.style.width = '100%'; return; }
    let k = 0;
    const fire = () => {
      const n = nodes[k % nodes.length], dot = $('#od' + (k % nodes.length), svg);
      nodes.forEach(x => x.classList.remove('is-lit')); n.classList.add('is-lit');
      gsap.fromTo(dot, { opacity: 1 }, { duration: 1.4, ease: 'power2.inOut', motionPath: { path: '#op' + (k % nodes.length), align: '#op' + (k % nodes.length), alignOrigin: [0.5, 0.5] }, onComplete: () => {
        gsap.to(dot, { opacity: 0, duration: 0.2 });
        const row = rows[k % rows.length]; row.classList.add('is-on');
        gsap.fromTo(core, { boxShadow: '0 0 0 1px rgba(6,182,212,0.9), 0 0 60px -5px rgba(6,182,212,0.9)' }, { boxShadow: '0 0 0 1px rgba(6,182,212,0.25), 0 0 40px -10px rgba(6,182,212,0.45)', duration: 0.9 });
        if (bar) gsap.to(bar, { width: Math.min(100, ((k % rows.length) + 1) / rows.length * 100) + '%', duration: 0.6, ease: 'power2.out' });
        if ((k + 1) % rows.length === 0) setTimeout(() => rows.forEach(r => r.classList.remove('is-on')), 1800);
        k++;
      } });
    };
    fire(); setInterval(fire, 2200);
    setTimeout(() => { if (!core.querySelector('.core__row.is-on')) { rows.forEach(r => r.classList.add('is-on')); if (bar) bar.style.width = '100%'; } }, 4000);
    // slow orbit rotation of the whole node layer via counter-rotating labels isn't needed; gently float nodes instead
    nodes.forEach((n, i) => gsap.to(n, { y: '+=10', duration: 3 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.2 }));
    // mouse parallax on the art
    const art = $('.orbit__art', orbit);
    if (art && matchMedia('(pointer:fine)').matches) orbit.addEventListener('pointermove', (e) => { const r = orbit.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; gsap.to(art, { x: px * 18, y: py * 18, duration: 0.8, ease: 'power2.out' }); });
  });

  /* ---------- Pipeline: scroll-scrubbed light along the rail ---------- */
  $$('.pipeline').forEach(pl => {
    const lit = $('.rail--lit', pl), spark = $('.spark', pl), steps = $$('.pstep', pl);
    if (!lit) return;
    const setP = (p) => { lit.style.strokeDasharray = `${p * 1000} 1000`; lit.setAttribute('pathLength', '1000'); if (spark) spark.setAttribute('cx', (p * 100) + '%'); steps.forEach((s, i) => s.classList.toggle('is-lit', p >= (i + 0.5) / steps.length)); };
    if (reduced || !hasGsap) { setP(1); return; }
    ScrollTrigger.create({ trigger: pl, start: 'top 80%', end: 'bottom 45%', scrub: 0.6, onUpdate: (st) => setP(st.progress) });
  });

  /* ---------- Inbox sorter: messages fly in from sources, list re-sorts with hot on top ---------- */
  $$('.sorter').forEach(sorter => onVisible(sorter, (el) => {
    const list = $('.sorter__list', el), sources = $$('.src', el);
    const queue = [
      { src: 1, icon: 'ph-chat-circle-text', who: 'Maria S.', text: 'Can you call me at 10? I need to sell this month.', tag: 'hot' },
      { src: 0, icon: 'ph-envelope-simple', who: 'D. Torres', text: 'What is your timeline usually? Just exploring.', tag: 'warm' },
      { src: 2, icon: 'ph-messenger-logo', who: 'J. Kim', text: 'Sent the address. Tenants leave next week.', tag: 'hot' },
      { src: 3, icon: 'ph-instagram-logo', who: 'A. Reyes', text: 'Not now, maybe next spring.', tag: 'now' },
      { src: 1, icon: 'ph-chat-circle-text', who: 'R. Patel', text: 'Yes, I want an offer. Roof needs work.', tag: 'hot' },
    ];
    const rank = { hot: 0, warm: 1, now: 2 };
    const render = (item) => { const m = document.createElement('div'); m.className = 'msg is-new'; m.dataset.tag = item.tag; m.innerHTML = `<i class="ph ${item.icon}"></i><div><b>${item.who}</b><span>${item.text}</span></div><span class="tag tag--${item.tag}">${item.tag === 'now' ? 'not now' : item.tag}</span>`; return m; };
    const resort = () => {
      const items = $$('.msg', list); const first = new Map(items.map(m => [m, m.getBoundingClientRect().top]));
      items.sort((a, b) => rank[a.dataset.tag] - rank[b.dataset.tag]).forEach(m => list.appendChild(m));
      items.forEach(m => { const dy = first.get(m) - m.getBoundingClientRect().top; if (dy && hasGsap && !reduced) gsap.fromTo(m, { y: dy }, { y: 0, duration: 0.7, ease: 'power3.inOut' }); });
    };
    let i = 0;
    const tick = () => {
      const item = queue[i % queue.length]; const src = sources[item.src];
      sources.forEach(s => s.classList.remove('is-fire')); src && src.classList.add('is-fire');
      const m = render(item);
      if (list.children.length >= 5) { const last = list.lastElementChild; if (hasGsap && !reduced) gsap.to(last, { opacity: 0, x: 20, duration: 0.3, onComplete: () => last.remove() }); else last.remove(); }
      if (hasGsap && !reduced && src) {
        const fly = document.createElement('div'); fly.className = 'flying'; fly.innerHTML = `<i class="ph ${item.icon}"></i>`; el.appendChild(fly);
        const er = el.getBoundingClientRect(), sr = src.getBoundingClientRect(), lr = list.getBoundingClientRect();
        gsap.set(fly, { x: sr.left - er.left + 4, y: sr.top - er.top + 4 });
        gsap.to(fly, { x: lr.left - er.left + 8, y: lr.top - er.top + 8, duration: 0.7, ease: 'power2.inOut', onComplete: () => { fly.remove(); list.prepend(m); gsap.from(m, { opacity: 0, scale: 0.96, duration: 0.3 }); setTimeout(() => { resort(); setTimeout(() => m.classList.remove('is-new'), 900); }, 500); } });
      } else { list.prepend(m); resort(); }
      i++;
    };
    tick(); setInterval(tick, 2600);
  }, 0.3));

  /* ---------- Call scene: typed transcript, chips fly from the mark into the fact slots ---------- */
  const lines = [
    { t: 'So the house is at <mark>1427 Maple Avenue</mark>, here in Dallas. It was my mother’s.', f: 0, chip: '1427 Maple Ave' },
    { t: 'I was hoping to get around <mark>one eighty-five</mark> for it, but honestly I just want it handled.', f: 1, chip: '$185,000' },
    { t: 'I live in Phoenix now, so I <mark>can’t keep flying out</mark> to deal with it.', f: 2, chip: 'Out of state' },
    { t: 'The <mark>roof needs work</mark>, the kitchen is from the 80s, and it’s been <mark>empty since March</mark>.', f: 3, chip: 'Roof · vacant' },
    { t: 'Could someone <mark>call me tomorrow around ten</mark>? I’ll have the paperwork by then.', f: 4, chip: 'Callback 10:00' },
  ];
  $$('.scene').forEach(scene => onVisible(scene, (sc) => {
    const line = $('.transcript__line', sc), facts = $$('.fact', sc), clock = $('.tclock', sc);
    let sec = 41; if (clock) setInterval(() => { sec++; clock.textContent = String(sec % 60).padStart(2, '0'); }, 1000);
    if (reduced || !line) { if (line) line.innerHTML = lines[0].t; facts.forEach(f => f.classList.add('is-on')); return; }
    let i = 0;
    const flyChip = (item) => {
      const mark = $('mark', line), fact = facts[item.f]; if (!mark || !fact || !hasGsap) { fact && fact.classList.add('is-on'); return; }
      const chip = document.createElement('div'); chip.className = 'chip-fly'; chip.textContent = item.chip; sc.appendChild(chip);
      const r0 = mark.getBoundingClientRect(), r1 = fact.getBoundingClientRect(), rs = sc.getBoundingClientRect();
      gsap.set(chip, { x: r0.left - rs.left, y: r0.top - rs.top, scale: 0.9 });
      gsap.to(chip, { x: r1.left - rs.left + 10, y: r1.top - rs.top + 10, scale: 0.7, opacity: 0.2, duration: 0.8, ease: 'power3.inOut', onComplete: () => { chip.remove(); fact.classList.add('is-on'); } });
    };
    const typeLine = () => {
      const item = lines[i % lines.length]; if (i % lines.length === 0) facts.forEach(f => f.classList.remove('is-on'));
      const tmp = document.createElement('div'); tmp.innerHTML = item.t; const plain = tmp.textContent; let pos = 0;
      const tick = () => {
        pos++; let out = '', count = 0;
        tmp.childNodes.forEach(n => { const txt = n.textContent, take = Math.max(0, Math.min(txt.length, pos - count)); const piece = txt.slice(0, take); count += txt.length; out += n.nodeName === 'MARK' ? (piece ? `<mark>${piece}</mark>` : '') : piece; });
        line.innerHTML = out + '<span class="caret"></span>';
        if (pos < plain.length) setTimeout(tick, 24); else { flyChip(item); i++; setTimeout(typeLine, 1600); }
      };
      tick();
    };
    typeLine();
  }, 0.4));

  /* ---------- SMS scene ---------- */
  $$('.phone').forEach(phone => onVisible(phone, (ph) => {
    const bubbles = $$('.bubble', ph); const side = $$('.sms-side .callout', ph.parentElement);
    if (reduced) { bubbles.forEach(b => b.classList.add('is-on')); side.forEach(s => s.classList.add('is-on')); return; }
    const play = () => {
      bubbles.forEach(b => b.classList.remove('is-on')); side.forEach(s => s.classList.remove('is-on'));
      let delay = 300;
      bubbles.forEach((b, idx) => {
        const out = b.classList.contains('bubble--out');
        if (out) { setTimeout(() => { b.dataset.html = b.dataset.html || b.innerHTML; b.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; b.classList.add('is-on'); }, delay); delay += 900; setTimeout(() => { b.innerHTML = b.dataset.html; }, delay); }
        else setTimeout(() => b.classList.add('is-on'), delay);
        delay += out ? 1400 : 1700;
        if (idx === bubbles.length - 1) { setTimeout(() => side.forEach((s, k) => setTimeout(() => s.classList.add('is-on'), k * 250)), delay - 800); setTimeout(play, delay + 6000); }
      });
    };
    play();
  }, 0.4));

  /* ---------- Budget splitter (interactive) ---------- */
  $$('.splitter').forEach(sp => {
    const range = $('input[type=range]', sp), meta = $('.fill--meta', sp), goog = $('.fill--google', sp), tMeta = $('.t-meta', sp), tGoog = $('.t-google', sp), total = parseFloat(sp.dataset.total || '100');
    const H = 90, Y = 150; // bucket geometry in the svg
    const apply = (p) => {
      sp.style.setProperty('--p', p + '%');
      if (meta) { meta.setAttribute('height', H * p / 100); meta.setAttribute('y', Y + H - H * p / 100); }
      if (goog) { goog.setAttribute('height', H * (100 - p) / 100); goog.setAttribute('y', Y + H - H * (100 - p) / 100); }
      if (tMeta) tMeta.textContent = `$${Math.round(total * p / 100)}/day`; if (tGoog) tGoog.textContent = `$${Math.round(total * (100 - p) / 100)}/day`;
      $$('.flow--meta', sp).forEach(f => f.style.opacity = 0.3 + p / 100 * 0.7); $$('.flow--google', sp).forEach(f => f.style.opacity = 0.3 + (100 - p) / 100 * 0.7);
    };
    range && range.addEventListener('input', () => apply(+range.value)); apply(range ? +range.value : 64);
  });

  /* ---------- Automation graph: pulses along edges, nodes light up ---------- */
  $$('.graph').forEach(g => onVisible(g, (el) => {
    const edges = $$('.edge', el), nodes = $$('.gnode', el), svg = $('svg', el);
    if (!hasGsap || reduced) { nodes.forEach(n => n.classList.add('is-lit')); return; }
    const run = (k) => {
      const e = edges[k % edges.length]; if (!e.id) e.id = 'e' + k;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '4'); c.setAttribute('class', 'pulse'); svg.appendChild(c);
      const from = nodes.find(n => n.dataset.id === e.dataset.from), to = nodes.find(n => n.dataset.id === e.dataset.to);
      from && from.classList.add('is-lit');
      gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.to(c, { duration: 1.2, ease: 'power1.inOut', motionPath: { path: '#' + e.id, align: '#' + e.id, alignOrigin: [0.5, 0.5] }, onComplete: () => { c.remove(); to && to.classList.add('is-lit'); setTimeout(() => { from && from.classList.remove('is-lit'); }, 400); } });
    };
    let k = 0; run(0); setInterval(() => { k++; if (k % edges.length === 0) nodes.forEach(n => n.classList.remove('is-lit')); run(k); }, 1500);
  }, 0.3));

  /* ---------- Deal assembler: chips fly from sources into slots ---------- */
  $$('.assembler').forEach(as => onVisible(as, (el) => {
    const sources = $$('.source', el), slots = $$('.slot', el);
    const plan = [{ s: 0, slot: 0, v: 'Maria Sanchez' }, { s: 0, slot: 1, v: '$142,300 · 61% equity' }, { s: 1, slot: 2, v: '(512) 555-0142' }, { s: 2, slot: 3, v: 'ARV $262k' }, { s: 3, slot: 4, v: 'Pre-foreclosure' }, { s: 2, slot: 5, v: '84 cash buyers' }];
    if (!hasGsap || reduced) { slots.forEach(s => s.classList.add('is-filled')); return; }
    let i = 0;
    const step = () => {
      const p = plan[i % plan.length]; if (i % plan.length === 0) slots.forEach(s => s.classList.remove('is-filled'));
      const src = sources[p.s], slot = slots[p.slot]; sources.forEach(s => s.classList.remove('is-fire')); src.classList.add('is-fire');
      const chip = document.createElement('div'); chip.className = 'chip-fly'; chip.textContent = p.v; el.appendChild(chip);
      const r0 = src.getBoundingClientRect(), r1 = slot.getBoundingClientRect(), rs = el.getBoundingClientRect();
      gsap.set(chip, { x: r0.left - rs.left + 8, y: r0.top - rs.top + 14, scale: 0.8, opacity: 0 });
      gsap.to(chip, { opacity: 1, duration: 0.2 });
      gsap.to(chip, { x: r1.left - rs.left + 6, y: r1.top - rs.top + 6, scale: 0.9, duration: 0.9, ease: 'power3.inOut', onComplete: () => { chip.remove(); slot.classList.add('is-filled'); gsap.fromTo(slot, { scale: 1.04 }, { scale: 1, duration: 0.4 }); } });
      i++;
    };
    step(); setInterval(step, 1700);
  }, 0.3));

  /* ---------- Screenshots: subtle scroll parallax on frames ---------- */
  if (hasGsap && !reduced) $$('.lift').forEach(el => gsap.fromTo(el, { y: 30 }, { y: -30, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 } }));
})();
