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

// Project pages on touch screens: swipe left for the next project, right for the previous one
// (the same targets as the side arrows, which are hidden on small screens).
(function () {
  var prev = document.querySelector('.page-arrow--prev');
  var next = document.querySelector('.page-arrow--next');
  if (!prev || !next) return;
  var x0 = null, y0 = null, t0 = 0;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1 || document.documentElement.classList.contains('viewer-open')) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Date.now() - t0 > 800) return;                                   // a slow drag is not a swipe
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;  // mostly sideways, far enough
    location.assign((dx < 0 ? next : prev).href);
  }, { passive: true });
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
