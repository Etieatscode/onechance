try { require('dotenv').config(); } catch (e) {}
const store = require('./_store');

// ── admin auth (Basic) — POST requires ADMIN_PASSWORD when set ──
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

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method === 'GET') {
    return store.getConfig().then(cfg => res.end(JSON.stringify(cfg)));
  }
  if (req.method === 'POST') {
    if (!checkAdminAuth(req)) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Echelon Admin", charset="UTF-8"');
      return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const cfg = await store.getConfig();
        if (typeof data.solReserve === 'number') cfg.solReserve = Math.max(0, data.solReserve);
        if (typeof data.solPercentage === 'number') cfg.solPercentage = Math.min(100, Math.max(0, data.solPercentage));
        if (typeof data.tokenReserve === 'number') cfg.tokenReserve = Math.max(0, data.tokenReserve);
        if (typeof data.maxPerTx === 'number') cfg.maxPerTx = Math.min(48, Math.max(1, data.maxPerTx));
        if (typeof data.enabled === 'boolean') cfg.enabled = data.enabled;
        await store.setConfig(cfg);
        res.end(JSON.stringify({ ok: true, config: cfg }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  res.statusCode = 405;
  res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
};
