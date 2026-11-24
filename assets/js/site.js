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

// Project pages: the title is large, so a long one (several lines) is stepped down until the whole
// info (lead, title, details, description) fits. Side by side (wide screens) the info must not be
// taller than the poster, so the poster sits in the same place on every poster page; stacked
// (phones) it must fit on the screen.
(function () {
  var title = document.querySelector('.plagat-text .title');
  var text = document.querySelector('.plagat-text');
  var prose = document.querySelector('.plagat-text .prose');
  var media = document.querySelector('.plagat-media .cover img, .plagat-media .cover video, .plagat-media .media-main');
  if (!title || !prose) return;
  function sideBySide() { return window.matchMedia('(min-width: 900px)').matches; }
  function tooBig() {
    if (sideBySide() && media && media.getBoundingClientRect().height > 0) {
      return text.getBoundingClientRect().height > media.getBoundingClientRect().height;
    }
    var last = prose.lastElementChild || prose;
    return last.getBoundingClientRect().bottom + window.scrollY > window.innerHeight - 8;
  }
  function fit() {
    title.style.fontSize = '';
    if (!sideBySide()) return;   // stacked (phones): the page scrolls, so the title keeps its full size
    var size = parseFloat(getComputedStyle(title).fontSize);
    var min = size * 0.7;
    while (tooBig() && size > min) {
      size *= 0.95;
      title.style.fontSize = size + 'px';
    }
  }
  var t;
  function later() { clearTimeout(t); t = setTimeout(fit, 80); }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var img = document.querySelector('.plagat-media .cover img');
  if (img && !img.complete) img.addEventListener('load', fit);
  var vid = document.querySelector('.plagat-media .cover video');
  if (vid) vid.addEventListener('loadedmetadata', fit);
  window.addEventListener('resize', later);
})();
