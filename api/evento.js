/* API de Conversiones de Meta (lado servidor). Corre como función de Vercel.
   La página la llama con cada evento del Pixel y el MISMO event_id, así Meta los une y no los cuenta doble.
   Variables de entorno en Vercel:
     META_PIXEL_ID         → 914352463951226
     META_CAPI_TOKEN       → token generado en el Administrador de eventos (no se sube al repo)
     META_TEST_EVENT_CODE  → opcional, solo mientras se prueba (ej. TEST12345). Borrarlo al terminar. */
const crypto = require('crypto');

const VERSION = 'v23.0';
const EVENTOS = ['PageView', 'ViewContent', 'Lead', 'Schedule', 'Contact', 'CompleteRegistration'];
const ORIGENES = /^https:\/\/(www\.)?myconsulting\.io$|^https:\/\/nicolasiannaci99-ship-it\.github\.io$|^http:\/\/localhost(:\d+)?$/;

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const limpio = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

module.exports = async (req, res) => {
  const origen = req.headers.origin || '';
  if (ORIGENES.test(origen)) res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, configurado: !!(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN) });
  if (req.method !== 'POST') return res.status(405).end();
  if (origen && !ORIGENES.test(origen)) return res.status(403).json({ error: 'origen' });

  const PIXEL = process.env.META_PIXEL_ID, TOKEN = process.env.META_CAPI_TOKEN;
  if (!PIXEL || !TOKEN) return res.status(500).json({ error: 'faltan variables de entorno' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || !EVENTOS.includes(b.event_name) || !b.event_id) return res.status(400).json({ error: 'evento' });

  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim();
  const u = b.user || {};
  const user_data = {
    client_ip_address: ip || undefined,
    client_user_agent: req.headers['user-agent'] || undefined,
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
  };
  const em = limpio(u.em);
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { user_data.em = [sha(em)]; user_data.external_id = [sha(em)]; }
  const ph = String(u.ph || '').replace(/\D/g, '');
  if (ph.length >= 8) user_data.ph = [sha(ph)];
  const fn = limpio(u.fn), ln = limpio(u.ln);
  if (fn) user_data.fn = [sha(fn)];
  if (ln) user_data.ln = [sha(ln)];

  const evento = {
    event_name: b.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(b.event_id).slice(0, 100),
    event_source_url: typeof b.url === 'string' ? b.url.slice(0, 1000) : undefined,
    action_source: 'website',
    user_data,
    custom_data: b.custom_data && typeof b.custom_data === 'object' ? b.custom_data : undefined,
  };
  const cuerpo = { data: [evento] };
  if (process.env.META_TEST_EVENT_CODE) cuerpo.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const r = await fetch(`https://graph.facebook.com/${VERSION}/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    });
    const j = await r.json();
    if (!r.ok) { console.error('Meta CAPI', r.status, JSON.stringify(j)); return res.status(502).json({ error: 'meta', detalle: j.error && j.error.message }); }
    return res.status(200).json({ ok: true, recibidos: j.events_received });
  } catch (e) {
    console.error('Meta CAPI', e);
    return res.status(502).json({ error: 'red' });
  }
};
