// Keyboard: inside a poster wall the arrow keys move between posters
// (left/right = previous/next, up/down = the poster above/below in the same column).
(function () {
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 'up', ArrowDown: 'down' };
    if (!(e.key in keys)) return;
    var a = document.activeElement;
    if (!a || !a.closest) return;
    var card = a.closest('.pcard');
    var grid = card && card.parentElement;
    if (!grid || !grid.classList.contains('pgrid')) return;

    var links = Array.prototype.filter.call(grid.querySelectorAll('.pcard > a'), function (l) { return l.offsetParent !== null; });
    var i = links.indexOf(card.querySelector('a'));
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    var step = keys[e.key] === 'up' ? -cols : keys[e.key] === 'down' ? cols : keys[e.key];
    var next = links[i + step];
    if (!next) return;
    e.preventDefault();
    next.focus();
  });
})();

// Project pages on touch screens: the page follows the finger sideways. Let go past a third of the
// screen (or flick) and it slides out and the next / previous project slides in from that side;
// otherwise it springs back. Vertical scrolling is untouched.
(function () {
  var prev = document.querySelector('.page-arrow--prev');
  var next = document.querySelector('.page-arrow--next');
  var main = document.querySelector('main');
  if (!prev || !next || !main) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE_IN = 'cubic-bezier(0.6, 0, 1, 1)', EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';

  // arriving from a swipe: slide in from the side we came towards
  try {
    var came = sessionStorage.getItem('swipe-in');
    sessionStorage.removeItem('swipe-in');
    if (came && !reduce) {
      main.style.transform = 'translateX(' + (came === 'next' ? '' : '-') + '100vw)';
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        main.style.transition = 'transform 0.4s ' + EASE_OUT;
        main.style.transform = '';
        setTimeout(function () { main.style.transition = ''; }, 450);
      }); });
    }
  } catch (e) {}

  var x0 = null, y0 = 0, t0 = 0, dx = 0, mode = null;
  function set(x, anim) {
    main.style.transition = anim ? 'transform ' + anim : 'none';
    main.style.transform = x ? 'translateX(' + x + 'px)' : '';
  }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1 || document.documentElement.classList.contains('viewer-open')) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); dx = 0; mode = null;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (x0 === null) return;
    var mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!mode) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      mode = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
    }
    if (mode !== 'x') return;
    e.preventDefault();
    dx = mx;
    if (!reduce) set(dx * 0.9);
  }, { passive: false });
  document.addEventListener('touchend', function () {
    if (x0 === null || mode !== 'x') { x0 = null; return; }
    x0 = null;
    var w = window.innerWidth, fast = Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.5;
    if (Math.abs(dx) > w / 3 || (fast && Math.abs(dx) > 40)) {
      var go = dx < 0 ? 'next' : 'prev';
      try { sessionStorage.setItem('swipe-in', go); } catch (e) {}
      if (reduce) { location.assign((go === 'next' ? next : prev).href); return; }
      set((dx < 0 ? -1 : 1) * w, '0.2s ' + EASE_IN);
      setTimeout(function () { location.assign((go === 'next' ? next : prev).href); }, 190);
    } else {
      set(0, '0.3s ' + EASE_OUT);
    }
  }, { passive: true });
  window.addEventListener('pageshow', function (e) { if (e.persisted) set(0); });   // coming back with the back button
})();

// Project pages: the title is large, so a long one (several lines) is stepped down until the whole
// info (lead, title, details, description) fits. Side by side (wide screens) the info must not be
// taller than the poster, so the poster sits in the same place on every project page; stacked
// (phones) it must fit on the screen.
(function () {
  var title = document.querySelector('.project-text .title');
  var text = document.querySelector('.project-text');
  var prose = document.querySelector('.project-text .prose');
  var media = document.querySelector('.project-media .cover img, .project-media .cover video, .project-media .media-main');
  if (!title || !prose) return;
  function sideBySide() { return getComputedStyle(document.querySelector('.project-body')).display === 'grid'; }
  function tooBig() {
    if (sideBySide() && media && media.getBoundingClientRect().height > 0) {
      return text.getBoundingClientRect().height > media.getBoundingClientRect().height;
    }
    var last = prose.lastElementChild || prose;
    return last.getBoundingClientRect().bottom + window.scrollY > window.innerHeight - 8;
  }
  function fit() {
    title.style.fontSize = '';
    var size = parseFloat(getComputedStyle(title).fontSize);
    var min = size * 0.45;
    while (tooBig() && size > min) {
      size *= 0.95;
      title.style.fontSize = size + 'px';
    }
  }
  var t;
  function later() { clearTimeout(t); t = setTimeout(fit, 80); }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var img = document.querySelector('.project-media .cover img');
  if (img && !img.complete) img.addEventListener('load', fit);
  var vid = document.querySelector('.project-media .cover video');
  if (vid) vid.addEventListener('loadedmetadata', fit);
  window.addEventListener('resize', later);
})();

