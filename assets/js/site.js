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
