// Poster viewer: a click on the poster opens it full size on Ink. ← → (or a swipe, or the arrows
// at the bottom) flip through all posters, Esc or "zavrieť" closes. If you flipped to another
// poster, closing opens that poster's page. Hard cuts only: nothing fades.
// With the viewer closed, ← → on a poster page go to the previous / next poster.
(function () {
  var data = document.getElementById('posters');
  var trigger = document.querySelector('.cover .zoom');
  if (!data || !trigger) return;
  var posters = JSON.parse(data.textContent);
  var here = location.pathname.replace(/index\.html$/, '');
  var start = posters.findIndex(function (p) { return p.u === here; });
  if (start < 0) return;
  var i = start;
  var lastFocus = null;

  function arrow(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 12" width="24" height="12" aria-hidden="true" focusable="false"><path d="M0 5h18V0l6 6-6 6V7H0z"/></svg>';
  }

  var v = document.createElement('div');
  v.className = 'viewer';
  v.setAttribute('role', 'dialog');
  v.setAttribute('aria-modal', 'true');
  v.setAttribute('aria-label', 'Prehliadač plagátov');
  v.hidden = true;
  v.innerHTML =
    '<div class="v-bar"><p class="v-title"></p><button type="button" class="v-close">zavrieť</button></div>' +
    '<div class="v-stage"><img class="v-img" alt="" draggable="false"></div>' +
    '<div class="v-bar v-bar--bottom">' +
      '<button type="button" class="v-prev" aria-label="Predchádzajúci plagát">' + arrow('arr arr--back') + ' <span>predchádzajúci</span></button>' +
      '<p class="v-count" aria-live="polite"></p>' +
      '<button type="button" class="v-next" aria-label="Ďalší plagát"><span>ďalší</span> ' + arrow('arr') + '</button>' +
    '</div>';
  document.body.appendChild(v);

  var img = v.querySelector('.v-img');
  var stage = v.querySelector('.v-stage');
  var title = v.querySelector('.v-title');
  var count = v.querySelector('.v-count');
  var btnClose = v.querySelector('.v-close');
  var btnPrev = v.querySelector('.v-prev');
  var btnNext = v.querySelector('.v-next');

  function at(k) { return (k + posters.length) % posters.length; }
  function preload(k) { var im = new Image(); im.src = posters[at(k)].c; }

  function show(k) {
    i = at(k);
    var p = posters[i];
    img.removeAttribute('src');                    // hard cut: the old poster goes, the new one comes
    img.src = p.c;
    img.alt = p.a || p.t;
    title.textContent = p.t;
    count.textContent = (i + 1) + ' / ' + posters.length;
    if (v.hidden === false) history.replaceState(null, '', p.u);
    preload(i + 1);
    preload(i - 1);
  }

  function open() {
    lastFocus = document.activeElement;
    v.hidden = false;
    document.documentElement.classList.add('viewer-open');
    show(start);
    btnClose.focus();
  }

  function close() {
    v.hidden = true;
    document.documentElement.classList.remove('viewer-open');
    if (i !== start) { location.assign(posters[i].u); return; }
    history.replaceState(null, '', posters[start].u);
    if (lastFocus) lastFocus.focus();
  }

  trigger.addEventListener('click', function (e) { e.preventDefault(); open(); });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(i - 1); });
  btnNext.addEventListener('click', function () { show(i + 1); });
  

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (v.hidden) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (t && t.closest && t.closest('.pgrid')) return;          // the wall has its own arrow keys
      if (e.key === 'ArrowLeft') location.assign(posters[at(start - 1)].u);
      if (e.key === 'ArrowRight') location.assign(posters[at(start + 1)].u);
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
    else if (e.key === 'Tab') {                                    // keep focus inside the viewer
      var f = [btnClose, btnPrev, btnNext];
      var k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // swipe left / right on touch screens
  var x0 = null, y0 = null;
  stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
  stage.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1));
  });
})();
