/* API de Conversiones de Meta (lado servidor). Corre como función de Vercel.
   La página la llama con cada evento del Pixel y el MISMO event_id, así Meta los une y no los cuenta doble.
   Variables de entorno en Vercel:
     META_PIXEL_ID         → 914352463951226
     META_CAPI_TOKEN       → token generado en el Administrador de eventos (no se sube al repo)
     META_TEST_EVENT_CODE  → opcional, solo mientras se prueba (ej. TEST12345). Borrarlo al terminar.
     KV_REST_API_URL / KV_REST_API_TOKEN → base Redis (Upstash) para contar el A/B test. Las crea Vercel solo.
   A/B test: GET /api/evento?ab=titulo-1 devuelve los contadores por versión. */
const crypto = require('crypto');

const VERSION = 'v23.0';
const EVENTOS = ['PageView', 'ViewContent', 'Lead', 'Schedule', 'Contact', 'CompleteRegistration', 'AgendaCalificada', 'ABVisita', 'ABHorario'];
const SOLO_AB = ['ABVisita', 'ABHorario'];            // estos no van a Meta
const CUENTAN_AB = ['ABVisita', 'ABHorario', 'Schedule', 'AgendaCalificada', 'Contact'];

/* ---------- Contadores del A/B en Redis (Upstash, por REST) ---------- */
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = async (comandos) => {
  const r = await fetch(KV_URL + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + KV_TOKEN }, body: JSON.stringify(comandos) });
  return r.json();
};
const limpioId = (v) => String(v || '').replace(/[^\w.:-]/g, '').slice(0, 60);
async function contarAB(b) {
  if (!KV_URL || !KV_TOKEN || !b.ab || !CUENTAN_AB.includes(b.event_name)) return;
  const test = limpioId(b.ab.id), ver = limpioId(b.ab.ver);
  if (!test || !/^[A-Z]$/.test(ver)) return;
  // cada event_id cuenta una sola vez (recargar la página no suma)
  const [nx] = await redis([['SET', 'abvisto:' + limpioId(b.event_id), '1', 'NX', 'EX', '7776000']]);
  if (!nx || nx.result !== 'OK') return;
  await redis([['HINCRBY', 'ab:' + test, ver + ':' + b.event_name, '1'], ['HSETNX', 'ab:' + test + ':inicio', 'fecha', new Date().toISOString()]]);
}
const ORIGENES = /^https:\/\/(www\.)?myconsulting\.io$|^https:\/\/nicolasiannaci99-ship-it\.github\.io$|^http:\/\/localhost(:\d+)?$/;

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const limpio = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

module.exports = async (req, res) => {
  const origen = req.headers.origin || '';
  if (ORIGENES.test(origen)) res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET' && req.query && req.query.ab) {
    if (!KV_URL || !KV_TOKEN) return res.status(200).json({ error: 'falta la base Redis' });
    const test = limpioId(req.query.ab);
    const [todo, ini] = await redis([['HGETALL', 'ab:' + test], ['HGET', 'ab:' + test + ':inicio', 'fecha']]);
    const plano = todo.result || [], tabla = {};
    for (let i = 0; i < plano.length; i += 2) { const [ver, ev] = plano[i].split(':'); (tabla[ver] = tabla[ver] || {})[ev] = Number(plano[i + 1]); }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ test, desde: ini.result, versiones: tabla });
  }
  if (req.method === 'GET') return res.status(200).json({ ab: !!(KV_URL && KV_TOKEN), ok: true, pixel: !!process.env.META_PIXEL_ID, token: !!process.env.META_CAPI_TOKEN, prueba: !!process.env.META_TEST_EVENT_CODE });
  if (req.method !== 'POST') return res.status(405).end();
  if (origen && !ORIGENES.test(origen)) return res.status(403).json({ error: 'origen' });

  const PIXEL = process.env.META_PIXEL_ID, TOKEN = process.env.META_CAPI_TOKEN;
  if (!PIXEL || !TOKEN) return res.status(500).json({ error: 'faltan variables de entorno' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || !EVENTOS.includes(b.event_name) || !b.event_id) return res.status(400).json({ error: 'evento' });

  try { await contarAB(b); } catch (e) { console.error('A/B', e); }
  if (SOLO_AB.includes(b.event_name)) return res.status(200).json({ ok: true, ab: true });

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
