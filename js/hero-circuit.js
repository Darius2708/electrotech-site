/* Animație de fundal pentru hero: trasee de circuit cu impulsuri de „curent”.
   Canvas 2D, fără biblioteci externe. Se oprește când hero nu e vizibil
   sau tab-ul e ascuns și rămâne statică la prefers-reduced-motion. */
(function () {
  var cv = document.querySelector('.hero-fx');
  if (!cv || !cv.getContext) return;
  var hero = cv.parentElement;
  var ctx = cv.getContext('2d');
  var base = document.createElement('canvas');
  var bctx = base.getContext('2d');

  var CELL = 38;
  var DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  var YELLOW = '245,180,0', BLUE = '140,195,240';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1, traces = [], pulses = [], sparks = [];
  var visible = true, running = false, last = 0, lastPointer = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makePath(cells) {
    var pts = cells.map(function (c) { return [c[0] * CELL, c[1] * CELL]; });
    var segs = [], L = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
      var len = Math.sqrt(dx*dx + dy*dy);
      segs.push({ x: pts[i-1][0], y: pts[i-1][1], dx: dx / len, dy: dy / len, s: L, len: len });
      L += len;
    }
    return { pts: pts, segs: segs, L: L };
  }

  function pointAt(tr, d) {
    if (d <= 0) return tr.pts[0];
    if (d >= tr.L) return tr.pts[tr.pts.length - 1];
    var s = tr.segs, lo = 0, hi = s.length - 1;
    while (lo < hi) { var m = (lo + hi + 1) >> 1; if (s[m].s <= d) lo = m; else hi = m - 1; }
    var g = s[lo], t = d - g.s;
    return [g.x + g.dx * t, g.y + g.dy * t];
  }

  function build() {
    W = hero.clientWidth; H = hero.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    [cv, base].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cols = Math.ceil(W / CELL) + 1, rows = Math.ceil(H / CELL) + 1;
    var occ = {}, target = Math.round(cols * rows / (W < 640 ? 15 : 10)), tries = 0;
    traces = []; pulses = []; sparks = [];

    while (traces.length < target && tries++ < target * 25) {
      var c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * rows);
      if (occ[c + ',' + r]) continue;
      var dir = Math.floor(Math.random() * 4) * 2, cells = [[c, r]], steps = Math.floor(rand(5, 16));
      for (var i = 0; i < steps; i++) {
        if (i > 1 && Math.random() < 0.22) dir = (dir + (Math.random() < 0.5 ? 1 : 7)) % 8;
        var nc = c + DIRS[dir][0], nr = r + DIRS[dir][1];
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || occ[nc + ',' + nr]) break;
        c = nc; r = nr; cells.push([c, r]);
      }
      if (cells.length < 4) continue;
      cells.forEach(function (p) { occ[p[0] + ',' + p[1]] = 1; });
      traces.push(makePath(cells));
    }

    bctx.clearRect(0, 0, W, H);
    bctx.lineJoin = 'round'; bctx.lineCap = 'round';
    traces.forEach(function (tr) {
      bctx.beginPath();
      bctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
      for (var i = 1; i < tr.pts.length; i++) bctx.lineTo(tr.pts[i][0], tr.pts[i][1]);
      bctx.strokeStyle = 'rgba(255,255,255,0.10)'; bctx.lineWidth = 1.4; bctx.stroke();
      [tr.pts[0], tr.pts[tr.pts.length - 1]].forEach(function (p) {
        bctx.beginPath(); bctx.arc(p[0], p[1], 3.2, 0, Math.PI * 2);
        bctx.fillStyle = 'rgba(23,64,111,1)'; bctx.fill();
        bctx.strokeStyle = 'rgba(255,255,255,0.22)'; bctx.lineWidth = 1.2; bctx.stroke();
      });
    });

    if (reduce) { drawStatic(); }
  }

  function spawn(tr, reversed) {
    tr = tr || traces[Math.floor(Math.random() * traces.length)];
    if (!tr) return;
    pulses.push({
      tr: tr, d: 0, rev: reversed === undefined ? Math.random() < 0.5 : reversed,
      v: rand(90, 200), tail: rand(50, 110), done: false,
      col: Math.random() < 0.22 ? BLUE : YELLOW
    });
  }

  function pos(p, d) { return pointAt(p.tr, p.rev ? p.tr.L - d : d); }

  function drawPulse(p) {
    var n = 14, prev = null;
    ctx.lineWidth = 2.2;
    for (var k = 0; k <= n; k++) {
      var dd = p.d - p.tail * (k / n);
      if (dd < 0 || dd > p.tr.L) { prev = null; continue; }
      var q = pos(p, dd);
      if (prev) {
        ctx.strokeStyle = 'rgba(' + p.col + ',' + (0.85 * (1 - k / n)) + ')';
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      prev = q;
    }
    if (p.d <= p.tr.L) {
      var h = pos(p, p.d);
      var g = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 14);
      g.addColorStop(0, 'rgba(' + p.col + ',0.9)');
      g.addColorStop(1, 'rgba(' + p.col + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h[0], h[1], 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,240,0.95)'; ctx.beginPath(); ctx.arc(h[0], h[1], 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    var maxP = Math.max(4, Math.round(traces.length * (W < 640 ? 0.18 : 0.3)));
    if (pulses.length < maxP && Math.random() < 0.08) spawn();

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    pulses = pulses.filter(function (p) {
      p.d += p.v * dt;
      if (!p.done && p.d >= p.tr.L) {
        p.done = true;
        var e = pos(p, p.tr.L);
        sparks.push({ x: e[0], y: e[1], t: 0, col: p.col });
      }
      drawPulse(p);
      return p.d < p.tr.L + p.tail;
    });

    sparks = sparks.filter(function (s) {
      s.t += dt;
      var k = s.t / 0.7;
      if (k >= 1) return false;
      ctx.strokeStyle = 'rgba(' + s.col + ',' + (0.8 * (1 - k)) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4 + k * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(' + s.col + ',' + (1 - k) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < Math.min(10, traces.length); i++) {
      var tr = traces[Math.floor(Math.random() * traces.length)];
      var h = pointAt(tr, tr.L * 0.6);
      var g = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 12);
      g.addColorStop(0, 'rgba(' + YELLOW + ',0.8)'); g.addColorStop(1, 'rgba(' + YELLOW + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h[0], h[1], 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function update() {
    var should = !reduce && visible && !document.hidden;
    if (should && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    else if (!should) running = false;
  }

  hero.addEventListener('pointermove', function (e) {
    if (reduce || e.timeStamp - lastPointer < 110) return;
    lastPointer = e.timeStamp;
    var b = hero.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    var best = null, bd = 130 * 130, rev = false;
    traces.forEach(function (tr) {
      [0, 1].forEach(function (end) {
        var p = end ? tr.pts[tr.pts.length - 1] : tr.pts[0];
        var d2 = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
        if (d2 < bd) { bd = d2; best = tr; rev = !!end; }
      });
    });
    if (best && pulses.length < 60) spawn(best, rev);
  });

  var rt;
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(build, 150); }).observe(hero);
  } else {
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; update(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', update);

  build();
  for (var i = 0; i < 6; i++) spawn();
  update();
})();
