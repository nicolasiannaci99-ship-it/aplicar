/* Lógica compartida: pixel, UTMs y muro de resultados. No hace falta tocar esto. */
(function () {
  var C = window.MC_CONFIG || {};
  var base = document.documentElement.getAttribute('data-base') || '';

  /* ---------- Datos de Calendly: se leen y se borran de la URL ----------
     Calendly manda email, nombre y respuestas en la URL. Los guardamos y limpiamos
     la dirección ANTES de cargar el Pixel, para no mandarle datos personales a Meta. */
  window.MC_QS = location.search;
  if (/invitee_|answer_|email/i.test(location.search)) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  }

  /* ---------- UTMs: se guardan para toda la sesión ---------- */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var q = new URLSearchParams(window.MC_QS);
  var utm = {};
  UTM_KEYS.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('mc_utm', JSON.stringify(utm));
    utm = JSON.parse(sessionStorage.getItem('mc_utm') || '{}');
  } catch (e) {}
  window.MC_UTM = utm;

  /* ---------- A/B test ----------
     Cada visitante queda fijo en una versión (A o B) para siempre en ese navegador.
     La versión viaja en todos los eventos (Pixel, servidor y Calendly) para comparar resultados.
     Para ver una versión a mano: ?ver=A o ?ver=B (no cambia la versión guardada). */
  window.MC_AB = null;
  var AB = C.abTest;
  var guardado = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  if (AB && AB.id && AB.variantes) {
    var kv = 'mc_ab_' + AB.id, ver = guardado(kv);
    var esLanding = base === '';
    if (!ver && esLanding) { ver = Math.random() < 0.5 ? 'A' : 'B'; guardado(kv, ver); }
    var forzada = q.get('ver');
    if (forzada && AB.variantes[forzada]) ver = forzada;
    var visitante = guardado('mc_vid');
    if (!visitante) { visitante = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); guardado('mc_vid', visitante); }
    if (ver) window.MC_AB = { id: AB.id, ver: ver, forzada: !!forzada, visitante: visitante };
  }

  /* ---------- Datos de la persona (solo los que manda Calendly) ----------
     Se usan para que Meta reconozca a quién agendó. El Pixel y el servidor los mandan cifrados (SHA-256). */
  var persona = {};
  var em = (q.get('invitee_email') || '').trim().toLowerCase();
  if (em) persona.em = em;
  if (q.get('invitee_first_name')) persona.fn = q.get('invitee_first_name').trim().toLowerCase();
  if (q.get('invitee_last_name')) persona.ln = q.get('invitee_last_name').trim().toLowerCase();
  q.forEach(function (v, k) {
    if (!persona.ph && /^answer_|phone|text_reminder/.test(k) && /^[+\d\s().-]{8,20}$/.test(v) && v.replace(/\D/g, '').length >= 8) persona.ph = v.replace(/\D/g, '');
  });

  // la aplicación de la landing completa estos datos (nombre, email, teléfono) para el servidor
  window.mcPersona = function (p) { Object.keys(p || {}).forEach(function (k) { if (p[k]) persona[k] = p[k]; }); };

  /* ---------- Cookies de Meta (_fbp / _fbc) ---------- */
  var cookie = function (n) { var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; };
  var fbclid = q.get('fbclid');
  try {
    if (fbclid) sessionStorage.setItem('mc_fbc', 'fb.1.' + Date.now() + '.' + fbclid);
  } catch (e) {}
  var fbc = function () { var c = cookie('_fbc'); try { return c || sessionStorage.getItem('mc_fbc') || ''; } catch (e) { return c; } };

  /* ---------- API de Conversiones: el mismo evento, desde el servidor ---------- */
  var nuevoId = function (ev) { return ev + '.' + Date.now().toString(36) + '.' + Math.random().toString(36).slice(2, 10); };
  var alServidor = function (evento, datos, id) {
    if (!C.capiUrl) return;
    var cuerpo = JSON.stringify({
      event_name: evento, event_id: id, url: location.href, custom_data: datos || undefined,
      ab: window.MC_AB && !window.MC_AB.forzada ? { id: window.MC_AB.id, ver: window.MC_AB.ver } : undefined,
      user: { fbp: cookie('_fbp'), fbc: fbc(), em: persona.em, fn: persona.fn, ln: persona.ln, ph: persona.ph }
    });
    try {
      // text/plain evita la consulta previa (CORS) y keepalive la deja terminar aunque se cierre la página
      fetch(C.capiUrl, { method: 'POST', body: cuerpo, keepalive: true, mode: 'cors', headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
    } catch (e) {}
  };

  /* ---------- Pixel de Meta ---------- */
  window.mcTrack = function () {};
  if (C.metaPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixelId, persona);
    // id: si se pasa uno fijo (ej. el de la reserva de Calendly), recargar la página no duplica el evento
    window.mcTrack = function (evento, datos, id) {
      id = id || nuevoId(evento);
      if (window.MC_AB) { datos = Object.assign({}, datos || {}); datos.ab_test = window.MC_AB.id; datos.variante = window.MC_AB.ver; }
      var estandar = /^(PageView|ViewContent|Lead|Schedule|Contact|CompleteRegistration)$/.test(evento);
      fbq(estandar ? 'track' : 'trackCustom', evento, datos || {}, { eventID: id });
      // se espera un instante para que el Pixel cree la cookie _fbp y viaje también al servidor
      if (cookie('_fbp')) alServidor(evento, datos, id);
      else setTimeout(function () { alServidor(evento, datos, id); }, 600);
    };
    mcTrack('PageView');
  }

  /* Eventos solo para el A/B (no van a Meta): se cuentan una vez por visitante */
  window.mcAB = function (evento) {
    if (!window.MC_AB || window.MC_AB.forzada) return;
    alServidor(evento, null, evento + '.' + window.MC_AB.id + '.' + window.MC_AB.visitante);
  };
  if (window.MC_AB && base === '') {
    mcAB('ABVisita');
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
