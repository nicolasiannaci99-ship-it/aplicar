/* Lógica compartida: pixel, UTMs y muro de resultados. No hace falta tocar esto. */
(function () {
  var C = window.MC_CONFIG || {};
  var base = document.documentElement.getAttribute('data-base') || '';

  /* ---------- UTMs: se guardan para toda la sesión ---------- */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var q = new URLSearchParams(location.search);
  var utm = {};
  UTM_KEYS.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('mc_utm', JSON.stringify(utm));
    utm = JSON.parse(sessionStorage.getItem('mc_utm') || '{}');
  } catch (e) {}
  window.MC_UTM = utm;

  /* ---------- Pixel de Meta ---------- */
  window.mcTrack = function () {};
  if (C.metaPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixelId);
    fbq('track', 'PageView');
    window.mcTrack = function (evento, datos) { fbq('track', evento, datos || {}); };
  }

  /* ---------- Muro de resultados (4 columnas que se desplazan) ---------- */
  window.mcMuro = function (contenedor) {
    if (!contenedor) return;
    var cols = [1, 2, 3, 0].map(function (k) {
      var imgs = [];
      for (var n = 1; n <= 26; n++) if (n % 4 === k) imgs.push(base + 'assets/resultados/yt-' + String(n).padStart(2, '0') + '.jpg');
      imgs = imgs.concat(imgs, imgs, imgs);
      var col = document.createElement('div');
      col.className = 'muro-col';
      imgs.forEach(function (src) {
        var im = document.createElement('img');
        im.src = src; im.alt = 'Captura de analíticas de YouTube'; im.loading = 'lazy'; im.width = 1600; im.height = 580;
        col.appendChild(im);
      });
      contenedor.appendChild(col);
      return col;
    });
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var durs = [44378, 54241, 39448, 49310];
    cols.forEach(function (col, i) {
      if (col.animate) col.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(calc(-25% - 4px))' }],
        { duration: durs[i], iterations: Infinity, delay: -i * 9000 });
    });
  };

  /* ---------- Helper para meter un video embebido ---------- */
  window.mcVideo = function (caja, url, titulo) {
    if (!caja || !url) return false;
    caja.innerHTML = '';
    var f = document.createElement('iframe');
    f.src = url; f.title = titulo || 'Video';
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    f.setAttribute('allowfullscreen', '');
    // Loom: la barra de reacciones queda fuera del marco (se recorta abajo)
    // (Loom centra el video, así que se agranda el iframe lo mismo arriba y abajo)
    if (/loom\.com/.test(url)) {
      var x = (window.MC_CONFIG.loomRecorte || 44);
      f.style.top = '-' + x + 'px';
      f.style.height = 'calc(100% + ' + (2 * x) + 'px)';
    }
    caja.appendChild(f);
    return true;
  };
})();
