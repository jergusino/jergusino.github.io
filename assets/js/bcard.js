(function () {
  var cards = document.querySelectorAll('.bcard');
  function pos(e, c) { var r = c.getBoundingClientRect(); c.style.setProperty('--x', (e.clientX - r.left) + 'px'); c.style.setProperty('--y', (e.clientY - r.top) + 'px'); }
  cards.forEach(function (c) {
    ['pointerenter', 'pointerdown', 'pointerleave'].forEach(function (t) { c.addEventListener(t, function (e) { pos(e, c); }); });
  });
})();
