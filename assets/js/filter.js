// Projects page: category and subject selectors, sorting and search. The choice is kept in the
// address (?druh=plagat&tema=film&zoradit=az&q=paris), so a filtered list can be shared or reloaded.
// Without JavaScript every poster stays visible (newest first). Hidden posters are taken out of
// the page, so the brick stagger stays regular.
(function () {
  var bar = document.querySelector('.controls');
  var grid = document.querySelector('.pgrid');
  if (!bar || !grid) return;

  var cards = Array.prototype.slice.call(grid.children);
  var typeBtns = bar.querySelectorAll('[data-filter]');
  var temaBtns = bar.querySelectorAll('[data-tema]');
  var sortBtns = bar.querySelectorAll('[data-sort]');
  var input = bar.querySelector('input');
  var empty = document.querySelector('.empty');
  var SORT_URL = { 'new': 'najnovsie', 'old': 'najstarsie', 'az': 'az' };
  var state = { type: 'all', tema: 'all', sort: 'new', q: '' };

  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function has(btns, attr, v) { return Array.prototype.some.call(btns, function (b) { return b.getAttribute(attr) === v; }); }

  var sorters = {
    'new': function (a, b) { return b.getAttribute('data-date') - a.getAttribute('data-date'); },
    'old': function (a, b) { return a.getAttribute('data-date') - b.getAttribute('data-date'); },
    'az': function (a, b) { return a.getAttribute('data-title').localeCompare(b.getAttribute('data-title'), 'sk'); }
  };

  function pressed(btns, attr, value) {
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value)); });
  }

  function writeUrl() {
    var p = new URLSearchParams();
    if (state.type !== 'all') p.set('druh', state.type);
    if (state.tema !== 'all') p.set('tema', state.tema);
    if (state.sort !== 'new') p.set('zoradit', SORT_URL[state.sort]);
    if (state.q.trim()) p.set('q', state.q.trim());
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function readUrl() {
    var p = new URLSearchParams(location.search);
    var hash = decodeURIComponent(location.hash.replace('#', ''));        // older links: /projects/#plagat
    var t = p.get('druh') || hash;
    if (t && has(typeBtns, 'data-filter', t)) state.type = t;
    var tema = p.get('tema');
    if (tema && has(temaBtns, 'data-tema', tema)) state.tema = tema;
    var z = p.get('zoradit');
    Object.keys(SORT_URL).forEach(function (k) { if (SORT_URL[k] === z) state.sort = k; });
    state.q = p.get('q') || '';
    input.value = state.q;
  }

  function render() {
    var q = norm(state.q);
    var list = cards.filter(function (c) {
      var tags = ' ' + (c.getAttribute('data-tags') || '') + ' ';
      return (state.type === 'all' || c.getAttribute('data-type') === state.type) &&
        (state.tema === 'all' || tags.indexOf(' ' + state.tema + ' ') !== -1) &&
        (!q || norm(c.getAttribute('data-search') + ' ' + c.getAttribute('data-tags')).indexOf(q) !== -1);
    }).sort(sorters[state.sort]);
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    list.forEach(function (c) { grid.appendChild(c); });
    pressed(typeBtns, 'data-filter', state.type);
    pressed(temaBtns, 'data-tema', state.tema);
    pressed(sortBtns, 'data-sort', state.sort);
    if (empty) empty.hidden = list.length !== 0;
  }

  function update() { writeUrl(); render(); }

  typeBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.type = b.getAttribute('data-filter'); update(); });
  });
  temaBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.tema = b.getAttribute('data-tema'); update(); });
  });
  sortBtns.forEach(function (b) {
    b.addEventListener('click', function () { state.sort = b.getAttribute('data-sort'); update(); });
  });
  input.addEventListener('input', function () { state.q = input.value; update(); });

  bar.hidden = false;
  readUrl();
  render();
})();
