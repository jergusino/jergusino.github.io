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
// taller than the poster, so the poster sits in the same place on every project page; stacked
// (phones) it must fit on the screen.
(function () {
  var title = document.querySelector('.project-text .title');
  var text = document.querySelector('.project-text');
  var prose = document.querySelector('.project-text .prose');
  var media = document.querySelector('.project-media .cover img, .project-media .cover video, .project-media .media-main');
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
  var img = document.querySelector('.project-media .cover img');
  if (img && !img.complete) img.addEventListener('load', fit);
  var vid = document.querySelector('.project-media .cover video');
  if (vid) vid.addEventListener('loadedmetadata', fit);
  window.addEventListener('resize', later);
})();

// Scroll reveal: elements marked .rv rise into place as they enter the screen, in a short stagger.
(function () {
  var els = document.querySelectorAll('.rv');
  if (!els.length) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.style.setProperty('--d', (n++ * 0.06) + 's');
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach(function (e) { io.observe(e); });
  setTimeout(function () { document.querySelectorAll('.rv:not(.in)').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight * 1.2) e.classList.add('in'); }); }, 1500);   // safety net
  // the filter on /projects/ re-orders cards: make sure none stay hidden
  document.addEventListener('click', function () { setTimeout(function () { document.querySelectorAll('.rv:not(.in)').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight) e.classList.add('in'); }); }, 30); });
})();

// The big asterisks turn as you scroll (a notch every 120 px of scroll).
(function () {
  var els = document.querySelectorAll('.spin');
  if (!els.length || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var tick = false;
  function upd() { tick = false; var d = (window.scrollY * 0.12) % 360; els.forEach(function (e) { e.style.setProperty('--spin', d + 'deg'); }); }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
})();

// Home hero: a field of grey asterisks, still. Near the pointer they turn and grow, and the one closest to it is
// the yellow one (yellow among grey). Without a pointer the yellow one rests top right of the headline.
(function () {
  var cv = document.querySelector('.field');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), hero = cv.parentNode;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, S = 64, cols = 0, rows = 0, px = 0, py = 0, ptx = 0, pty = 0, hasPtr = false, yw = [], bestIdx = -1, run = true, t0 = performance.now();
  var GREY = [88, 86, 80], LIGHT = [200, 197, 188], YEL = '#ffd60a', soft = false;
  function size() {
    var r = hero.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
    soft = W < 700 || (window.matchMedia && matchMedia('(pointer: coarse)').matches); S = soft ? 48 : 66; cols = Math.ceil(W / S) + 1; rows = Math.ceil(H / S) + 1; yw = [];
  }
  function star(x, y, a, r, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath();
    for (var k = 0; k < 3; k++) { var t = a + k * Math.PI / 3, dx = Math.sin(t) * r, dy = -Math.cos(t) * r; ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
    ctx.stroke();
  }
  function frame(now) {
    var t = (now - t0) / 1000;
    var tx = hasPtr ? ptx : W * 0.76, ty = hasPtr ? pty : H * 0.34;      // at rest the yellow one sits still, top right of the headline
    var dt = Math.min(0.05, Math.max(0.001, (now - (frame.last || now)) / 1000)); frame.last = now;
    var k = 1 - Math.pow(0.001, dt);                                       // frame-rate independent glide (about 0.1 per frame at 60fps)
    px += (tx - px) * k; py += (ty - py) * k;                       // it glides to the pointer, and back
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var best = 1e9, bi = -1;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var x = i * S + S / 2 - 8, y = j * S + S / 2 - 8, idx = i * rows + j;
      var dx = px - x, dy = py - y, d = Math.sqrt(dx * dx + dy * dy), inf = soft ? 0 : Math.max(0, 1 - d / 280);
      var pull = inf * inf * 0.42;                       // the yellow one attracts: nearby stars drift towards it
      x += dx * pull; y += dy * pull; d *= 1 - pull;
      var a = Math.sin(i * 0.5 + j * 0.4) * 0.5 + inf * inf * 1.6;
      var r = soft ? 4.2 : 5.5 + inf * 7;
      if (d < best) { best = d; bi = idx; }
      var c = GREY.map(function (g, n) { return Math.round(g + (LIGHT[n] - g) * inf); });
      star(x, y, a, r, soft ? 2.2 : 2.6 + inf * 1.4, soft ? 'rgb(70,68,63)' : 'rgb(' + c.join(',') + ')');
      if (!soft) {                                       // yellow stays on the grid; passing it to the next star is a soft cross-fade
        var w = yw[idx] || 0; w += ((idx === bestIdx ? 1 : 0) - w) * 0.16; yw[idx] = w;
        if (w > 0.02) { ctx.globalAlpha = w; star(x, y, a, r + 3 * w, 2.6 + 3.4 * w, YEL); ctx.globalAlpha = 1; }
      }
    }
    bestIdx = bi;
  }
  function loop(now) { if (run && !document.hidden) frame(now); if (!reduce && !soft) requestAnimationFrame(loop); }
  size(); px = W * 0.76; py = H * 0.34; frame(performance.now());
  window.addEventListener('resize', function () { size(); if (reduce || soft) frame(performance.now()); });
  window.addEventListener('pointermove', function (e) {   // on the whole window, so the star keeps following over the navbar too
    if (e.pointerType === 'touch') return;
    var r = hero.getBoundingClientRect(); ptx = e.clientX - r.left; pty = e.clientY - r.top; hasPtr = true; });
  document.documentElement.addEventListener('pointerleave', function () { hasPtr = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { run = en[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  if (!reduce && !soft) requestAnimationFrame(loop);
})();

// Variety: small tags and labels blur into focus; headings rise word by word. (Skipped for reduced motion.)
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  var targets = [];
  document.querySelectorAll('.sec-head .label, .closing .label, .chip, .cap, .meta dt, .count, .ctl-l, .lead').forEach(function (e) {
    if (e.closest('.hero')) return;
    e.classList.add('bf'); targets.push(e);
  });
  function words(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.nodeValue.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'); o.className = 'wd'; var n = document.createElement('span'); n.textContent = w; n.style.setProperty('--i', i++); o.appendChild(n); frag.appendChild(o);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
    el.classList.add('wds'); el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    Array.prototype.forEach.call(el.querySelectorAll('.wd'), function (w) { w.setAttribute('aria-hidden', 'true'); });
  }
  document.querySelectorAll('.h, .closing .display').forEach(function (e) { e.classList.remove('rv'); e.style.transform = ''; words(e); targets.push(e); });
  var io = new IntersectionObserver(function (en) {
    var n = 0;
    en.forEach(function (x) { if (!x.isIntersecting) return; if (x.target.classList.contains('bf')) x.target.style.setProperty('--d', (n++ * 0.05) + 's'); x.target.classList.add('in'); io.unobserve(x.target); });
  }, { rootMargin: '0px 0px -6% 0px' });
  targets.forEach(function (e) { io.observe(e); });
  function sweep() { targets.forEach(function (e) { if (!e.classList.contains('in') && e.getBoundingClientRect().top < innerHeight * 1.05) e.classList.add('in'); }); }   // safety net: nothing stays hidden
  window.addEventListener('scroll', sweep, { passive: true }); window.addEventListener('load', sweep); setTimeout(sweep, 1400);
})();

