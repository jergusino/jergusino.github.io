// Projects page: category selector, sorting and search. Without JavaScript every poster stays visible
// (newest first). Hidden posters are taken out of the page, so the brick stagger stays regular.
(function () {
  var bar = document.querySelector('.controls');
  var grid = document.querySelector('.pgrid');
  if (!bar || !grid) return;

  var cards = Array.prototype.slice.call(grid.children);
  var filterBtns = bar.querySelectorAll('[data-filter]');
  var sortBtns = bar.querySelectorAll('[data-sort]');
  var input = bar.querySelector('input');
  var empty = document.querySelector('.empty');
  var state = { type: 'all', sort: 'new', q: '' };

  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

  var sorters = {
    'new': function (a, b) { return b.getAttribute('data-date') - a.getAttribute('data-date'); },
    'old': function (a, b) { return a.getAttribute('data-date') - b.getAttribute('data-date'); },
    'az': function (a, b) { return a.getAttribute('data-title').localeCompare(b.getAttribute('data-title'), 'sk'); }
  };

  function pressed(btns, attr, value) {
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value)); });
  }

  function render() {
    var q = norm(state.q);
    var list = cards.filter(function (c) {
      return (state.type === 'all' || c.getAttribute('data-type') === state.type) &&
        (!q || norm(c.getAttribute('data-search')).indexOf(q) !== -1);
    }).sort(sorters[state.sort]);
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    list.forEach(function (c) { grid.appendChild(c); });
    pressed(filterBtns, 'data-filter', state.type);
    pressed(sortBtns, 'data-sort', state.sort);
    if (empty) empty.hidden = list.length !== 0;
  }

  function fromHash() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    var ok = Array.prototype.some.call(filterBtns, function (b) { return b.getAttribute('data-filter') === h; });
    return ok ? h : 'all';
  }

  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.type = b.getAttribute('data-filter');
      history.replaceState(null, '', state.type === 'all' ? location.pathname : '#' + state.type);
      render();
    });
  });
  sortBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.sort = b.getAttribute('data-sort'); render(); });
  });
  input.addEventListener('input', function () { state.q = input.value; render(); });

  bar.hidden = false;
  state.type = fromHash();
  render();
})();
