/* Animații de interfață: apariție la derulare, antet compact, bară de progres,
   link activ în meniu, efect de undă la apăsarea butoanelor. Fără biblioteci. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Apariție la derulare, cu decalaj între elementele din același grup */
  var groups = [
    '.section-head > *', '.trust-item', '.svc-grid', '.gal-card', '.why',
    '.tool-img', '.tool-txt > *', '.tool-txt li', '.zone-card', '.map',
    '.contact-info', '.contact-form', '.foot-wrap > *'
  ];
  var targets = [];
  groups.forEach(function (sel) {
    var seen = new Map();
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.classList.contains('reveal')) return;
      var parent = el.parentElement, i = seen.get(parent) || 0;
      seen.set(parent, i + 1);
      el.classList.add('reveal');
      el.style.setProperty('--d', Math.min(i, 6) * 80 + 'ms');
      targets.push(el);
    });
  });

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* 2. Antet compact + bară de progres */
  var header = document.querySelector('header.site');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || 0;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (header) {
      header.classList.toggle('scrolled', y > 12);
      header.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* 3. Link activ în meniu, după secțiunea vizibilă */
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.links a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) map[s.id] = a;
    });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (a && en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); });
          a.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { so.observe(document.getElementById(id)); });
  }

  /* 4. Undă la apăsarea butoanelor */
  if (!reduce) {
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn');
      if (!b) return;
      var r = b.getBoundingClientRect(), size = Math.max(r.width, r.height);
      var s = document.createElement('span');
      s.className = 'ripple';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(s);
      setTimeout(function () { s.remove(); }, 650);
    });
  }
})();
