// Instagram posts load only when tapped: nothing is sent to Instagram until then.
(function () {
  document.querySelectorAll('.post-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = b.getAttribute('data-embed'); f.loading = 'lazy'; f.title = b.getAttribute('aria-label');
      f.setAttribute('allowtransparency', 'true'); f.setAttribute('scrolling', 'no'); f.className = 'post-frame';
      f.style.height = b.getAttribute('data-h') + 'px';
      b.parentNode.replaceChild(f, b);
    });
  });
})();
