try { require('dotenv').config(); } catch (e) {}
const store = require('./_store');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    return store.getConfig().then(cfg => res.end(JSON.stringify(cfg)));
  }
  if (req.method === 'POST') {
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
