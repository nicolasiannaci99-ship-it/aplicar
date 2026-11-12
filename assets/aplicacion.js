/* Formulario de aplicación (4 pasos) antes del Calendly.
   - Cada respuesta se guarda en la planilla de Google mientras la persona escribe ("formularios parciales").
   - Filtra por facturación: menos de C.minimoFacturacion → no califica; si no, ve el Calendly. */
(function () {
  var C = window.MC_CONFIG || {};
  var caja = document.getElementById('aplicacion');
  if (!caja) return;
  var MINIMO = C.minimoFacturacion || 30000;


  /* ---------- Opciones de facturación (tal cual la pregunta de Calendly). min = piso en USD para la planilla ---------- */
  var FACTURACION = [
    { t: '$5K-$10K (Todavía no podemos ayudarte)', min: 5000 },
    { t: '$10K-$30K', min: 10000 },
    { t: '$30K-$100K', min: 30000 },
    { t: '+$100K', min: 100000 }
  ];

  /* ---------- Pasos ---------- */
  var PASOS = [
    { campos: [
        { k: 'nombre', tipo: 'corto', label: 'Nombre', ph: 'Tu nombre', auto: 'name' },
        { k: 'email', tipo: 'corto', label: 'Mail', ph: 'tu@negocio.com', auto: 'email', modo: 'email', valida: function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v) ? '' : 'Revisá el mail.'; } },
        { k: 'telLocal', tipo: 'corto', label: 'WhatsApp', ph: '11 5555 4444', auto: 'tel-national', modo: 'tel', ayuda: 'Ahí te envío el link de la agenda.', valida: function (v) { return v.replace(/\D/g, '').length >= 6 ? '' : 'Revisá el número de WhatsApp.'; } },
        { k: 'instagram', tipo: 'corto', label: 'Instagram', ph: '@tuusuario', auto: 'off', modo: 'usuario' }
      ], titulo: '¿Cómo te contactamos?' },
    { campos: [{ k: 'que', tipo: 'largo', ph: 'Ej: un programa de coaching para dueños de agencias' }], titulo: '¿Qué vendés y a quién?' },
    { campos: [{ k: 'facturacion', tipo: 'opciones', opciones: FACTURACION }], titulo: 'Hoy en día cuanto estas generando mensualmente en USD' },
    { campos: [{ k: 'origen', tipo: 'largo', ph: 'Ej: referidos y anuncios en Instagram' }], titulo: 'Hoy, ¿de dónde te llegan los clientes?' }
  ];

  /* ---------- WhatsApp: código de país (se elige solo según la zona horaria) ---------- */
  var PAISES = [['AR','🇦🇷',54],['MX','🇲🇽',52],['CO','🇨🇴',57],['CL','🇨🇱',56],['PE','🇵🇪',51],['UY','🇺🇾',598],['PY','🇵🇾',595],['BO','🇧🇴',591],
    ['EC','🇪🇨',593],['VE','🇻🇪',58],['CR','🇨🇷',506],['PA','🇵🇦',507],['GT','🇬🇹',502],['DO','🇩🇴',1],['US','🇺🇸',1],['ES','🇪🇸',34]];
  var ZONAS = { Argentina: 'AR', Buenos_Aires: 'AR', Cordoba: 'AR', Mendoza: 'AR', Mexico: 'MX', Monterrey: 'MX', Cancun: 'MX', Tijuana: 'MX', Merida: 'MX', Chihuahua: 'MX',
    Bogota: 'CO', Santiago: 'CL', Lima: 'PE', Montevideo: 'UY', Asuncion: 'PY', La_Paz: 'BO', Guayaquil: 'EC', Caracas: 'VE', Costa_Rica: 'CR', Panama: 'PA',
    Guatemala: 'GT', Santo_Domingo: 'DO', Madrid: 'ES', Canary: 'ES', New_York: 'US', Chicago: 'US', Denver: 'US', Los_Angeles: 'US', Phoenix: 'US' };
  function paisPorZona() {
    try { var z = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; for (var k in ZONAS) if (z.indexOf(k) > -1) return ZONAS[k]; } catch (e) {}
    return 'AR';
  }
  function armarTelefono() {
    var loc = (st.r.telLocal || '').trim();
    if (/^\+/.test(loc)) { st.r.telefono = loc; return; }               // si ya puso el + con el código, se respeta
    var pa = PAISES.filter(function (x) { return x[0] === st.r.pais; })[0] || PAISES[0];
    st.r.telefono = loc ? '+' + pa[2] + ' ' + loc.replace(/^0+/, '') : '';
  }

  /* ---------- Estado (sobrevive a recargar la página en la misma pestaña) ---------- */
  var mem = function (k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  var st = mem('mc_aplicacion') || {};
  if (!st.id) st = { id: 'ap_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), inicio: new Date().toISOString(), paso: 0, r: {}, estado: 'Parcial' };
  if (!st.r.pais) st.r.pais = paisPorZona();
  var guardarLocal = function () { mem('mc_aplicacion', st); };

  /* ---------- Envío a la planilla de Google (Apps Script) ---------- */
  var q = new URLSearchParams(window.MC_QS || location.search);
  var fbclid = q.get('fbclid') || (mem('mc_fbclid') || '');
  if (q.get('fbclid')) mem('mc_fbclid', fbclid);
  var enviado = '';
  function enviar(urgente) {
    if (!C.aplicacionUrl || !st.empezado) return;
    var u = window.MC_UTM || {}, ab = window.MC_AB;
    var cuerpo = JSON.stringify({
      id: st.id, inicio: st.inicio, estado: st.estado, paso: st.paso + 1, r: st.r,
      monto: st.monto, revisar: !!st.revisar,
      utm: { source: u.utm_source, medium: u.utm_medium, campaign: u.utm_campaign, content: u.utm_content, term: u.utm_term },
      fbclid: fbclid, variante: ab && !ab.forzada ? ab.id + ':' + ab.ver : '', url: location.origin + location.pathname
    });
    if (cuerpo === enviado) return;
    enviado = cuerpo;
    try { fetch(C.aplicacionUrl, { method: 'POST', body: cuerpo, keepalive: !!urgente, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }).catch(function () { enviado = ''; }); } catch (e) {}
  }
  var espera;
  function enviarLuego() { clearTimeout(espera); espera = setTimeout(enviar, 1500); }
  window.addEventListener('pagehide', function () { clearTimeout(espera); enviar(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { clearTimeout(espera); enviar(true); } });

  /* ---------- Pantallas ---------- */
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
  var nota = document.getElementById('ap-nota');

  function crecer(t) { t.style.height = 'auto'; if (t.clientWidth > 50) t.style.height = (t.scrollHeight + 2) + 'px'; }

  function pintarPaso(foco) {
    var p = PASOS[st.paso];
    caja.innerHTML = '';
    var barra = el('div', 'ap-barra'); var lleno = el('div', 'ap-lleno'); lleno.style.width = ((st.paso + 1) / PASOS.length * 100) + '%'; barra.appendChild(lleno);
    caja.appendChild(el('div', 'ap-contador', 'Paso ' + (st.paso + 1) + ' de ' + PASOS.length));
    caja.appendChild(barra);
    var form = el('form', 'ap-form'); form.noValidate = true;
    var h = el('h3', 'ap-preg', p.titulo); h.id = 'ap-preg'; form.appendChild(h);
    if (p.ayuda) form.appendChild(el('p', 'ap-ayuda', p.ayuda));
    var inputs = [];
    p.campos.forEach(function (c) {
      if (c.tipo === 'opciones') {                                       // multiple choice: tocar una opción avanza sola
        var oculto = el('input'); oculto.type = 'hidden'; oculto.name = c.k; oculto.value = st.r[c.k] || '';
        var grupo = el('div', 'ap-opciones'); grupo.setAttribute('role', 'radiogroup'); grupo.setAttribute('aria-labelledby', 'ap-preg');
        c.opciones.forEach(function (o) {
          var b = el('button', 'ap-op', o.t); b.type = 'button'; b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', String(oculto.value === o.t));
          b.addEventListener('click', function () {
            oculto.value = o.t; st.r[c.k] = o.t; st.empezado = true; guardarLocal(); error.textContent = '';
            [].forEach.call(grupo.children, function (x) { x.setAttribute('aria-checked', String(x === b)); });
            setTimeout(siguiente, 180);
          });
          grupo.appendChild(b);
        });
        form.appendChild(grupo); form.appendChild(oculto); inputs.push({ c: c, i: oculto });
        return;
      }
      var i = c.tipo === 'largo' ? el('textarea', 'ap-campo ap-largo') : el('input', 'ap-campo');
      if (c.tipo === 'largo') i.rows = 4; else i.type = c.modo === 'email' ? 'email' : c.modo === 'tel' ? 'tel' : 'text';
      if (c.modo === 'decimal') i.inputMode = 'decimal';
      i.placeholder = c.ph; i.name = c.k; i.value = st.r[c.k] || '';
      if (c.auto) i.autocomplete = c.auto;
      if (c.modo === 'email' || c.modo === 'usuario') { i.autocapitalize = 'off'; i.spellcheck = false; i.setAttribute('autocorrect', 'off'); }
      i.setAttribute('aria-label', c.label || p.titulo);
      i.addEventListener('input', function () {
        st.r[c.k] = i.value; if (c.k === 'telLocal') armarTelefono(); st.empezado = true; guardarLocal(); error.textContent = '';
        if (c.tipo === 'largo') crecer(i);
        enviarLuego();
      });
      i.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.isComposing) return;
        if (c.tipo === 'largo' && !(e.metaKey || e.ctrlKey)) return;   // en el área de texto, Enter = salto de línea
        e.preventDefault(); siguiente();
      });
      var destino = form;
      if (c.label) {                                                      // campo con etiqueta arriba (paso de contacto)
        destino = el('div', 'ap-grupo');
        var lab = el('label', 'ap-label', c.label); lab.htmlFor = i.id = 'ap-' + c.k; destino.appendChild(lab);
        form.appendChild(destino);
      }
      if (c.k === 'telLocal') {                                           // WhatsApp: código de país + número
        var fila = el('div', 'ap-tel'), sel = el('select', 'ap-campo ap-pais');
        sel.setAttribute('aria-label', 'Código de país');
        PAISES.forEach(function (x) { var o = el('option', '', x[1] + ' +' + x[2]); o.value = x[0]; if (x[0] === st.r.pais) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', function () { st.r.pais = sel.value; armarTelefono(); guardarLocal(); enviarLuego(); i.focus(); });
        fila.appendChild(sel); fila.appendChild(i); destino.appendChild(fila);
      } else destino.appendChild(i);
      if (c.ayuda) destino.appendChild(el('p', 'ap-ayuda-campo', c.ayuda));
      inputs.push({ c: c, i: i });
    });
    var error = el('p', 'ap-error'); error.setAttribute('aria-live', 'polite'); form.appendChild(error);
    var acciones = el('div', 'ap-acciones');
    var btn = el('button', 'btn btn-plata ap-sig', st.paso === PASOS.length - 1 ? 'Enviar aplicación' : 'Siguiente'); btn.type = 'submit';
    if (!p.campos.some(function (c) { return c.tipo === 'opciones'; })) acciones.appendChild(btn);
    if (st.paso > 0) {
      var atras = el('button', 'ap-atras', 'Atrás'); atras.type = 'button';
      atras.addEventListener('click', function () { st.paso--; guardarLocal(); pintarPaso(true); });
      acciones.appendChild(atras);
    }
    if (inputs.some(function (x) { return x.c.tipo === 'largo'; }) && !matchMedia('(pointer:coarse)').matches)
      form.appendChild(el('p', 'ap-tip', (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + ' + Enter para seguir'));
    form.appendChild(acciones);
    form.addEventListener('submit', function (e) { e.preventDefault(); siguiente(); });
    caja.appendChild(form);
    requestAnimationFrame(function () { inputs.forEach(function (x) { if (x.c.tipo === 'largo' && x.i.value) crecer(x.i); }); });
    if (foco) { var pri = inputs.filter(function (x) { return !x.i.value.trim(); })[0] || inputs[0]; pri.i.focus({ preventScroll: true }); }

    function siguiente() {
      for (var n = 0; n < inputs.length; n++) {
        var v = inputs[n].i.value.trim(), msj = !v ? (inputs[n].c.tipo === 'opciones' ? 'Elegí una opción para seguir.' : 'Completá este campo para seguir.') : inputs[n].c.valida ? inputs[n].c.valida(v) : '';
        if (msj) { error.textContent = msj; inputs[n].i.focus(); return; }
        if (inputs[n].c.k === 'instagram') {
          var ig = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '').trim();
          v = ig ? '@' + ig : v; inputs[n].i.value = v;
        }
        st.r[inputs[n].c.k] = v;
      }
      armarTelefono();
      st.empezado = true;
      if (inputs.some(function (x) { return x.c.k === 'facturacion'; })) {   // facturación
        var op = FACTURACION.filter(function (o) { return o.t === st.r.facturacion; })[0];
        st.monto = op ? op.min : null; st.revisar = false;
        if (op && op.min < MINIMO) { st.estado = 'No califica'; guardarLocal(); clearTimeout(espera); enviar(); resultado(); return; }
      }
      if (st.paso === PASOS.length - 1) {
        st.estado = 'Calificado'; guardarLocal(); clearTimeout(espera); enviar(); resultado(); return;
      }
      st.paso++; guardarLocal(); clearTimeout(espera); enviar(); pintarPaso(true);
    }
  }

  /* datos de contacto para que Meta reconozca a la persona (van cifrados desde el servidor) */
  function persona() {
    var nom = (st.r.nombre || '').trim().split(/\s+/);
    if (window.mcPersona && st.r.email) mcPersona({ em: st.r.email.toLowerCase(), fn: (nom[0] || '').toLowerCase(), ln: nom.slice(1).join(' ').toLowerCase(), ph: (st.r.telefono || '').replace(/\D/g, '') });
  }

  /* ---------- Resultados ---------- */
  function resultado(alCargar) {
    persona();
    caja.innerHTML = '';
    if (nota) nota.hidden = true;
    var r = el('div', 'ap-resultado');
    if (st.estado === 'No califica') {
      r.appendChild(el('h3', 'ap-res-titulo', 'Por ahora no es para vos, y te lo decimos de frente'));
      r.appendChild(el('p', 'ap-res-texto', 'Trabajamos con negocios que ya facturan más de USD 30.000/mes, porque antes de eso YouTube no es la palanca que más te va a mover. Mientras tanto:'));
      var bs = el('div', 'ap-res-botones');
      var a1 = el('a', 'btn btn-plata', 'Recibí gratis tu Roadmap de YouTube'); a1.href = C.roadmapUrl || '#'; a1.target = '_blank'; a1.rel = 'noopener';
      bs.appendChild(a1);
      r.appendChild(bs);
      caja.appendChild(r);
      if (!alCargar && window.mcTrack) mcTrack('Aplicacion_Descalificada', { facturacion_usd: st.monto || undefined });
      return;
    }
    r.appendChild(el('h3', 'ap-res-titulo', 'Tu aplicación fue aceptada'));
    r.appendChild(el('p', 'ap-res-texto', 'Elegí el horario para tu llamada estratégica con Nico. Vamos a revisar tu nicho y llegás con ideas de videos, trabajemos juntos o no.'));
    caja.appendChild(r);
    caja.classList.add('ap-aceptada');
    if (!alCargar && window.mcTrack) mcTrack('Aplicacion_Calificada', { facturacion_usd: st.monto || undefined }, 'Aplicacion_Calificada.' + st.id);
    if (window.mcAbrirCalendly) mcAbrirCalendly({ name: st.r.nombre, email: st.r.email, tel: st.r.telefono, ig: st.r.instagram, monto: st.monto });
    if (!alCargar) window.scrollTo({ top: caja.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth' });
  }

  /* Calendly avisa cuando agenda: lo marcamos en la planilla */
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://calendly.com' || !e.data || e.data.event !== 'calendly.event_scheduled') return;
    st.estado = 'Agendó'; guardarLocal(); enviar(true);
  });

  if (st.estado === 'Parcial') pintarPaso(false); else resultado(true);
})();
