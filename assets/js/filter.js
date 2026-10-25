// Project filter. Without JavaScript every project simply stays visible.
(function () {
  var bar = document.querySelector('.filters');
  if (!bar) return;
  var rows = document.querySelectorAll('.pcard');
  var buttons = bar.querySelectorAll('button');
  var empty = document.querySelector('.empty');

  function apply(type) {
    var shown = 0;
    rows.forEach(function (row) {
      var show = type === 'all' || row.getAttribute('data-type') === type;
      row.hidden = !show;
      if (show) shown++;
    });
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === type));
    });
    if (empty) empty.hidden = shown !== 0;
  }

  function fromHash() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    var ok = Array.prototype.some.call(buttons, function (b) { return b.getAttribute('data-filter') === h; });
    return ok ? h : 'all';
  }

  bar.hidden = false;
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-filter');
      apply(t);
      history.replaceState(null, '', t === 'all' ? location.pathname : '#' + t);
    });
  });
  apply(fromHash());
})();
