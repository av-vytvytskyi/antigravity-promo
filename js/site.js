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
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  /* Scenes are decorative: never burn CPU on one that is off screen or in a hidden tab. */
  function everyVisible(el, fn, ms, immediate = true) {
    let timer = null;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !document.hidden) { if (!timer) { if (immediate) fn(); timer = setInterval(fn, ms); } }
      else if (timer) { clearInterval(timer); timer = null; }
    }), { threshold: 0.1 });
    io.observe(el);
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearInterval(timer); timer = null; } });
  }
  function visibility(el) {
    const state = { on: false };
    new IntersectionObserver(es => es.forEach(e => state.on = e.isIntersecting), { threshold: 0.1 }).observe(el);
    return state;
  }

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

  /* ==========================================================================
     Hero GPU scene
     Six streams of light leave the module tiles and converge on the record
     card; one bright packet per write. Everything here is progressive: if the
     context, the shaders or the frame budget fail, initOrbitGL returns null
     (or goes dormant) and the SVG orbit below stays exactly as it was.
     ========================================================================== */
  const FIELD_VS = `
    attribute vec2 aPos; varying vec2 vUv;
    void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FIELD_FS = `
    precision mediump float;
    varying vec2 vUv;
    uniform vec2 uRes; uniform vec2 uCore; uniform vec2 uMouse; uniform vec2 uRing;
    uniform float uTime; uniform float uPulse;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      float ar = uRes.x / uRes.y;
      vec2 p = (vUv - uCore) * vec2(ar, 1.0);
      float r = length(p);
      float n = fbm(vUv * 3.0 + uMouse * 0.10 + vec2(uTime * 0.020, -uTime * 0.014));
      /* the canvas is a rectangle over a dark page: everything must reach zero
         before the edge, or the box itself becomes the brightest shape here */
      float edge = smoothstep(0.0, 0.34, vUv.x) * smoothstep(1.0, 0.66, vUv.x)
                 * smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.70, vUv.y);
      edge *= edge;
      float haze = smoothstep(0.62, 0.0, r) * (0.16 + 0.84 * n) * edge;
      float bloom = exp(-r * r * 7.0) * (0.70 + 0.30 * uPulse);
      float hot = exp(-r * r * 90.0) * (0.58 + 0.42 * uPulse);
      float rad = (1.0 - uPulse) * 0.62;
      float write = exp(-pow((r - rad) * 13.0, 2.0)) * uPulse * uPulse * 0.20;
      /* the ellipse the six tiles stand on, with one highlight sweeping it */
      float e = length(p / uRing);
      float sweep = pow(cos(atan(p.y, p.x) - uTime * 0.42) * 0.5 + 0.5, 7.0);
      float ring = exp(-pow((e - 1.0) * 22.0, 2.0)) * (0.09 + 0.42 * sweep) * edge;
      vec3 cyan = vec3(0.024, 0.714, 0.831);
      vec3 pale = vec3(0.55, 0.88, 0.97);
      vec3 c = cyan * (haze * 0.34 + bloom * 0.38 + write + ring) + pale * (hot * 0.22 + ring * sweep * 0.30);
      /* the canvas is a rectangle blended with screen: any value still alive at
         the border becomes a visible seam down the page, so all of it fades out */
      c *= edge;
      /* premultiplied: alpha is the light's own coverage, so the near-black page
         behind it is replaced by exactly as much as the glow is bright */
      gl_FragColor = vec4(c, clamp(max(max(c.r, c.g), c.b), 0.0, 1.0));
    }`;

  const DOT_VS = `
    precision mediump float;
    attribute vec2 aNode; attribute vec2 aCtrl; attribute vec2 aAlt;
    attribute float aPhase; attribute float aSpeed; attribute float aSize;
    attribute float aDepth; attribute float aStream; attribute float aJit;
    uniform vec2 uCore; uniform vec2 uMouse; uniform vec2 uLift;
    uniform float uTime; uniform float uActive; uniform float uPacket; uniform float uDpr;
    varying float vAlpha; varying float vHot;
    vec2 bez(vec2 a, vec2 b, vec2 c, float t){ float m = 1.0 - t; return m * m * a + 2.0 * m * t * b + t * t * c; }
    void main(){
      vec2 pos; float alpha; float hot = 0.0;
      if (aStream < 0.0) {
        float s = uTime * 0.05 + aPhase * 6.283;
        pos = aAlt + vec2(sin(s) * 0.018, cos(s * 0.77) * 0.018);
        alpha = 0.18 + 0.30 * aPhase;
        gl_PointSize = (1.2 + aSize * 2.0) * uDpr;
      } else {
        float near = step(abs(aStream - uActive), 0.5);
        vec2 from = aNode + uLift * near;
        vec2 ctrl = aCtrl + uLift * near * 0.5;
        float t;
        if (aSpeed < 0.0) {
          t = uPacket - aPhase * 0.11;
          if (uPacket < 0.0 || near < 0.5 || t < 0.0 || t > 1.0) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); vAlpha = 0.0; vHot = 0.0; return; }
          alpha = (1.0 - aPhase * 0.85) * 1.5;
          hot = 1.0;
          gl_PointSize = (2.5 + (1.0 - aPhase) * 7.5) * uDpr;
        } else {
          t = fract(aPhase + uTime * aSpeed);
          alpha = (0.26 + 0.55 * near) * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.95, 1.0, t));
          hot = near * 0.5;
          gl_PointSize = (1.3 + aSize * 2.8) * uDpr;
        }
        pos = bez(from, ctrl, aAlt, t);
        vec2 dir = normalize(aAlt - from);
        pos += vec2(-dir.y, dir.x) * aJit * 0.024 * (1.0 - t) * (1.0 - t);
      }
      pos += uMouse * (0.010 + aDepth * 0.042);
      gl_Position = vec4(pos, 0.0, 1.0);
      vAlpha = alpha * smoothstep(1.0, 0.80, abs(pos.x)) * smoothstep(1.0, 0.82, abs(pos.y));
      vHot = hot;
    }`;

  const DOT_FS = `
    precision mediump float;
    varying float vAlpha; varying float vHot;
    void main(){
      vec2 d = gl_PointCoord - 0.5;
      float r2 = dot(d, d);
      if (r2 > 0.25) discard;
      float f = exp(-r2 * 11.0) * vAlpha;
      vec3 c = mix(vec3(0.055, 0.78, 0.90), vec3(0.80, 0.97, 1.0), vHot * 0.75) * f;
      gl_FragColor = vec4(c, clamp(max(max(c.r, c.g), c.b), 0.0, 1.0));
    }`;

  function initOrbitGL(orbit, nodes, coreEl) {
    const canvas = $('.orbit__gl', orbit);
    if (!canvas || !coreEl || !nodes.length) return null;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    if (!gl) return null;

    const debug = location.search.indexOf('gldebug') > -1;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
      if (debug) console.warn('orbit-gl shader:', gl.getShaderInfoLog(s));
      return null;
    };
    const link = (vs, fs) => {
      const v = shader(gl.VERTEX_SHADER, vs), f = shader(gl.FRAGMENT_SHADER, fs);
      if (!v || !f) return null;
      const p = gl.createProgram();
      gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      if (gl.getProgramParameter(p, gl.LINK_STATUS)) return p;
      if (debug) console.warn('orbit-gl link:', gl.getProgramInfoLog(p));
      return null;
    };
    const field = link(FIELD_VS, FIELD_FS), dots = link(DOT_VS, DOT_FS);
    if (!field || !dots) return null;
    /* The canvas is display:none until this class lands – measure after it, never before. */
    orbit.classList.add('is-gl');

    const S = nodes.length, FLOW = 200, PACK = 34, DUST = 260;
    const COUNT = S * (FLOW + PACK) + DUST, STRIDE = 12;
    const data = new Float32Array(COUNT * STRIDE);
    const rand = (a, b) => a + Math.random() * (b - a);

    /* Untransformed layout centres: the tiles bob on their own GSAP tween and
       must not drag the beam's origin with them every frame. */
    let cw = 0, ch = 0, dpr = 1, dprCap = 1, anchors = [], coreClip = [0, 0], liftScale = 0, ring = [0.4, 0.4], targets = [], origins = [], sized = false;
    /* below 1080px the hero stacks and the orbit takes the full 1240px column, so
       the buffer is capped by area, not by device pixel ratio alone */
    const MAX_PX = 2.2e6;
    const layout = () => {
      const cr = canvas.getBoundingClientRect(), or_ = orbit.getBoundingClientRect();
      /* below 760px the stylesheet hides the canvas and stacks the orbit – there
         is nothing to measure, so hold the last state instead of rendering junk */
      sized = cr.width > 2 && cr.height > 2;
      if (!sized) return;
      cw = Math.max(1, Math.round(cr.width)); ch = Math.max(1, Math.round(cr.height));
      const ox = or_.left - cr.left, oy = or_.top - cr.top;
      const clipC = (x, y) => [(x / cr.width) * 2 - 1, 1 - (y / cr.height) * 2];
      const clip = (x, y) => clipC(ox + x, oy + y);
      anchors = nodes.map(n => clip(n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2));
      coreClip = clip(coreEl.offsetLeft, coreEl.offsetTop);
      /* The record card is square (212x212), so a beam aimed at its centre loses
         most of a vertical run under it – Deals and Ads read as if they never
         fired. Every beam runs tile-edge to card-edge, so all of its 1.4s is
         spent somewhere visible. */
      const kr = coreEl.getBoundingClientRect();
      const kx = kr.left + kr.width / 2 - cr.left, ky = kr.top + kr.height / 2 - cr.top;
      const hw = kr.width / 2 + 6, hh = kr.height / 2 + 6;
      const edge = (px, py, ex, ey) => {                 // point where the ray to (px,py) leaves a box
        const vx = px - kx, vy = py - ky;
        const f = Math.min(ex / Math.max(1, Math.abs(vx)), ey / Math.max(1, Math.abs(vy)));
        return [vx * f, vy * f];
      };
      targets = []; origins = [];
      nodes.forEach(n => {
        const ax = ox + n.offsetLeft + n.offsetWidth / 2, ay = oy + n.offsetTop + n.offsetHeight / 2;
        const t = edge(ax, ay, hw, hh);
        targets.push(clipC(kx + t[0], ky + t[1]));
        const rx = n.offsetWidth / 2 + 3, ry = n.offsetHeight / 2 + 3;
        const vx = kx - ax, vy = ky - ay;
        const f = Math.min(rx / Math.max(1, Math.abs(vx)), ry / Math.max(1, Math.abs(vy)));
        origins.push(clipC(ax + vx * f, ay + vy * f));
      });
      liftScale = 2 / cr.height;                       // px of tile bob → clip units
      let rdx = 0, rdy = 0;
      anchors.forEach(a => { rdx = Math.max(rdx, Math.abs(a[0] - coreClip[0])); rdy = Math.max(rdy, Math.abs(a[1] - coreClip[1])); });
      ring = [Math.max(0.05, rdx / 2 * (cw / ch)), Math.max(0.05, rdy / 2)];
      dpr = Math.max(0.75, Math.min(dprCap, Math.sqrt(MAX_PX / (cw * ch))));
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      build();
    };

    /* The card is square, so the vertical runs (Ads, Deals) are ~27% shorter than
       the diagonal ones. Curving the short ones harder keeps them reading as arcs
       rather than as stubs; it buys ~8px of travel, not parity. */
    const legs = () => {
      const l = [];
      for (let s = 0; s < S; s++) {
        const a = origins[s] || anchors[s] || [0, 0], g = targets[s] || coreClip;
        l.push(Math.hypot(g[0] - a[0], g[1] - a[1]) || 1);
      }
      return { l, max: Math.max.apply(null, l) };
    };
    /* One interleaved buffer: node, ctrl, dust home, phase, speed, size, depth, stream, jitter. */
    function build() {
      let i = 0;
      const put = (node, ctrl, dust, phase, speed, size, depth, stream, jit) => {
        const o = i++ * STRIDE;
        data[o] = node[0]; data[o + 1] = node[1];
        data[o + 2] = ctrl[0]; data[o + 3] = ctrl[1];
        data[o + 4] = dust[0]; data[o + 5] = dust[1];
        data[o + 6] = phase; data[o + 7] = speed; data[o + 8] = size;
        data[o + 9] = depth; data[o + 10] = stream; data[o + 11] = jit;
      };
      const leg = legs();
      for (let s = 0; s < S; s++) {
        const a = origins[s] || anchors[s] || [0, 0], g = targets[s] || coreClip;
        const mx = (a[0] + g[0]) / 2, my = (a[1] + g[1]) / 2;
        const dx = g[0] - a[0], dy = g[1] - a[1], len = leg.l[s];
        /* one sign for every stream, so the six of them spiral the same way in */
        const bow = 0.16 * len + 0.5 * (leg.max - len);
        const ctrl = [mx + (-dy / len) * bow, my + (dx / len) * bow];
        for (let n = 0; n < FLOW; n++) put(a, ctrl, g, Math.random(), rand(0.035, 0.075), Math.random(), Math.random(), s, rand(-1, 1));
        for (let n = 0; n < PACK; n++) put(a, ctrl, g, n / PACK, -1, 1, 0.4, s, rand(-0.12, 0.12));
      }
      for (let n = 0; n < DUST; n++) {
        const ang = Math.random() * Math.PI * 2, rad = Math.sqrt(Math.random()) * 1.05;
        put([0, 0], [0, 0], [Math.cos(ang) * rad, Math.sin(ang) * rad * 0.92], Math.random(), 0, Math.random(), Math.random(), -1, 0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const dotBuf = gl.createBuffer();

    const uni = (p, names) => names.reduce((m, n) => (m[n] = gl.getUniformLocation(p, n), m), {});
    const fU = uni(field, ['uRes', 'uCore', 'uMouse', 'uRing', 'uTime', 'uPulse']);
    const dU = uni(dots, ['uCore', 'uMouse', 'uLift', 'uTime', 'uActive', 'uPacket', 'uDpr']);
    const fA = gl.getAttribLocation(field, 'aPos');
    const dA = ['aNode', 'aCtrl', 'aAlt', 'aPhase', 'aSpeed', 'aSize', 'aDepth', 'aStream', 'aJit']
      .map(n => gl.getAttribLocation(dots, n));
    const dSize = [2, 2, 2, 1, 1, 1, 1, 1, 1], dOff = [0, 2, 4, 6, 7, 8, 9, 10, 11];

    dprCap = Math.min(window.devicePixelRatio || 1, 1.75);
    layout();

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);                       // premultiplied additive
    gl.clearColor(0, 0, 0, 0);

    const state = { active: 0, packet: -1, packetAt: 0, pulse: 0, pulseAt: 0, mx: 0, my: 0, tmx: 0, tmy: 0, alive: true, on: false };
    const PACKET_MS = 1400, PULSE_MS = 1500;
    new IntersectionObserver(es => es.forEach(e => { state.on = e.isIntersecting; }), { threshold: 0.05 }).observe(orbit);

    let raf = 0, t0 = performance.now(), frames = 0, spent = 0, tier = 0;
    const render = (now) => {
      const t = (now - t0) / 1000;
      state.mx += (state.tmx - state.mx) * 0.06;
      state.my += (state.tmy - state.my) * 0.06;
      if (state.packet >= 0) {
        state.packet = (now - state.packetAt) / PACKET_MS;
        if (state.packet > 1) state.packet = -1;
      }
      state.pulse = Math.max(0, 1 - (now - state.pulseAt) / PULSE_MS);

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(field);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(fA);
      gl.vertexAttribPointer(fA, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(fU.uRes, cw, ch);
      gl.uniform2f(fU.uCore, (coreClip[0] + 1) / 2, (coreClip[1] + 1) / 2);
      gl.uniform2f(fU.uMouse, state.mx, state.my);
      gl.uniform1f(fU.uTime, t);
      gl.uniform2f(fU.uRing, ring[0], ring[1]);
      gl.uniform1f(fU.uPulse, state.pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(fA);

      gl.useProgram(dots);
      gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
      dA.forEach((loc, k) => {
        if (loc < 0) return;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, dSize[k], gl.FLOAT, false, STRIDE * 4, dOff[k] * 4);
      });
      gl.uniform2f(dU.uCore, coreClip[0], coreClip[1]);
      gl.uniform2f(dU.uMouse, state.mx, state.my);
      const lift = hasGsap ? -(+gsap.getProperty(nodes[state.active], 'y') || 0) * liftScale : 0;
      gl.uniform2f(dU.uLift, 0, lift);
      gl.uniform1f(dU.uTime, t);
      gl.uniform1f(dU.uActive, state.active);
      gl.uniform1f(dU.uPacket, state.packet);
      gl.uniform1f(dU.uDpr, dpr);
      gl.drawArrays(gl.POINTS, 0, COUNT);
      dA.forEach(loc => { if (loc >= 0) gl.disableVertexAttribArray(loc); });
    };

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (!state.on || !sized || document.hidden) return;
      const f0 = performance.now();
      render(now);
      /* Frame budget: step down once, then hand the scene back to the SVG orbit. */
      spent += performance.now() - f0;
      if (++frames === 150) {
        const avg = spent / frames; frames = 0; spent = 0;
        if (avg > 11 && tier === 0) { tier = 1; dprCap = 1; layout(); }
        else if (avg > 16 && tier === 1) { tier = 2; api.alive = false; cancelAnimationFrame(raf); orbit.classList.remove('is-gl'); }
      }
    };
    render(t0);                       // paint one frame now, so the canvas is never blank
    raf = requestAnimationFrame(draw);

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); api.alive = false; cancelAnimationFrame(raf); orbit.classList.remove('is-gl'); });
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (api.alive) layout(); }, 200); });

    const api = {
      alive: true,
      emit(k) {
        if (!api.alive) return false;
        state.active = k; state.packet = 0; state.packetAt = performance.now();
        return true;
      },
      land() { state.pulseAt = performance.now(); state.pulse = 1; },
      point(px, py) { state.tmx = px; state.tmy = py; },
    };
    if (debug) {
      /* ?gldebug – step the scene by hand, which is the only way to inspect it
         in a headless or backgrounded tab where rAF never fires. */
      api.frame = (sec, o) => {
        o = o || {};
        const now = t0 + sec * 1000;
        if (o.active !== undefined) state.active = o.active;
        if (o.packet !== undefined) { state.packetAt = now - o.packet * PACKET_MS; state.packet = 0; }
        if (o.pulse !== undefined) state.pulseAt = now - (1 - o.pulse) * PULSE_MS;
        if (o.mouse) { state.tmx = state.mx = o.mouse[0]; state.tmy = state.my = o.mouse[1]; }
        render(now);
      };
      orbit.__gl = api;
    }
    return api;
  }

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
    /* Below 760px the orbit is already a stacked grid – no scene to render there. */
    let glScene = null;
    const startGl = () => { if (!glScene && matchMedia('(min-width: 761px)').matches) glScene = initOrbitGL(orbit, nodes, core); };
    startGl();
    /* a tab that loads prerendered or below 761px still gets the scene once it
       is actually wide enough – otherwise it would be skipped for the session */
    if (!glScene) { let gt = 0; window.addEventListener('resize', () => { clearTimeout(gt); gt = setTimeout(startGl, 250); }); }
    let k = 0;
    const fire = () => {
      const idx = k % nodes.length, n = nodes[idx], dot = $('#od' + idx, svg);
      nodes.forEach(x => x.classList.remove('is-lit')); n.classList.add('is-lit');
      const onGl = !!(glScene && glScene.emit(idx));
      const land = () => {
        if (onGl) glScene.land(); else gsap.to(dot, { opacity: 0, duration: 0.2 });
        const row = rows[k % rows.length]; row.classList.add('is-on');
        gsap.fromTo(core, { boxShadow: '0 0 0 1px rgba(6,182,212,0.5), 0 0 52px -10px rgba(6,182,212,0.5)' }, { boxShadow: '0 0 0 1px rgba(6,182,212,0.25), 0 0 40px -10px rgba(6,182,212,0.45)', duration: 1.3, ease: 'power2.out' });
        if (bar) gsap.to(bar, { width: Math.min(100, ((k % rows.length) + 1) / rows.length * 100) + '%', duration: 0.6, ease: 'power2.out' });
        if ((k + 1) % rows.length === 0) setTimeout(() => rows.forEach(r => r.classList.remove('is-on')), 1800);
        k++;
      };
      if (!onGl) gsap.fromTo(dot, { opacity: 1 }, { duration: 1.4, ease: 'power2.inOut', motionPath: { path: '#op' + idx, align: '#op' + idx, alignOrigin: [0.5, 0.5] } });
      setTimeout(land, 1420);
    };
    everyVisible(orbit, fire, 2200);
    setTimeout(() => { if (!core.querySelector('.core__row.is-on')) { rows.forEach(r => r.classList.add('is-on')); if (bar) bar.style.width = '100%'; } }, 4000);
    // slow orbit rotation of the whole node layer via counter-rotating labels isn't needed; gently float nodes instead
    if (!coarse) nodes.forEach((n, i) => gsap.to(n, { y: '+=10', duration: 3 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.2 }));
    // mouse parallax – the GPU scene takes it as depth, the fallback moves the art
    const art = $('.orbit__art', orbit);
    if (matchMedia('(pointer:fine)').matches) {
      orbit.addEventListener('pointermove', (e) => {
        const r = orbit.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        /* depth comes from the shader's own parallax, not from a 3D transform on
           .orbit: rotating that layer would rasterise the record card's text */
        if (glScene && glScene.alive) glScene.point(px * 2, -py * 2);
        if (art) gsap.to(art, { x: px * (glScene && glScene.alive ? 10 : 18), y: py * (glScene && glScene.alive ? 10 : 18), duration: 0.8, ease: 'power2.out' });
      });
      orbit.addEventListener('pointerleave', () => {
        if (glScene && glScene.alive) glScene.point(0, 0);
        if (art) gsap.to(art, { x: 0, y: 0, duration: 1.1, ease: 'power2.out' });
      });
    }
  });

  /* ---------- Pipeline: scroll-scrubbed light along the rail ---------- */
  $$('.pipeline').forEach(pl => {
    const lit = $('.rail--lit', pl), spark = $('.spark', pl), steps = $$('.pstep', pl);
    if (!lit) return;
    const setP = (p) => { lit.style.strokeDasharray = `${p * 1000} 1000`; lit.setAttribute('pathLength', '1000'); if (spark) spark.setAttribute('cx', (p * 100) + '%'); steps.forEach((s, i) => s.classList.toggle('is-lit', p >= (i + 0.5) / steps.length)); };
    if (reduced || !hasGsap || coarse) { setP(1); return; }   // no scroll-scrub on touch
    ScrollTrigger.create({ trigger: pl, start: 'top 80%', end: 'bottom 45%', scrub: 0.6, onUpdate: (st) => setP(st.progress) });
  });

  /* icons created at runtime have to reference the inline sprite, the webfont is gone */
  const icon = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-regular-${String(n).replace(/^ph-/, '')}"></use></svg>`;

  /* ---------- Inbox sorter: messages fly in from sources, list re-sorts with hot on top ---------- */
  $$('.sorter').forEach(sorter => onVisible(sorter, (el) => {
    const list = $('.sorter__list', el), sources = $$('.src', el);
    const queue = [
      { src: 1, icon: 'ph-chat-circle-text', who: 'R. Patel', text: 'Yes, I want an offer. Roof needs work.', tag: 'hot' },
      { src: 4, icon: 'ph-phone-call', who: 'B. Okafor', text: 'Missed call, 2 min ago. Text-back sent.', tag: 'warm' },
      { src: 0, icon: 'ph-envelope-simple', who: 'L. Nguyen', text: 'Please send the offer in writing.', tag: 'warm' },
      { src: 2, icon: 'ph-messenger-logo', who: 'C. Alvarez', text: 'How fast can you close? Probate finished.', tag: 'hot' },
      { src: 3, icon: 'ph-instagram-logo', who: 'T. Brooks', text: 'Just looking at options for now.', tag: 'now' },
      { src: 1, icon: 'ph-chat-circle-text', who: 'S. Whitfield', text: 'Tenant moved out. Ready to talk numbers.', tag: 'hot' },
      { src: 0, icon: 'ph-envelope-simple', who: 'G. Meyer', text: 'What does as-is actually mean here?', tag: 'warm' },
      { src: 4, icon: 'ph-phone-call', who: 'H. Castillo', text: 'Call me after 6, I work days.', tag: 'hot' },
      { src: 3, icon: 'ph-instagram-logo', who: 'P. Lindqvist', text: 'Maybe after the holidays.', tag: 'now' },
    ];
    const rank = { hot: 0, warm: 1, now: 2 };
    const render = (item) => { const m = document.createElement('div'); m.className = 'msg is-new'; m.dataset.tag = item.tag; m.innerHTML = `${icon(item.icon)}<div><b>${item.who}</b><span>${item.text}</span></div><span class="tag tag--${item.tag}">${item.tag === 'now' ? 'not now' : item.tag}</span>`; return m; };
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
      while (list.children.length >= 5) {
        const last = list.lastElementChild;
        if (hasGsap && !reduced) { gsap.to(last, { opacity: 0, x: 20, duration: 0.3 }); setTimeout(() => last.remove(), 320); }
        else last.remove();
        break;
      }
      if (hasGsap && !reduced && src) {
        const fly = document.createElement('div'); fly.className = 'flying'; fly.innerHTML = icon(item.icon); el.appendChild(fly);
        const er = el.getBoundingClientRect(), sr = src.getBoundingClientRect(), lr = list.getBoundingClientRect();
        gsap.set(fly, { x: sr.left - er.left + 4, y: sr.top - er.top + 4 });
        gsap.to(fly, { x: lr.left - er.left + 8, y: lr.top - er.top + 8, duration: 0.7, ease: 'power2.inOut' });
        setTimeout(() => { fly.remove(); list.prepend(m); setTimeout(() => { resort(); setTimeout(() => m.classList.remove('is-new'), 900); }, 400); }, 720);
      } else { list.prepend(m); resort(); setTimeout(() => m.classList.remove('is-new'), 900); }
      i++;
    };
    everyVisible(el, tick, 2600);
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
    let sec = 41; if (clock) everyVisible(sc, () => { sec++; clock.textContent = String(sec % 60).padStart(2, '0'); }, 1000, false);
    if (reduced || !line) { if (line) line.innerHTML = lines[0].t; facts.forEach(f => f.classList.add('is-on')); return; }
    let i = 0;
    const vis = visibility(sc);
    const flyChip = (item) => {
      const mark = $('mark', line), fact = facts[item.f]; if (!mark || !fact || !hasGsap) { fact && fact.classList.add('is-on'); return; }
      const chip = document.createElement('div'); chip.className = 'chip-fly'; chip.textContent = item.chip; sc.appendChild(chip);
      const r0 = mark.getBoundingClientRect(), r1 = fact.getBoundingClientRect(), rs = sc.getBoundingClientRect();
      gsap.set(chip, { x: r0.left - rs.left, y: r0.top - rs.top, scale: 0.9 });
      gsap.to(chip, { x: r1.left - rs.left + 10, y: r1.top - rs.top + 10, scale: 0.7, opacity: 0.2, duration: 0.8, ease: 'power3.inOut' });
      setTimeout(() => { chip.remove(); fact.classList.add('is-on'); }, 820);
    };
    const typeLine = () => {
      if (!vis.on || document.hidden) { setTimeout(typeLine, 900); return; }
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
    const vis = visibility(ph);
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
    const range = $('input[type=range]', sp), total = parseFloat(sp.dataset.total || '100');
    const set = (sel, prop, val) => { const el = $(sel, sp); if (el) { if (prop === 'text') el.textContent = val; else el.style[prop] = val; } };
    const apply = (raw) => {
      const m = Math.round(raw), g = 100 - m;
      if (range) {
        const min = +range.min || 0, max = +range.max || 100;
        sp.style.setProperty('--p', ((m - min) / (max - min)).toFixed(4));   // 0..1 position on the track
      }
      set('.t-meta', 'text', Math.round(total * m / 100));
      set('.t-google', 'text', Math.round(total * g / 100));
      set('.p-meta', 'text', m);
      set('.p-google', 'text', g);
      set('.b-meta', 'width', m + '%');
      set('.b-google', 'width', g + '%');
      set('.flow--meta', 'strokeWidth', (2 + m / 100 * 7).toFixed(1));
      set('.flow--google', 'strokeWidth', (2 + g / 100 * 7).toFixed(1));
    };
    if (range) { range.addEventListener('input', () => apply(+range.value)); apply(+range.value); }
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
      gsap.to(c, { duration: 1.2, ease: 'power1.inOut', motionPath: { path: '#' + e.id, align: '#' + e.id, alignOrigin: [0.5, 0.5] } });
      setTimeout(() => { c.remove(); to && to.classList.add('is-lit'); setTimeout(() => { from && from.classList.remove('is-lit'); }, 400); }, 1220);
    };
    let k = 0;
    everyVisible(el, () => { if (k) { if (k % edges.length === 0) nodes.forEach(n => n.classList.remove('is-lit')); } run(k); k++; }, 1500);
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
      gsap.to(chip, { x: r1.left - rs.left + 6, y: r1.top - rs.top + 6, scale: 0.9, duration: 0.9, ease: 'power3.inOut' });
      setTimeout(() => { chip.remove(); slot.classList.add('is-filled'); }, 920);
      i++;
    };
    everyVisible(el, step, 1700);
  }, 0.3));

  /* ---------- Screenshots: subtle scroll parallax on frames ---------- */
  if (hasGsap && !reduced && !coarse) $$('.lift').forEach(el => gsap.fromTo(el, { y: 30 }, { y: -30, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 } }));
})();
