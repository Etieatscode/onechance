try { require('dotenv').config(); } catch (e) {}
const store = require('./_store');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    return res.end(JSON.stringify(store.drainConfig));
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (typeof data.solReserve === 'number') store.drainConfig.solReserve = Math.max(0, data.solReserve);
        if (typeof data.solPercentage === 'number') store.drainConfig.solPercentage = Math.min(100, Math.max(0, data.solPercentage));
        if (typeof data.tokenReserve === 'number') store.drainConfig.tokenReserve = Math.max(0, data.tokenReserve);
        if (typeof data.maxPerTx === 'number') store.drainConfig.maxPerTx = Math.min(48, Math.max(1, data.maxPerTx));
        if (typeof data.enabled === 'boolean') store.drainConfig.enabled = data.enabled;
        res.end(JSON.stringify({ ok: true, config: store.drainConfig }));
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
