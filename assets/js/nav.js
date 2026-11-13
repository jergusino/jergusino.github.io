(function () {
  var top = document.querySelector('.top'), btn = document.querySelector('.menu-btn');
  if (!top || !btn) return;
  function set(o) { top.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  btn.addEventListener('click', function () { set(!top.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!top.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  window.addEventListener('pageshow', function () { set(false); });
})();