// Scroll reveal: elements marked .rv rise into place as they enter the screen, in a short stagger.
(function () {
  var els = document.querySelectorAll('.rv');
  if (!els.length) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.style.setProperty('--d', (n++ * 0.06) + 's');
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach(function (e) { io.observe(e); });
  setTimeout(function () { document.querySelectorAll('.rv:not(.in)').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight * 1.2) e.classList.add('in'); }); }, 1500);   // safety net
  // the filter on /projects/ re-orders cards: make sure none stay hidden
  document.addEventListener('click', function () { setTimeout(function () { document.querySelectorAll('.rv:not(.in)').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight) e.classList.add('in'); }); }, 30); });
})();

// The big asterisks turn as you scroll (a notch every 120 px of scroll).
(function () {
  var els = document.querySelectorAll('.spin');
  if (!els.length || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var tick = false;
  function upd() { tick = false; var d = (window.scrollY * 0.12) % 360; els.forEach(function (e) { e.style.setProperty('--spin', d + 'deg'); }); }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
})();

// Home hero: a field of grey asterisks, still. Near the pointer they turn and grow, and the one closest to it is
// the yellow one (yellow among grey). Without a pointer the yellow one rests top right of the headline.
(function () {
  var cv = document.querySelector('.field');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), hero = cv.parentNode;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, S = 64, cols = 0, rows = 0, px = 0, py = 0, ptx = 0, pty = 0, hasPtr = false, run = true, t0 = performance.now();
  var GREY = [58, 57, 53], LIGHT = [150, 148, 140], YEL = '#ffd60a', soft = false;
  function size() {
    var r = hero.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
    soft = W < 700 || (window.matchMedia && matchMedia('(pointer: coarse)').matches); S = soft ? 56 : 64; cols = Math.ceil(W / S) + 1; rows = Math.ceil(H / S) + 1;
  }
  function star(x, y, a, r, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath();
    for (var k = 0; k < 3; k++) { var t = a + k * Math.PI / 3, dx = Math.sin(t) * r, dy = -Math.cos(t) * r; ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
    ctx.stroke();
  }
  function frame(now) {
    var t = (now - t0) / 1000;
    var tx = hasPtr ? ptx : W * 0.76, ty = hasPtr ? pty : H * 0.34;      // at rest the yellow one sits still, top right of the headline
    px += (tx - px) * 0.14; py += (ty - py) * 0.14;                       // it glides to the pointer, and back
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var best = 1e9, bx = 0, by = 0, ba = 0, br = 0;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var x = i * S + (S - (W % S)) / 2 * 0 + S / 2 - 8, y = j * S + S / 2 - 8;
      var dx = px - x, dy = py - y, d = Math.sqrt(dx * dx + dy * dy), inf = Math.max(0, 1 - d / (soft ? 150 : 230)) * (soft ? 0.5 : 1);
      var a = Math.sin(i * 0.5 + j * 0.4) * 0.5 + inf * inf * 1.6;
      var r = soft ? 5 + inf * 6 : 7 + inf * 9;
      if (d < best) { best = d; bx = x; by = y; ba = a; br = r; }
      var c = GREY.map(function (g, n) { return Math.round(g + (LIGHT[n] - g) * inf); });
      star(x, y, a, r, soft ? 2.4 + inf : 3.2 + inf * 1.6, 'rgb(' + c.join(',') + ')');
    }
    star(bx, by, ba, br + (soft ? 1 : 3), soft ? 3.6 : 6, YEL);
  }
  function loop(now) { if (run && !document.hidden) frame(now); if (!reduce) requestAnimationFrame(loop); }
  size(); px = W * 0.76; py = H * 0.34; frame(performance.now());
  window.addEventListener('resize', function () { size(); if (reduce) frame(performance.now()); });
  hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); ptx = e.clientX - r.left; pty = e.clientY - r.top; hasPtr = true; });
  hero.addEventListener('pointerleave', function () { hasPtr = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { run = en[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  if (!reduce) requestAnimationFrame(loop);
})();
