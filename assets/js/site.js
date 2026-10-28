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
  var media = document.querySelector('.project-media .cover img, .project-media .media-main');
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
  window.addEventListener('resize', later);
})();
